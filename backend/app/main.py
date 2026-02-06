from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pypdf import PdfReader
from utils.config import config
import io
import google.auth
from google.auth.transport.requests import Request

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

@app.post("/upload-resume")
async def upload_resume(
    file: UploadFile = File(...), 
    role: str = Form(...)
):
    try:
        content = await file.read()
        text = ""
        
        if file.content_type == "application/pdf":
            pdf = PdfReader(io.BytesIO(content))
            for page in pdf.pages:
                text += page.extract_text() + "\n"
        else:
            # Assume plain text
            text = content.decode("utf-8")
            
        # Return extracted text so frontend can use it in System Prompt
        return {
            "status": "success", 
            "extracted_length": len(text),
            "extracted_text": text,
            "target_role": role
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/auth/token")
async def get_gemini_token():
    """
    Issues an access token for calling Gemini API directly.
    Prefers GEMINI_API_KEY for local development.
    Falls back to Google Cloud ADC (Service Account) for production.
    """
    import os
    
    # 1. Try API Key first (preferred for local dev)
    api_key = config.GEMINI_API_KEY
    if not api_key:
        api_key = os.environ.get("GEMINI_API_KEY")
    
    if api_key:
        print(f"Using API Key (Length: {len(api_key)})")
        return {
            "token": api_key,
            "type": "key",
            "expires_in": -1
        }
    
    # 2. Fallback to ADC OAuth (for production / cloud environments)
    try:
        SCOPES = ["https://www.googleapis.com/auth/cloud-platform"]
        creds, _ = google.auth.default(scopes=SCOPES)
        
        if not creds.valid:
            creds.refresh(Request())
            
        print("Generated OAuth Token via ADC")
        return {
            "token": creds.token,
            "type": "bearer",
            "expires_in": 3600
        }
    except Exception as e:
        print(f"ADC Token generation failed: {e}")
        raise HTTPException(
            status_code=500, 
            detail="No credentials found. Set GEMINI_API_KEY in backend/.env OR configure Google Cloud ADC."
        )

# Feedback Endpoint
from agents.feedback_agent import FeedbackAgent
from models.schemas import Message
from models.analysis_schema import InterviewAnalysisReport
from typing import List
from pydantic import BaseModel

class AnalysisRequest(BaseModel):
    history: List[Message]
    role: str

@app.post("/analyze-interview", response_model=InterviewAnalysisReport)
async def analyze_interview_endpoint(request: AnalysisRequest):
    """
    Triggers a deep-dive analysis of the interview using Gemini 3 Pro Deepthink.
    """
    agent = FeedbackAgent()
    try:
        report = await agent.generate_detailed_analysis(request.history, request.role)
        return report
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))