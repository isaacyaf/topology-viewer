from __future__ import annotations

from dataclasses import dataclass
from itertools import product


@dataclass
class GeneratedTopology:
    topo_type: str
    params: dict
    nodes: list[dict]
    edges: list[dict]


def _node(node_id: str, label: str, kind: str, tier: int) -> dict:
    return {
        "id": node_id,
        "type": "custom",
        "position": {"x": 0, "y": 0},
        "data": {"label": label, "kind": kind, "tier": tier},
    }


def _edge(edge_id: str, source: str, target: str, label: str | None = "link") -> dict:
    edge = {
        "id": edge_id,
        "source": source,
        "target": target,
        "sourceHandle": "top",
        "targetHandle": "bottom",
    }
    if label:
        edge["label"] = label
    return edge


def _connect_all(edges: list[dict], sources: list[str], targets: list[str], prefix: str) -> None:
    for source in sources:
        for target in targets:
            edges.append(_edge(f"{prefix}-{source}-{target}", source, target))


def generate_leaf_spine(spines: int, leaves: int, spine_kind: str, leaf_kind: str) -> GeneratedTopology:
    spines = max(1, int(spines))
    leaves = max(1, int(leaves))
    nodes: list[dict] = []
    edges: list[dict] = []

    spine_ids = []
    for idx in range(spines):
        node_id = f"spine-{idx + 1}"
        spine_ids.append(node_id)
        nodes.append(_node(node_id, f"Spine {idx + 1}", spine_kind, tier=3))

    for idx in range(leaves):
        leaf_id = f"leaf-{idx + 1}"
        nodes.append(_node(leaf_id, f"Leaf {idx + 1}", leaf_kind, tier=2))
        for spine_id in spine_ids:
            edges.append(_edge(f"e-{leaf_id}-{spine_id}", leaf_id, spine_id))

    return GeneratedTopology(
        topo_type="leaf-spine",
        params={"spines": spines, "leaves": leaves},
        nodes=nodes,
        edges=edges,
    )


def generate_three_tier(
    core: int,
    aggregation: int,
    access: int,
    core_kind: str,
    agg_kind: str,
    access_kind: str,
) -> GeneratedTopology:
    core = max(1, int(core))
    aggregation = max(1, int(aggregation))
    access = max(1, int(access))
    nodes: list[dict] = []
    edges: list[dict] = []

    core_ids = []
    agg_ids = []

    for idx in range(core):
        node_id = f"core-{idx + 1}"
        core_ids.append(node_id)
        nodes.append(_node(node_id, f"Core {idx + 1}", core_kind, tier=3))

    for idx in range(aggregation):
        node_id = f"agg-{idx + 1}"
        agg_ids.append(node_id)
        nodes.append(_node(node_id, f"Agg {idx + 1}", agg_kind, tier=2))

    for idx in range(access):
        node_id = f"access-{idx + 1}"
        nodes.append(_node(node_id, f"Access {idx + 1}", access_kind, tier=1))
        for agg_id in agg_ids:
            edges.append(_edge(f"e-{node_id}-{agg_id}", node_id, agg_id))

    for agg_id in agg_ids:
        for core_id in core_ids:
            edges.append(_edge(f"e-{agg_id}-{core_id}", agg_id, core_id))

    return GeneratedTopology(
        topo_type="three-tier",
        params={"core": core, "aggregation": aggregation, "access": access},
        nodes=nodes,
        edges=edges,
    )


