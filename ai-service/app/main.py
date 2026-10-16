import logging

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from app.agent.graph import blog_graph


logging.basicConfig(level=logging.INFO)

app = FastAPI(title="BlogPilot AI Service")


class GenerateBlogRequest(BaseModel):
    prompt: str = Field(min_length=3, max_length=5000)


@app.get("/health")
def health():
    return {
        "success": True,
        "message": "AI service is running",
    }


@app.post("/generate")
def generate_blog(request: GenerateBlogRequest):
    prompt = request.prompt.strip()

    if len(prompt) < 3:
        raise HTTPException(
            status_code=400,
            detail="Please provide a more descriptive prompt.",
        )

    try:
        result = blog_graph.invoke({
            "topic": prompt,
            "generated_sections": [],
        })

        plan = result["plan"]
        content = result["final_content"]

        return {
            "success": True,
            "data": {
                "title": plan["title"],
                "content": content,
                "plan": plan,
                "sources": result.get("sources", []),
                "images": [],
            },
        }

    except Exception:
        logging.exception("Blog generation failed")

        raise HTTPException(
            status_code=502,
            detail="The blog agent failed to generate content.",
        )