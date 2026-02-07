from google import genai
from google.genai import types
from utils.config import config
from models.schemas import Message
from models.analysis_schema import InterviewAnalysisReport
from typing import List
import json
import httpx
import asyncio

class FeedbackAgent:
    def __init__(self):
        self.client = genai.Client(api_key=config.GEMINI_API_KEY)
        self.formatted_model = config.FEEDBACK_MODEL
        
        # Groq fallback client (initialized lazily)
        self._groq_client = None
    
    @property
    def groq_client(self):
        """Lazy initialization of Groq client"""
        if self._groq_client is None and config.GROQ_API_KEY:
            from groq import Groq
            self._groq_client = Groq(api_key=config.GROQ_API_KEY)
        return self._groq_client
    
    def _build_system_prompt(self, role: str) -> str:
        """Build the analysis system prompt"""
        return f"""You are an expert technical interviewer and communication coach. 
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
- "Hire": Meets requirements solidly.
- "Weak Hire": Borderline, needs support.
- "No Hire": Significant gaps.

Output MUST be a valid JSON object with this EXACT structure:
{{
    "overall_score": <0-100>,
    "summary": "<string>",
    "speech_analysis": {{
        "pace": "<Too Fast|Good|Too Slow>",
        "clarity": <0-100>,
        "conciseness": <0-100>,
        "stammering_frequency": "<None|Low|Moderate|High>",
        "filled_pauses_count": <int>,
        "long_pauses_count": <int>
    }},
    "content_analysis": {{
        "technical_accuracy": <0-100>,
        "relevance": <0-100>,
        "problem_solving_skills": <0-100>,
        "key_strengths": ["<string>", ...],
        "areas_for_improvement": ["<string>", ...]
    }},
    "question_breakdown": [
        {{
            "question_text": "<string>",
            "user_response_summary": "<string>",
            "score": <0-100>,
            "feedback": "<string>",
            "better_response_suggestion": "<string>"
        }}
    ],
    "actionable_tips": ["<string>", ...],
    "final_verdict": "<Strong Hire|Hire|Weak Hire|No Hire>"
}}

IMPORTANT: Return ONLY the JSON object. No markdown, no code blocks, no additional text."""
    
    def _format_history(self, history: List[Message]) -> str:
        """Format conversation history"""
        formatted = ""
        for msg in history:
            formatted += f"[{msg.role.upper()}]: {msg.content}\n"
        return formatted

    async def _call_gemini(self, system_prompt: str, formatted_history: str) -> InterviewAnalysisReport:
        """Call Gemini API for analysis"""
        response = self.client.models.generate_content(
            model=self.formatted_model,
            contents=f"{system_prompt}\n\nTRANSCRIPT:\n{formatted_history}",
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=InterviewAnalysisReport,
                thinking_config=types.ThinkingConfig(thinking_level="low")
            ),
        )
        
        if hasattr(response, 'parsed') and response.parsed:
            return response.parsed
        else:
            return InterviewAnalysisReport.model_validate_json(response.text)
    
    async def _call_groq(self, system_prompt: str, formatted_history: str) -> InterviewAnalysisReport:
        """Fallback to Groq API for analysis"""
        if not self.groq_client:
            raise ValueError("Groq API key not configured. Add GROQ_API_KEY to your .env file.")
        
        # Run sync Groq call in thread pool
        def _sync_groq_call():
            completion = self.groq_client.chat.completions.create(
                model=config.GROQ_MODEL,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"TRANSCRIPT:\n{formatted_history}"}
                ],
                temperature=0.3,
                response_format={"type": "json_object"}
            )
            return completion.choices[0].message.content
        
        response_text = await asyncio.to_thread(_sync_groq_call)
        return InterviewAnalysisReport.model_validate_json(response_text)

    async def generate_detailed_analysis(self, history: List[Message], role: str) -> InterviewAnalysisReport:
        """
        Generate detailed interview analysis with automatic fallback.
        Primary: Gemini API
        Fallback: Groq API (on rate limit or other Gemini errors)
        """
        system_prompt = self._build_system_prompt(role)
        formatted_history = self._format_history(history)
        
        # Try Gemini first
        try:
            print("[FeedbackAgent] Attempting analysis with Gemini...")
            return await self._call_gemini(system_prompt, formatted_history)
        
        except Exception as gemini_error:
            error_str = str(gemini_error).lower()
            
            # Check if it's a rate limit error (429)
            is_rate_limit = (
                "429" in error_str or 
                "resource_exhausted" in error_str or 
                "quota" in error_str or
                "rate" in error_str
            )
            
            if is_rate_limit:
                print(f"[FeedbackAgent] Gemini rate limited. Falling back to Groq...")
                
                if not config.GROQ_API_KEY:
                    error_msg = "Gemini is rate-limited and GROQ_API_KEY is missing in environment variables."
                    print(f"[FeedbackAgent] {error_msg}")
                    # Raise a new error with a clear message for the frontend/logs
                    raise ValueError(error_msg)
                
                try:
                    return await self._call_groq(system_prompt, formatted_history)
                except Exception as groq_error:
                    print(f"[FeedbackAgent] Groq fallback also failed: {groq_error}")
                    raise groq_error
            else:
                # Not a rate limit error
                print(f"[FeedbackAgent] Error: {gemini_error}")
                raise gemini_error
