from collections import deque
from typing import List, Dict, Any
from models.schemas import Message

class SessionManager:
    def __init__(self):
        self._context_buffer: deque = deque(maxlen=5) # Stores last 5 turns
        self._history: List[Message] = []
        self._active_speaker: str = "interviewer" # Default start
        self._session_data: Dict[str, Any] = {}

    def add_message(self, role: str, content: str):
        message = Message(role=role, content=content)
        self._history.append(message)
        self._context_buffer.append(message)
        
        # Simple turn taking logic update
        if role == "user":
            self._active_speaker = "interviewer"
        elif role == "interviewer":
            self._active_speaker = "user"
            
    def get_context(self) -> List[Message]:
        return list(self._context_buffer)

    def get_full_history(self) -> List[Message]:
        return self._history

    def get_active_speaker(self) -> str:
        return self._active_speaker

    def set_active_speaker(self, speaker: str):
        self._active_speaker = speaker

    def clear_session(self):
        self._context_buffer.clear()
        self._history.clear()
        self._active_speaker = "interviewer"
