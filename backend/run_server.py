
import uvicorn
import os

if __name__ == "__main__":
    # In development, you might want restart, but it kills WebSockets.
    # To prevent StatReload from killing active sessions during code edits, 
    # you can either:
    # 1. Disable reload (workers=1, reload=False)
    # 2. Exclude specific files/dirs (reload_excludes)
    
    # "Production-like" runner for local dev stability
    uvicorn.run(
        "app.main:app",
        host="127.0.0.1",
        port=8000,
        reload=True,  # Set to False for absolute stability
        reload_excludes=["agents/*", "logs/*"], # Example exclusions
        ws_ping_interval=None, # Prevent aggressive ping disconnects if needed
        ws_ping_timeout=None
    )
