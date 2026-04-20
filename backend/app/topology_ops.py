from __future__ import annotations

import json
from copy import deepcopy
from datetime import datetime
from math import ceil, sqrt
from uuid import uuid4

from .models import Topology

DEFAULT_TIER = {
    "switch": 3,
    "rack": 2,
    "server": 1,
    "asic": 1,
    "patch": 2,
}

KIND_LABEL = {
    "rack": "Rack",
    "switch": "Switch",
    "server": "Server",
    "asic": "ASIC",
    "patch": "Patch Panel",
}

NON_TREE_TYPES = {
    "torus-2d",
    "torus-3d",
    "dragonfly",
    "butterfly",
    "mesh",
    "ring",
    "star",
}

FALLBACK_NODE_WIDTH = 164
FALLBACK_NODE_HEIGHT = 60
MIN_PATCH_SPLIT = 2
DEFAULT_PATCH_SPLIT = 8
MAX_PATCH_SPLIT = 1024


def topology_to_response(topology: Topology) -> dict:
    return {
        "id": topology.id,
        "name": topology.name,
        "topo_type": topology.topo_type,
        "topo_params": json.loads(topology.topo_params_json),
        "nodes": json.loads(topology.nodes_json),
        "edges": normalize_edges(json.loads(topology.edges_json)),
        "updated_at": topology.updated_at,
    }


def read_topology_graph(topology: Topology) -> tuple[dict, list[dict], list[dict]]:
    params = json.loads(topology.topo_params_json)
    nodes = json.loads(topology.nodes_json)
    edges = json.loads(topology.edges_json)
    return params, nodes, normalize_edges(edges)


def write_topology_graph(
    topology: Topology,
    *,
    topo_type: str | None = None,
    topo_params: dict | None = None,
    nodes: list[dict] | None = None,
    edges: list[dict] | None = None,
) -> None:
    if topo_type is not None:
        topology.topo_type = topo_type
    if topo_params is not None:
        topology.topo_params_json = json.dumps(topo_params)
    if nodes is not None:
        topology.nodes_json = json.dumps(nodes)
    if edges is not None:
        topology.edges_json = json.dumps(normalize_edges(edges))
    topology.updated_at = datetime.utcnow()


def is_non_tree_topology(topo_type: str) -> bool:
    return topo_type in NON_TREE_TYPES


def clamp_patch_split(split_count: int | None) -> int:
    return max(MIN_PATCH_SPLIT, min(MAX_PATCH_SPLIT, int(split_count or DEFAULT_PATCH_SPLIT)))


def normalize_handle(value: str | None, role: str) -> str:
    if not value:
        return "bottom-out" if role == "source" else "top-in"
    if value.endswith("-out") or value.endswith("-in"):
        return value
    if value in {"left", "right", "top", "bottom"}:
        suffix = "out" if role == "source" else "in"
        return f"{value}-{suffix}"
    return value


def normalize_edges(edges: list[dict]) -> list[dict]:
    normalized: list[dict] = []
    for edge in edges:
        next_edge = deepcopy(edge)
        next_edge["sourceHandle"] = normalize_handle(next_edge.get("sourceHandle"), "source")
        next_edge["targetHandle"] = normalize_handle(next_edge.get("targetHandle"), "target")
        normalized.append(next_edge)
    return normalized


def _node_label(kind: str, index: int) -> str:
    return f"{KIND_LABEL.get(kind, kind)} {index}"


def _node_tier(node: dict) -> int:
    data = node.get("data") or {}
    kind = data.get("kind") or "server"
    return int(data.get("tier") or DEFAULT_TIER.get(kind, DEFAULT_TIER["server"]))


def _score_node(node: dict, edges_by_source: dict[str, list[str]], edges_by_target: dict[str, list[str]]) -> int:
    tier = _node_tier(node)
    if tier >= 3:
        return 1000
    if tier == 2:
        return len(edges_by_source.get(node["id"], [])) * 10
    return len(edges_by_target.get(node["id"], []))


