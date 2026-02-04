from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from app.dependencies import get_api_key
from utils.session_manager import SessionManager
from agents.interviewer import InterviewerAgent
from agents.instructor import InstructorAgent
from utils.prompts import SCENARIOS
from pypdf import PdfReader
from utils.config import config
from google import genai
from google.genai import types
import io
import json
import random
import asyncio
import traceback
import base64

app = FastAPI(title="The Shadow Instructor API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Store processed resume data temporarily (in production, use a DB/Session Store)
# keyed by some session_id or just a simple global for this single-user demo
CURRENT_CONTEXT = {
    "resume_text": "",
    "target_role": "General Software Engineer"
}

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
            
        # Update global context
        CURRENT_CONTEXT["resume_text"] = text
        CURRENT_CONTEXT["target_role"] = role
        
        return {"status": "success", "extracted_length": len(text)}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.websocket("/ws/simulation")
async def websocket_endpoint(websocket: WebSocket, scenario: str = "url_shortener"):
    await websocket.accept()
    
    # Configuration for Gemini Live
    # Using v1alpha for Native Audio Preview features
    client = genai.Client(api_key=config.GEMINI_API_KEY, http_options={'api_version': 'v1alpha'})
    
    # Prepare System Logic
    role = CURRENT_CONTEXT["target_role"]
    resume = CURRENT_CONTEXT["resume_text"]
    
    system_instruction = f"""
    You are an expert technical interviewer at a top tech company.
    You are interviewing the candidate for the role of: {role}.
    
    CANDIDATE STARTING CONTEXT (RESUME HIGHLIGHTS):
    {resume[:4000]}
    
    YOUR GOAL:
    1. Conduct a rigorous but fair technical interview.
    2. Start by briefly validating 1-2 key items from their resume to build rapport.
    3. Then move to a system design or coding challenge fitting the role.
    4. Speak naturally, professionally, and concisely. 
    5. This is a VOICE interview. Keep responses spoken-word friendly.
    """

    speech_config = types.SpeechConfig(
        voice_config=types.VoiceConfig(
            prebuilt_voice_config=types.PrebuiltVoiceConfig(
                voice_name='Kore' 
            )
        )
    )

    try:
        # Connect to Gemini Live Session
        # Using specific Native Audio model for bidi streaming
        async with client.aio.live.connect(
            model="gemini-2.5-flash-native-audio-preview-12-2025", 
            config=types.LiveConnectConfig(
                response_modalities=[types.Modality.AUDIO], # Native Audio Output
                speech_config=speech_config,
                system_instruction=system_instruction
            )
        ) as session:
            
            print("Connected to Gemini Live...")

            async def receive_from_client():
                """Listen for Audio/Text from Frontend -> Send to Gemini"""
                try:
                    while True:
                        message = await websocket.receive()
                        
                        if "bytes" in message:
                            # Forward Audio Chunk to Gemini
                            # Wrap in media_chunks as expected by LiveClientRealtimeInput
                            await session.send(input={"media_chunks": [{"data": message["bytes"], "mime_type": "audio/webm"}]}, end_of_turn=False)
                        
                        elif "text" in message:
                            # Forward Text to Gemini
                            try:
                                data = json.loads(message["text"])
                                if "content" in data:
                                    await session.send(input=data["content"], end_of_turn=True)
                            except:
                                pass # ignore bad json
                except WebSocketDisconnect:
                    print("Client disconnected (receive loop)")
                except Exception as e:
                    print(f"Error in receive_from_client: {e}")

            async def send_to_client():
                """Listen for Audio/Text from Gemini -> Send to Audio Player / Chat"""
                try:
                    async for response in session.receive():
                        # Handle Audio
                        if response.data:
                            await websocket.send_bytes(response.data)

                        # Handle Text (if available in this modality)
                        if response.text:
                            await websocket.send_text(json.dumps({
                                "role": "interviewer", 
                                "content": response.text
                            }))
                            
                except Exception as e:
                     print(f"Error in send_to_client: {e}")
                     traceback.print_exc()

            # Run both loops concurrently
            await asyncio.gather(receive_from_client(), send_to_client())

    except Exception as e:
        print(f"Gemini Live Connection Error: {e}")
        traceback.print_exc()
        await websocket.close()