from typing import TypedDict


class BlogState(TypedDict, total=False):
    topic: str

    needs_research: bool
    research_mode: str
    queries: list[str]
    evidence: list[dict]

    plan: dict

    sections: list[dict]
    generated_sections: list[dict]
    merged_content: str

    image_plan: list[dict]
    images: list[dict]

    final_content: str