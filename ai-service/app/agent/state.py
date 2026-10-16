from typing import Annotated, TypedDict
import operator


class BlogState(TypedDict, total=False):
    topic: str

    needs_research: bool
    research_mode: str
    queries: list[str]

    evidence: list[dict]
    sources: list[dict]

    plan: dict
    generated_sections: Annotated[list[dict], operator.add]

    final_content: str