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
    lines = [ln.strip() for ln in raw.splitlines() if ln.strip()]
    out_lines: list[str] = []

    for ln in lines:
        if len(out_lines) >= 5:
            break
        # Look for the pattern "something - http" or "something — http"
        if "http" in ln:
            # Clean up the line to match "n) Name — URL"
            # Remove existing numbering if present
            content = ln.split(")", 1)[1].strip() if ")" in ln[:5] else ln
            # Normalize separator to em-dash
            if " — " in content:
                pass
            elif " - " in content:
                content = content.replace(" - ", " — ")
            elif " —" in content:
                content = content.replace(" —", " — ")
            elif "— " in content:
                content = content.replace("— ", " — ")
            
            # If no separator found but URL exists, add one
            if " — " not in content:
                parts = content.split("http", 1)
                content = f"{parts[0].strip()} — http{parts[1].strip()}"
            
            out_lines.append(f"{len(out_lines)+1}) {content}")

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
