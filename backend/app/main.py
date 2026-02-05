import json
from datetime import datetime
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
from .schemas import TopologyCreate, TopologyPayload, TopologyResponse, TopologySummary
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


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/topology", response_model=TopologyResponse)
def read_topology(db: Session = Depends(get_db)):
    topology = get_or_create_default(db)
    return {
        "id": topology.id,
        "name": topology.name,
        "topo_type": topology.topo_type,
        "topo_params": json.loads(topology.topo_params_json),
        "nodes": json.loads(topology.nodes_json),
        "edges": json.loads(topology.edges_json),
        "updated_at": topology.updated_at,
    }


@app.put("/api/topology", response_model=TopologyResponse)
def write_topology(payload: TopologyPayload, db: Session = Depends(get_db)):
    topology = get_or_create_default(db)
    topology = update_topology(db, topology, payload)
    return {
        "id": topology.id,
        "name": topology.name,
        "topo_type": topology.topo_type,
        "topo_params": json.loads(topology.topo_params_json),
        "nodes": json.loads(topology.nodes_json),
        "edges": json.loads(topology.edges_json),
        "updated_at": topology.updated_at,
    }


@app.get("/api/topologies", response_model=list[TopologySummary])
def read_topologies(db: Session = Depends(get_db)):
    items = list_topologies(db)
    return [
        {"id": item.id, "name": item.name, "updated_at": item.updated_at} for item in items
    ]


@app.post("/api/topologies", response_model=TopologyResponse)
def create_topology_endpoint(
    payload: TopologyCreate, db: Session = Depends(get_db)
):
    topology = create_topology(db, payload)
    return {
        "id": topology.id,
        "name": topology.name,
        "topo_type": topology.topo_type,
        "topo_params": json.loads(topology.topo_params_json),
        "nodes": json.loads(topology.nodes_json),
        "edges": json.loads(topology.edges_json),
        "updated_at": topology.updated_at,
    }


@app.get("/api/topologies/{topology_id}", response_model=TopologyResponse)
def read_topology_by_id(topology_id: int, db: Session = Depends(get_db)):
    topology = get_topology(db, topology_id)
    if not topology:
        raise HTTPException(status_code=404, detail="Topology not found")
    return {
        "id": topology.id,
        "name": topology.name,
        "topo_type": topology.topo_type,
        "topo_params": json.loads(topology.topo_params_json),
        "nodes": json.loads(topology.nodes_json),
        "edges": json.loads(topology.edges_json),
        "updated_at": topology.updated_at,
    }


@app.put("/api/topologies/{topology_id}", response_model=TopologyResponse)
def write_topology_by_id(
    topology_id: int, payload: TopologyPayload, db: Session = Depends(get_db)
):
    topology = get_topology(db, topology_id)
    if not topology:
        raise HTTPException(status_code=404, detail="Topology not found")
    topology = update_topology(db, topology, payload)
    return {
        "id": topology.id,
        "name": topology.name,
        "topo_type": topology.topo_type,
        "topo_params": json.loads(topology.topo_params_json),
        "nodes": json.loads(topology.nodes_json),
        "edges": json.loads(topology.edges_json),
        "updated_at": topology.updated_at,
    }


@app.delete("/api/topologies/{topology_id}")
def delete_topology_by_id(topology_id: int, db: Session = Depends(get_db)):
    topology = get_topology(db, topology_id)
    if not topology:
        raise HTTPException(status_code=404, detail="Topology not found")
    delete_topology(db, topology)
    return {"status": "deleted"}


@app.post("/api/topologies/{topology_id}/generate", response_model=TopologyResponse)
def generate_topology(topology_id: int, payload: dict, db: Session = Depends(get_db)):
    topology = get_topology(db, topology_id)
    if not topology:
        raise HTTPException(status_code=404, detail="Topology not found")

    topo_type = payload.get("topo_type")
    params = payload.get("params") or {}
    if topo_type == "leaf-spine":
        result = generate_leaf_spine(
            params.get("spines", 2),
            params.get("leaves", 4),
            params.get("spine_kind", "switch"),
            params.get("leaf_kind", "switch"),
        )
    elif topo_type == "fat-tree":
        result = generate_fat_tree(
            params.get("k", 4),
            params.get("core_kind", "switch"),
            params.get("agg_kind", "switch"),
            params.get("edge_kind", "switch"),
        )
    elif topo_type == "three-tier":
        result = generate_three_tier(
            params.get("core", 2),
            params.get("aggregation", 4),
            params.get("access", 6),
            params.get("core_kind", "switch"),
            params.get("agg_kind", "switch"),
            params.get("access_kind", "switch"),
        )
    elif topo_type == "expanded-clos":
        result = generate_expanded_clos(
            params.get("tiers", 4),
            params.get("nodes_per_tier", 4),
            params.get("kind", "switch"),
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
        )
    elif topo_type == "torus-2d":
        result = generate_torus_2d(
            params.get("rows", 3),
            params.get("cols", 3),
            params.get("kind", "switch"),
        )
    elif topo_type == "torus-3d":
        result = generate_torus_3d(
            params.get("x", 3),
            params.get("y", 3),
            params.get("z", 3),
            params.get("kind", "switch"),
        )
    elif topo_type == "dragonfly":
        result = generate_dragonfly(
            params.get("groups", 3),
            params.get("routers_per_group", 4),
            params.get("kind", "switch"),
        )
    elif topo_type == "butterfly":
        result = generate_butterfly(
            params.get("stages", 4),
            params.get("width", 4),
            params.get("kind", "switch"),
        )
    elif topo_type == "mesh":
        result = generate_mesh(
            params.get("rows", 3),
            params.get("cols", 3),
            params.get("kind", "switch"),
        )
    elif topo_type == "ring":
        result = generate_ring(params.get("count", 6), params.get("kind", "switch"))
    elif topo_type == "star":
        result = generate_star(params.get("count", 6), params.get("kind", "switch"))
    else:
        raise HTTPException(status_code=400, detail="Unsupported topology type")

    topology.name = payload.get("name") or topology.name
    topology.topo_type = result.topo_type
    topology.topo_params_json = json.dumps(result.params)
    topology.nodes_json = json.dumps(result.nodes)
    topology.edges_json = json.dumps(result.edges)
    topology.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(topology)

    return {
        "id": topology.id,
        "name": topology.name,
        "topo_type": topology.topo_type,
        "topo_params": json.loads(topology.topo_params_json),
        "nodes": json.loads(topology.nodes_json),
        "edges": json.loads(topology.edges_json),
        "updated_at": topology.updated_at,
    }
