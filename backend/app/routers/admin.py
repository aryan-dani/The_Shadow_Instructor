from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel
from utils.usage_tracker import get_usage_stats, MAX_BUDGET
from utils.config import config

router = APIRouter()

def verify_admin(x_admin_password: str = Header(None)):
    if not x_admin_password or x_admin_password != config.ADMIN_PASSWORD:
        raise HTTPException(status_code=403, detail="Unauthorized Admin Access")
    return True

@router.get("/usage")
async def get_usage(is_admin: bool = Depends(verify_admin)):
    """Returns the API usage stats and cost breakdown."""
    stats = get_usage_stats()
    return stats
