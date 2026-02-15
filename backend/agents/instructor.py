from utils.gemini_client import get_gemini_client
from google.genai import types
from utils.config import config
from models.schemas import Message, Feedback
from utils.prompts import INSTRUCTOR_SYSTEM_PROMPT
from typing import Optional
import json

class InstructorAgent:
    def __init__(self):
        self.client = get_gemini_client()
        # VERIFICATION LOG
        is_vertex = getattr(self.client, "vertexai", False)
        print(f"[InstructorAgent] Initialized. 🟢 Vertex AI: {is_vertex}")
        
        self.model = config.INSTRUCTOR_MODEL
        
    async def analyze_and_coach(self, history: list[Message]) -> Optional[str]:
        # The instructor looks at the history and provides feedback.
        # We only want to analyze the *last* user message in context of history
        if not history or history[-1].role != "user":
            return None # Only critique after user speaks (or maybe after interviewer replies to user? Let's stick to simple turn-based)

        # Actually, standard flow: User speaks -> Interviewer speaks -> Instructor critiques USER's last move.
        # But 'history' here likely includes the Interviewer's *pending* or *just sent* response if we append it first in main.py.
        # Let's assume we want to critique the interactions.
        
        formatted_history = "\n".join([f"{msg.role}: {msg.content}" for msg in history])
        
        try:
            response = self.client.models.generate_content(
                model=self.model,
                contents=formatted_history,
                config=types.GenerateContentConfig(
                    system_instruction=INSTRUCTOR_SYSTEM_PROMPT,
                    temperature=0.5,
                    response_mime_type="application/json",
                    response_schema=Feedback
                )
            )
            
            # Return the JSON text directly. The frontend/main.py will handle it.
            return response.text or None
            
        except Exception as e:
            print(f"Error generating instructor response: {e}")
            return None
