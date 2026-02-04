import os
from dotenv import load_dotenv
from pathlib import Path

# Explicitly load .env from backend root
env_path = Path(__file__).parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

class Config:
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
    INTERVIEWER_MODEL = "gemini-3-flash-preview" 
    INSTRUCTOR_MODEL = "gemini-3-pro-preview" 
    
    # Defaults if not set
    HOST = os.getenv("HOST", "127.0.0.1")
    PORT = int(os.getenv("PORT", "8000"))

config = Config()
