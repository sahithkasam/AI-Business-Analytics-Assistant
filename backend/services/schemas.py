"""
Pydantic request/response schemas for all API endpoints.
"""
from datetime import datetime
from typing import Any, List, Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, field_validator


# ─── Auth ───────────────────────────────────────────────────────────────────

class UserRegister(BaseModel):
    email: EmailStr
    username: str = Field(min_length=3, max_length=50)
    password: str = Field(min_length=8, max_length=128)
    full_name: Optional[str] = None

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit")
        return v

    @field_validator("username")
    @classmethod
    def username_alphanumeric(cls, v: str) -> str:
        if not v.replace("_", "").replace("-", "").isalnum():
            raise ValueError("Username may only contain letters, numbers, underscores, hyphens")
        return v.lower()


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: "UserResponse"


class RefreshRequest(BaseModel):
    refresh_token: str


class UserResponse(BaseModel):
    id: UUID
    email: str
    username: str
    full_name: Optional[str]
    role: str
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# ─── Analytics Query ─────────────────────────────────────────────────────────

class QueryRequest(BaseModel):
    question: str = Field(min_length=5, max_length=1000)
    stream: bool = False


class ColumnMeta(BaseModel):
    name: str
    type: str


class QueryResponse(BaseModel):
    id: Optional[UUID] = None
    natural_query: str
    generated_sql: Optional[str]
    corrected_sql: Optional[str]
    sql_explanation: Optional[str]
    columns: List[ColumnMeta]
    data: List[dict[str, Any]]
    row_count: int
    chart_type: str
    insights: Optional[str]
    execution_time_ms: int
    retry_count: int
    status: str
    error: Optional[str]
    created_at: Optional[datetime] = None


# ─── Query History ────────────────────────────────────────────────────────────

class QueryHistoryItem(BaseModel):
    id: UUID
    natural_language_query: str
    generated_sql: Optional[str]
    sql_explanation: Optional[str]
    execution_time_ms: Optional[int]
    row_count: Optional[int]
    status: str
    chart_type: Optional[str]
    insights: Optional[str]
    is_favorite: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class QueryHistoryList(BaseModel):
    items: List[QueryHistoryItem]
    total: int
    page: int
    page_size: int


class ToggleFavoriteResponse(BaseModel):
    id: UUID
    is_favorite: bool


# ─── KPI / Dashboard ─────────────────────────────────────────────────────────

class KPICard(BaseModel):
    label: str
    value: Any
    change_pct: Optional[float] = None
    trend: Optional[str] = None  # "up" | "down" | "neutral"
    prefix: Optional[str] = None
    suffix: Optional[str] = None


class DashboardKPIs(BaseModel):
    total_revenue: KPICard
    total_orders: KPICard
    active_customers: KPICard
    avg_order_value: KPICard
    revenue_growth: KPICard
    top_category: KPICard


# ─── Export ───────────────────────────────────────────────────────────────────

class ExportRequest(BaseModel):
    query_id: Optional[UUID] = None
    sql: Optional[str] = None
    format: str = Field(pattern="^(csv|pdf)$")
    title: Optional[str] = "Analytics Report"


