from pydantic import BaseModel
from typing import List, Optional

class Message(BaseModel):
    role: str
    content: str
    timestamp: Optional[float] = None

class Feedback(BaseModel):
    score: int
    pros: List[str]
    cons: List[str]
    improvement_tip: str

class SessionState(BaseModel):
    session_id: str
    active_speaker: str  # "user", "interviewer", "instructor"
    turn_count: int
    context_keys: List[str] = []
