from datetime import datetime
from typing import Any, List, Optional
from pydantic import BaseModel, Field


class TopologyBase(BaseModel):
    name: str = Field(default="Default")
    topo_type: str = Field(default="custom")
    topo_params: dict = Field(default_factory=dict)
    nodes: List[Any] = Field(default_factory=list)
    edges: List[Any] = Field(default_factory=list)


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
