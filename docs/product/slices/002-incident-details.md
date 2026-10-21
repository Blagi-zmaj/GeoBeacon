# 002 — Incident Details

## User

A person who has selected an incident point on the map.

## Problem

A map point alone is not enough to judge an incident's meaning, recency, or provenance.

## User capability

The user can open incident details and see its type, severity, canonical status, last update time, source, and location.

## Acceptance criteria

- Details are available after selecting a map point.
- Details are also available through a stable direct URL.
- The response exposes an explicit update time and source provenance.
- The response uses the canonical status values from slice 001: `active`, `in_progress`, `secured`, and `closed`.
- Missing data is clearly marked as unavailable rather than replaced with misleading placeholder values.
- The view handles an incident that was deleted, closed, or has become stale.
- The API contract has an integration test, including not-found behavior.
- The displayed location preserves the `longitude, latitude` coordinate order.

## Provenance and source status

Source observations and operational status are separate concepts. The API should expose enough provenance to distinguish a value received from NASA from a value derived by GeoBeacon. If the source does not provide an operational status, the UI must not imply that an inferred status was directly confirmed by NASA.

## Risks and open questions

- Which fields are required for a user to consider an incident trustworthy?
- How should the UI communicate the difference between observation time, ingestion time, and `updated_at`?
- What freshness threshold makes an incident stale for each source?
- Which status transitions are allowed, and can a `secured` incident become `active` again?