def generate_fat_tree(k: int, core_kind: str, agg_kind: str, edge_kind: str) -> GeneratedTopology:
    k = int(k)
    if k < 2 or k % 2 != 0:
        raise ValueError("k must be an even integer >= 2")

    pods = k
    edge_per_pod = k // 2
    agg_per_pod = k // 2
    core = (k // 2) ** 2

    nodes: list[dict] = []
    edges: list[dict] = []

    core_ids = []
    for idx in range(core):
        node_id = f"core-{idx + 1}"
        core_ids.append(node_id)
        nodes.append(_node(node_id, f"Core {idx + 1}", core_kind, tier=3))

    agg_ids = []
    edge_ids = []

    for pod in range(pods):
        for idx in range(agg_per_pod):
            node_id = f"pod-{pod + 1}-agg-{idx + 1}"
            agg_ids.append(node_id)
            nodes.append(_node(node_id, f"Pod {pod + 1} Agg {idx + 1}", agg_kind, tier=2))
        for idx in range(edge_per_pod):
            node_id = f"pod-{pod + 1}-edge-{idx + 1}"
            edge_ids.append(node_id)
            nodes.append(_node(node_id, f"Pod {pod + 1} Edge {idx + 1}", edge_kind, tier=1))

    # Connect edge <-> aggregation within each pod
    for pod in range(pods):
        pod_edges = [
            f"pod-{pod + 1}-edge-{idx + 1}" for idx in range(edge_per_pod)
        ]
        pod_aggs = [
            f"pod-{pod + 1}-agg-{idx + 1}" for idx in range(agg_per_pod)
        ]
        for edge_id in pod_edges:
            for agg_id in pod_aggs:
                edges.append(_edge(f"e-{edge_id}-{agg_id}", edge_id, agg_id))

    # Connect aggregation to core (classic k-ary fat-tree)
    group_size = k // 2
    for pod in range(pods):
        pod_aggs = [
            f"pod-{pod + 1}-agg-{idx + 1}" for idx in range(agg_per_pod)
        ]
        for agg_idx, agg_id in enumerate(pod_aggs):
            for core_idx in range(group_size):
                core_id = core_ids[agg_idx * group_size + core_idx]
                edges.append(_edge(f"e-{agg_id}-{core_id}", agg_id, core_id))

    return GeneratedTopology(
        topo_type="fat-tree",
        params={"k": k, "pods": pods},
        nodes=nodes,
        edges=edges,
    )


def generate_expanded_clos(tiers: int, nodes_per_tier: int, kind: str) -> GeneratedTopology:
    tiers = max(2, int(tiers))
    nodes_per_tier = max(1, int(nodes_per_tier))
    nodes: list[dict] = []
    edges: list[dict] = []

    tier_nodes: list[list[str]] = []
    for tier in range(tiers, 0, -1):
        ids: list[str] = []
        for idx in range(nodes_per_tier):
            node_id = f"tier-{tier}-sw-{idx + 1}"
            ids.append(node_id)
            nodes.append(_node(node_id, f"Tier {tier} Sw {idx + 1}", kind, tier=tier))
        tier_nodes.append(ids)

    for i in range(len(tier_nodes) - 1):
        _connect_all(edges, tier_nodes[i + 1], tier_nodes[i], f"e-t{i+1}")

    return GeneratedTopology(
        topo_type="expanded-clos",
        params={"tiers": tiers, "nodes_per_tier": nodes_per_tier},
        nodes=nodes,
        edges=edges,
    )


def generate_core_and_pod(
    cores: int,
    pods: int,
    pod_leaves: int,
    pod_aggs: int,
    core_kind: str,
    agg_kind: str,
    leaf_kind: str,
) -> GeneratedTopology:
    cores = max(1, int(cores))
    pods = max(1, int(pods))
    pod_leaves = max(1, int(pod_leaves))
    pod_aggs = max(1, int(pod_aggs))
    nodes: list[dict] = []
    edges: list[dict] = []

    core_ids = []
    for idx in range(cores):
        node_id = f"core-{idx + 1}"
        core_ids.append(node_id)
        nodes.append(_node(node_id, f"Core {idx + 1}", core_kind, tier=3))

    for pod in range(pods):
        agg_ids = []
        leaf_ids = []
        for idx in range(pod_aggs):
            node_id = f"pod-{pod + 1}-agg-{idx + 1}"
            agg_ids.append(node_id)
            nodes.append(_node(node_id, f"Pod {pod + 1} Agg {idx + 1}", agg_kind, tier=2))
        for idx in range(pod_leaves):
            node_id = f"pod-{pod + 1}-leaf-{idx + 1}"
            leaf_ids.append(node_id)
            nodes.append(_node(node_id, f"Pod {pod + 1} Leaf {idx + 1}", leaf_kind, tier=1))
        _connect_all(edges, leaf_ids, agg_ids, f"e-pod-{pod+1}")
        _connect_all(edges, agg_ids, core_ids, f"e-core-{pod+1}")

    return GeneratedTopology(
        topo_type="core-and-pod",
        params={"cores": cores, "pods": pods, "pod_leaves": pod_leaves, "pod_aggs": pod_aggs},
        nodes=nodes,
        edges=edges,
    )


def generate_torus_2d(rows: int, cols: int, kind: str) -> GeneratedTopology:
    rows = max(2, int(rows))
    cols = max(2, int(cols))
    nodes: list[dict] = []
    edges: list[dict] = []
    ids = {}
    for r, c in product(range(rows), range(cols)):
        node_id = f"n-{r}-{c}"
        ids[(r, c)] = node_id
        nodes.append(_node(node_id, f"Node {r},{c}", kind, tier=1))
    for r, c in product(range(rows), range(cols)):
        right = (r, (c + 1) % cols)
        down = ((r + 1) % rows, c)
        edges.append(_edge(f"e-{r}-{c}-r", ids[(r, c)], ids[right]))
        edges.append(_edge(f"e-{r}-{c}-d", ids[(r, c)], ids[down]))
    return GeneratedTopology(
        topo_type="torus-2d",
        params={"rows": rows, "cols": cols},
        nodes=nodes,
        edges=edges,
    )


def generate_torus_3d(x: int, y: int, z: int, kind: str) -> GeneratedTopology:
    x = max(2, int(x))
    y = max(2, int(y))
    z = max(2, int(z))
    nodes: list[dict] = []
    edges: list[dict] = []
    ids = {}
    for i, j, k in product(range(x), range(y), range(z)):
        node_id = f"n-{i}-{j}-{k}"
        ids[(i, j, k)] = node_id
        nodes.append(_node(node_id, f"Node {i},{j},{k}", kind, tier=1))
    for i, j, k in product(range(x), range(y), range(z)):
        nx = ((i + 1) % x, j, k)
        ny = (i, (j + 1) % y, k)
        nz = (i, j, (k + 1) % z)
        edges.append(_edge(f"e-{i}-{j}-{k}-x", ids[(i, j, k)], ids[nx]))
        edges.append(_edge(f"e-{i}-{j}-{k}-y", ids[(i, j, k)], ids[ny]))
        edges.append(_edge(f"e-{i}-{j}-{k}-z", ids[(i, j, k)], ids[nz]))
    return GeneratedTopology(
        topo_type="torus-3d",
        params={"x": x, "y": y, "z": z},
        nodes=nodes,
        edges=edges,
    )


def generate_dragonfly(groups: int, routers_per_group: int, kind: str) -> GeneratedTopology:
    groups = max(2, int(groups))
    routers_per_group = max(2, int(routers_per_group))
    nodes: list[dict] = []
    edges: list[dict] = []

    group_ids: list[list[str]] = []
    for g in range(groups):
        ids = []
        for r in range(routers_per_group):
            node_id = f"g{g + 1}-r{r + 1}"
            ids.append(node_id)
            nodes.append(_node(node_id, f"G{g + 1} R{r + 1}", kind, tier=1))
        group_ids.append(ids)

    for ids in group_ids:
        for i in range(len(ids)):
            for j in range(i + 1, len(ids)):
                edges.append(_edge(f"e-local-{ids[i]}-{ids[j]}", ids[i], ids[j]))

    for g in range(groups):
        for r in range(routers_per_group):
            src = group_ids[g][r]
            dst_group = (g + r + 1) % groups
            dst = group_ids[dst_group][r % routers_per_group]
            edges.append(_edge(f"e-global-{src}-{dst}", src, dst))

    return GeneratedTopology(
        topo_type="dragonfly",
        params={"groups": groups, "routers_per_group": routers_per_group},
        nodes=nodes,
        edges=edges,
    )


def generate_butterfly(stages: int, width: int, kind: str) -> GeneratedTopology:
    stages = max(2, int(stages))
    width = max(2, int(width))
    nodes: list[dict] = []
    edges: list[dict] = []

    stage_nodes: list[list[str]] = []
    for s in range(stages):
        ids = []
        for i in range(width):
            node_id = f"s{s + 1}-n{i + 1}"
            ids.append(node_id)
            nodes.append(_node(node_id, f"S{s + 1} N{i + 1}", kind, tier=1))
        stage_nodes.append(ids)

    for s in range(stages - 1):
        for i in range(width):
            src = stage_nodes[s][i]
            dst1 = stage_nodes[s + 1][i]
            dst2 = stage_nodes[s + 1][(i + 1) % width]
            edges.append(_edge(f"e-bf-{s}-{i}-a", src, dst1))
            edges.append(_edge(f"e-bf-{s}-{i}-b", src, dst2))

    return GeneratedTopology(
        topo_type="butterfly",
        params={"stages": stages, "width": width},
        nodes=nodes,
        edges=edges,
    )


def generate_mesh(rows: int, cols: int, kind: str) -> GeneratedTopology:
    rows = max(2, int(rows))
    cols = max(2, int(cols))
    nodes: list[dict] = []
    edges: list[dict] = []
    ids = {}
    for r, c in product(range(rows), range(cols)):
        node_id = f"n-{r}-{c}"
        ids[(r, c)] = node_id
        nodes.append(_node(node_id, f"Node {r},{c}", kind, tier=1))
    for r, c in product(range(rows), range(cols)):
        if c + 1 < cols:
            edges.append(_edge(f"e-{r}-{c}-r", ids[(r, c)], ids[(r, c + 1)]))
        if r + 1 < rows:
            edges.append(_edge(f"e-{r}-{c}-d", ids[(r, c)], ids[(r + 1, c)]))
    return GeneratedTopology(
        topo_type="mesh",
        params={"rows": rows, "cols": cols},
        nodes=nodes,
        edges=edges,
    )


def generate_ring(count: int, kind: str) -> GeneratedTopology:
    count = max(3, int(count))
    nodes: list[dict] = []
    edges: list[dict] = []
    ids = []
    for idx in range(count):
        node_id = f"n-{idx + 1}"
        ids.append(node_id)
        nodes.append(_node(node_id, f"Node {idx + 1}", kind, tier=1))
    for idx in range(count):
        src = ids[idx]
        dst = ids[(idx + 1) % count]
        edges.append(_edge(f"e-{src}-{dst}", src, dst))
    return GeneratedTopology(
        topo_type="ring",
        params={"count": count},
        nodes=nodes,
        edges=edges,
    )


def generate_star(count: int, kind: str) -> GeneratedTopology:
    count = max(3, int(count))
    nodes: list[dict] = []
    edges: list[dict] = []
    center_id = "center"
    nodes.append(_node(center_id, "Center", kind, tier=1))
    for idx in range(count - 1):
        node_id = f"n-{idx + 1}"
        nodes.append(_node(node_id, f"Node {idx + 1}", kind, tier=1))
        edges.append(_edge(f"e-{center_id}-{node_id}", center_id, node_id))
    return GeneratedTopology(
        topo_type="star",
        params={"count": count},
        nodes=nodes,
        edges=edges,
    )
