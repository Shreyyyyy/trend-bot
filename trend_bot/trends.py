from __future__ import annotations

import os
from typing import Any


def fetch_trends() -> dict[str, Any]:
    """Fetch a compact set of 'trends' via Tavily search.

    We keep it deliberately simple: a handful of focused queries + top results.
    """
    api_key = os.environ.get("TAVILY_API_KEY")
    if not api_key:
        raise RuntimeError("TAVILY_API_KEY missing")

    from tavily import TavilyClient

    client = TavilyClient(api_key=api_key)

    base_queries = [
        "site:reddit.com/r/MachineLearning OR site:reddit.com/r/LocalLLM latest AI problems frustrations",
        "site:reddit.com/r/OpenAI OR site:reddit.com/r/LangChain 'how to' solve RAG issues",
        "GitHub engineering blog latest LLM infrastructure scaling",
        "GitHub trending AI projects problem solving tools",
        "Hacker News latest AI startups solving developer pain points",
        "Reddit threads 'unsolved' AI agent reliability issues",
        "GitHub issues 'help wanted' trending LLM frameworks",
        "latest engineering blogs AI infrastructure bottlenecks",
        "multimodal RAG PDF image table problem solving",
    ]

    extra = os.environ.get("EXTRA_QUERIES", "").strip()
    if extra:
        base_queries.extend([q.strip() for q in extra.split(",") if q.strip()])

    results = []
    for i, q in enumerate(base_queries):
        # Use advanced search for the first few primary queries for a 'deep dive'
        depth = "advanced" if i < 3 else "basic"
        r = client.search(query=q, search_depth=depth, max_results=6, time_range="week")
        results.append({"query": q, "results": r.get("results", [])})

    return {"queries": results}
