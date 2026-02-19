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
        self.model = config.INSTRUCTOR_MODEL

    async def analyze_and_coach(self, history: list[Message]) -> Optional[str]:
        if not history or history[-1].role != "user":
            return None

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
            return response.text or None
        except Exception as e:
            print(f"[InstructorAgent] Error: {e}")
            return None