def build_node(
    *,
    existing_nodes: list[dict],
    kind: str,
    label: str | None = None,
    tier: int | None = None,
    split_count: int | None = None,
    position: dict | None = None,
    layout: str | None = None,
    node_id: str | None = None,
    topo_type: str = "custom",
) -> dict:
    kind = kind or "rack"
    tier = int(tier or DEFAULT_TIER.get(kind, DEFAULT_TIER["server"]))
    same_kind_count = sum(1 for node in existing_nodes if (node.get("data") or {}).get("kind") == kind)
    next_node = {
        "id": node_id or f"node-{uuid4().hex[:12]}",
        "type": "custom",
        "position": position or {"x": 100 + len(existing_nodes) * 40, "y": 100 + len(existing_nodes) * 30},
        "data": {
            "label": label or _node_label(kind, same_kind_count + 1),
            "kind": kind,
            "tier": tier,
            "layout": layout or ("grid" if is_non_tree_topology(topo_type) else "tree"),
        },
    }
    if kind == "patch":
        next_node["data"]["splitCount"] = clamp_patch_split(split_count)
    return next_node


def build_edge(
    *,
    source: str,
    target: str,
    label: str | None = "link",
    edge_id: str | None = None,
    source_handle: str | None = None,
    target_handle: str | None = None,
) -> dict:
    edge = {
        "id": edge_id or f"edge-{uuid4().hex[:12]}",
        "source": source,
        "target": target,
        "sourceHandle": normalize_handle(source_handle, "source"),
        "targetHandle": normalize_handle(target_handle, "target"),
    }
    if label is not None:
        edge["label"] = label
    return edge


def apply_auto_layout(nodes: list[dict], edges: list[dict], topo_type: str, topo_params: dict, end_gap: bool = False) -> list[dict]:
    nodes = deepcopy(nodes)
    edges = normalize_edges(edges)

    if topo_type in {"torus-2d", "mesh"}:
        spacing_x = topo_params.get("nodeSpacingX") or 180
        spacing_y = topo_params.get("layerGap") or 140
        for node in nodes:
            node_id = node["id"]
            parts = node_id.split("-")
            if len(parts) >= 3 and parts[0] == "n":
                r = int(parts[1])
                c = int(parts[2])
            else:
                r = 0
                c = 0
            node["position"] = {"x": 140 + c * spacing_x, "y": 120 + r * spacing_y}
        return nodes

    if topo_type == "torus-3d":
        z_count = topo_params.get("z") or 3
        spacing_x = topo_params.get("nodeSpacingX") or 160
        spacing_y = topo_params.get("layerGap") or 120
        layer_gap = topo_params.get("layerGap3d") or 260
        for node in nodes:
            node_id = node["id"]
            parts = node_id.split("-")
            if len(parts) >= 4 and parts[0] == "n":
                i = int(parts[1])
                j = int(parts[2])
                k = int(parts[3])
            else:
                i = j = k = 0
            layer_x = (k % z_count) * layer_gap
            node["position"] = {"x": 140 + layer_x + i * spacing_x, "y": 120 + j * spacing_y}
        return nodes

    if topo_type == "dragonfly":
        groups = topo_params.get("groups") or 3
        routers_per_group = topo_params.get("routers_per_group") or 4
        group_cols = ceil(sqrt(groups))
        local_cols = ceil(sqrt(routers_per_group))
        group_spacing_x = topo_params.get("groupGapX") or 320
        group_spacing_y = topo_params.get("layerGap") or 260
        node_spacing_x = topo_params.get("nodeSpacingX") or 120
        node_spacing_y = topo_params.get("nodeSpacingY") or 90
        for node in nodes:
            node_id = node["id"]
            if node_id.startswith("g") and "-r" in node_id:
                group_part, router_part = node_id.split("-r", 1)
                g = int(group_part[1:]) - 1
                r = int(router_part) - 1
            else:
                g = r = 0
            group_row = g // group_cols
            group_col = g % group_cols
            local_col = r % local_cols
            local_row = r // local_cols
            node["position"] = {
                "x": 140 + group_col * group_spacing_x + local_col * node_spacing_x,
                "y": 120 + group_row * group_spacing_y + local_row * node_spacing_y,
            }
        return nodes

    if topo_type == "butterfly":
        spacing_x = topo_params.get("nodeSpacingX") or 180
        spacing_y = topo_params.get("layerGap") or 140
        for node in nodes:
            node_id = node["id"]
            if node_id.startswith("s") and "-n" in node_id:
                stage_part, node_part = node_id.split("-n", 1)
                stage_index = int(stage_part[1:]) - 1
                node_index = int(node_part) - 1
            else:
                stage_index = node_index = 0
            node["position"] = {"x": 140 + node_index * spacing_x, "y": 120 + stage_index * spacing_y}
        return nodes

    edges_by_source: dict[str, list[str]] = {}
    edges_by_target: dict[str, list[str]] = {}
    for edge in edges:
        edges_by_source.setdefault(edge["source"], []).append(edge["target"])
        edges_by_target.setdefault(edge["target"], []).append(edge["source"])

    tiers = sorted({_node_tier(node) for node in nodes}, reverse=True)
    max_in_tier = max(1, *[sum(1 for node in nodes if _node_tier(node) == tier) for tier in tiers])
    layer_gap = topo_params.get("layerGap") or 220
    node_spacing_x = topo_params.get("nodeSpacingX") or 220

    next_nodes: list[dict] = []
    for node in nodes:
        tier = _node_tier(node)
        tier_index = tiers.index(tier)
        group = [candidate for candidate in nodes if _node_tier(candidate) == tier]
        ordered = sorted(
            group,
            key=lambda candidate: (
                -_score_node(candidate, edges_by_source, edges_by_target),
                str((candidate.get("data") or {}).get("label") or candidate["id"]),
            ),
        )
        row_index = next(index for index, candidate in enumerate(ordered) if candidate["id"] == node["id"])
        offset = (max_in_tier - len(group)) / 2
        x = 140 + max(0, row_index + offset) * node_spacing_x
        if end_gap and row_index == len(group) - 1:
            x += node_spacing_x
        y = 120 + tier_index * layer_gap
        next_node = deepcopy(node)
        next_node["position"] = {"x": x, "y": y}
        next_nodes.append(next_node)
    return next_nodes


