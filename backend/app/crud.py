import json
from datetime import datetime
from sqlalchemy.orm import Session

from .models import Topology
from .schemas import TopologyCreate, TopologyPayload
from .topology_generators import generate_leaf_spine


def _seed_topology() -> Topology:
    generated = generate_leaf_spine(2, 4, "switch", "switch")
    return Topology(
        name="Default Leaf-Spine 2x4",
        topo_type=generated.topo_type,
        topo_params_json=json.dumps(generated.params),
        nodes_json=json.dumps(generated.nodes),
        edges_json=json.dumps(generated.edges),
        updated_at=datetime.utcnow(),
    )


def list_topologies(db: Session) -> list[Topology]:
    items = db.query(Topology).order_by(Topology.id.asc()).all()
    if items:
        return items
    seed = _seed_topology()
    db.add(seed)
    db.commit()
    db.refresh(seed)
    return [seed]


def get_topology(db: Session, topology_id: int) -> Topology | None:
    return db.query(Topology).filter(Topology.id == topology_id).first()


def get_or_create_default(db: Session) -> Topology:
    topology = db.query(Topology).first()
    if topology:
        return topology
    seed = _seed_topology()
    db.add(seed)
    db.commit()
    db.refresh(seed)
    return seed


def create_topology(db: Session, payload: TopologyCreate) -> Topology:
    topology = Topology(
        name=payload.name,
        topo_type=payload.topo_type,
        topo_params_json=json.dumps(payload.topo_params),
        nodes_json=json.dumps(payload.nodes),
        edges_json=json.dumps(payload.edges),
        updated_at=datetime.utcnow(),
    )
    db.add(topology)
    db.commit()
    db.refresh(topology)
    return topology


def update_topology(db: Session, topology: Topology, payload: TopologyPayload) -> Topology:
    topology.name = payload.name
    topology.topo_type = payload.topo_type
    topology.topo_params_json = json.dumps(payload.topo_params)
    topology.nodes_json = json.dumps(payload.nodes)
    topology.edges_json = json.dumps(payload.edges)
    topology.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(topology)
    return topology


def delete_topology(db: Session, topology: Topology) -> None:
    db.delete(topology)
    db.commit()
