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
    Tries Google Cloud ADC (Service Account) first for production security.
    Falls back to GEMINI_API_KEY for local development if ADC is missing.
    """
    try:
        # 1. Try Service Account (Production / Secure)
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
        
        # 2. Fallback to API Key (Dev Only)
        api_key = config.GEMINI_API_KEY
        
        # Debugging: Check if key is actually loaded
        if not api_key:
             print("Config GEMINI_API_KEY is missing. Checking os.environ...")
             import os
             api_key = os.environ.get("GEMINI_API_KEY")

        if api_key:
            print(f"Falling back to API Key (Length: {len(api_key)})")
            return {
                "token": api_key,
                "type": "key",
                "expires_in": -1
            }
            
        print("CRITICAL: No credentials found. ADC failed and GEMINI_API_KEY not set.")
        raise HTTPException(status_code=500, detail="No credentials found. 1) Run 'gcloud auth application-default login' OR 2) Set GEMINI_API_KEY in backend/.env")