# 001 — Incidents in the Map Viewport

## User

A person monitoring environmental conditions on a public map.

## Problem

The user cannot quickly see which relevant incidents are located in the area currently displayed on the map.

## User capability

The user can open the map and see incidents inside the current viewport. For every returned incident, the map can show its location, title, type, severity, status, and last update time.

## Viewport contract

The API accepts four named WGS84 longitude/latitude boundaries:

```text
west, south, east, north
```

Longitude is expressed in `[-180, 180]`, latitude in `[-90, 90]`, and coordinate pairs use the usual GeoJSON/PostGIS order `longitude, latitude`.

When `west <= east`, the viewport is one rectangular area. When `west > east`, the viewport crosses the antimeridian and represents the union of two areas:

```text
[west, 180] ∪ [-180, east]
```

The API must query both areas and combine their results. The response limit or pagination applies to the combined result, not separately to each half.

The following input is invalid:

- longitude outside `[-180, 180]`;
- latitude outside `[-90, 90]`;
- `south >= north`;
- missing, non-numeric, or non-finite values.

Invalid input receives a documented client error. An antimeridian crossing is valid and must not be rejected merely because `west > east`.

## Status semantics

The canonical GeoBeacon statuses are:

- `active` — the incident is detected or considered ongoing;
- `closed` — no further action is expected for the incident.

The default viewport response should include `active` and exclude `closed` incidents. This default must remain explicit in the API contract.

NASA ingestion is a source of updates, not automatically the authority for operational status. The ingestion layer must preserve the source payload and map source values to canonical status only when the source contract supports that mapping. If NASA provides observations but no operational status, the mapping rules must be defined separately rather than presenting an inferred value as a confirmed operational state.

## Acceptance criteria

- The API accepts `west`, `south`, `east`, and `north`.
- The API returns only incidents whose locations are inside the requested viewport.
- A viewport crossing the antimeridian returns incidents from both sides of the split.
- Invalid coordinates and invalid boundary relationships return a documented client error.
- The response has an explicit limit or cursor-based pagination.
- The limit applies to the combined result of an antimeridian query.
- The default response excludes `closed` incidents and documents the status filter.
- The response includes location, title, type, severity, status, and `updated_at`.
- The frontend eventually exposes loading, empty, error, and success states.
- Selecting a point identifies the incident; full incident details belong to slice 002.
- An integration test proves that an incident outside the viewport is not returned.
- An integration test covers an antimeridian-crossing viewport.
- The spatial query has a checked `EXPLAIN ANALYZE` plan using the intended index.

## Large viewports and aggregation

The first version should return bounded incident records. It must not silently turn a synchronous detail request into an asynchronous worker job.

If a viewport contains too many records, the product needs an explicit aggregation mode, such as H3 cells or clustering. H3 aggregation is a separate contract because it returns cell counts or summaries instead of individual incidents. A worker may be introduced later if the product defines job creation, progress, failure, and result retrieval; it is not implied by a large viewport alone.

## Scope boundary

MapLibre, another map library, or a custom renderer is an implementation choice outside this slice. The slice first establishes the spatial API contract and verifies that a minimal frontend can consume it.

## Risks and open questions

- Is the current spatial model and query plan fast enough for the largest supported viewport?
- What is the maximum number of individual incidents that the map can render before aggregation is required?
- Is manual refresh sufficient for the first version, or is near-real-time delivery required?
- Which NASA source fields can legitimately drive status transitions?
