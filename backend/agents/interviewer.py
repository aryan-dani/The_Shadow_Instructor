from utils.gemini_client import get_gemini_client
from google.genai import types
from utils.config import config
from models.schemas import Message
from utils.prompts import get_interviewer_prompt, build_live_system_instruction, ANTI_HALLUCINATION_RULES


class InterviewerAgent:
    def __init__(self, scenario: str = "url_shortener", resume_context: str = ""):
        self.client = get_gemini_client()
        self.model = config.INTERVIEWER_MODEL

        if resume_context:
            self.system_prompt = build_live_system_instruction(
                role=scenario,
                resume_text=resume_context,
                persona="friendly",
                difficulty="medium",
            )
        else:
            self.system_prompt = get_interviewer_prompt(scenario)

    async def generate_response(self, history: list[Message]) -> str:
        formatted_history = "\n".join([f"{msg.role}: {msg.content}" for msg in history])

        try:
            response = self.client.models.generate_content(
                model=self.model,
                contents=formatted_history,
                config=types.GenerateContentConfig(
                    system_instruction=self.system_prompt,
                    temperature=0.7
                )
            )
            return response.text or "I apologize, could you repeat that?"
        except Exception as e:
            print(f"[InterviewerAgent] Error: {e}")
            return "I apologize, let's move on to the next topic."
