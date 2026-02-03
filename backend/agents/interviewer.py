from google import genai
from google.genai import types
from utils.config import config
from models.schemas import Message
from utils.prompts import SYSTEM_DESIGN_INTERVIEWER
from typing import List

class InterviewerAgent:
    def __init__(self):
        self.client = genai.Client(api_key=config.GEMINI_API_KEY)
        self.model = config.INTERVIEWER_MODEL
        
    async def generate_response(self, history: List[Message]) -> str:
        # Convert internal history to Gemini format if needed, 
        # or just pass last few messages as prompt context.
        
        formatted_history = "\n".join([f"{msg.role}: {msg.content}" for msg in history])
        
        try:
            response = self.client.models.generate_content(
                model=self.model,
                contents=formatted_history,
                config=types.GenerateContentConfig(
                    system_instruction=SYSTEM_DESIGN_INTERVIEWER,
                    temperature=0.7
                )
            )
            return response.text or "I apologize, could you repeat that?"
        except Exception as e:
            print(f"Error generating interviewer response: {e}")
            return "I apologize, let's move on to the next topic."

