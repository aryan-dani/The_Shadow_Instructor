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

# ==================== SHADOW ROUTES ====================
from app.routers import shadow
app.include_router(shadow.router)

# ==================== VISUAL ROAST ====================
@app.post("/analyze-resume-visual")
async def analyze_resume_visual(
    file: UploadFile = File(...)
):
    """
    Uploads a PDF, sends it to Gemini 1.5 Pro to visually 'roast' the formatting.
    """
    from google import genai
    from google.genai import types
    
    try:
        content = await file.read()
        
        # Initialize Client
        client = genai.Client(api_key=config.GEMINI_API_KEY)
        
        # Upload file to Gemini (Ephemeral upload)
        # Note: In production, manage file lifecycle. for now, let it auto-expire.
        # The SDK might expect a path or file-like object. 
        # API expects 'client.files.upload'
        
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
        return json.loads(response.text)
        
    except Exception as e:
        print(f"Visual Roast Error: {e}")
        return {"status": "error", "message": str(e)}