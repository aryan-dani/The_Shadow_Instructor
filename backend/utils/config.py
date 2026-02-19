import os
from dotenv import load_dotenv
from pathlib import Path

# Explicitly load .env from backend root
env_path = Path(__file__).parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

class Config:
    # --- Model Configuration ---
    SHADOW_MODEL = "gemini-3-flash-preview"

    # All agents use the same model (change here to update everywhere)
    INTERVIEWER_MODEL = SHADOW_MODEL
    INSTRUCTOR_MODEL = SHADOW_MODEL
    FEEDBACK_MODEL = SHADOW_MODEL

    # Groq Fallback (for when Gemini rate limits are hit)
    GROQ_API_KEY = os.getenv("GROQ_API_KEY")
    GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")

    # --- Server ---
    HOST = os.getenv("HOST", "127.0.0.1")
    PORT = int(os.getenv("PORT", "8000"))

    # --- Vertex AI ---
    GOOGLE_CLOUD_PROJECT = os.getenv("GOOGLE_CLOUD_PROJECT")
    GOOGLE_CLOUD_LOCATION = "global"
    GOOGLE_APPLICATION_CREDENTIALS_JSON = os.getenv("GOOGLE_APPLICATION_CREDENTIALS_JSON")

config = Config()
