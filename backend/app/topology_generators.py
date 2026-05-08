from __future__ import annotations

import re
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


def _edge(
    edge_id: str,
    source: str,
    target: str,
    label: str | None = "link",
    source_handle: str = "bottom-out",
    target_handle: str = "top-in",
) -> dict:
    edge = {
        "id": edge_id,
        "source": source,
        "target": target,
        "sourceHandle": source_handle,
        "targetHandle": target_handle,
    }
    if label:
        edge["label"] = label
    return edge


def _connect_all(
    edges: list[dict],
    sources: list[str],
    targets: list[str],
    prefix: str,
    label: str | None = "link",
) -> None:
    for source in sources:
        for target in targets:
            edges.append(_edge(f"{prefix}-{source}-{target}", source, target, label=label))


def _slug(value: str) -> str:
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", value.strip().lower()).strip("-")
    return slug or "layer"


def generate_layered_custom(
    layers: list[dict],
    edge_label: str | None = "link",
    connection_mode: str = "full-mesh",
    layout: str | None = None,
    layer_gap: int | None = None,
    node_spacing_x: int | None = None,
) -> GeneratedTopology:
    if not layers:
        raise ValueError("At least one layer is required")
    if connection_mode not in {"full-mesh", "one-to-one", "none"}:
        raise ValueError("connection_mode must be full-mesh, one-to-one, or none")

    nodes: list[dict] = []
    edges: list[dict] = []
    layer_node_ids: list[list[str]] = []
    used_node_ids: set[str] = set()
    used_edge_ids: set[str] = set()

    for layer_index, layer in enumerate(layers, start=1):
        count = max(1, int(layer.get("count") or 1))
        kind = layer.get("kind") or "switch"
        tier = max(1, int(layer.get("tier") or 1))
        base_label = layer.get("label") or layer.get("label_prefix") or f"Layer {tier}"
        base_id = _slug(layer.get("id") or base_label or f"layer-{layer_index}")
        if base_id in used_node_ids:
            base_id = f"{base_id}-{layer_index}"
        ids: list[str] = []
        for node_index in range(1, count + 1):
            node_id = f"{base_id}-{node_index}"
            while node_id in used_node_ids:
                node_id = f"{base_id}-{node_index}-{len(used_node_ids) + 1}"
            used_node_ids.add(node_id)
            ids.append(node_id)

            label = base_label if count == 1 else f"{base_label} {node_index}"
            node = _node(node_id, label, kind, tier=tier)
            node["data"]["layout"] = layout or layer.get("layout") or "tree"
            if kind == "patch":
                node["data"]["splitCount"] = max(2, min(1024, int(layer.get("splitCount") or 8)))
            nodes.append(node)
        layer_node_ids.append(ids)

    if connection_mode != "none":
        for layer_index in range(len(layer_node_ids) - 1):
            sources = layer_node_ids[layer_index]
            targets = layer_node_ids[layer_index + 1]
            if connection_mode == "full-mesh":
                for source in sources:
                    for target in targets:
                        edge_id = f"e-{source}-{target}"
                        while edge_id in used_edge_ids:
                            edge_id = f"e-{source}-{target}-{len(used_edge_ids) + 1}"
                        used_edge_ids.add(edge_id)
                        edges.append(_edge(edge_id, source, target, label=edge_label))
            if connection_mode == "one-to-one":
                for pair_index, source in enumerate(sources):
                    target = targets[pair_index % len(targets)]
                    edge_id = f"e-{source}-{target}"
                    while edge_id in used_edge_ids:
                        edge_id = f"e-{source}-{target}-{len(used_edge_ids) + 1}"
                    used_edge_ids.add(edge_id)
                    edges.append(_edge(edge_id, source, target, label=edge_label))

    params = {
        "layers": layers,
        "edge_label": edge_label,
        "connection_mode": connection_mode,
    }
    if layout:
        params["layout"] = layout
    if layer_gap is not None:
        params["layerGap"] = layer_gap
    if node_spacing_x is not None:
        params["nodeSpacingX"] = node_spacing_x

    return GeneratedTopology(
        topo_type="layered-custom",
        params=params,
        nodes=nodes,
        edges=edges,
    )


