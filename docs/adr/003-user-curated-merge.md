# ADR-003: User-curated merge instead of auto-resolve

Status: accepted (from PRD v0.3)

When the same record changed on two sides, the app shows A (local) vs B (cloud) side by side
and the user picks: keep A / keep B / keep both.

Why: maintenance data is operational. A silently "last-write-wins" overwrite can hide a
breakdown status or a wrong checklist. Trade-off: more UI work and a user decision per conflict,
acceptable because conflicts are rare in v1 (batch sync, small teams).
