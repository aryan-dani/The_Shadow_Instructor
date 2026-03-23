
import json
from google import genai
from google.oauth2 import service_account
from utils.config import config
from utils.usage_tracker import init_db, log_usage, get_total_cost, MAX_BUDGET

# Initialize usage DB on startup
init_db()

class TokenTrackingModels:
    def __init__(self, models):
        self._models = models

    def generate_content(self, **kwargs):
        # Enforce Budget Cap
        if get_total_cost() >= MAX_BUDGET:
            raise ValueError(f"API Budget Limit Exceeded (${MAX_BUDGET}). No further calls allowed.")
            
        response = self._models.generate_content(**kwargs)
        
        # Track usage
        try:
            if hasattr(response, 'usage_metadata') and response.usage_metadata is not None:
                prompt_tokens = response.usage_metadata.prompt_token_count or 0
                completion_tokens = response.usage_metadata.candidates_token_count or 0
                model_name = kwargs.get('model', 'unknown')
                log_usage(model_name, prompt_tokens, completion_tokens)
        except Exception as e:
            print(f"Error logging usage: {e}")
            
        return response

class TokenTrackingClient:
    def __init__(self, client: genai.Client):
        self._client = client
        self._wrapped_models = TokenTrackingModels(client.models)

    def __getattr__(self, name):
        if name == 'models':
            return self._wrapped_models
        return getattr(self._client, name)

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

def get_gemini_client(location: str | None = None) -> genai.Client | TokenTrackingClient:
    """
    Returns a configured Gemini Client using Vertex AI.
    Raises an exception if service account credentials are not configured.
    """
    creds = get_credentials()
    if not creds:
        raise ValueError("Google Cloud service account credentials are not configured.")

    target_location = location or config.GOOGLE_CLOUD_LOCATION

    client = genai.Client(
        vertexai=True,
        project=config.GOOGLE_CLOUD_PROJECT,
        location=target_location,
        credentials=creds,
    )
    return TokenTrackingClient(client)
