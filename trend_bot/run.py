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
    """Ensure output is exactly 5 lines with metadata: 'n) Name — URL | WHY: ...'."""
    import re
    # 1. Split into chunks by project numbering
    segments = re.split(r'\n(?=\s*\d+[\.\)])', raw.strip())
    if len(segments) <= 1:
        segments = [s for s in raw.split("\n") if s.strip() and re.match(r'^\d+[\.\)]', s.strip())]
    
    out_lines: list[str] = []
    for seg in segments:
        if len(out_lines) >= 5:
            break
            
        # Clean segment
        text = seg.replace("\n", " ").strip()
        
        # Extract components
        url_match = re.search(r'https?://[^\s\|]+', text)
        url = url_match.group(0) if url_match else "https://github.com/trending"
        
        # Remove numbering and URL from text to find name and metadata
        clean_text = re.sub(r'^\d+[\.\)]\s*', '', text)
        clean_text = clean_text.replace(url, "").strip()
        # Remove common separators
        clean_text = re.sub(r'^[\s—\-]+', '', clean_text)
        
        # If the LLM followed the | format, we have Name | WHY ...
        # Otherwise we just have Name ... metadata ...
        if "|" in clean_text:
            # Reconstruct carefully
            parts = clean_text.split("|", 1)
            name = parts[0].strip()
            metadata = f" | {parts[1].strip()}"
        else:
            # Heuristic: Name is usually the first part
            name = clean_text.split("WHY:", 1)[0].split("BUILD:", 1)[0].split("MARKET:", 1)[0].strip()
            metadata = clean_text[len(name):].strip()
            if metadata:
                # Ensure | before metadata if missing
                if not metadata.startswith("|"):
                    metadata = f" | {metadata}"
        
        if not name:
            name = "Project Idea"
            
        out_lines.append(f"{len(out_lines)+1}) {name} — {url}{metadata}")

    # Fallback/Padding
    while len(out_lines) < 5:
        out_lines.append(f"{len(out_lines)+1}) [Idea pending] — https://github.com/trending | WHY: Scan failed | BUILD: Manual check | MARKET: General")

    return "\n".join(out_lines)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", type=Path, default=Path("out"))
    args = ap.parse_args()

    args.out.mkdir(parents=True, exist_ok=True)

    from datetime import datetime
    timestamp = datetime.now().isoformat()
    meta = {"timestamp": timestamp, "trends": trends}
    (args.out / "trends.json").write_text(json.dumps(meta, indent=2), encoding="utf-8")

    trends_text = _trends_to_text(trends)
    src_urls = _collect_source_urls(trends)
    if src_urls:
        trends_text += "\n\nSOURCE URL POOL (choose exactly one per idea):\n" + "\n".join(f"- {u}" for u in src_urls[:60])
    raw = generate_ideas(SYSTEM_PROMPT, trends_text)
    ideas_text = _postprocess_ideas(raw)
    
    # Add timestamp header to ideas.md for parsing
    ideas_text = f"DATE: {timestamp}\n" + ideas_text
    (args.out / "ideas.md").write_text(ideas_text, encoding="utf-8")

    print(f"Wrote: {args.out/'trends.json'}")
    print(f"Wrote: {args.out/'ideas.md'}")


if __name__ == "__main__":
    main()
