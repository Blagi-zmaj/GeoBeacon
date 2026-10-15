# ADR 0002: Use PostgreSQL with PostGIS for Spatial Storage

**Date:** 2026-10-15  
**Status:** Proposed

## 1. Problem

GeoBeacon requires a persistent spatial data store capable of acting as the ultimate source of truth for all incident telemetry. The storage must satisfy three critical requirements:

1. Highly efficient spatial read patterns, primarily Viewport Bounding Box (BBox) filtering for MapLibre GL JS, and secondary distance-based alert queries.
2. The ability to filter spatial data efficiently alongside relational metadata (e.g., incident category, severity).
3. Robust handling of ingestion anomalies, ensuring idempotent writes without duplication or data corruption when external sources (e.g., NASA API) send delayed, out-of-order, or retried payloads following a worker crash.

## 2. Considered Options

- **Option A: PostgreSQL + PostGIS**
  - **Ideal Use Case:** Systems requiring ACID transactional guarantees, relational integrity, and a full suite of complex geospatial operations.
  - **Pros/Cons:** Native support for GiST spatial indexes. Provides separate types for planar geometry (fast bounding box filters) and spherical geography (accurate meter-based distance calculations). The tradeoff is a heavier write I/O and transaction locking overhead during ingestion spikes compared to purely in-memory stores.
- **Option B: Redis with GEO module**
  - **Ideal Use Case:** Ultra-fast, ephemeral tracking of live entities (e.g., driver locations in ride-sharing apps) where the primary query is `GEORADIUS` (e.g., "drivers within 3 km").
  - **Why it fails for GeoBeacon:** Redis GEO relies on Geohashes stored in Sorted Sets. It does not natively support arbitrary polygonal or bounding-box queries required for MapLibre viewports. Additionally, it lacks relational querying, making it impossible to perform combined spatial and metadata filtering (e.g., "incidents within BBox AND severity > 3") without complex application-level logic.
- **Option C: Distributed Document Store (Elasticsearch / MongoDB)**
  - **Ideal Use Case:** Log analytics and full-text search enriched with basic spatial metadata (e.g., searching for keywords within a geographical area).
  - **Why it fails for GeoBeacon:** While Elasticsearch supports `geo_shape` queries, it is an eventually consistent system optimized for search read-heavy workloads rather than high-frequency, transactional UPSERTs of individual records. Its lack of mature GIS standards and relational joins disqualifies it as a primary source of truth.

## 3. Decision & Justification

We decided to adopt **PostgreSQL with PostGIS** as the primary source of truth for spatial data. Redis GEO and Document Stores are rejected for this role, though Redis may be evaluated later strictly as an ephemeral cache if read loads require it.

**Data Modeling and Query Justification:**

- **Storage Type:** Incident locations will be stored using the `geography(Point, 4326)` column type. This guarantees that distance calculations (e.g., 50km alert radii) are accurately computed over the Earth's sphere in meters using `ST_DWithin`.
- **Viewport Filtering & Index Alignment:** MapLibre read queries will cast the `geography` column to `geometry` on the fly to utilize the fast `&&` bounding box operator. **Crucially**, casting a column at query time bypasses standard indexes on the raw column. To ensure the PostgreSQL query planner uses a GiST index instead of falling back to a `Seq Scan`, we explicitly define a **Functional Index** on the cast expression: `CREATE INDEX ... USING GIST ((location::geometry))`.

**Ingestion and Idempotency:**
To handle worker crashes and retries securely, we mandate a `UNIQUE(source_id)` constraint on the `incidents` table. Workers will execute a transactional UPSERT (`ON CONFLICT (source_id) DO UPDATE`).
To prevent out-of-order or delayed messages from overwriting newer data, the worker relies on the external source timestamp (cursor). The UPSERT logic strictly enforces: `WHERE incidents.source_timestamp < EXCLUDED.source_timestamp`.

## 4. Edge Cases / When it breaks

This architecture is designed for current ingestion and read loads but will face limitations under the following conditions:

1. **Massive Bounding Box Queries:** If a client requests a bounding box covering an entire hemisphere containing millions of points, the query will return a massive payload, crashing the client and spiking database memory. We must enforce strict API-level pagination or maximum return limits, eventually requiring PostGIS-level spatial clustering if zoomed out.
2. **Write Contention:** At extreme ingestion scales (e.g., 10,000+ points/sec), transaction locking on UPSERTs may become a bottleneck. We would need to introduce batching or decouple ingestion into a faster write-ahead log.

## 5. Consequences

Adopting PostGIS imposes strict technical disciplines on the team:

- **Metric Distances:** All distance-based alerts and queries must be explicitly calculated in meters (not degrees), enforcing the use of the `geography` type for `ST_DWithin`.
- **Index Verification:** The team must not assume the GiST index is utilized. Every new spatial query must be verified using `EXPLAIN ANALYZE` in PostgreSQL to guarantee an `Index Scan` or `Bitmap Index Scan`. The presence of a `Seq Scan` is treated as a blocking bug.
- **Functional Index Awareness:** Developers must be aware that queries casting `location` to `geometry` for viewport filtering (`&&`) rely specifically on the functional index `(location::geometry)`.
- **Timestamp Reliance:** The database's consistency relies heavily on the accuracy of external source timestamps to prevent out-of-order overwrite anomalies during UPSERTs.
