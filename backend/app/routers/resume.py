from fastapi import APIRouter, UploadFile, File, Form
from pypdf import PdfReader
import io
from app.services.resume_service import analyze_resume_with_gemini, analyze_resume_with_groq
from utils.config import config

router = APIRouter()

@router.post("/upload-resume")
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
            text = content.decode("utf-8")

        return {
            "status": "success",
            "extracted_length": len(text),
            "extracted_text": text,
            "target_role": role
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

@router.post("/analyze-resume-visual")
async def analyze_resume_visual(file: UploadFile = File(...)):
    """Uploads a PDF and analyzes formatting. Falls back to Groq on rate limit."""
    try:
        content = await file.read()

        try:
            return await analyze_resume_with_gemini(content)
        except Exception as gemini_error:
            error_str = str(gemini_error).lower()
            is_retryable = any(k in error_str for k in [
                "429", "resource_exhausted", "quota", "rate", "location", "precondition"
            ])

            if is_retryable and config.GROQ_API_KEY:
                return await analyze_resume_with_groq(content)

            raise gemini_error

    except Exception as e:
        return {"status": "error", "message": str(e)}
