import os
from dotenv import load_dotenv
from pathlib import Path
from langchain_google_genai import ChatGoogleGenerativeAI

load_dotenv(Path(__file__).resolve().parent / ".env")

llm = ChatGoogleGenerativeAI(
    model=os.getenv("GEMINI_MODEL", "gemini-3.6-flash"),
    google_api_key=os.getenv("GOOGLE_API_KEY"),
    temperature=0,
)

response = llm.invoke("Reply with exactly: BlogPilot is working.")
print(response.content)