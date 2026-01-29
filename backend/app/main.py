from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends
from fastapi.middleware.cors import CORSMiddleware
from app.dependencies import get_api_key
from utils.session_manager import SessionManager
from agents.interviewer import InterviewerAgent
from agents.instructor import InstructorAgent
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

@app.websocket("/ws/simulation")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    
    session = SessionManager()
    interviewer = InterviewerAgent()
    instructor = InstructorAgent()
    
    # Send initial greeting
    greeting = "Hello, I'm your interviewer today. Shall we begin?"
    session.add_message("interviewer", greeting)
    await websocket.send_text(json.dumps({"role": "interviewer", "content": greeting}))
    
    try:
        while True:
            data = await websocket.receive_text()
            # Expecting JSON or plain text. Let's assume plain text message from user.
            
            # Update state with user message
            session.add_message("user", data)
            
            # Generate Interviewer Response
            history = session.get_context() # get recent context
            response_text = await interviewer.generate_response(history)
            
            session.add_message("interviewer", response_text)
            await websocket.send_text(json.dumps({"role": "interviewer", "content": response_text}))
            
            # Trigger Instructor Analysis (Shadow Mode)
            # In a real app, this might be async/background to not block conversation.
            # Here we await it for simplicity in Phase 1.
            instructor_feedback = await instructor.analyze_and_coach(session.get_full_history())
            if instructor_feedback:
                 await websocket.send_text(json.dumps({
                     "role": "instructor", 
                     "content": instructor_feedback
                 }))

    except WebSocketDisconnect:
        print("Client disconnected")
    except Exception as e:
        print(f"Error: {e}")
        await websocket.close()