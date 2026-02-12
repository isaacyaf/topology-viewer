# Topology Viewer PLAN

## 1) Goal

On top of the existing editable topology capabilities, complete three areas: rule validation, export consistency, and quality assurance, so the project is stable for demos and maintainable long-term.

## 2) Current Status

### Completed

- Topology CRUD (frontend + backend)
- Autosave and manual save
- Tiered auto layout (top-down)
- Tier 1 generators: Leaf-Spine, Fat-Tree, 3-Tier
- Tier 2 generators: Expanded Clos, Core-and-Pod
- Tier 3 reference topologies: Torus, Dragonfly, Butterfly, Mesh/Ring/Star
- Topology metadata persistence (`topo_type`, `topo_params`)

### High-Priority Gaps

- Validation for topology parameters and connection rules
- Export consistency and completeness checks
- Basic automated tests (API + generator core rules)

## 3) Execution Priority

1. Rule validation (prevent invalid data from entering the system)
2. Export consistency (ensure outputs are reliably consumable by other tools)
3. Automated testing (prevent regressions)
4. Documentation and demo flow improvements (reduce handover cost)
5. Operational readiness (security, observability, CI/CD)

## 4) Phased Plan

### Phase A: Rule Validation (1-2 days)

- Backend: Add topology-specific validation in generate/update flows
- Frontend: Add real-time parameter validation and error messages
- Minimum acceptance:
  - Fat-Tree `k` must be even
  - Count/tier/fanout parameters must meet reasonable lower bounds
  - Invalid parameters are blocked with clear error feedback

### Phase B: Export Consistency (1 day)

- Define export schema (required fields for type, params, nodes, edges)
- Add pre-export normalization (ID, tier, role, edge type)
- Minimum acceptance:
  - Exported JSON always includes `topo_type` and `topo_params`
  - Repeated exports of the same topology have consistent structure

### Phase C: Testing and Regression (1-2 days)

- Backend unit tests: generators and validators
- API tests: basic flows for `/api/topologies` and `/generate`
- Minimum acceptance:
  - Each core generator has at least 1 valid case + 1 invalid case
  - Key API happy paths pass

### Phase D: Documentation and Release Readiness (0.5-1 day)

- Update README: feature matrix, limitations, known issues
- Create demo checklist (create, generate, edit, save, export)
- Minimum acceptance:
  - A new team member can run local setup and complete the demo in 15 minutes

### Phase E: Operational Readiness (1-2 days)

- Security baseline:
  - Add request size limits and basic payload validation hardening
  - Restrict CORS origins by environment (dev vs prod)
- Observability baseline:
  - Structured backend logging (request id, status code, latency)
  - Error boundaries and user-facing error states in frontend
- CI baseline:
  - Add CI pipeline for lint + tests on pull requests
- Minimum acceptance:
  - CI runs automatically for PRs and blocks merge on failures
  - Key API errors are visible in logs with enough debugging context

### Phase F: Product Usability Improvements (1-2 days)

- Topology editing UX:
  - Multi-select and bulk actions (delete, tier update)
  - Safer destructive actions (confirmation + undo consistency)
- Data portability:
  - Add import JSON to complement export flow
  - Validate imported schema with actionable error messages
- Internationalization readiness:
  - Move all user-facing strings into locale resources
  - Add language fallback behavior for missing keys
- Minimum acceptance:
  - Users can import an exported topology without manual fixes
  - Major actions (delete/import/generate) provide clear success/error feedback

## 5) Milestones

1. M1: Validation Ready
   - Complete Phase A, with baseline parameter validation for all core topologies
2. M2: Export Stable
   - Complete Phase B, with stable and reproducible export fields
3. M3: QA Baseline
   - Complete Phase C, establishing a minimum automated test safety net
4. M4: Demo Ready
   - Complete Phase D, ready for stable external demos
5. M5: Ops Ready
   - Complete Phase E, with CI, logging, and security baseline
6. M6: Usability Upgrade
   - Complete Phase F, with import flow and key UX improvements

## 6) Risks and Mitigations

- Risk: Large differences across topology rules can fragment validation logic
  - Mitigation: Use a single validator entry point, dispatch by topology type
- Risk: Frontend/backend may interpret parameters differently
  - Mitigation: Define one schema as source of truth and share field definitions
- Risk: New topology additions may break existing behavior
  - Mitigation: Keep a minimum regression test per topology
- Risk: Growing feature set can increase UI complexity and user confusion
  - Mitigation: Define UX patterns for primary actions and keep interaction rules consistent
- Risk: Missing CI enforcement can allow regressions into main branch
  - Mitigation: Require PR checks (lint/tests) before merge

## 7) Definition of Done

- Users can reliably generate core DC topologies and receive clear validation feedback
- Export content is complete and consistent
- Key flows are covered by repeatable automated tests
- README and demo flow support handoff and external presentation
- CI, logging, and baseline security controls are in place
- Import/export round-trip works for supported topology types

## 8) Added Backlog Items (New)

1. API versioning and compatibility policy
   - Define `/api/v1` path strategy and deprecation rules for future changes.
2. Database migration workflow
   - Add migration tooling/process so schema changes are trackable and reversible.
3. Performance targets for large topologies
   - Set target limits (for example, node/edge counts) and verify load/edit/render performance.
4. Access control model (if external users are expected)
   - Plan authentication/authorization boundaries before multi-user deployment.
5. Release management
   - Tagging/changelog template and release checklist for repeatable delivery.
