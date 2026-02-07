from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pypdf import PdfReader
from utils.config import config
import io
import google.auth
from google.auth.transport.requests import Request
import asyncio
import json

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
    user_id: str | None = None  # Optional user_id

@app.post("/analyze-interview", response_model=InterviewAnalysisReport)
async def analyze_interview_endpoint(request: AnalysisRequest):
    """
    Triggers a deep-dive analysis of the interview using Gemini 3 Pro Deepthink.
    """
    agent = FeedbackAgent()
    try:
        report = await agent.generate_detailed_analysis(request.history, request.role)
        
        # Save to Supabase if user_id is provided
        if request.user_id:
            from utils.db import db
            supabase = db.get_client()
            if supabase:
                try:
                    # 1. Insert Interview
                    interview_data = {
                        "user_id": request.user_id,
                        "job_role": request.role,
                        "topic": "General Interview", # Can be improved later
                        "overall_score": report.overall_score,
                        "transcript": agent._format_history(request.history) 
                    }
                    response = supabase.table("interviews").insert(interview_data).execute()
                    
                    if response.data and isinstance(response.data, list) and len(response.data) > 0 and isinstance(response.data[0], dict):
                        interview_id = response.data[0].get("id")
                        
                        # 2. Insert Metrics
                        metrics_data = [
                            {"interview_id": interview_id, "metric_name": "Clarity", "score": report.speech_analysis.clarity},
                            {"interview_id": interview_id, "metric_name": "Conciseness", "score": report.speech_analysis.conciseness},
                            {"interview_id": interview_id, "metric_name": "Technical Accuracy", "score": report.content_analysis.technical_accuracy},
                            {"interview_id": interview_id, "metric_name": "Problem Solving", "score": report.content_analysis.problem_solving_skills},
                        ]
                        supabase.table("interview_metrics").insert(metrics_data).execute()
                        print(f"Saved interview {interview_id} for user {request.user_id}")
                except Exception as db_error:
                    print(f"Failed to save to Supabase: {db_error}")

        return report
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==================== SHADOW ROUTES ====================
from app.routers import shadow
app.include_router(shadow.router)

# ==================== VISUAL ROAST ====================
async def _analyze_resume_with_gemini(content: bytes) -> dict:
    """Analyze resume visually using Gemini (can see the PDF)"""
    from google import genai
    from google.genai import types
    
    client = genai.Client(api_key=config.GEMINI_API_KEY)
    
    start_pdf_upload = await asyncio.to_thread(
        client.files.upload,
        file=io.BytesIO(content),
        config={"mime_type": "application/pdf"}
    )
    
    if not start_pdf_upload.uri:
        raise ValueError("Failed to upload file to Gemini")
    
    prompt = """
    You are a Professional Resume Design Consultant.
    Analyze this Resume PDF for visual and formatting quality.
    
    Evaluate:
    1. **Layout & Whitespace**: Is the spacing balanced? Are margins appropriate?
    2. **Typography**: Are fonts consistent and professional? Is hierarchy clear?
    3. **Visual Hierarchy**: Is important info easy to find? Are sections clear?
    4. **Overall Aesthetics**: Does it look modern and polished?
    
    Output a JSON object:
    {
        "score": 1-10 (10 is excellent),
        "summary": "A 2-3 sentence professional assessment of the overall design.",
        "issues": [
            { "category": "Layout|Typography|Hierarchy|Aesthetics", "description": "What the issue is", "suggestion": "How to fix it" }
        ],
        "strengths": ["List of things done well"]
    }
    
    Be constructive and helpful. Focus on actionable improvements.
    """
    
    response = await asyncio.to_thread(
        client.models.generate_content,
        model=config.SHADOW_MODEL,
        contents=[types.Part.from_uri(file_uri=start_pdf_upload.uri, mime_type="application/pdf"), prompt],
        config=types.GenerateContentConfig(
            response_mime_type="application/json"
        )
    )
    
    if response.text is None:
        raise ValueError("Empty response from Gemini API")
    
    result = json.loads(response.text)
    result["analysis_mode"] = "visual"
    return result


async def _analyze_resume_with_groq(content: bytes) -> dict:
    """Fallback: Analyze resume using Groq (text-based analysis only)"""
    from groq import Groq
    
    if not config.GROQ_API_KEY:
        raise ValueError("Groq API key not configured")
    
    # Extract text from PDF since Groq can't see the PDF visually
    pdf = PdfReader(io.BytesIO(content))
    extracted_text = ""
    for page in pdf.pages:
        extracted_text += page.extract_text() + "\n"
    
    prompt = """You are a Professional Resume Consultant.
Analyze this resume TEXT for structure and content quality.

Since you're analyzing extracted text (not the visual PDF), focus on:
1. **Content Structure**: Are sections well-organized? Is information logically grouped?
2. **Professional Language**: Is the writing clear, concise, and professional?
3. **Information Completeness**: Are key sections present (experience, skills, education)?
4. **Formatting Indicators**: Based on text structure, infer potential formatting issues.

Output a JSON object:
{
    "score": 1-10 (10 is excellent),
    "summary": "A 2-3 sentence professional assessment.",
    "issues": [
        { "category": "Structure|Content|Language|Completeness", "description": "What the issue is", "suggestion": "How to fix it" }
    ],
    "strengths": ["List of things done well"]
}

Be constructive and helpful. Focus on actionable improvements.
IMPORTANT: Return ONLY the JSON object, no markdown or extra text."""

    groq_client = Groq(api_key=config.GROQ_API_KEY)
    
    def _sync_call():
        return groq_client.chat.completions.create(
            model=config.GROQ_MODEL,
            messages=[
                {"role": "system", "content": prompt},
                {"role": "user", "content": f"RESUME TEXT:\n{extracted_text}"}
            ],
            temperature=0.3,
            response_format={"type": "json_object"}
        )
    
    completion = await asyncio.to_thread(_sync_call)
    message_content = completion.choices[0].message.content
    if message_content is None:
        raise ValueError("Empty response from Groq API")
    result = json.loads(message_content)
    result["analysis_mode"] = "text"  # Indicate this was text-only analysis
    return result


@app.post("/analyze-resume-visual")
async def analyze_resume_visual(
    file: UploadFile = File(...)
):
    """
    Uploads a PDF, sends it to Gemini to visually analyze formatting.
    Falls back to Groq (text-based analysis) if Gemini rate limits are hit.
    """
    try:
        content = await file.read()
        
        # Try Gemini first (visual analysis)
        try:
            print("[ResumeAnalyzer] Attempting visual analysis with Gemini...")
            return await _analyze_resume_with_gemini(content)
        
        except Exception as gemini_error:
            error_str = str(gemini_error).lower()
            
            # Check if it's a rate limit error
            is_rate_limit = (
                "429" in error_str or 
                "resource_exhausted" in error_str or 
                "quota" in error_str or
                "rate" in error_str
            )
            
            if is_rate_limit and config.GROQ_API_KEY:
                print(f"[ResumeAnalyzer] Gemini rate limited. Falling back to Groq (text-based)...")
                return await _analyze_resume_with_groq(content)
            else:
                raise gemini_error
        
    except Exception as e:
        print(f"Visual Roast Error: {e}")
        return {"status": "error", "message": str(e)}