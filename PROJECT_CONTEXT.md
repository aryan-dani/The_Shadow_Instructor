# The Shadow Instructor - Project Context

## Overview

"The Shadow Instructor" is a next-gen live interview simulation platform. It uses a dual-agent system (Interviewer & Instructor) to provide real-time practice and feedback.

## Current Status

**Phase 1: The Spine (Completed)** - 2026-01-29

- Scaffolding of the backend structure.
- Implementation of the Dual-Agent architecture (`gemini-3-flash-preview` & `gemini-3-pro-preview`).
- `SessionManager` state machine implemented.
- FastAPI server with `/ws/simulation` WebSocket endpoint active.
- Verified end-to-end communication.

## Architecture

- **Backend**: FastAPI (Python)
- **Agents**: Google GenAI SDK
  - `InterviewerAgent`: Conducts the interview.
  - `InstructorAgent`: Shadow logic, analysis, and feedback.
- **State**: In-memory `SessionManager` (Context window of 5 turns).

## Directory Structure

```
backend/
├── app/
│   ├── main.py          # Entry point, WebSocket handler
│   └── dependencies.py  # Security & Helpers
├── agents/
│   ├── interviewer.py   # Interviewer logic
│   └── instructor.py    # Instructor/Shadow logic
├── utils/
│   ├── session_manager.py # State management
│   └── config.py        # Env vars
├── models/
│   └── schemas.py       # Pydantic models
└── requirements.txt
```

## How to Run

1. Ensure `.env` has `GEMINI_API_KEY`.
2. `cd backend`
3. `uvicorn app.main:app --reload`
4. Connect via WebSocket to `ws://localhost:8000/ws/simulation`.

## Roadmap

- [x] **Phase 1: The Spine** (Backend scaffolding & Basic Agents)
- [x] **Phase 2: The Flesh** (Detailed Prompt Engineering, System Design Scenarios, Structured Feedback)
  - [x] Detailed System Design prompt implemented.
  - [x] Structured Feedback (JSON) implemented for Instructor.
- [ ] **Phase 3: The Skin** (Frontend Interface, Voice capability)
      
