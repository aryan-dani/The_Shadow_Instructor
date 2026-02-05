The Shadow Instructor

A Dual-Agent AI Interview Simulation Platform

Table of Contents

1.  Project Overview
2.  Problem Statement
3.  Proposed Solution
4.  Architecture
5.  Key Features
6.  Technology Stack
7.  Prerequisites
8.  Installation and Setup
    8.1. Backend Setup
    8.2. Frontend Setup
9.  Usage Guide
10. Hackathon Submission Details
11. Contributing
12. License

13. Project Overview

The Shadow Instructor is a sophisticated live interview simulation platform developed for the "AI for Bharat" Hackathon (https://vision.hack2skill.com/event/ai-for-bharat). It leverages Google's Gemini Multimodal Live API to provide a real-time, voice-first technical interview experience. The system utilizes a unique dual-agent architecture comprising an "Interviewer Agent" that conducts the session and a "Shadow (Instructor) Agent" that provides silent analysis and structured feedback, enabling candidates to practice in a hyper-realistic, low-latency environment tailored to their specific resume and target role.

2. Problem Statement

Job seekers, particularly students and early-career professionals, face significant challenges in interview preparation:

- Performance Anxiety: A lack of realistic environments to practice verbal communication under pressure.
- Generic Feedback: Existing mock interview solutions often provide generic responses that lack technical depth or specificity to the user's background.
- Context Awareness: Standard AI chatbots fail to tailor questions to the candidate's actual resume or specific job description.
- Latency Issues: Text-based interactions disrupt the natural flow required for verbal interview practice.

3. Proposed Solution

The Shadow Instructor addresses these issues through a web-based platform that offers:

- Real-time Voice Interaction: Sub-second latency conversation using Gemini 2.5 Flash.
- Resume Contextualization: Automated parsing of PDF resumes to seed the interview context.
- Dual-Agent Feedback Loop:
  - The Interviewer conducts the session, challenging the user on technical concepts.
  - The Instructor analyzes the transcript to generate a comprehensive scorecard on technical accuracy and communication clarity.

4. Architecture

The system follows a Hybrid Client-Server-Cloud architecture:

- Frontend (Next.js 16): Handles the user interface, audio capture (PCM 16kHz), and direct WebSocket communication with the Gemini API. It manages local audio buffering and implements Voice Activity Detection (VAD) for interruptibility.
- Backend (FastAPI): Serves as the trust anchor. It handles resume uploads, parses PDF content, and issues short-lived OAuth tokens for the frontend to securely access Google Cloud services.
- Cloud (Google Gemini):
  - Gemini 2.5 Flash Native Audio Preview: Powers the low-latency live interview session.
  - Gemini 3 Pro Preview: Powers the Instructor agent for high-level reasoning and feedback generation.

5. Key Features

- Resume-Based Personalization: The system extracts text from uploaded resumes to tailor interview questions specifically to the candidate's experience.
- Low-Latency Voice Interface: Direct WebSocket connection ensures a conversational flow comparable to human interaction.
- Interruptibility: Users can interrupt the AI at any point, and the system will immediately cease audio output and listen, mimicking natural conversation dynamics.
- Structured Feedback Reports: Post-interview analysis provides actionable insights into technical strenghts and weaknesses.
- Secure Architecture: Uses a token-vending pattern to prevent exposure of long-lived API keys on the client side.

6. Technology Stack

- Frontend: Next.js 16, TypeScript, Tailwind CSS, Web Audio API
- Backend: Python 3.10+, FastAPI, PyPDF, Google Auth
- AI Models: Google Gemini 2.5 Flash (Audio), Google Gemini 3 Pro (Text/Reasoning)
- Infrastructure: Google Cloud Platform (Vertex AI / Generative Language API)

7. Prerequisites

- Node.js v18 or higher
- Python 3.10 or higher
- Google Cloud Platform Account with Gemini API enabled
- A Google Cloud Service Account JSON key (for production) or an API Key (for development)

8. Installation and Setup

8.1. Backend Setup

1.  Navigate to the backend directory:
    cd backend

2.  Create a virtual environment:
    python -m venv venv
    source venv/bin/activate # On Windows: venv\Scripts\activate

3.  Install dependencies:
    pip install -r requirements.txt

4.  Configure Environment Variables:
    Create a .env file in the backend directory.
    Add your GEMINI_API_KEY:
    GEMINI_API_KEY=your_api_key_here

5.  Run the server:
    uvicorn app.main:app --reload

    The backend will start at http://localhost:8000.

8.2. Frontend Setup

1.  Navigate to the frontend directory:
    cd frontend

2.  Install dependencies:
    npm install

3.  Run the development server:
    npm run dev

    The application will act as a client at http://localhost:3000.

4.  Usage Guide

5.  Open the application in a modern web browser (Chrome or Edge recommended).
6.  Upload a PDF version of your resume.
7.  Enter the target job role (e.g., "Senior Backend Engineer").
8.  Click "Start Interview" to initialize the WebSocket connection.
9.  Allow microphone permissions when prompted.
10. Engage in the interview. Speak clearly and naturally.
11. End the session to view the feedback generated by the Instructor agent.

12. Hackathon Submission Details

This project is submitted for the "AI for Bharat" Hackathon. It demonstrates the application of Multimodal AI to the domain of Education and Developer Productivity.

Team: The Shadow Instructor Team
Repository: https://github.com/aryan-dani/The_Shadow_Instructor

11. Contributing

This project is a prototype developed for a hackathon. Contributions are welcome but should be discussed via issues first.

12. License

This project is licensed under the MIT License - see the LICENSE file for details.
