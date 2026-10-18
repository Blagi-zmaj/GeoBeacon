# ADR 0003: Single Incidents Table with PostGIS Spatial Queries and H3 Aggregation

**Date:** 2026-10-18  
**Status:** Accepted

## 1. Problem

GeoBeacon stores the current state of point-based environmental incidents and requires highly performant read patterns across multiple zoom levels without tracking historical movements. The system must satisfy three primary read requirements:

1. Viewport Bounding Box (BBox) filtering for high zoom levels.
2. Heatmap aggregation for low zoom levels, scaling efficiently to tens of thousands of active incidents.
3. Radial alerts using `ST_DWithin`.

The challenge is providing fast heatmap clustering on low zoom levels without starving the database CPU or introducing complex eventual consistency mechanisms, all while sustaining an ingestion rate of approximately 20 UPSERTs per second.

## 2. Considered Options

- **Option A: One table with aggregation at query time (On-the-fly)**
  - **Ideal Use Case:** Small datasets where on-the-fly spatial clustering (e.g., KMeans, DBSCAN) is computationally cheap.
  - **Why it fails for GeoBeacon:** Clustering costs scale directly with the number of points and the zoom level. Executing these calculations dynamically during heavy pan/zoom actions risks database CPU starvation and unpredictable latencies.
- **Option B: Main table plus materialized views (Spatial Pre-aggregation)**
  - **Ideal Use Case:** Read-heavy systems where stale data (eventual consistency) is acceptable and read patterns are highly predictable.
  - **Why it fails for GeoBeacon:** Introduces eventual consistency (lag), meaning users might see stale heatmap data while BBox data remains fresh. It also requires a complex refresh strategy and significantly increases maintenance overhead.
- **Option C: One table with PostGIS location and denormalized H3 cell indexes**
  - **Ideal Use Case:** Systems requiring real-time, low-latency aggregations over large spatial datasets by grouping on pre-calculated, discrete global grid identifiers.
  - **Pros/Cons:** Bypasses spatial clustering bottlenecks by using standard relational `GROUP BY` on a text/integer H3 column. Keeps a single source of truth. The tradeoff is increased worker complexity and payload size, as H3 cells must be calculated and kept in sync during ingestion.

## 3. Decision & Justification

We decided to adopt **Option C (One table with PostGIS location and denormalized H3 cell indexes)** as the unified spatial and aggregation store.

**Data Modeling and Query Justification:**

- **Storage & Indexing:** The `incidents` table will serve as the single source of truth. It will store a point location using `geography(Point, 4326)` and utilize a GiST index for viewport BBox and `ST_DWithin` alerts (aligning with ADR 0002).
- **Heatmap Aggregation:** We will store denormalized H3 identifiers dedicated solely to low-zoom heatmap aggregations. This allows the database to aggregate points in milliseconds using a standard relational `GROUP BY h3_resX` query, bypassing heavy spatial recalculations.

**Handling H3 Calculation & Resolution:**

- **Worker-Side Computation:** H3 cells will be calculated by the Node.js Worker pipeline using the `h3-js` library _before_ executing the UPSERT. This offloads CPU workload from the PostgreSQL instance and avoids relying on the `h3-pg` database extension, keeping the database image standard and portable.
- **Resolution Strategy (Multiple Columns):** We will store multiple, explicitly defined H3 resolutions (e.g., `h3_res3`, `h3_res5`) in dedicated columns rather than storing a single base cell and computing parents on the fly. This avoids database-side computation during reads. The API will dynamically select the appropriate `h3_resX` column based on the client's requested zoom level.

## 4. Edge Cases / When it breaks

This architecture is designed for the projected load but will trigger architectural reviews under the following concrete operational thresholds:

1. **Extreme Data Growth:** If the number of active records exceeds **500,000**, or if the heatmap query p95 latency consistently exceeds **200ms**, we will trigger a review to introduce a dedicated pre-aggregation layer (e.g., materialized views or a separate OLAP store).
2. **Write Contention:** If the ingestion rate spikes above **200 UPSERTs/second** for sustained periods, transaction locking may become a bottleneck, requiring the implementation of a write-ahead queue or batching mechanism in the worker.
3. **Complex Background Filtering:** Heatmap queries require filtering by Time, Status, or Viewport. When active incidents scale massively, standard indexes will not suffice. We will require composite indexes (e.g., `h3_res3 + type + severity`) to prevent `Seq Scan` fallbacks.
4. **Spatial Inconsistency Detection:** To detect inconsistencies between the `location` point and the denormalized `h3_resX` columns (due to potential worker logic bugs), we will implement a weekly worker-side data validation script that samples database records, re-calculates the H3 cells via `h3-js`, and alerts on any mismatches.

## 5. Consequences

Adopting denormalized H3 aggregation imposes strict technical disciplines on the team:

- **Resolution Coupling:** Defining and hardcoding the H3 resolution policy tightly couples the backend data model to the frontend MapLibre zoom behavior. Any changes to zoom UX may require database schema migrations to add new H3 resolution columns.
- **Transactional Consistency:** The Node.js worker must guarantee that any modification to an incident's location atomically updates all associated H3 cell identifiers in the same SQL statement to prevent spatial desynchronization.
- **Increased Payload & Storage:** Denormalizing multiple H3 resolutions per incident increases the storage footprint and the payload size managed by the worker during UPSERT operations.
- **Query Plan Expectations:** Developers must understand that heatmap queries combined with a viewport filter will utilize the GiST index on `location`, followed by an in-memory `HashAggregate` on the `h3_resX` column. We will _not_ create B-Tree indexes on the H3 columns themselves, as we do not filter (`WHERE`) directly by specific H3 cell strings.

## 6. Current Implementation & Migration Gap

This ADR describes the **target architecture**. The current system implementation differs from this design and requires a migration phase.

**Current State:**

- H3 cells are currently computed on-the-fly in PostgreSQL during the `GET /heatmap` read phase using the `h3` and `h3_postgis` extensions.
- Only a single, hardcoded resolution (resolution 4) is utilized.
- The Node.js worker does not compute H3 cells, nor does it write them to the database.
- The `source_timestamp` column exists in the schema (`backend/src/db/init.ts`), but the worker does not yet enforce protection against out-of-order updates during UPSERTs.

**Migration Plan:**

1. **Schema Update:** Run a database migration to add `h3_res3` (VARCHAR) and `h3_res5` (VARCHAR) columns to the `incidents` table. The `source_timestamp` column is already present and requires no structural migration.
2. **Worker Refactoring:** Update the Node.js ingestion pipeline to compute `h3_res3` and `h3_res5` using `h3-js`. Update the SQL UPSERT query to insert these values atomically and apply the `WHERE incidents.source_timestamp < EXCLUDED.source_timestamp` guard.
3. **API Refactoring:** Update the `GET /heatmap` endpoint to dynamically select the `h3_res3` or `h3_res5` column based on the requested zoom level, replacing the current on-the-fly SQL computation.
4. **Extension Deprecation:** Execute a formal, reversible database migration (`DROP EXTENSION IF EXISTS h3_postgis; DROP EXTENSION IF EXISTS h3;`) to remove the extensions after verifying no legacy views or functions depend on them. If backward compatibility is required for external analytical tools, these extensions may temporarily remain installed.
