from utils.gemini_client import get_gemini_client
from google.genai import types
from utils.config import config
import json
import base64

class ShadowAgent:
    def __init__(self):
        self.client = get_gemini_client()
        self.model = config.SHADOW_MODEL

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
            print(f"[ShadowAgent] Vision error: {e}")
            return {"status": "error"}

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
            print(f"[ShadowAgent] Pacing error: {e}")
            return {"status": "error"}
