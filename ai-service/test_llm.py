import os
from dotenv import load_dotenv
from pathlib import Path
from langchain_groq import ChatGroq

load_dotenv(Path(__file__).resolve().parent / ".env")

llm = ChatGroq(
    model=os.getenv("GROQ_MODEL", "openai/gpt-oss-120b"),
    groq_api_key=os.getenv("GROQ_API_KEY"),
    temperature=0,
)

response = llm.invoke("Reply me with -- Blog pilot is working")
print(response.content)