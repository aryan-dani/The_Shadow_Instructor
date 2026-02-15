
import json
from google import genai
from google.oauth2 import service_account
from utils.config import config

def get_gemini_client(location: str = None) -> genai.Client:
    """
    Returns a configured Gemini Client.
    Prioritizes Vertex AI (Service Account) if credentials exist.
    Falls back to Google AI Studio (API Key).
    """
    creds = None
    if config.GOOGLE_APPLICATION_CREDENTIALS_JSON:
        try:
            service_account_info = json.loads(config.GOOGLE_APPLICATION_CREDENTIALS_JSON)
            creds = service_account.Credentials.from_service_account_info(
                service_account_info,
                scopes=["https://www.googleapis.com/auth/cloud-platform"]
            )
        except json.JSONDecodeError as e:
            print(f"Warning: Invalid GOOGLE_APPLICATION_CREDENTIALS_JSON: {e}")
            pass

    target_location = location or config.GOOGLE_CLOUD_LOCATION

    return genai.Client(
        vertexai=True if creds else False,
        project=config.GOOGLE_CLOUD_PROJECT if creds else None,
        location=target_location if creds else None,
        credentials=creds,
        api_key=config.GEMINI_API_KEY if not creds else None
    )
