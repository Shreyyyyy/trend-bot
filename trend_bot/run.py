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
    """Force a crisp output regardless of model verbosity.

    Extract the first 5 (Project, Source) pairs and emit a tiny message.
    """
    lines = [ln.strip() for ln in raw.splitlines()]
    pairs: list[tuple[str, str]] = []

    i = 0
    while i < len(lines) and len(pairs) < 5:
        l = lines[i]
        # Accept multiple formats
        if l.lower().startswith("project:") or l.lower().startswith("1) project") or ") project" in l.lower():
            # normalize project line
            if ":" in l:
                name = l.split(":", 1)[1].strip()
            else:
                name = l

            # find source on same/next few lines
            src = ""
            for j in range(i + 1, min(i + 6, len(lines))):
                sj = lines[j]
                if sj.lower().startswith("source:"):
                    src = sj.split(":", 1)[1].strip()
                    break
            if name and src:
                pairs.append((name, src))
                i += 1
                continue
        i += 1

    # Fallback: if model ignored the format, just keep the first 20 lines.
    if not pairs:
        return "\n".join(lines[:20]).strip()

    out_lines = ["This week’s 5 project ideas:"]
    for idx, (name, src) in enumerate(pairs, start=1):
        out_lines.append(f"{idx}) {name}")
        out_lines.append(f"   Source: {src}")
    return "\n".join(out_lines).strip() + "\n"


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
