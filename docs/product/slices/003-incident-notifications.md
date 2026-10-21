# 003 — Incident Notifications

## User

A person monitoring a selected environmental area.

## Problem

The user may miss a new, important incident because they are not watching the map continuously.

## User capability

The user can:

- enable notifications for a selected area;
- set a minimum severity level;
- receive a notification when a new, verified incident meets those conditions;
- open the notification and navigate to the incident details and map location.

## Acceptance criteria

- The user can explicitly enable and disable a subscription.
- An incident that does not meet the subscription criteria does not generate a notification.
- Reprocessing the same source event does not generate duplicate notifications.
- Clicking a notification opens the correct incident and positions the map at its location.
- Denying notification permission does not prevent normal map use.
- The notification contains the title, severity, update time, and source.
- The system can show whether a notification was created, sent, and handled after the user clicked it.
- A notification is emitted only when the product's definitions of "new" and "verified" are satisfied.

## Status and verification

The canonical statuses are `active`, `in_progress`, `secured`, and `closed`. Status is not the same as verification. A NASA observation may create or update an incident without proving that the incident has been independently verified or operationally handled.

The notification design must define whether notifications are allowed for each status. A reasonable first proposal is to notify for a newly verified `active` or `in_progress` incident, but this is a product decision that needs evidence from the intended user workflow.

## Idempotency and source events

The notification pipeline needs a stable source event or incident version key. It should record enough information to make retries safe and to distinguish a new observation from a repeated delivery of the same observation. Source timestamps and ingestion timestamps should remain separate.

## Risks and open questions

- What exactly makes an incident "new"?
- What evidence makes an incident "verified"?
- Which statuses can trigger notifications?
- How will duplicate deliveries and older source data be rejected?
- What does the user see when the notification provider is unavailable?
- Are push notifications required for the first release, or is periodic map refresh sufficient?
- Should a status transition, severity increase, or location change create another notification?
- MapLibre is an implementation detail. The notification contract depends first on the incident identity, provenance, status, and navigation URL.
