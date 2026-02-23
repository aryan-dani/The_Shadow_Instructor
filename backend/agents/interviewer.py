from utils.gemini_client import get_gemini_client
from google.genai import types
from utils.config import config
from models.schemas import Message
from utils.prompts import get_interviewer_prompt, build_live_system_instruction, ANTI_HALLUCINATION_RULES
import asyncio


class InterviewerAgent:
    def __init__(self, scenario: str = "url_shortener", resume_context: str = ""):
        self.client = get_gemini_client()
        self.model = config.INTERVIEWER_MODEL

        # Groq fallback client
        self._groq_client = None

        if resume_context:
            self.system_prompt = build_live_system_instruction(
                role=scenario,
                resume_text=resume_context,
                persona="friendly",
                difficulty="medium",
            )
        else:
            self.system_prompt = get_interviewer_prompt(scenario)

    @property
    def groq_client(self):
        if self._groq_client is None and config.GROQ_API_KEY:
            from groq import Groq
            self._groq_client = Groq(api_key=config.GROQ_API_KEY)
        return self._groq_client

    async def _call_groq(self, formatted_history: str) -> str:
        if not self.groq_client:
            raise ValueError("Groq API key not configured.")

        def _sync_groq():
            completion = self.groq_client.chat.completions.create(
                model=config.GROQ_MODEL,
                messages=[
                    {"role": "system", "content": self.system_prompt},
                    {"role": "user", "content": formatted_history}
                ],
                temperature=0.7,
            )
            return completion.choices[0].message.content

        response_text = await asyncio.to_thread(_sync_groq)
        return response_text or "I apologize, could you repeat that?"

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
            error_str = str(e).lower()
            is_rate_limit = any(k in error_str for k in ["429", "resource_exhausted", "quota", "rate"])

            if is_rate_limit and config.GROQ_API_KEY:
                try:
                    return await self._call_groq(formatted_history)
                except Exception as groq_error:
                    print(f"[InterviewerAgent] Groq Fallback Error: {groq_error}")
                    return "I apologize, let's move on to the next topic."
            
            print(f"[InterviewerAgent] Error: {e}")
            return "I apologize, let's move on to the next topic."
