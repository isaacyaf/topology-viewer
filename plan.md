# Topology Scope Plan

## Goal
Focus on tree / CLOS-style topologies that are common in data center networks, and define optional add-ons that are useful for visualization but not required for the first release.

## Scope Summary
### Tier 1 (must-have)
1) Leaf-Spine (2-tier folded Clos)
   - Standard DC fabric; leaves connect to spines.
2) Fat-Tree (k-ary, 3-tier folded Clos)
   - Pods with edge + aggregation; core on top.
3) 3-Tier Tree (Core / Aggregation / Access)
   - Traditional enterprise DC hierarchy.

### Tier 2 (optional, aligned with CLOS)
4) Expanded Clos (multi-stage)
   - More than 3 tiers for larger fabrics.
5) Core-and-Pod (core + repeated pods)
   - Growth model; pods repeated under a core.

### Tier 3 (reference-only)
6) Torus (2D/3D grid with wrap-around)
7) Dragonfly
8) Butterfly (multi-stage)
9) Mesh / Ring / Star (generic network families)

## Notes from Topology Literature
- Fat-tree is a folded Clos topology with three layers (edge/aggregation/core) and k pods; each pod has k switches split between edge and aggregation. k is even. 
- Leaf-Spine naming aligns with the fat-tree levels (leaf at bottom, spine/aggregation in the middle, core/ToF on top).
- 3-tier DC architecture is the classic core/aggregation/access hierarchy.
- Torus is a mesh with wrap-around links (2D or 3D), useful as a reference topology but not a CLOS variant.
- Dragonfly and Butterfly are HPC-style topologies; include as reference-only unless explicitly requested.

## Implementation Plan
### Phase 1: Data Model
- Node attributes: type, tier (numeric), role (leaf/spine/core/agg/access), pod id (optional).
- Edge attributes: type (uplink/downlink), capacity label.

### Phase 2: Layout Engine
- Top-down tiered layout (numeric tier descending).
- Leaf-Spine rule: connect each leaf to all spines.
- Fat-Tree rule: generate pods (edge+aggregation), connect to core.
- 3-Tier rule: connect access->aggregation->core with fanout.
- Expanded Clos: allow N tiers with per-tier fanout.

### Phase 3: UI Controls
- Topology selector: Leaf-Spine, Fat-Tree, 3-Tier, Expanded Clos.
- Parameters per topology:
  - Leaf-Spine: #spines, #leaves, oversubscription.
  - Fat-Tree: k (even), pods, servers per edge.
  - 3-Tier: #core, #agg, #access, fanout.
  - Expanded Clos: tier count, nodes per tier, fanout.

### Phase 4: Validation/Export
- Validate required connections based on topology rules.
- Export JSON with topology type + parameters + nodes/edges.

## Acceptance Criteria
- Users can generate Leaf-Spine and Fat-Tree layouts with one click.
- Layouts are top-down (higher tier above lower tier).
- Nodes align left-to-right within a tier.
- Export includes topology metadata.

## Progress Tracking
### Completed
- Tier 1 generators implemented: Leaf-Spine, Fat-Tree, 3-Tier
- Topology metadata storage (topo_type, topo_params)
- Generator API endpoint
- Frontend generator UI with parameter inputs
- Tiered auto layout (numeric tiers, top-down)
- Tier 2 generators implemented: Expanded Clos, Core-and-Pod
- Tier 3 generators implemented: 2D/3D Torus, Dragonfly, Butterfly, Mesh/Ring/Star

### In Progress / Pending
- Validation rules per topology (e.g., fat-tree k even)
- Export metadata (type + params) validation/consistency checks

### Not Started
