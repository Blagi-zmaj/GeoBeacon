# ADR 0001: Use Fastify and ws for API and Real-Time Telemetry

**Date:** 2026-10-07
**Status:** Proposed

## 1. Problem

The GeoBeacon pipeline faces two distinct challenges:

1. Serving heavy initial geospatial datasets (e.g., thousands of geographic points for MapLibre) via standard HTTP.
2. Maintaining persistent, low-overhead connections for live telemetry updates.

The goal is to select a unified backend framework that provides strong type safety and routing for HTTP endpoints, while exposing a clean WebSocket layer, without assuming the framework will automatically optimize WebSocket payloads.

## 2. Considered Options

- **Option A: Express.js + Socket.io**
  - Viability: Highly viable due to a massive ecosystem and mature tooling.
  - Pros: Built-in fallback mechanisms (long-polling) and automatic broadcast/room features.
  - Cons: Express lacks built-in schema validation. Socket.io introduces proprietary framing and ping/pong overhead that is unnecessary for modern browsers with native WebSocket support.
- **Option B: Fastify + @fastify/websocket**
  - Viability: Fits the modern Node.js ecosystem with native async/await and schema-first design.
  - Pros: Fastify provides robust HTTP routing, schema validation, and excellent TypeScript integration. The `@fastify/websocket` plugin exposes the bare-metal `ws` library, offering standard WebSocket connections with minimal protocol overhead.
  - Cons: Payload serialization on the WebSocket layer is not optimized by Fastify and remains the developer's responsibility.
- **Option C: Managed Real-Time (e.g., AWS API Gateway WebSocket)**
  - Viability: Standard industry approach for offloading infrastructure management.
  - Pros: Zero infrastructure to maintain for real-time connections; built-in horizontal auto-scaling.
  - Cons: Introduces vendor lock-in and high recurring costs at scale, which directly conflicts with GeoBeacon's mandate for a self-hosted, open-source-friendly architecture.

## 3. Decision & Justification

We decided to adopt **Fastify with @fastify/websocket**.

The justification is based on operational control, protocol simplicity, and developer experience. Fastify provides the TypeScript integration and plugin ecosystem we need for HTTP APIs. For transport, `@fastify/websocket` gives us complete control over the WebSocket stream without proprietary abstractions.

**Architectural behavior for real-time updates:**

- **Delivery Semantics (Locations vs. Alerts):**
  - Locations: Follow a "latest position wins" model. Coalescence occurs in the Node.js application memory (using a `Map<IncidentId, Payload>`). We bound memory by monitoring TCP backpressure (`ws.bufferedAmount`); if the buffer grows too large, we drop stale location updates.
  - Alerts: Require guaranteed delivery. Clients must fetch missed alerts via a dedicated HTTP REST endpoint immediately upon reconnecting.
- **Authentication & Reconnect:**
  - Auth is performed via a short-lived token during the initial HTTP upgrade request.
  - Synchronization: Upon reconnecting, the client fetches a full HTTP snapshot to synchronize state. To prevent a race condition where a stale HTTP snapshot overwrites a newer WS update received during the fetch, the client will reject snapshot records with source timestamps older than its currently held data.

## 4. Edge Cases / When it breaks

**Initial Operating Envelope:** This architecture is designed for a single-instance deployment handling 2,000 concurrent connections, up to 20 updates per second, with an average payload size of <1KB.

The system will hit its limits under the following conditions:

1. **CPU-Bound Event Loop Blocking:** Node.js is single-threaded. While PostGIS handles heavy database-level spatial queries, performing intensive application-level data transformations before broadcasting will block the event loop, causing ping timeouts. We must monitor Event Loop Lag to detect this.
2. **Horizontal Scaling & Fan-out:** When load exceeds the connection or memory limits of a single instance, we must scale horizontally. This will require evaluating and introducing a shared fan-out mechanism (e.g., Redis Pub/Sub, NATS). This decision is deferred to a future ADR.
3. **Network Partitions (Split-Brain):** If the future fan-out mechanism disconnects, local instances will enter a degraded state, broadcasting only local updates. The server must notify clients of this degradation and force a full HTTP sync once the fan-out connection is restored.

## 5. Consequences

Adopting this architecture imposes specific operational duties on the development team. While Fastify optimizes HTTP response serialization via `fast-json-stringify`, this mechanism is bypassed once a connection is upgraded to a WebSocket. Consequently, the team is fully responsible for manually implementing, optimizing, and monitoring the payload serialization for the real-time WebSocket stream to prevent CPU bottlenecks.
