import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
    INTERVIEWER_MODEL = "gemini-2.0-flash-exp" # Using flash as requested (mapping to available model)
    INSTRUCTOR_MODEL = "gemini-2.0-pro-exp-02-05" # Using pro as requested (mapping to available model)
    
    # Defaults if not set
    HOST = os.getenv("HOST", "127.0.0.1")
    PORT = int(os.getenv("PORT", "8000"))

config = Config()
