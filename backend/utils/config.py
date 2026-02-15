import os
from dotenv import load_dotenv
from pathlib import Path

# Explicitly load .env from backend root
env_path = Path(__file__).parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

class Config:
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
    SHADOW_MODEL = "gemini-3-flash-preview" 
    LIVE_INTERVIEW_MODEL = "gemini-live-2.5-flash-native-audio"
    LIVE_LOCATION = "us-central1"
    
    # Legacy fallbacks
    INTERVIEWER_MODEL = SHADOW_MODEL
    INSTRUCTOR_MODEL = SHADOW_MODEL
    FEEDBACK_MODEL = SHADOW_MODEL
    
    # Groq Fallback (for when Gemini rate limits are hit)
    GROQ_API_KEY = os.getenv("GROQ_API_KEY")
    GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")  # Free tier friendly
    
    # Supabase Configuration
    SUPABASE_URL = os.getenv("SUPABASE_URL")
    SUPABASE_KEY = os.getenv("SUPABASE_KEY") # service_role or anon key depending on backend needs. service_role preferred for backend admin tasks.
    
    # Defaults if not set
    HOST = os.getenv("HOST", "127.0.0.1")
    PORT = int(os.getenv("PORT", "8000"))

    # Vertex AI Configuration
    GOOGLE_CLOUD_PROJECT = os.getenv("GOOGLE_CLOUD_PROJECT")
    # Vertex AI Preview models often require 'global' location or specific regions. 
    # User specified 'global' for Gemini 3 Preview.
    GOOGLE_CLOUD_LOCATION = "global" 
    GOOGLE_APPLICATION_CREDENTIALS_JSON = os.getenv("GOOGLE_APPLICATION_CREDENTIALS_JSON")

config = Config()
