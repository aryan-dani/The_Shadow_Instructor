from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import List
import json
import base64
import asyncio
from agents.shadow_vision import ShadowAgent

router = APIRouter()
shadow_agent = ShadowAgent()

@router.websocket("/ws/shadow")
async def shadow_websocket(websocket: WebSocket):
    print(f"👻 Shadow WebSocket Connection Request")
    await websocket.accept()
    print(f"👻 Shadow WebSocket Accepted")
    
    # Store minimal state for this connection
    active = True
    
    try:
        while active:
            # Expect JSON messages from frontend
            # { type: "frame", data: "base64..." }
            # { type: "transcript", text: "..." }
            
            try:
                data = await websocket.receive_text()
            except Exception as e:
                print(f"Shadow WebSocket Receive Error (Client disconnect?): {e}")
                break

            message = json.loads(data)
            
            response = None
            
            if message.get("type") == "frame":
                # Analyze visual cues
                try:
                    analysis = await shadow_agent.analyze_frame_and_context(message.get("data"))
                    
                    if analysis.get("status") == "alert":
                        response = {
                            "type": "feedback",
                            "category": "vision",
                            "message": analysis.get("message"),
                            "level": "warning"
                        }
                except Exception as e:
                     print(f"Shadow Vision Analysis Error: {e}")

            elif message.get("type") == "transcript":
                # Analyze text pacing
                try:
                    text = message.get("text", "")
                    analysis = await shadow_agent.analyze_pacing(text)
                    
                    if analysis.get("status") == "alert":
                        response = {
                            "type": "feedback",
                            "category": "audio",
                            "message": analysis.get("message", "Check your pacing"),
                            "level": "info"
                        }
                except Exception as e:
                    print(f"Shadow Text Analysis Error: {e}")

            if response:
                await websocket.send_json(response)
                
    except WebSocketDisconnect:
        active = False
        print("Shadow WebSocket disconnected")
    except Exception as e:
        print(f"Shadow WebSocket Error: {e}")
        try:
            await websocket.close()
        except:
            pass
