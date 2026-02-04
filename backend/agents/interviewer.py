from google import genai
from google.genai import types
from utils.config import config
from models.schemas import Message
from utils.prompts import get_interviewer_prompt
from typing import List

class InterviewerAgent:
    def __init__(self, scenario: str = "url_shortener", resume_context: str = ""):
        self.client = genai.Client(api_key=config.GEMINI_API_KEY)
        self.model = config.INTERVIEWER_MODEL
        
        # If resume is provided, override standard prompt with a personalized one
        if resume_context:
            self.system_prompt = f"""
            You are an expert technical interviewer at a top-tier tech company.
            You are interviewing a candidate for the role of: {scenario}.
            
            CANDIDATE STARTING CONTEXT (RESUME HIGHLIGHTS):
            {resume_context[:5000]} # Truncate to avoid context limit issues initially
            
            YOUR GOAL:
            1. Conduct a rigorous but fair technical interview based on the role.
            2. Start by briefly validating 1-2 key items from their resume to build rapport.
            3. Then move quickly to a relevant system design or coding challenge fitting the role.
            4. Be professional, concise, and conversational. 
            5. Since this is a Voice/Video interview, do NOT output markdown code blocks unless absolutely necessary. Keep responses spoken-word friendly (short sentences).
            """
        else:
            self.system_prompt = get_interviewer_prompt(scenario)
        
    async def generate_response(self, history: List[Message]) -> str:
        # Convert internal history to Gemini format if needed, 
        # or just pass last few messages as prompt context.
        
        formatted_history = "\n".join([f"{msg.role}: {msg.content}" for msg in history])
        
        try:
            response = self.client.models.generate_content(
                model=self.model,
                contents=formatted_history,
                config=types.GenerateContentConfig(
                    system_instruction=self.system_prompt,
                    temperature=0.7
                )
            )
            return response.text or "I apologize, could you repeat that?"
        except Exception as e:
            print(f"Error generating interviewer response: {e}")
            return "I apologize, let's move on to the next topic."