def generate_leaf_spine(
    spines: int,
    leaves: int,
    spine_kind: str,
    leaf_kind: str,
    edge_label: str | None = "link",
) -> GeneratedTopology:
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
            edges.append(_edge(f"e-{spine_id}-{leaf_id}", spine_id, leaf_id, label=edge_label))

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
    edge_label: str | None = "link",
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
            edges.append(_edge(f"e-{agg_id}-{node_id}", agg_id, node_id, label=edge_label))

    for agg_id in agg_ids:
        for core_id in core_ids:
            edges.append(_edge(f"e-{core_id}-{agg_id}", core_id, agg_id, label=edge_label))

    return GeneratedTopology(
        topo_type="three-tier",
        params={"core": core, "aggregation": aggregation, "access": access},
        nodes=nodes,
        edges=edges,
    )


def generate_fat_tree(
    k: int,
    core_kind: str,
    agg_kind: str,
    edge_kind: str,
    edge_label: str | None = "link",
) -> GeneratedTopology:
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
        pod_edges = [f"pod-{pod + 1}-edge-{idx + 1}" for idx in range(edge_per_pod)]
        pod_aggs = [f"pod-{pod + 1}-agg-{idx + 1}" for idx in range(agg_per_pod)]
        for edge_id in pod_edges:
            for agg_id in pod_aggs:
                edges.append(_edge(f"e-{agg_id}-{edge_id}", agg_id, edge_id, label=edge_label))

    # Connect aggregation to core (classic k-ary fat-tree)
    group_size = k // 2
    for pod in range(pods):
        pod_aggs = [f"pod-{pod + 1}-agg-{idx + 1}" for idx in range(agg_per_pod)]
        for agg_idx, agg_id in enumerate(pod_aggs):
            for core_idx in range(group_size):
                core_id = core_ids[agg_idx * group_size + core_idx]
                edges.append(_edge(f"e-{core_id}-{agg_id}", core_id, agg_id, label=edge_label))

    return GeneratedTopology(
        topo_type="fat-tree",
        params={"k": k, "pods": pods},
        nodes=nodes,
        edges=edges,
    )


def generate_expanded_clos(
    tiers: int, nodes_per_tier: int, kind: str, edge_label: str | None = "link"
) -> GeneratedTopology:
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
        _connect_all(edges, tier_nodes[i], tier_nodes[i + 1], f"e-t{i + 1}", label=edge_label)

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
    edge_label: str | None = "link",
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
        _connect_all(edges, agg_ids, leaf_ids, f"e-pod-{pod + 1}", label=edge_label)
        _connect_all(edges, core_ids, agg_ids, f"e-core-{pod + 1}", label=edge_label)

    return GeneratedTopology(
        topo_type="core-and-pod",
        params={"cores": cores, "pods": pods, "pod_leaves": pod_leaves, "pod_aggs": pod_aggs},
        nodes=nodes,
        edges=edges,
    )


def generate_torus_2d(rows: int, cols: int, kind: str, edge_label: str | None = "link") -> GeneratedTopology:
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
        edges.append(
            _edge(
                f"e-{r}-{c}-r",
                ids[(r, c)],
                ids[right],
                label=edge_label,
                source_handle="right-out",
                target_handle="left-in",
            )
        )
        edges.append(
            _edge(
                f"e-{r}-{c}-d",
                ids[(r, c)],
                ids[down],
                label=edge_label,
                source_handle="bottom-out",
                target_handle="top-in",
            )
        )
    return GeneratedTopology(
        topo_type="torus-2d",
        params={"rows": rows, "cols": cols},
        nodes=nodes,
        edges=edges,
    )


def generate_torus_3d(x: int, y: int, z: int, kind: str, edge_label: str | None = "link") -> GeneratedTopology:
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
        edges.append(
            _edge(
                f"e-{i}-{j}-{k}-x",
                ids[(i, j, k)],
                ids[nx],
                label=edge_label,
                source_handle="right-out",
                target_handle="left-in",
            )
        )
        edges.append(
            _edge(
                f"e-{i}-{j}-{k}-y",
                ids[(i, j, k)],
                ids[ny],
                label=edge_label,
                source_handle="bottom-out",
                target_handle="top-in",
            )
        )
        edges.append(
            _edge(
                f"e-{i}-{j}-{k}-z",
                ids[(i, j, k)],
                ids[nz],
                label=edge_label,
                source_handle="right-out",
                target_handle="left-in",
            )
        )
    return GeneratedTopology(
        topo_type="torus-3d",
        params={"x": x, "y": y, "z": z},
        nodes=nodes,
        edges=edges,
    )


