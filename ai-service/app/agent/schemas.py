from pydantic import BaseModel, Field


class ResearchDecision(BaseModel):
    needs_research: bool
    mode: str = Field(
        description="Choose closed_book, hybrid, or open_book"
    )
    queries: list[str] = Field(default_factory=list)


class SectionPlan(BaseModel):
    id: str
    title: str
    goal: str
    requiresResearch: bool = False
    requiresImage: bool = False


class BlogPlan(BaseModel):
    title: str
    audience: str
    tone: str
    sections: list[SectionPlan]


class GeneratedSection(BaseModel):
    section_id: str
    title: str
    content: str