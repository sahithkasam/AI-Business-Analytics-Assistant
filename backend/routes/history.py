from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession

from database.connection import get_db
from models.analytics import QueryHistory
from models.user import User
from services.schemas import QueryHistoryList, QueryHistoryItem, ToggleFavoriteResponse
from utils.security import require_any_role

router = APIRouter(prefix="/history", tags=["Query History"])


@router.get("", response_model=QueryHistoryList)
async def get_history(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    favorites_only: bool = False,
    current_user: User = Depends(require_any_role),
    db: AsyncSession = Depends(get_db),
):
    query = select(QueryHistory).where(QueryHistory.user_id == current_user.id)
    if favorites_only:
        query = query.where(QueryHistory.is_favorite == True)

    # Count
    count_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = count_result.scalar()

    # Paginate
    query = query.order_by(desc(QueryHistory.created_at)).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    items = result.scalars().all()

    return QueryHistoryList(
        items=[QueryHistoryItem.model_validate(i) for i in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{history_id}", response_model=QueryHistoryItem)
async def get_history_item(
    history_id: UUID,
    current_user: User = Depends(require_any_role),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(QueryHistory).where(
            QueryHistory.id == history_id,
            QueryHistory.user_id == current_user.id,
        )
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="History item not found")
    return item


@router.patch("/{history_id}/favorite", response_model=ToggleFavoriteResponse)
async def toggle_favorite(
    history_id: UUID,
    current_user: User = Depends(require_any_role),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(QueryHistory).where(
            QueryHistory.id == history_id,
            QueryHistory.user_id == current_user.id,
        )
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="History item not found")

    item.is_favorite = not item.is_favorite
    await db.commit()
    return ToggleFavoriteResponse(id=item.id, is_favorite=item.is_favorite)


@router.delete("/{history_id}", status_code=204)
async def delete_history_item(
    history_id: UUID,
    current_user: User = Depends(require_any_role),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(QueryHistory).where(
            QueryHistory.id == history_id,
            QueryHistory.user_id == current_user.id,
        )
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="History item not found")

    await db.delete(item)
    await db.commit()


@router.delete("", status_code=204)
async def clear_history(
    current_user: User = Depends(require_any_role),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(QueryHistory).where(QueryHistory.user_id == current_user.id)
    )
    items = result.scalars().all()
    for item in items:
        await db.delete(item)
    await db.commit()
