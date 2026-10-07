from pydantic import BaseModel, Field


class ResearchDecision(BaseModel):
    needs_research: bool
    mode: str = Field(
        description="One of: closed_book, hybrid, open_book"
    )
    queries: list[str] = Field(default_factory=list)


class SectionPlan(BaseModel):
    id: str
    title: str
    goal: str
    requires_research: bool = False
    requires_image: bool = False


class BlogPlan(BaseModel):
    title: str
    audience: str
    tone: str
    sections: list[SectionPlan]


class Source(BaseModel):
    title: str = ""
    url: str = ""
    snippet: str = ""


class ImagePlan(BaseModel):
    section_id: str
    description: str
    alt: str


class GeneratedBlog(BaseModel):
    title: str
    content: str