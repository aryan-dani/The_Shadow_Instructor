import asyncio
import io
import json
from pypdf import PdfReader
from utils.config import config
from utils.gemini_client import get_gemini_client
from google.genai import types


async def analyze_resume_with_gemini(content: bytes) -> dict:
    """Analyze resume visually using Gemini via Vertex AI."""
    client = get_gemini_client()

    # Vertex AI: send PDF as inline bytes
    file_part = types.Part.from_bytes(data=content, mime_type="application/pdf")

    prompt = """You are a Professional Resume Design Consultant.
Analyze this Resume PDF for visual and formatting quality.

Evaluate:
1. **Layout & Whitespace** — Is the spacing balanced? Are margins appropriate?
2. **Typography** — Are fonts consistent and professional? Is hierarchy clear?
3. **Visual Hierarchy** — Is important info easy to find? Are sections well-defined?
4. **Overall Aesthetics** — Does it look modern and polished?

Output JSON:
{
    "score": 1-10,
    "summary": "2-3 sentence professional assessment.",
    "issues": [
        {"category": "Layout|Typography|Hierarchy|Aesthetics", "description": "...", "suggestion": "..."}
    ],
    "strengths": ["..."]
}

Be constructive and actionable."""

    response = await asyncio.to_thread(
        client.models.generate_content,
        model=config.SHADOW_MODEL,
        contents=[file_part, prompt],
        config=types.GenerateContentConfig(
            response_mime_type="application/json"
        )
    )

    if response.text is None:
        raise ValueError("Empty response from Gemini API")

    result = json.loads(response.text)
    result["analysis_mode"] = "visual"
    return result


async def analyze_resume_with_groq(content: bytes) -> dict:
    """Fallback: Analyze resume using Groq (text-based analysis only)."""
    from groq import Groq

    if not config.GROQ_API_KEY:
        raise ValueError("Groq API key not configured")

    pdf = PdfReader(io.BytesIO(content))
    extracted_text = "\n".join([page.extract_text() for page in pdf.pages])

    prompt = """You are a Professional Resume Consultant.
Analyze this resume TEXT for structure and content quality.

Focus on:
1. **Content Structure** — Are sections well-organized and logically grouped?
2. **Professional Language** — Is the writing clear, concise, and professional?
3. **Information Completeness** — Are key sections present (experience, skills, education)?
4. **Formatting Indicators** — Based on text structure, infer potential formatting issues.

Output JSON:
{
    "score": 1-10,
    "summary": "2-3 sentence professional assessment.",
    "issues": [
        {"category": "Structure|Content|Language|Completeness", "description": "...", "suggestion": "..."}
    ],
    "strengths": ["..."]
}

Return ONLY the JSON object."""

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
    result["analysis_mode"] = "text"
    return result
