from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class TopologyBase(BaseModel):
    name: str = Field(default="Default")
    topo_type: str = Field(default="custom")
    topo_params: dict = Field(default_factory=dict)
    nodes: list[Any] = Field(default_factory=list)
    edges: list[Any] = Field(default_factory=list)


class TopologyPayload(TopologyBase):
    pass


class TopologyCreate(TopologyBase):
    name: str = Field(default="Untitled")


class TopologyResponse(TopologyBase):
    id: int
    updated_at: datetime


class TopologySummary(BaseModel):
    id: int
    name: str
    updated_at: datetime


class Position(BaseModel):
    x: float = 0
    y: float = 0


class NodeData(BaseModel):
    model_config = ConfigDict(extra="allow")

    label: str
    kind: Literal["rack", "switch", "server", "asic", "patch"]
    tier: int
    splitCount: int | None = None
    layout: Literal["tree", "grid"] | None = None


class NodeModel(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: str
    type: str = "custom"
    position: Position = Field(default_factory=Position)
    data: NodeData


class NodeCreate(BaseModel):
    kind: Literal["rack", "switch", "server", "asic", "patch"] = "rack"
    label: str | None = None
    tier: int | None = None
    splitCount: int | None = None
    position: Position | None = None
    layout: Literal["tree", "grid"] | None = None
    id: str | None = None


class NodeUpdate(BaseModel):
    label: str | None = None
    kind: Literal["rack", "switch", "server", "asic", "patch"] | None = None
    tier: int | None = None
    splitCount: int | None = None
    layout: Literal["tree", "grid"] | None = None
    position: Position | None = None


class BatchNodeCreate(BaseModel):
    kind: Literal["rack", "switch", "server", "asic", "patch"] = "switch"
    tier: int = 1
    count: int = 1
    splitCount: int | None = None
    connect_to_lower_tier: bool = True


class EdgeModel(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: str
    source: str
    target: str
    label: str | None = "link"
    sourceHandle: str | None = None
    targetHandle: str | None = None


class EdgeCreate(BaseModel):
    source: str
    target: str
    label: str | None = "link"
    sourceHandle: str | None = None
    targetHandle: str | None = None
    id: str | None = None


class EdgeUpdate(BaseModel):
    label: str | None = None
    sourceHandle: str | None = None
    targetHandle: str | None = None


class GenerateTopologyRequest(BaseModel):
    topo_type: str
    params: dict = Field(default_factory=dict)
    name: str | None = None


class LayoutRequest(BaseModel):
    end_gap: bool = False


class ArrangeRequest(BaseModel):
    node_ids: list[str] = Field(default_factory=list)
    mode: Literal[
        "left",
        "right",
        "top",
        "bottom",
        "distribute-horizontal",
        "distribute-vertical",
    ]
