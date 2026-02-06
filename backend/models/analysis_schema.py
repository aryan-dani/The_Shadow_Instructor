from pydantic import BaseModel
from typing import List, Optional

class MetricScore(BaseModel):
    name: str
    score: int  # 0-100
    reason: str
    examples: List[str] = []

class SpeechAnalysis(BaseModel):
    pace: str  # "Too Fast", "Good", "Too Slow"
    clarity: int  # 0-100
    conciseness: int  # 0-100
    stammering_frequency: str # "None", "Low", "Moderate", "High"
    filled_pauses_count: int # Uh, um, like
    long_pauses_count: int

class ContentAnalysis(BaseModel):
    technical_accuracy: int # 0-100
    relevance: int # 0-100
    problem_solving_skills: int # 0-100
    key_strengths: List[str]
    areas_for_improvement: List[str]

class QuestionFeedback(BaseModel):
    question_text: str
    user_response_summary: str
    score: int
    feedback: str
    better_response_suggestion: str

class InterviewAnalysisReport(BaseModel):
    overall_score: int
    summary: str
    speech_analysis: SpeechAnalysis
    content_analysis: ContentAnalysis
    question_breakdown: List[QuestionFeedback]
    actionable_tips: List[str]
    final_verdict: str # "Hire", "No Hire", "Weak Hire", "Strong Hire"
