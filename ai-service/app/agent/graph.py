from langgraph.graph import StateGraph, START, END
from langgraph.types import Send

from .state import BlogState
from .nodes import (
    router_node,
    research_node,
    planner_node,
    write_section_node,
    reducer_node,
)


def route_after_router(state: BlogState):
    if state.get("needs_research", False):
        return "research"

    return "planner"


def dispatch_workers(state: BlogState):
    """Fan out one task per planned section."""

    return [
        Send(
            "write_section",
            {
                "topic": state["topic"],
                "plan": state["plan"],
                "section": section,
                "evidence": state.get("evidence", []),
            },
        )
        for section in state["plan"]["sections"]
    ]


builder = StateGraph(BlogState)

builder.add_node("router", router_node)
builder.add_node("research", research_node)
builder.add_node("planner", planner_node)
builder.add_node("write_section", write_section_node)
builder.add_node("reducer", reducer_node)

builder.add_edge(START, "router")

builder.add_conditional_edges(
    "router",
    route_after_router,
    {
        "research": "research",
        "planner": "planner",
    },
)

builder.add_edge("research", "planner")

builder.add_conditional_edges(
    "planner",
    dispatch_workers,
)

builder.add_edge("write_section", "reducer")
builder.add_edge("reducer", END)

blog_graph = builder.compile()