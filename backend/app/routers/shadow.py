from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import json
from agents.shadow_vision import ShadowAgent

router = APIRouter()
shadow_agent = ShadowAgent()

@router.websocket("/ws/shadow")
async def shadow_websocket(websocket: WebSocket, persona: str = "friendly"):
    await websocket.accept()

    try:
        while True:
            try:
                data = await websocket.receive_text()
            except Exception:
                break

            message = json.loads(data)
            response = None

            if message.get("type") == "frame":
                try:
                    analysis = await shadow_agent.analyze_frame_and_context(
                        message.get("data"), persona=persona
                    )
                    if analysis.get("status") == "alert":
                        response = {
                            "type": "feedback",
                            "category": "vision",
                            "message": analysis.get("message"),
                            "level": "warning"
                        }
                except Exception:
                    pass

            elif message.get("type") == "transcript":
                try:
                    text = message.get("text", "")
                    analysis = await shadow_agent.analyze_pacing(text, persona=persona)
                    if analysis.get("status") == "alert":
                        response = {
                            "type": "feedback",
                            "category": "audio",
                            "message": analysis.get("message", "Check your pacing"),
                            "level": "info"
                        }
                except Exception:
                    pass

            if response:
                await websocket.send_json(response)

    except WebSocketDisconnect:
        pass
    except Exception:
        try:
            await websocket.close()
        except Exception:
            pass
