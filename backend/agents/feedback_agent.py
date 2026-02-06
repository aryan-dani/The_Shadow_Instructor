from google import genai
from google.genai import types
from utils.config import config
from models.schemas import Message
from models.analysis_schema import InterviewAnalysisReport
from typing import List
import json

class FeedbackAgent:
    def __init__(self):
        self.client = genai.Client(api_key=config.GEMINI_API_KEY)
        self.formatted_model = config.FEEDBACK_MODEL

    async def generate_detailed_analysis(self, history: List[Message], role: str) -> InterviewAnalysisReport:
        # 1. Format conversation
        formatted_history = ""
        for msg in history:
            formatted_history += f"[{msg.role.upper()}]: {msg.content}\n"
            
        # 2. Construct System Prompt
        system_prompt = f"""
        You are an expert technical interviewer and communication coach. 
        Your task is to analyze the following interview transcript for a candidate applying for the role of: {role}.

        You must provide a ruthless, deep-dive analysis of the candidate's performance. 
        Focus on TWO main areas:
        1. **Technical Content**: Accuracy, depth, problem-solving approach.
        2. **Communication Style**: Clarity, conciseness, confidence, and fluency identifiers (stammering, filler words, pauses).

        Since this is a transcript, you must infer "stammering" and "pauses" based on:
        - Repetitions of words (e.g., "I... I think").
        - Filler words (e.g., "um", "uh", "like") if present in the text.
        - Short, choppy sentences or very long, rambling sentences.
        - Contextual clues about hesitation.

        **Goal**: Provide specific, actionable feedback that helps the user drastically improve their interview skills.
        
        **Final Verdict Logic**:
        - "Strong Hire": Exceeds all expectations.
        - "Hire": Meets requirements solidy.
        - "Weak Hire": borderline, needs support.
        - "No Hire": Significant gaps.

        Output MUST be a valid JSON object matching the `InterviewAnalysisReport` schema.
        `final_verdict` MUST be ONLY one of the 4 strings listed above. Do NOT add reasoning there.
        """

        # 3. Call Gemini with Thinking Config
        try:
            response = self.client.models.generate_content(
                model=self.formatted_model,
                contents=f"{system_prompt}\n\nTRANSCRIPT:\n{formatted_history}",
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=InterviewAnalysisReport,
                    thinking_config=types.ThinkingConfig(thinking_level="low")
                ),
            )
            
            # The SDK with response_schema should return a parsed object or we can parse text
            # Depending on version, response.parsed might be available, or response.text is JSON
            
            # Safe parsing
            if hasattr(response, 'parsed') and response.parsed:
                return response.parsed
            else:
                return InterviewAnalysisReport.model_validate_json(response.text)

        except Exception as e:
            print(f"Error generating feedback analysis: {e}")
            raise e
