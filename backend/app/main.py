from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from .crud import (
    create_topology,
    delete_topology,
    get_or_create_default,
    get_topology,
    list_topologies,
    update_topology,
)
from .db import SessionLocal, engine
from .models import Base
from .schemas import (
    ArrangeRequest,
    BatchNodeCreate,
    EdgeCreate,
    EdgeUpdate,
    GenerateTopologyRequest,
    LayoutRequest,
    NodeCreate,
    NodeUpdate,
    TopologyCreate,
    TopologyPayload,
    TopologyResponse,
    TopologySummary,
)
from .topology_ops import (
    DEFAULT_PATCH_SPLIT,
    DEFAULT_TIER,
    KIND_LABEL,
    MAX_PATCH_SPLIT,
    MIN_PATCH_SPLIT,
    apply_auto_layout,
    arrange_nodes,
    build_edge,
    build_node,
    clamp_patch_split,
    read_topology_graph,
    topology_to_response,
    write_topology_graph,
)
from .topology_generators import (
    generate_butterfly,
    generate_core_and_pod,
    generate_dragonfly,
    generate_expanded_clos,
    generate_fat_tree,
    generate_leaf_spine,
    generate_mesh,
    generate_ring,
    generate_star,
    generate_three_tier,
    generate_torus_2d,
    generate_torus_3d,
)

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Topology Viewer API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_topology_or_404(db: Session, topology_id: int):
    topology = get_topology(db, topology_id)
    if not topology:
        raise HTTPException(status_code=404, detail="Topology not found")
    return topology


def commit_topology(db: Session, topology):
    db.commit()
    db.refresh(topology)
    return topology_to_response(topology)


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/meta")
def read_api_meta():
    return {
        "node_kinds": list(KIND_LABEL.keys()),
        "node_kind_labels": KIND_LABEL,
        "default_tiers": DEFAULT_TIER,
        "patch_panel_limits": {
            "min": MIN_PATCH_SPLIT,
            "default": DEFAULT_PATCH_SPLIT,
            "max": MAX_PATCH_SPLIT,
        },
        "topology_types": [
            "custom",
            "leaf-spine",
            "fat-tree",
            "three-tier",
            "expanded-clos",
            "core-and-pod",
            "torus-2d",
            "torus-3d",
            "dragonfly",
            "butterfly",
            "mesh",
            "ring",
            "star",
        ],
        "arrange_modes": [
            "left",
            "right",
            "top",
            "bottom",
            "distribute-horizontal",
            "distribute-vertical",
        ],
        "edge_handles": [
            "top-out",
            "bottom-out",
            "left-out",
            "right-out",
            "top-in",
            "bottom-in",
            "left-in",
            "right-in",
        ],
    }


@app.get("/api/topology", response_model=TopologyResponse)
def read_topology(db: Session = Depends(get_db)):
    topology = get_or_create_default(db)
    return topology_to_response(topology)


@app.put("/api/topology", response_model=TopologyResponse)
def write_topology(payload: TopologyPayload, db: Session = Depends(get_db)):
    topology = get_or_create_default(db)
    topology = update_topology(db, topology, payload)
    return topology_to_response(topology)


@app.get("/api/topologies", response_model=list[TopologySummary])
def read_topologies(db: Session = Depends(get_db)):
    items = list_topologies(db)
    return [{"id": item.id, "name": item.name, "updated_at": item.updated_at} for item in items]


@app.post("/api/topologies", response_model=TopologyResponse)
def create_topology_endpoint(payload: TopologyCreate, db: Session = Depends(get_db)):
    topology = create_topology(db, payload)
    return topology_to_response(topology)


@app.get("/api/topologies/{topology_id}", response_model=TopologyResponse)
def read_topology_by_id(topology_id: int, db: Session = Depends(get_db)):
    topology = get_topology_or_404(db, topology_id)
    return topology_to_response(topology)


