import json
import os

from langchain_core.messages import HumanMessage, SystemMessage
from tavily import TavilyClient

from .llm import llm
from .prompts import (
    ROUTER_PROMPT,
    PLANNER_PROMPT,
    SECTION_PROMPT,
    REDUCER_PROMPT,
)
from .schemas import ResearchDecision, BlogPlan


def router_node(state):
    decision = llm.with_structured_output(
        ResearchDecision
    ).invoke([
        SystemMessage(content=ROUTER_PROMPT),
        HumanMessage(content=f"User topic:\n{state['topic']}"),
    ])

    needs_research = decision.needs_research
    mode = decision.mode

    if mode not in {"closed_book", "hybrid", "open_book"}:
        mode = "hybrid" if needs_research else "closed_book"

    if mode == "closed_book":
        needs_research = False

    queries = decision.queries[:4] if needs_research else []

    return {
        "needs_research": needs_research,
        "research_mode": mode,
        "queries": queries,
    }


def research_node(state):
    api_key = os.getenv("TAVILY_API_KEY")

    if not api_key:
        raise RuntimeError(
            "TAVILY_API_KEY is missing, but the router requested research."
        )

    client = TavilyClient(api_key=api_key)

    evidence = []
    seen_urls = set()

    for query in state.get("queries", [])[:4]:
        response = client.search(
            query=query,
            search_depth="basic",
            max_results=3,
        )

        for result in response.get("results", []):
            url = result.get("url", "")

            if not url or url in seen_urls:
                continue

            seen_urls.add(url)

            evidence.append({
                "title": result.get("title", ""),
                "url": url,
                "snippet": result.get("content", ""),
            })

    # Keep the context bounded for the LLM.
    evidence = evidence[:10]

    return {
        "evidence": evidence,
        "sources": evidence,
    }


def planner_node(state):
    evidence = state.get("evidence", [])

    response = llm.with_structured_output(
        BlogPlan
    ).invoke([
        SystemMessage(content=PLANNER_PROMPT),
        HumanMessage(content=json.dumps({
            "topic": state["topic"],
            "research_mode": state.get(
                "research_mode", "closed_book"
            ),
            "research_evidence": evidence,
        }, ensure_ascii=False)),
    ])

    if len(response.sections) < 3:
        raise ValueError(
            "The planner must generate at least three sections."
        )

    plan = response.model_dump()

    return {
        "plan": plan,
    }


def write_section_node(state):
    """Generate one section. LangGraph invokes this node per Send task."""

    section = state["section"]
    plan = state["plan"]

    response = llm.invoke([
        SystemMessage(content=SECTION_PROMPT),
        HumanMessage(content=json.dumps({
            "topic": state["topic"],
            "audience": plan["audience"],
            "tone": plan["tone"],
            "section": section,
            #for rate limiting
            "research_evidence": state.get("evidence", [])[:3],
        }, ensure_ascii=False)),
    ])

    content = response.content

    if not isinstance(content, str):
        raise ValueError("The section writer returned unexpected content.")

    if not content.strip():
        raise ValueError(
            f"Empty content returned for section: {section['title']}"
        )

    return {
        "generated_sections": [{
            "section_id": section["id"],
            "title": section["title"],
            "content": content.strip(),
        }]
    }


# def reducer_node(state):
#     """Order parallel results and edit them into a cohesive blog."""

#     plan = state["plan"]
#     sections_by_id = {
#         section["section_id"]: section
#         for section in state.get("generated_sections", [])
#     }

#     ordered_sections = []

#     for planned_section in plan["sections"]:
#         generated = sections_by_id.get(planned_section["id"])

#         if not generated:
#             raise ValueError(
#                 f"Missing generated section: {planned_section['id']}"
#             )

#         ordered_sections.append({
#             "title": planned_section["title"],
#             "content": generated["content"],
#         })

#     response = llm.invoke([
#         SystemMessage(content=REDUCER_PROMPT),
#         HumanMessage(content=json.dumps({
#             "blog_title": plan["title"],
#             "audience": plan["audience"],
#             "tone": plan["tone"],
#             "sections": ordered_sections,
#         }, ensure_ascii=False)),
#     ])

#     content = response.content

#     if not isinstance(content, str) or not content.strip():
#         raise ValueError("The reducer returned empty blog content.")

#     return {
#         "final_content": content.strip(),
#     }



# for rate limiting

def reducer_node(state):
    plan = state["plan"]

    sections_by_id = {
        section["section_id"]: section
        for section in state.get("generated_sections", [])
    }

    parts = [f"# {plan['title']}"]

    for planned_section in plan["sections"]:
        generated = sections_by_id.get(planned_section["id"])

        if not generated:
            raise ValueError(
                f"Missing generated section: {planned_section['id']}"
            )

        parts.append(
            f"## {planned_section['title']}\n\n"
            f"{generated['content'].strip()}"
        )

    final_content = "\n\n".join(parts)

    return {"final_content": final_content}
