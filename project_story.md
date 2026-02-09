# Project Story: The Shadow Instructor

## Inspiration

We've all been there: the sweaty palms, the racing heart, the blanking out on a question you *knew* the answer to five minutes ago. Technical interviews are less about what you know and more about how you communicate it under pressure.

Existing interview prep tools are either static code editors (LeetCode) or passive video recorders. They lack the **immediacy** of a real human interviewer and the **insight** of an expert coach. We wanted to bridge that gap. We asked ourselves: *What if you could bring a senior engineer into the interview with you, but they were invisible to the interviewer, whispering advice in your ear?*

That thought experiment gave birth to **The Shadow Instructor**—a dual-agent AI platform where you face a tough Interviewer while a benevolent Shadow critiques your performance in real-time.

## What it does

**The Shadow Instructor** is a real-time, multimodal interview simulation platform. You upload your resume, choose a persona (e.g., "Friendly Startup," "Tough FAANG"), and enter a live video call.

1.  **The Interviewer Agent**: Drives the conversation, asks dynamic follow-up questions based on your resume, and challenges your technical depth.
2.  **The Shadow Agent**: Silently observes the interaction. It analyzes your answers, your pacing, and even your non-verbal cues (eye contact, hesitation). It provides ephemeral "heads-up" feedback on your dashboard without interrupting the flow.

At the end, you receive a comprehensive **Shadow Report** breaking down your technical accuracy, communication clarity, and soft skills, complete with a transcript and actionable improvement plan.

## How we built it

We architected a **Dual-Agent System** to separate the "adversarial" role of the interviewer from the "cooperative" role of the instructor.

*   **The Brain (AI)**: We leveraged **Google's Gemini 1.5 Pro** for the heavy lifting (Instructor logic) and **Gemini 1.5 Flash** for low-latency conversation (Interviewer logic). We used complex system prompting to ensure the agents don't hallucinate or speak over each other.
*   **The Spine (Backend)**: Built with **FastAPI** and Python. We implemented a custom `SessionManager` state machine to track the conversation context window (last 5 turns) and manage the turn-taking logic between the user and the two agents.
*   **The Nervous System (Real-time)**: We used **WebSockets** to stream audio transcripts and analysis data with sub-500ms latency.
*   **The Face (Frontend)**: A high-performance **Next.js** application styled with **Tailwind CSS** and **Framer Motion** for a sleek, dark-mode, enterprise-grade aesthetic.
*   **The Eyes (Vision)**: We integrated browser-based media streams to capture video, implementing a "Shadow Observer" hook that analyzes user presence.

We also mathematically modeled the interview performance using a weighted scoring algorithm:

$$ Performance(P) = \frac{\sum (w_t \cdot T_{ech} + w_c \cdot C_{omm} + w_v \cdot V_{ibe})}{|Terms|} $$

Where \\( T_{ech} \\) matches key technical keywords from the resume, and \\( V_{ibe} \\) represents non-verbal confidence metrics.

## Challenges we ran into

*   **The Rate Limit Wall**: We hit the `429 RESOURCE_EXHAUSTED` error hard during testing. We had to implement robust error handling and a fallback mechanism to alternative models (like Groq) to keep the simulation running smoothly even under load.
*   **The "Overcast" Shadow**: Initially, the Shadow Instructor was too chatty, flooding the UI with feedback. We had to tune the prompt temperature (0.5) and add logic to only critique significant events, rather than every single sentence.
*   **State Management**: Synchronizing the frontend video state with the backend's conversation state was tricky. We used a custom WebSocket protocol to ensure that when the AI "Stopped speaking," the frontend UI updated instantly.

## Accomplishments that we're proud of

*   **Real-Time "Vibe Checks"**: Getting the Shadow Agent to correctly identify when a user was rambling vs. giving a detailed answer was a huge win.
*   **Resume Parsing**: We built a custom heuristic parser that extracts skills and experience from raw text with surprising accuracy, allowing the AI to ask questions like *"Tell me more about your time at [Company From Resume]."*
*   **The UI Polish**: We moved away from a "hackathon MVP" look to a polished, "Dark Mode" aesthetic that feels like a shipping product.

## What we learned

*   **Context is King**: AI models forget quickly. Managing a strict sliding window of context (last 5 turns) was crucial for keeping the interview coherent without blowing up token costs.
*   **Latency Matters More Than Intelligence**: For a conversational interface, a faster answer is often better than a perfect answer. Optimizing our WebSocket payloads was essential.

## What's next for The Shadow Instructor

*   **Voice-to-Voice**: Currently we use speech-to-text. The next step is direct audio stream processing for even lower latency.
*   **Multiplayer Mock Interviews**: Allowing a human friend to take over the "Interviewer" role while the AI remains as the "Shadow Instructor" to grade both parties.
*   **Emotion Analysis**: Deepening the computer vision aspect to detect micro-expressions of stress and prompt the user to "take a breath."