@app.put("/api/topologies/{topology_id}", response_model=TopologyResponse)
def write_topology_by_id(topology_id: int, payload: TopologyPayload, db: Session = Depends(get_db)):
    topology = get_topology_or_404(db, topology_id)
    topology = update_topology(db, topology, payload)
    return topology_to_response(topology)


@app.delete("/api/topologies/{topology_id}")
def delete_topology_by_id(topology_id: int, db: Session = Depends(get_db)):
    topology = get_topology_or_404(db, topology_id)
    delete_topology(db, topology)
    return {"status": "deleted"}


@app.post("/api/topologies/{topology_id}/generate", response_model=TopologyResponse)
def generate_topology(topology_id: int, payload: GenerateTopologyRequest, db: Session = Depends(get_db)):
    topology = get_topology_or_404(db, topology_id)

    topo_type = payload.topo_type
    params = payload.params or {}
    edge_label = params.get("edge_label", "link")
    try:
        if topo_type == "leaf-spine":
            result = generate_leaf_spine(
                params.get("spines", 2),
                params.get("leaves", 4),
                params.get("spine_kind", "switch"),
                params.get("leaf_kind", "switch"),
                edge_label,
            )
        elif topo_type == "fat-tree":
            result = generate_fat_tree(
                params.get("k", 4),
                params.get("core_kind", "switch"),
                params.get("agg_kind", "switch"),
                params.get("edge_kind", "switch"),
                edge_label,
            )
        elif topo_type == "three-tier":
            result = generate_three_tier(
                params.get("core", 2),
                params.get("aggregation", 4),
                params.get("access", 6),
                params.get("core_kind", "switch"),
                params.get("agg_kind", "switch"),
                params.get("access_kind", "switch"),
                edge_label,
            )
        elif topo_type == "expanded-clos":
            result = generate_expanded_clos(
                params.get("tiers", 4),
                params.get("nodes_per_tier", 4),
                params.get("kind", "switch"),
                edge_label,
            )
        elif topo_type == "core-and-pod":
            result = generate_core_and_pod(
                params.get("cores", 2),
                params.get("pods", 2),
                params.get("pod_leaves", 4),
                params.get("pod_aggs", 2),
                params.get("core_kind", "switch"),
                params.get("agg_kind", "switch"),
                params.get("leaf_kind", "switch"),
                edge_label,
            )
        elif topo_type == "torus-2d":
            result = generate_torus_2d(
                params.get("rows", 3),
                params.get("cols", 3),
                params.get("kind", "switch"),
                edge_label,
            )
        elif topo_type == "torus-3d":
            result = generate_torus_3d(
                params.get("x", 3),
                params.get("y", 3),
                params.get("z", 3),
                params.get("kind", "switch"),
                edge_label,
            )
        elif topo_type == "dragonfly":
            result = generate_dragonfly(
                params.get("groups", 3),
                params.get("routers_per_group", 4),
                params.get("kind", "switch"),
                edge_label,
            )
        elif topo_type == "butterfly":
            result = generate_butterfly(
                params.get("stages", 4),
                params.get("width", 4),
                params.get("kind", "switch"),
                edge_label,
            )
        elif topo_type == "mesh":
            result = generate_mesh(
                params.get("rows", 3),
                params.get("cols", 3),
                params.get("kind", "switch"),
                edge_label,
            )
        elif topo_type == "ring":
            result = generate_ring(params.get("count", 6), params.get("kind", "switch"), edge_label)
        elif topo_type == "star":
            result = generate_star(params.get("count", 6), params.get("kind", "switch"), edge_label)
        else:
            raise HTTPException(status_code=400, detail="Unsupported topology type")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    topology.name = payload.name or topology.name
    write_topology_graph(
        topology,
        topo_type=result.topo_type,
        topo_params=result.params,
        nodes=result.nodes,
        edges=result.edges,
    )
    return commit_topology(db, topology)


