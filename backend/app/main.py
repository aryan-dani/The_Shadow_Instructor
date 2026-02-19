from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from app.routers import auth, resume, shadow
from agents.feedback_agent import FeedbackAgent
from models.schemas import Message
from models.analysis_schema import InterviewAnalysisReport
from typing import List
from pydantic import BaseModel

app = FastAPI(title="The Shadow Instructor API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health_check():
    return {"status": "ok", "phase": "The Spine"}

# Include Routers
app.include_router(auth.router, prefix="/auth", tags=["Auth"])
app.include_router(resume.router, tags=["Resume"])
app.include_router(shadow.router)

# Feedback Endpoint (To be refactored into a router later if needed)
class AnalysisRequest(BaseModel):
    history: List[Message]
    role: str
    user_id: str | None = None  # Optional user_id

@app.post("/analyze-interview", response_model=InterviewAnalysisReport)
async def analyze_interview_endpoint(request: AnalysisRequest):
    """Triggers a deep-dive analysis of the interview transcript."""
    agent = FeedbackAgent()
    try:
        report = await agent.generate_detailed_analysis(request.history, request.role)
        return report
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