def arrange_nodes(nodes: list[dict], node_ids: list[str], mode: str) -> list[dict]:
    if len(node_ids) < 2:
        return deepcopy(nodes)

    selected_set = set(node_ids)
    selected_nodes = [deepcopy(node) for node in nodes if node["id"] in selected_set]
    if len(selected_nodes) < 2:
        return deepcopy(nodes)

    def size_of(node: dict) -> tuple[float, float]:
        return (node.get("width") or FALLBACK_NODE_WIDTH, node.get("height") or FALLBACK_NODE_HEIGHT)

    next_positions: dict[str, dict[str, float]] = {}

    if mode == "left":
        min_x = min(node["position"]["x"] for node in selected_nodes)
        for node in selected_nodes:
            next_positions[node["id"]] = {"x": min_x, "y": node["position"]["y"]}

    if mode == "right":
        max_right = max(node["position"]["x"] + size_of(node)[0] for node in selected_nodes)
        for node in selected_nodes:
            next_positions[node["id"]] = {"x": max_right - size_of(node)[0], "y": node["position"]["y"]}

    if mode == "top":
        min_y = min(node["position"]["y"] for node in selected_nodes)
        for node in selected_nodes:
            next_positions[node["id"]] = {"x": node["position"]["x"], "y": min_y}

    if mode == "bottom":
        max_bottom = max(node["position"]["y"] + size_of(node)[1] for node in selected_nodes)
        for node in selected_nodes:
            next_positions[node["id"]] = {"x": node["position"]["x"], "y": max_bottom - size_of(node)[1]}

    if mode == "distribute-horizontal" and len(selected_nodes) >= 3:
        ordered = sorted(selected_nodes, key=lambda node: node["position"]["x"])
        first = ordered[0]
        last = ordered[-1]
        step = (last["position"]["x"] - first["position"]["x"]) / (len(ordered) - 1)
        for index, node in enumerate(ordered):
            next_positions[node["id"]] = {"x": first["position"]["x"] + step * index, "y": node["position"]["y"]}

    if mode == "distribute-vertical" and len(selected_nodes) >= 3:
        ordered = sorted(selected_nodes, key=lambda node: node["position"]["y"])
        first = ordered[0]
        last = ordered[-1]
        step = (last["position"]["y"] - first["position"]["y"]) / (len(ordered) - 1)
        for index, node in enumerate(ordered):
            next_positions[node["id"]] = {"x": node["position"]["x"], "y": first["position"]["y"] + step * index}

    result: list[dict] = []
    for node in nodes:
        next_node = deepcopy(node)
        if node["id"] in next_positions:
            next_node["position"] = next_positions[node["id"]]
        result.append(next_node)
    return result