def generate_dragonfly(
    groups: int, routers_per_group: int, kind: str, edge_label: str | None = "link"
) -> GeneratedTopology:
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

    grid_side = int(routers_per_group**0.5)
    if grid_side * grid_side < routers_per_group:
        grid_side += 1

    for ids in group_ids:
        for idx in range(len(ids)):
            row = idx // grid_side
            col = idx % grid_side
            right_idx = idx + 1
            if col + 1 < grid_side and right_idx < len(ids):
                edges.append(
                    _edge(
                        f"e-local-h-{ids[idx]}-{ids[right_idx]}",
                        ids[idx],
                        ids[right_idx],
                        label=edge_label,
                        source_handle="right-out",
                        target_handle="left-in",
                    )
                )
            down_idx = idx + grid_side
            if down_idx < len(ids):
                edges.append(
                    _edge(
                        f"e-local-v-{ids[idx]}-{ids[down_idx]}",
                        ids[idx],
                        ids[down_idx],
                        label=edge_label,
                        source_handle="bottom-out",
                        target_handle="top-in",
                    )
                )

    for g in range(groups):
        for r in range(routers_per_group):
            src = group_ids[g][r]
            dst_group = (g + r + 1) % groups
            dst = group_ids[dst_group][r % routers_per_group]
            edges.append(
                _edge(
                    f"e-global-{src}-{dst}",
                    src,
                    dst,
                    label=edge_label,
                    source_handle="right-out",
                    target_handle="left-in",
                )
            )

    return GeneratedTopology(
        topo_type="dragonfly",
        params={"groups": groups, "routers_per_group": routers_per_group},
        nodes=nodes,
        edges=edges,
    )


def generate_butterfly(stages: int, width: int, kind: str, edge_label: str | None = "link") -> GeneratedTopology:
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
            node_kind = "asic" if s == 0 or s == stages - 1 else kind
            nodes.append(_node(node_id, f"S{s + 1} N{i + 1}", node_kind, tier=1))
        stage_nodes.append(ids)

    for s in range(stages - 1):
        for src in stage_nodes[s]:
            for dst in stage_nodes[s + 1]:
                edges.append(
                    _edge(
                        f"e-bf-{s}-{src}-{dst}",
                        src,
                        dst,
                        label=edge_label,
                        source_handle="bottom-out",
                        target_handle="top-in",
                    )
                )

    return GeneratedTopology(
        topo_type="butterfly",
        params={"stages": stages, "width": width},
        nodes=nodes,
        edges=edges,
    )


def generate_mesh(rows: int, cols: int, kind: str, edge_label: str | None = "link") -> GeneratedTopology:
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
            edges.append(
                _edge(
                    f"e-{r}-{c}-r",
                    ids[(r, c)],
                    ids[(r, c + 1)],
                    label=edge_label,
                    source_handle="right-out",
                    target_handle="left-in",
                )
            )
        if r + 1 < rows:
            edges.append(
                _edge(
                    f"e-{r}-{c}-d",
                    ids[(r, c)],
                    ids[(r + 1, c)],
                    label=edge_label,
                    source_handle="bottom-out",
                    target_handle="top-in",
                )
            )
    return GeneratedTopology(
        topo_type="mesh",
        params={"rows": rows, "cols": cols},
        nodes=nodes,
        edges=edges,
    )


def generate_ring(count: int, kind: str, edge_label: str | None = "link") -> GeneratedTopology:
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
        edges.append(
            _edge(
                f"e-{src}-{dst}",
                src,
                dst,
                label=edge_label,
                source_handle="right-out",
                target_handle="left-in",
            )
        )
    return GeneratedTopology(
        topo_type="ring",
        params={"count": count},
        nodes=nodes,
        edges=edges,
    )


def generate_star(count: int, kind: str, edge_label: str | None = "link") -> GeneratedTopology:
    count = max(3, int(count))
    nodes: list[dict] = []
    edges: list[dict] = []
    center_id = "center"
    nodes.append(_node(center_id, "Center", kind, tier=1))
    for idx in range(count - 1):
        node_id = f"n-{idx + 1}"
        nodes.append(_node(node_id, f"Node {idx + 1}", kind, tier=1))
        edges.append(
            _edge(
                f"e-{center_id}-{node_id}",
                center_id,
                node_id,
                label=edge_label,
                source_handle="bottom-out",
                target_handle="top-in",
            )
        )
    return GeneratedTopology(
        topo_type="star",
        params={"count": count},
        nodes=nodes,
        edges=edges,
    )
