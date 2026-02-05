from datetime import datetime
from sqlalchemy import Column, DateTime, Integer, String, Text
from sqlalchemy.orm import declarative_base

Base = declarative_base()


class Topology(Base):
    __tablename__ = "topologies"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False, default="Default")
    topo_type = Column(String(50), nullable=False, default="custom")
    topo_params_json = Column(Text, nullable=False, default="{}")
    nodes_json = Column(Text, nullable=False)
    edges_json = Column(Text, nullable=False)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow)