@app.post("/api/topologies/{topology_id}/nodes", response_model=TopologyResponse)
def create_node_endpoint(topology_id: int, payload: NodeCreate, db: Session = Depends(get_db)):
    topology = get_topology_or_404(db, topology_id)
    topo_params, nodes, edges = read_topology_graph(topology)
    nodes.append(
        build_node(
            existing_nodes=nodes,
            kind=payload.kind,
            label=payload.label,
            tier=payload.tier,
            split_count=payload.splitCount,
            position=payload.position.model_dump() if payload.position else None,
            layout=payload.layout,
            node_id=payload.id,
            topo_type=topology.topo_type,
        )
    )
    write_topology_graph(topology, topo_params=topo_params, nodes=nodes, edges=edges)
    return commit_topology(db, topology)


@app.post("/api/topologies/{topology_id}/nodes/batch", response_model=TopologyResponse)
def create_nodes_batch(topology_id: int, payload: BatchNodeCreate, db: Session = Depends(get_db)):
    topology = get_topology_or_404(db, topology_id)
    topo_params, nodes, edges = read_topology_graph(topology)
    count = max(1, int(payload.count))
    tier = max(1, int(payload.tier))
    existing_nodes = list(nodes)
    new_nodes = []
    for index in range(count):
        new_nodes.append(
            build_node(
                existing_nodes=existing_nodes + new_nodes,
                kind=payload.kind,
                tier=tier,
                split_count=payload.splitCount,
                position={"x": 120 + (len(existing_nodes) + index) * 30, "y": 120 + (len(existing_nodes) + index) * 20},
                topo_type=topology.topo_type,
            )
        )
    nodes.extend(new_nodes)

    if payload.connect_to_lower_tier:
        lower_tiers = [
            node_tier
            for node_tier in [((node.get("data") or {}).get("tier")) for node in existing_nodes]
            if isinstance(node_tier, int) and node_tier < tier
        ]
        if lower_tiers:
            lower_tier = max(lower_tiers)
            lower_nodes = [node for node in existing_nodes if (node.get("data") or {}).get("tier") == lower_tier]
            for new_node in new_nodes:
                for lower_node in lower_nodes:
                    edges.append(
                        build_edge(
                            source=new_node["id"],
                            target=lower_node["id"],
                            label=topo_params.get("edge_label", "link"),
                            edge_id=f"e-custom-{new_node['id']}-{lower_node['id']}",
                        )
                    )

    write_topology_graph(topology, topo_params=topo_params, nodes=nodes, edges=edges)
    return commit_topology(db, topology)


@app.patch("/api/topologies/{topology_id}/nodes/{node_id}", response_model=TopologyResponse)
def update_node_endpoint(topology_id: int, node_id: str, payload: NodeUpdate, db: Session = Depends(get_db)):
    topology = get_topology_or_404(db, topology_id)
    topo_params, nodes, edges = read_topology_graph(topology)
    target = next((node for node in nodes if node["id"] == node_id), None)
    if not target:
        raise HTTPException(status_code=404, detail="Node not found")

    data = target.setdefault("data", {})
    previous_kind = data.get("kind")
    updates = payload.model_dump(exclude_unset=True)
    if "position" in updates:
        target["position"] = updates.pop("position")
    if "label" in updates:
        data["label"] = updates.pop("label")
    if "kind" in updates:
        data["kind"] = updates.pop("kind")
    if "tier" in updates:
        data["tier"] = int(updates.pop("tier"))
    if "layout" in updates:
        data["layout"] = updates.pop("layout")
    if payload.splitCount is not None or data.get("kind") == "patch" or previous_kind == "patch":
        if data.get("kind") == "patch":
            data["splitCount"] = clamp_patch_split(payload.splitCount if payload.splitCount is not None else data.get("splitCount"))
        else:
            data.pop("splitCount", None)

    write_topology_graph(topology, topo_params=topo_params, nodes=nodes, edges=edges)
    return commit_topology(db, topology)


