# API Guide

This document describes the backend API for the Data Center Topology Viewer.

Base URL:

- Local backend: `http://127.0.0.1:8000`
- Docker Compose backend: `http://127.0.0.1:8000`

Content type:

- Send JSON with `Content-Type: application/json`
- Responses are JSON

## Overview

The API has two usage styles:

- Full-topology CRUD: fetch or replace a whole topology document
- Agent-friendly graph operations: modify nodes, edges, layout, and arrangement incrementally

For AI agents, prefer the graph-operation endpoints. They are more stable than repeatedly replacing the full topology payload.

## Common Response Shape

Most topology endpoints return this shape:

```json
{
  "id": 1,
  "name": "Example Topology",
  "topo_type": "custom",
  "topo_params": {},
  "nodes": [],
  "edges": [],
  "updated_at": "2026-04-20T12:34:56.000000"
}
```

## Metadata

### `GET /api/health`

Health check.

Example:

```bash
curl http://127.0.0.1:8000/api/health
```

### `GET /api/meta`

Returns supported node kinds, topology types, patch panel limits, edge handles, and arrange modes.

Use this first if an AI agent needs to discover valid enums before writing data.

Example:

```bash
curl http://127.0.0.1:8000/api/meta
```

## Topology CRUD

### `GET /api/topologies`

List all topologies.

```bash
curl http://127.0.0.1:8000/api/topologies
```

### `POST /api/topologies`

Create a topology.

```bash
curl -X POST http://127.0.0.1:8000/api/topologies \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "Agent Workspace",
    "topo_type": "custom",
    "topo_params": {},
    "nodes": [],
    "edges": []
  }'
```

### `GET /api/topologies/{id}`

Fetch one topology.

```bash
curl http://127.0.0.1:8000/api/topologies/1
```

### `PUT /api/topologies/{id}`

Replace the full topology document.

This is useful for import/sync workflows, but not ideal for step-by-step agent editing.

```bash
curl -X PUT http://127.0.0.1:8000/api/topologies/1 \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "Imported Topology",
    "topo_type": "custom",
    "topo_params": {},
    "nodes": [],
    "edges": []
  }'
```

### `DELETE /api/topologies/{id}`

Delete a topology.

```bash
curl -X DELETE http://127.0.0.1:8000/api/topologies/1
```

## Legacy Single-Topology Endpoints

These are still available:

- `GET /api/topology`
- `PUT /api/topology`

They operate on the default topology record.

## Topology Generation

### `POST /api/topologies/{id}/generate`

Generate a topology from a supported topology type and parameter set.

Supported `topo_type` values:

- `leaf-spine`
- `fat-tree`
- `three-tier`
- `expanded-clos`
- `core-and-pod`
- `torus-2d`
- `torus-3d`
- `dragonfly`
- `butterfly`
- `mesh`
- `ring`
- `star`

Example:

```bash
curl -X POST http://127.0.0.1:8000/api/topologies/1/generate \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "Generated Leaf-Spine",
    "topo_type": "leaf-spine",
    "params": {
      "spines": 2,
      "leaves": 4,
      "spine_kind": "switch",
      "leaf_kind": "switch",
      "edge_label": "uplink"
    }
  }'
```

## Node Operations

### `POST /api/topologies/{id}/nodes`

Add one node.

Fields:

- `kind`: `rack`, `switch`, `server`, `asic`, `patch`
- `label`: optional
- `tier`: optional
- `splitCount`: only meaningful for `patch`
- `position`: optional `{ "x": number, "y": number }`
- `layout`: optional `tree` or `grid`
- `id`: optional custom node ID

Example:

```bash
curl -X POST http://127.0.0.1:8000/api/topologies/1/nodes \
  -H 'Content-Type: application/json' \
  -d '{
    "kind": "patch",
    "tier": 2,
    "splitCount": 512,
    "label": "Patch Panel A"
  }'
```

### `POST /api/topologies/{id}/nodes/batch`

Batch-add nodes.

Fields:

- `kind`
- `tier`
- `count`
- `splitCount`
- `connect_to_lower_tier`: when `true`, connect new nodes to the nearest lower tier using the current `edge_label`

Example:

```bash
curl -X POST http://127.0.0.1:8000/api/topologies/1/nodes/batch \
  -H 'Content-Type: application/json' \
  -d '{
    "kind": "server",
    "tier": 1,
    "count": 8,
    "connect_to_lower_tier": false
  }'
```

### `PATCH /api/topologies/{id}/nodes/{node_id}`

Update one node.

Mutable fields:

- `label`
- `kind`
- `tier`
- `splitCount`
- `layout`
- `position`

Example:

```bash
curl -X PATCH http://127.0.0.1:8000/api/topologies/1/nodes/node-123 \
  -H 'Content-Type: application/json' \
  -d '{
    "label": "Core Switch 1",
    "tier": 3,
    "position": { "x": 220, "y": 120 }
  }'
```

### `DELETE /api/topologies/{id}/nodes/{node_id}`

Delete one node. Connected edges are also removed.

```bash
curl -X DELETE http://127.0.0.1:8000/api/topologies/1/nodes/node-123
```

## Edge Operations

### `POST /api/topologies/{id}/edges`

Add one edge.

Fields:

- `source`
- `target`
- `label`
- `sourceHandle`
- `targetHandle`
- `id`

Example:

```bash
curl -X POST http://127.0.0.1:8000/api/topologies/1/edges \
  -H 'Content-Type: application/json' \
  -d '{
    "source": "core-1",
    "target": "leaf-1",
    "label": "uplink",
    "sourceHandle": "bottom-out",
    "targetHandle": "top-in"
  }'
```

### `PATCH /api/topologies/{id}/edges/{edge_id}`

Update one edge.

Mutable fields:

- `label`
- `sourceHandle`
- `targetHandle`

Example:

```bash
curl -X PATCH http://127.0.0.1:8000/api/topologies/1/edges/edge-123 \
  -H 'Content-Type: application/json' \
  -d '{
    "label": "downlink"
  }'
```

### `DELETE /api/topologies/{id}/edges/{edge_id}`

Delete one edge.

```bash
curl -X DELETE http://127.0.0.1:8000/api/topologies/1/edges/edge-123
```

## Layout and Arrangement

### `POST /api/topologies/{id}/layout`

Apply backend auto-layout.

Fields:

- `end_gap`: boolean

Example:

```bash
curl -X POST http://127.0.0.1:8000/api/topologies/1/layout \
  -H 'Content-Type: application/json' \
  -d '{
    "end_gap": true
  }'
```

### `POST /api/topologies/{id}/arrange`

Align or distribute selected nodes.

Supported `mode` values:

- `left`
- `right`
- `top`
- `bottom`
- `distribute-horizontal`
- `distribute-vertical`

Example:

```bash
curl -X POST http://127.0.0.1:8000/api/topologies/1/arrange \
  -H 'Content-Type: application/json' \
  -d '{
    "node_ids": ["node-a", "node-b", "node-c"],
    "mode": "distribute-horizontal"
  }'
```

## Agent Workflow Recommendation

Recommended sequence for an AI agent:

1. `GET /api/meta`
2. `GET /api/topologies` or `POST /api/topologies`
3. `POST /api/topologies/{id}/generate` if starting from a known topology template
4. Use node and edge APIs for incremental edits
5. `POST /api/topologies/{id}/layout` after structural changes
6. `GET /api/topologies/{id}` to verify final state

## Error Handling

Common status codes:

- `200 OK`: success
- `400 Bad Request`: invalid payload or unsupported topology type
- `404 Not Found`: topology, node, or edge does not exist
- `422 Unprocessable Entity`: request body failed schema validation

## Notes

- Patch panel `splitCount` is clamped by the backend. Current supported range is exposed by `GET /api/meta`.
- Edge handles are normalized by the backend. For example, `top` becomes `top-in` or `top-out` depending on role.
- For agent automation, prefer small graph operations over whole-document replacement.
