from utils.gemini_client import get_gemini_client
from google.genai import types
from utils.config import config
from models.schemas import Message
from models.analysis_schema import InterviewAnalysisReport
from utils.prompts import ANTI_HALLUCINATION_RULES
from typing import Any
import json
import asyncio


class FeedbackAgent:
    def __init__(self):
        self.client = get_gemini_client()
        self.model = config.FEEDBACK_MODEL

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
        """Build the analysis system prompt with anti-hallucination rules."""
        return f"""You are an expert technical interviewer and communication coach.
Analyze the following interview transcript for a candidate applying for: {role}.

ANALYSIS FOCUS:
1. **Technical Content** — Accuracy, depth, and problem-solving approach of what was ACTUALLY said.
2. **Communication Style** — Clarity, conciseness, confidence, and fluency.

SPEECH PATTERN ANALYSIS (inferred from transcript text):
- Repetitions (e.g., "I... I think") indicate stammering.
- Filler words (e.g., "um", "uh", "like") indicate hesitation.
- Short, choppy sentences or long, rambling sentences indicate pacing issues.

{ANTI_HALLUCINATION_RULES}

SCORING GUIDANCE:
- If the candidate gave one-word or vague answers ("sure", "yeah", "okay"), score them LOW.
  Do NOT assume they understood the concept — they did not demonstrate it.
- Only credit knowledge that was EXPLICITLY articulated by the candidate.
- "Strong Hire": Exceeds all expectations with clear articulation.
- "Hire": Meets requirements with solid, explicit responses.
- "Weak Hire": Borderline — some knowledge shown but communication gaps.
- "No Hire": Significant gaps in both content and communication.

Output MUST be a valid JSON object:
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
            "user_response_summary": "<string — what they ACTUALLY said, verbatim essence>",
            "score": <0-100>,
            "feedback": "<string>",
            "better_response_suggestion": "<string>"
        }}
    ],
    "actionable_tips": ["<string>", ...],
    "final_verdict": "<Strong Hire|Hire|Weak Hire|No Hire>"
}}

Return ONLY the JSON object. No markdown, no code blocks, no additional text."""

    def _format_history(self, history: list[Message]) -> str:
        return "\n".join([f"[{msg.role.upper()}]: {msg.content}" for msg in history])

    async def _call_gemini(self, system_prompt: str, formatted_history: str) -> InterviewAnalysisReport:
        response = self.client.models.generate_content(
            model=self.model,
            contents=f"{system_prompt}\n\nTRANSCRIPT:\n{formatted_history}",
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=InterviewAnalysisReport,
                thinking_config=types.ThinkingConfig(thinking_level="low")
            ),
        )

        if hasattr(response, 'parsed') and response.parsed:
            return response.parsed
        return InterviewAnalysisReport.model_validate_json(response.text)

    async def _call_groq(self, system_prompt: str, formatted_history: str) -> InterviewAnalysisReport:
        if not self.groq_client:
            raise ValueError("Groq API key not configured.")

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

    async def generate_detailed_analysis(self, history: list[Message], role: str) -> InterviewAnalysisReport:
        """
        Generate detailed interview analysis.
        Primary: Gemini API | Fallback: Groq API (on rate limit)
        """
        system_prompt = self._build_system_prompt(role)
        formatted_history = self._format_history(history)

        try:
            return await self._call_gemini(system_prompt, formatted_history)
        except Exception as gemini_error:
            error_str = str(gemini_error).lower()
            is_rate_limit = any(k in error_str for k in ["429", "resource_exhausted", "quota", "rate"])

            if is_rate_limit and config.GROQ_API_KEY:
                try:
                    return await self._call_groq(system_prompt, formatted_history)
                except Exception as groq_error:
                    raise groq_error

            raise gemini_error
