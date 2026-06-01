from sqlalchemy import Column, String, Integer, JSON, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

from database.connection import Base


class UploadedDataset(Base):
    __tablename__ = "uploaded_datasets"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    original_filename = Column(String(255), nullable=True)
    table_name = Column(String(100), unique=True, nullable=False)
    row_count = Column(Integer, default=0)
    columns_meta = Column(JSON, nullable=False)     # [{name, pg_type, sample_values}]
    kpi_columns = Column(JSON, nullable=True)       # [{label, col, agg}]
    chart_suggestions = Column(JSON, nullable=True) # [{type, x, y, title}]
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="uploaded_datasets")

    def __repr__(self):
        return f"<UploadedDataset {self.name} [{self.table_name}]>"
