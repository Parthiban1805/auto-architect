from sqlalchemy import Column, Integer, Text, DateTime
from sqlalchemy.dialects.postgresql import JSONB
import datetime
from database import Base

class ProjectRun(Base):
    __tablename__ = "project_runs"

    id = Column(Integer, primary_key=True, index=True)
    transcript = Column(Text, nullable=False)
    result_json = Column(JSONB, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
