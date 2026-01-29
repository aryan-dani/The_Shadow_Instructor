from google import genai
from google.genai import types
from utils.config import config
from models.schemas import Message
from typing import List

class InstructorAgent:
    def __init__(self):
        self.client = genai.Client(api_key=config.GEMINI_API_KEY)
        self.model = config.INSTRUCTOR_MODEL
        
    async def analyze_and_coach(self, history: List[Message]) -> str:
        # The instructor looks at the history and provides feedback.
        formatted_history = "\n".join([f"{msg.role}: {msg.content}" for msg in history])
        
        system_instruction = (
            "You are a mentorship AI (The Shadow Instructor). "
            "Analyze the ongoing interview and provide critical feedback to the candidate (user). "
            "Focus on communication style, technical accuracy, and problem-solving approach."
        )
        
        try:
            response = self.client.models.generate_content(
                model=self.model,
                contents=formatted_history,
                config=types.GenerateContentConfig(
                    system_instruction=system_instruction,
                    thinking_config=types.ThinkingConfig(include_thoughts=True), # Enable high reasoning/thinking
                    temperature=0.7
                )
            )
            
            # If using thinking model, we might want to extract thoughts or just return text.
            # Assuming standard text return for now.
            return response.text
            
        except Exception as e:
            print(f"Error generating instructor response: {e}")
            return "Observation: Keep checking your calculations."
