from fastapi import Header, HTTPException
import os

async def get_api_key(x_api_key: str = Header(...)):
    # Simple check against env var or a hardcoded value for scaffold
    expected_key = os.getenv("APP_API_KEY", "shadow-secret")
    if x_api_key != expected_key:
        raise HTTPException(status_code=403, detail="Invalid API Key")
    return x_api_key
