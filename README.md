# Data Center Topology Viewer

Editable data center topology viewer with a React Flow frontend and FastAPI backend (front/back separated).

## Status
### Completed
- Editable nodes and edges (drag, connect, relabel, delete)
- Autosave to backend (SQLite) with manual save
- Multi-topology CRUD
- Auto layout (tiered, top-down with numeric tiers)
- Tier 1 topology generators: Leaf-Spine, Fat-Tree, 3-Tier
- Tier 2 topology generators: Expanded Clos, Core-and-Pod
- Tier 3 topology generators: 2D/3D Torus, Dragonfly, Butterfly, Mesh/Ring/Star
- Topology metadata persisted (type + params)

### Not Yet Implemented
- Validation rules per topology

## Setup

### Docker (frontend + backend)
```bash
docker compose up --build
```

### Backend
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev -- --host 0.0.0.0
```

Open `http://localhost:5173`.

### Proxy Target (Docker)
When running via docker compose, the frontend proxy target is set to `http://backend:8000`.
For local dev, it defaults to `http://127.0.0.1:8000`.

## API
- `GET /api/topologies` list topologies
- `POST /api/topologies` create topology
- `GET /api/topologies/{id}` get topology
- `PUT /api/topologies/{id}` update topology
- `DELETE /api/topologies/{id}` delete topology
- `POST /api/topologies/{id}/generate` generate Tier 1 topologies

Legacy single-topology endpoints (still supported):
- `GET /api/topology`
- `PUT /api/topology`

## Notes
- Data stored in `backend/topology.db` (SQLite).
- If you have an existing DB from older versions, delete `backend/topology.db` to pick up new columns.
