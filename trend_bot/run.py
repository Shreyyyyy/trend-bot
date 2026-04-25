from __future__ import annotations

import argparse
import json
from pathlib import Path

from trend_bot.llm import generate_ideas
from trend_bot.prompt import SYSTEM_PROMPT
from trend_bot.trends import fetch_trends


def _trends_to_text(trends: dict) -> str:
    lines = []
    for block in trends.get("queries", []):
        q = block.get("query")
        lines.append(f"- Query: {q}")
        for r in block.get("results", [])[:6]:
            title = r.get("title")
            url = r.get("url")
            content = (r.get("content") or "").strip().replace("\n", " ")
            content = content[:240] + ("…" if len(content) > 240 else "")
            lines.append(f"  - {title} ({url}) :: {content}")
    return "\n".join(lines)


def _collect_source_urls(trends: dict) -> list[str]:
    urls: list[str] = []
    for block in trends.get("queries", []):
        for r in block.get("results", [])[:6]:
            u = r.get("url")
            if isinstance(u, str) and u.startswith("http"):
                urls.append(u)
    # de-dupe while preserving order
    seen = set()
    out = []
    for u in urls:
        if u in seen:
            continue
        seen.add(u)
        out.append(u)
    return out


def _postprocess_ideas(raw: str) -> str:
    """Ensure output is exactly 5 lines: 'n) Name — URL'."""
    # 1. Break into segments that look like they start a new project
    # Split by common project markers: "1.", "1)", "Project Name:", etc.
    import re
    segments = re.split(r'\n(?=\s*(?:\d+[\.\)]|Project Name:))', raw)
    if len(segments) <= 1:
        # Fallback: split by double newline if no markers found
        segments = raw.split("\n\n")

    out_lines: list[str] = []
    
    for seg in segments:
        if len(out_lines) >= 5:
            break
        
        # Try to find a project name
        name = ""
        name_match = re.search(r'(?:Project Name:\s*|(?:\d+[\.\)]\s*))([^\n—\-]+)', seg)
        if name_match:
            name = name_match.group(1).strip()
        else:
            # First non-empty line as name if no marker found
            lines = [l.strip() for l in seg.splitlines() if l.strip()]
            if lines:
                name = lines[0]
        
        # Try to find a URL
        url_match = re.search(r'https?://[^\s\)]+', seg)
        url = url_match.group(0) if url_match else "https://github.com/trending"
        
        if name:
            # Clean up name (remove colon if it was "Project Name: ...")
            name = re.sub(r'^Project Name:\s*', '', name, flags=re.IGNORECASE).strip()
            out_lines.append(f"{len(out_lines)+1}) {name} — {url}")

    # Fallback/Padding
    while len(out_lines) < 5:
        out_lines.append(f"{len(out_lines)+1}) [Idea pending further research] — https://github.com/trending")

    return "\n".join(out_lines)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", type=Path, default=Path("out"))
    args = ap.parse_args()

    args.out.mkdir(parents=True, exist_ok=True)

    trends = fetch_trends()
    (args.out / "trends.json").write_text(json.dumps(trends, indent=2), encoding="utf-8")

    trends_text = _trends_to_text(trends)
    src_urls = _collect_source_urls(trends)
    if src_urls:
        trends_text += "\n\nSOURCE URL POOL (choose exactly one per idea):\n" + "\n".join(f"- {u}" for u in src_urls[:60])
    raw = generate_ideas(SYSTEM_PROMPT, trends_text)
    ideas_text = _postprocess_ideas(raw)
    (args.out / "ideas.md").write_text(ideas_text, encoding="utf-8")

    print(f"Wrote: {args.out/'trends.json'}")
    print(f"Wrote: {args.out/'ideas.md'}")


if __name__ == "__main__":
    main()
