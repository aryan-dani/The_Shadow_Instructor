from utils.gemini_client import get_gemini_client
from google.genai import types
from utils.config import config
from models.schemas import Message, Feedback
from utils.prompts import INSTRUCTOR_SYSTEM_PROMPT
from typing import Optional
import json
import asyncio


class InstructorAgent:
    def __init__(self):
        self.client = get_gemini_client()
        self.model = config.INSTRUCTOR_MODEL
        
        # Groq fallback client
        self._groq_client = None

    @property
    def groq_client(self):
        if self._groq_client is None and config.GROQ_API_KEY:
            from groq import Groq
            self._groq_client = Groq(api_key=config.GROQ_API_KEY)
        return self._groq_client

    async def _call_groq(self, formatted_history: str) -> Optional[str]:
        if not self.groq_client:
            raise ValueError("Groq API key not configured.")

        def _sync_groq():
            completion = self.groq_client.chat.completions.create(
                model=config.GROQ_MODEL,
                messages=[
                    {"role": "system", "content": f"{INSTRUCTOR_SYSTEM_PROMPT}\n\nRespond ONLY with a valid JSON matching the Feedback schema."},
                    {"role": "user", "content": formatted_history}
                ],
                temperature=0.5,
                response_format={"type": "json_object"}
            )
            return completion.choices[0].message.content

        response_text = await asyncio.to_thread(_sync_groq)
        return response_text or None

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
            error_str = str(e).lower()
            is_rate_limit = any(k in error_str for k in ["429", "resource_exhausted", "quota", "rate"])

            if is_rate_limit and config.GROQ_API_KEY:
                try:
                    return await self._call_groq(formatted_history)
                except Exception as groq_error:
                    print(f"[InstructorAgent] Groq Fallback Error: {groq_error}")
                    return None
            
            print(f"[InstructorAgent] Error: {e}")
            return None
