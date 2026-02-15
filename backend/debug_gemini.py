
import os
import google.genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("GEMINI_API_KEY")

if not API_KEY:
    print("❌ Error: GEMINI_API_KEY is missing from environment.")
    exit(1)

client = google.genai.Client(api_key=API_KEY)

def list_available_models():
    print("\n🔍 Checking available models...")
    try:
        # Note: The SDK method to list models might vary, using a standard approach
        # Attempting to list via the client if supported, or manually testing common ones.
        # The genai v2 SDK (google.genai) is newer.
        
        # We will try to just print standard ones if we can't find a list method easily in code inspection
        # But let's try to use the models.list if it exists or similar.
        # Since I can't browse the SDK docs live easily, I'll rely on the user running this to see errors or success.
        
        # Standard testing sequence
        models_to_test = [
            "gemini-3-flash-preview",
            "gemini-2.0-flash-exp",
            "gemini-1.5-flash", 
            "gemini-1.5-pro"
        ]
        
        for model_name in models_to_test:
            print(f"\n   > Testing connection to: {model_name}")
            try:
                response = client.models.generate_content(
                    model=model_name,
                    contents="Hello, are you working in this region?"
                )
                print(f"   ✅ SUCCESS! {model_name} is working.")
            except Exception as e:
                print(f"   ❌ FAILED. {model_name} error: {str(e)}")

    except Exception as e:
        print(f"An error occurred during listing: {e}")

if __name__ == "__main__":
    print(f"📍 Checking Gemini Availability from this server...")
    print(f"🔑 API Key found: {'Yes' if API_KEY else 'No'}")
    list_available_models()
