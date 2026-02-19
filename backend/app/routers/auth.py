from fastapi import APIRouter
from google.auth.transport.requests import Request
from utils.config import config
from utils.gemini_client import get_credentials

router = APIRouter()

@router.get("/token")
async def get_gemini_token():
    """Issues a Vertex AI OAuth access token for calling Gemini API directly."""
    creds = get_credentials()
    if not creds:
        return {"error": "Service account credentials not configured", "token": None}

    try:
        if not creds.valid:
            creds.refresh(Request())

        return {
            "token": creds.token,
            "type": "bearer",
            "expires_in": 3600,
            "project_id": config.GOOGLE_CLOUD_PROJECT,
            "location": config.GOOGLE_CLOUD_LOCATION
        }
    except Exception as e:
        return {"error": f"Token generation failed: {e}", "token": None}
