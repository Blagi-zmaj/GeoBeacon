# Mentor Learning System Update — Comparison

**Date:** 2026-10-20  
**Selected target:** Product fullstack engineer, with geospatial engineering as the primary specialization  
**Time budget:** 5–7 hours per week

This is a comparison summary, not the source of truth. The updated instructions live in `AGENTS.md` and `docs/mentor/`.

## Before → After

| File | Before | After |
| :--- | :----- | :---- |
| `AGENTS.md` | Senior Fullstack with AI and spatial skills treated as parallel goals; mandatory clarification and 2–3 learner-proposed options for every recommendation; every checkpoint gated on an ADR. | 12-month product fullstack goal with geospatial as the primary specialty and AI as product-driven follow-on; ask only materially useful questions; require an ADR only for consequential architecture decisions; judge progress using implementation and verification evidence. |
| `docs/mentor/PROTOCOL.md` | Every code review/feature completion/checkpoint required 3–5 questions, repeated retries, an ADR, ADR approval, then explanation. | Review depth matches task risk; learner attempt is followed by implementation evidence; ADRs apply to significant decisions only; a four-level rubric and retest plan record progress. |
| `docs/mentor/QUESTION_BANK.md` | Emphasis on architecture choices, distributed failure, scale hypotheticals, and spatial/realtime topics. | Adds product outcomes, vertical-slice scope, frontend/API/data flow, user states, security, tests, measured performance, deployment, operations, and senior communication while retaining spatial and failure questions. |
| `docs/mentor/PROGRESS.md` | A `Mastered >= 8/10` matrix and session scores without a consistent evidence rubric. | Records the 5–7 hour weekly budget, annual outcomes, evidence required for each competency, a four-level rubric, and retests; historical scores remain labeled as historical. |
| `docs/mentor/BOOKS.md` | Books described as the primary study material, with several broad infrastructure topics and unowned books. | Project work is the main curriculum; reading is targeted to current gaps and limited to about 0.5–1 hour weekly; owned books remain references and additional books are optional. |
| `docs/mentor/STAGE_QUESTIONS_ANSWERS.md` | Previous answers could be read as validated reference answers. | Preserved as an archive and explicitly labeled unverified material for retrieval practice. |
| `docs/mentor/QUESTIONS/Single-table-postgis-h3.md` | Question-and-answer file had no status indicating whether the answers were canonical. | Labeled as an archived case whose claims must be checked against code, query plans, and current documentation. |

## Annual Learning Shape

1. **Months 1–3:** A user-visible incident browsing slice across UI, API, and PostgreSQL.
2. **Months 4–6:** Reliable external-data ingestion with provenance, validation, and duplicate/out-of-order handling.
3. **Months 7–9:** Security, tests, bounded queries, deployment, observability, and a recovery exercise.
4. **Months 10–12:** Own a significant product change through verification and reflection; add AI only if the product need is concrete.

The target is demonstrated readiness in a bounded product context, not a guaranteed senior title or completion of GeoBeacon's full 2–3 year product vision.

## Git Visibility

`.gitignore` excludes the entire `docs/mentor/` directory, and its existing files are not tracked in the repository. I left that rule and those notes' tracking status unchanged. Consequently, their edits are present on disk but do not appear in `git diff`; this file provides the visible comparison summary. `AGENTS.md` and this summary are visible in Git status.
