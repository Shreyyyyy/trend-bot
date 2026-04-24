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
        "GitHub trending LLM router multi model inference",
        "open source RAG framework trending",
        "Hacker News RAG slow expensive pipeline",
        "AI agent reliability tool failures looping",
        "PDF parsing tables images bounding boxes docling liteparse",
        "local LLM performance optimization llama.cpp vLLM",
        "arXiv retrieval embedding optimization paper",
        "smaller faster transformer architecture arXiv",
        "multimodal RAG PDF image table",
    ]

    extra = os.environ.get("EXTRA_QUERIES", "").strip()
    if extra:
        base_queries.extend([q.strip() for q in extra.split(",") if q.strip()])

    results = []
    for q in base_queries:
        r = client.search(query=q, search_depth="basic", max_results=6)
        results.append({"query": q, "results": r.get("results", [])})

    return {"queries": results}
