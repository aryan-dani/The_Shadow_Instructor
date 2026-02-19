
import json
from google import genai
from google.oauth2 import service_account
from utils.config import config

def get_credentials():
    """Returns google.oauth2.service_account.Credentials if configured."""
    if config.GOOGLE_APPLICATION_CREDENTIALS_JSON:
        try:
            # Handle potential surrounding quotes from env vars
            json_str = config.GOOGLE_APPLICATION_CREDENTIALS_JSON.strip()
            if json_str.startswith("'") and json_str.endswith("'"):
                json_str = json_str[1:-1]
            
            service_account_info = json.loads(json_str)
            return service_account.Credentials.from_service_account_info(
                service_account_info,
                scopes=["https://www.googleapis.com/auth/cloud-platform"]
            )
        except json.JSONDecodeError:
            pass
    return None

def get_gemini_client(location: str | None = None) -> genai.Client:
    """
    Returns a configured Gemini Client using Vertex AI.
    Raises an exception if service account credentials are not configured.
    """
    creds = get_credentials()
    if not creds:
        raise ValueError("Google Cloud service account credentials are not configured.")

    target_location = location or config.GOOGLE_CLOUD_LOCATION

    return genai.Client(
        vertexai=True,
        project=config.GOOGLE_CLOUD_PROJECT,
        location=target_location,
        credentials=creds,
    )