@app.delete("/api/topologies/{topology_id}/nodes/{node_id}", response_model=TopologyResponse)
def delete_node_endpoint(topology_id: int, node_id: str, db: Session = Depends(get_db)):
    topology = get_topology_or_404(db, topology_id)
    topo_params, nodes, edges = read_topology_graph(topology)
    next_nodes = [node for node in nodes if node["id"] != node_id]
    if len(next_nodes) == len(nodes):
        raise HTTPException(status_code=404, detail="Node not found")
    next_edges = [edge for edge in edges if edge["source"] != node_id and edge["target"] != node_id]
    write_topology_graph(topology, topo_params=topo_params, nodes=next_nodes, edges=next_edges)
    return commit_topology(db, topology)


@app.post("/api/topologies/{topology_id}/edges", response_model=TopologyResponse)
def create_edge_endpoint(topology_id: int, payload: EdgeCreate, db: Session = Depends(get_db)):
    topology = get_topology_or_404(db, topology_id)
    topo_params, nodes, edges = read_topology_graph(topology)
    node_ids = {node["id"] for node in nodes}
    if payload.source not in node_ids or payload.target not in node_ids:
        raise HTTPException(status_code=400, detail="Edge source/target must reference existing nodes")
    edges.append(
        build_edge(
            source=payload.source,
            target=payload.target,
            label=payload.label,
            edge_id=payload.id,
            source_handle=payload.sourceHandle,
            target_handle=payload.targetHandle,
        )
    )
    write_topology_graph(topology, topo_params=topo_params, nodes=nodes, edges=edges)
    return commit_topology(db, topology)


@app.patch("/api/topologies/{topology_id}/edges/{edge_id}", response_model=TopologyResponse)
def update_edge_endpoint(topology_id: int, edge_id: str, payload: EdgeUpdate, db: Session = Depends(get_db)):
    topology = get_topology_or_404(db, topology_id)
    topo_params, nodes, edges = read_topology_graph(topology)
    target = next((edge for edge in edges if edge["id"] == edge_id), None)
    if not target:
        raise HTTPException(status_code=404, detail="Edge not found")
    updates = payload.model_dump(exclude_unset=True)
    if "label" in updates:
        target["label"] = updates["label"]
    if "sourceHandle" in updates:
        target["sourceHandle"] = updates["sourceHandle"]
    if "targetHandle" in updates:
        target["targetHandle"] = updates["targetHandle"]
    write_topology_graph(topology, topo_params=topo_params, nodes=nodes, edges=edges)
    return commit_topology(db, topology)


@app.delete("/api/topologies/{topology_id}/edges/{edge_id}", response_model=TopologyResponse)
def delete_edge_endpoint(topology_id: int, edge_id: str, db: Session = Depends(get_db)):
    topology = get_topology_or_404(db, topology_id)
    topo_params, nodes, edges = read_topology_graph(topology)
    next_edges = [edge for edge in edges if edge["id"] != edge_id]
    if len(next_edges) == len(edges):
        raise HTTPException(status_code=404, detail="Edge not found")
    write_topology_graph(topology, topo_params=topo_params, nodes=nodes, edges=next_edges)
    return commit_topology(db, topology)


@app.post("/api/topologies/{topology_id}/layout", response_model=TopologyResponse)
def layout_topology(topology_id: int, payload: LayoutRequest, db: Session = Depends(get_db)):
    topology = get_topology_or_404(db, topology_id)
    topo_params, nodes, edges = read_topology_graph(topology)
    nodes = apply_auto_layout(nodes, edges, topology.topo_type, topo_params, payload.end_gap)
    write_topology_graph(topology, topo_params=topo_params, nodes=nodes, edges=edges)
    return commit_topology(db, topology)


@app.post("/api/topologies/{topology_id}/arrange", response_model=TopologyResponse)
def arrange_topology_nodes(topology_id: int, payload: ArrangeRequest, db: Session = Depends(get_db)):
    topology = get_topology_or_404(db, topology_id)
    topo_params, nodes, edges = read_topology_graph(topology)
    nodes = arrange_nodes(nodes, payload.node_ids, payload.mode)
    write_topology_graph(topology, topo_params=topo_params, nodes=nodes, edges=edges)
    return commit_topology(db, topology)
