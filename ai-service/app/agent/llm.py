import os
from pathlib import Path

from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI

load_dotenv(Path(__file__).resolve().parents[2] / ".env")

api_key = os.getenv("GOOGLE_API_KEY")
model_name = os.getenv("GEMINI_MODEL", "gemini-3.6-flash")

if not api_key:
    raise RuntimeError("GOOGLE_API_KEY is missing")

print(f"Gemini model configured: {model_name}")

llm = ChatGoogleGenerativeAI(
    model=model_name,
    temperature=0.4,
    google_api_key=api_key,
)