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
    lines = [ln.strip() for ln in raw.splitlines() if ln.strip()]

    # Preferred: parse strict 5-line format: "n) name — url"
    out_lines: list[str] = []
    for ln in lines:
        if len(out_lines) >= 5:
            break
        if "http" not in ln:
            continue
        # try split on emdash/mdash/hyphen separators
        sep = "—" if "—" in ln else "-" if " - " in ln else None
        if sep:
            left, right = ln.split(sep, 1)
            url = right.strip()
            name = left.split(")", 1)[1].strip() if ")" in left else left.strip()
            if url.startswith("http") and name:
                out_lines.append(f"{len(out_lines)+1}) {name} — {url}")
                continue

        # else: line has URL but not the separator; keep it as-is (cleaned)
        out_lines.append(ln)

    # Secondary fallback: pair URLs with previous line as name
    if len(out_lines) < 5:
        pairs: list[str] = []
        prev = ""
        for ln in lines:
            if "http" in ln:
                # extract first url-like token
                parts = [p for p in ln.replace("(", " ").replace(")", " ").split() if p.startswith("http")]
                if parts:
                    name = prev[:120] if prev else "Project idea"
                    pairs.append(f"{len(pairs)+1}) {name} — {parts[0]}")
                    if len(pairs) >= 5:
                        break
            prev = ln
        if pairs:
            out_lines = pairs

    # Absolute fallback
    if not out_lines:
        return "No ideas generated. (Model returned empty output.)\n"

    return "\n".join(out_lines[:5]).strip() + "\n"


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
