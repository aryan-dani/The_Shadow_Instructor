from utils.gemini_client import get_gemini_client
from google.genai import types
from utils.config import config
import json
import base64
import asyncio

class ShadowAgent:
    def __init__(self):
        self.client = get_gemini_client()
        self.model = config.SHADOW_MODEL

        # Groq fallback client
        self._groq_client = None

    @property
    def groq_client(self):
        if self._groq_client is None and config.GROQ_API_KEY:
            from groq import Groq
            self._groq_client = Groq(api_key=config.GROQ_API_KEY)
        return self._groq_client

    async def _call_groq_vision(self, prompt: str, base64_image: str) -> dict:
        if not self.groq_client:
            raise ValueError("Groq API key not configured for vision.")

        def _sync_groq():
            # Use Groq's vision model
            completion = self.groq_client.chat.completions.create(
                model="llama-3.2-11b-vision-preview",
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": f"{prompt}\n\nRespond ONLY with a valid JSON matching the exact schema requested."},
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/jpeg;base64,{base64_image}",
                                },
                            },
                        ],
                    }
                ],
                temperature=0.4,
                response_format={"type": "json_object"}
            )
            return completion.choices[0].message.content

        response_text = await asyncio.to_thread(_sync_groq)
        return json.loads(response_text)

    async def analyze_frame_and_context(self, base64_image: str, persona: str = "friendly") -> dict:
        """
        Analyzes a single video frame for non-verbal cues (eye contact, posture, expression).
        """
        tone_map = {
            "friendly": "Be warm and encouraging, like a supportive mentor.",
            "tough": "Be direct and professional. Focus on executive presence.",
            "faang": "Evaluate against top-tier tech company standards for composure and confidence.",
            "roast": "Be hilariously sarcastic. Mock poor posture or wandering eyes with comedic flair.",
        }
        tone = tone_map.get(persona, tone_map["friendly"])

        prompt = f"""Analyze this webcam frame of a candidate in a live technical interview.
Persona: {persona}. Tone: {tone}

Evaluate:
1. **Eye Contact** — Are they looking at the camera/screen, or distracted?
2. **Posture** — Slouching, stiff, or well-positioned?
3. **Expression** — Nervous, confident, or disengaged?

Return JSON:
{{"status": "ok"|"alert", "message": "Brief advice (max 7 words) in persona tone, or null if ok", "confidence": 0.0-1.0}}

Only return "alert" for CLEAR issues. If they look fine, use "ok" with null message."""

        try:
            image_bytes = base64.b64decode(base64_image)
            response = self.client.models.generate_content(
                model=self.model,
                contents=[
                    types.Part(text=prompt),
                    types.Part(inline_data=types.Blob(
                        mime_type="image/jpeg",
                        data=image_bytes
                    ))
                ],
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.4,
                )
            )
            return json.loads(response.text)
        except Exception as e:
            error_str = str(e).lower()
            is_rate_limit = any(k in error_str for k in ["429", "resource_exhausted", "quota", "rate"])

            if is_rate_limit and config.GROQ_API_KEY:
                try:
                    return await self._call_groq_vision(prompt, base64_image)
                except Exception as groq_error:
                    print(f"[ShadowAgent] Groq Vision Fallback error: {groq_error}")
                    return {"status": "error"}

            print(f"[ShadowAgent] Vision error: {e}")
            return {"status": "error"}

    async def _call_groq_pacing(self, prompt: str) -> dict:
        if not self.groq_client:
            raise ValueError("Groq API key not configured.")

        def _sync_groq():
            completion = self.groq_client.chat.completions.create(
                model=config.GROQ_MODEL,
                messages=[
                    {"role": "system", "content": "You are a pacing analysis system. Respond ONLY with a valid JSON."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                response_format={"type": "json_object"}
            )
            return completion.choices[0].message.content

        response_text = await asyncio.to_thread(_sync_groq)
        return json.loads(response_text)

    async def analyze_pacing(self, transcript_chunk: str, persona: str = "friendly") -> dict:
        """Analyzes a chunk of spoken text for rambling, repetition, or filler words."""
        if len(transcript_chunk.split()) < 30:
            return {"status": "ok"}

        tone_map = {
            "friendly": "Give gentle, constructive advice.",
            "tough": "Be blunt about wasted time.",
            "faang": "Note that conciseness is valued at top companies.",
            "roast": "Roast them for boring you to death.",
        }
        tone = tone_map.get(persona, tone_map["friendly"])

        prompt = f"""Analyze this spoken transcript segment for rambling.
Persona: {persona}. Tone: {tone}
Text: "{transcript_chunk}"

Is the speaker repeating themselves, going off-topic, or using excessive filler words?
Return JSON: {{"status": "alert"|"ok", "message": "Brief advice in persona tone"}}"""

        try:
            response = self.client.models.generate_content(
                model=self.model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.3
                )
            )
            return json.loads(response.text)
        except Exception as e:
            error_str = str(e).lower()
            is_rate_limit = any(k in error_str for k in ["429", "resource_exhausted", "quota", "rate"])

            if is_rate_limit and config.GROQ_API_KEY:
                try:
                    return await self._call_groq_pacing(prompt)
                except Exception as groq_error:
                    print(f"[ShadowAgent] Groq Pacing Fallback error: {groq_error}")
                    return {"status": "error"}

            print(f"[ShadowAgent] Pacing error: {e}")
            return {"status": "error"}
