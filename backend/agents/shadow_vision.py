from google import genai
from google.genai import types
from utils.config import config
import json
import base64

class ShadowAgent:
    def __init__(self):
        self.client = genai.Client(api_key=config.GEMINI_API_KEY)
        self.model = config.SHADOW_MODEL

    async def analyze_frame_and_context(self, base64_image: str, last_transcript: str = "") -> dict:
        """
        Analyzes a single video frame for non-verbal cues (eye contact, posture).
        Also considers the last spoke transcript to check for anxiety/rambling visually + verbally.
        """
        prompt = """
        You are "The Shadow", a real-time interview coach.
        Analyze this webcam frame of a candidate during a technical interview.
        
        Check for:
        1. **Eye Contact**: Is the user looking at the camera/screen or looking away/down too much?
        2. **Posture**: Slouching? Stiff?
        3. **Expression**: Nervous? Confident? Bored?
        
        Output a JSON object with this EXACT schema:
        {
            "status": "ok" | "alert",
            "message": "Brief advice" (e.g. "Maintain eye contact", "Sit up straight", "Smile more", "You look nervous - breathe"),
            "confidence": 0-1
        }
        
        Only return "alert" if there is a CLEAR issue. If they look fine, status is "ok", message is null or empty.
        Be lenient. Only flag obvious bad habits.
        """
        
        try:
            # We assume image is JPEG base64
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
                    system_instruction="You are a helpful monitoring tool. Be concise and JSON only."
                )
            )
            
            # Simple parsing
            text = response.text
            data = json.loads(text)
            return data
            
        except Exception as e:
            print(f"Shadow Vision Error: {e}")
            return {"status": "error"}

    async def analyze_pacing(self, transcript_chunk: str) -> dict:
        """
        Analyzes a chunk of text for rambling.
        """
        if len(transcript_chunk.split()) < 30:
            return {"status": "ok"} # Too short
            
        prompt = f"""
        Analyze this spoken transcript for "Rambling".
        Text: "{transcript_chunk}"
        
        Is the speaker repeating themselves, going off-topic, or using excessive filler words?
        Output JSON: {{ "status": "alert"|"ok", "message": "Summarize your point"|"Stop rambling" }}
        """
        
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
            print(f"Shadow Text Error: {e}")
            return {"status": "error"}
