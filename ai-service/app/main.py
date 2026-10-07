from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()


class GenerateBlogRequest(BaseModel):
    prompt: str


@app.get("/")
def health():
    return {
        "success": True,
        "message": "AI service is running",
    }

@app.get("/health")
def health():
    return {
        "success": True,
        "message": "AI service is healthy",
    }


@app.post("/generate")
def generate_blog(request: GenerateBlogRequest):
    return {
        "success": True,
        "data": {
            "title": "Test AI Generated Blog",

            "content": f"""# Test AI Generated Blog

## Introduction

This is a temporary response from the AI service.

User prompt:

{request.prompt}

## Conclusion

The Express backend successfully communicated with the FastAPI service.
""",

            "plan": {
                "title": "Test AI Generated Blog",
                "audience": "General readers",
                "tone": "Professional",
                "sections": [
                    {
                        "id": "introduction",
                        "title": "Introduction",
                        "goal": "Introduce the topic",
                        "requiresResearch": False,
                        "requiresImage": False
                    },
                    {
                        "id": "main-content",
                        "title": "Main Content",
                        "goal": "Explain the topic",
                        "requiresResearch": False,
                        "requiresImage": False
                    },
                    {
                        "id": "conclusion",
                        "title": "Conclusion",
                        "goal": "Summarize the topic",
                        "requiresResearch": False,
                        "requiresImage": False
                    }
                ]
            },

            "sources": [],

            "images": []
        }
    }