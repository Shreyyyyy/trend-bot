"""Send the weekly ideas to Telegram.

Usage:
  python -m trend_bot.notify_telegram --ideas out/ideas.md

Env:
  TELEGRAM_BOT_TOKEN
  TELEGRAM_CHAT_ID
"""

from __future__ import annotations

import argparse
import os
from pathlib import Path

import requests


def _must_env(k: str) -> str:
    v = os.environ.get(k, "").strip()
    if not v:
        raise RuntimeError(f"{k} missing")
    return v


def _shorten(text: str, max_chars: int = 3500) -> str:
    # Telegram bot API hard limit is 4096 chars; keep headroom.
    if len(text) <= max_chars:
        return text
    return text[:max_chars - 1] + "…"


def _clean_for_telegram(text: str) -> str:
    # Keep it plain and readable on mobile.
    # - Strip markdown-ish headers/formatting
    # - Collapse extra blank lines
    lines = []
    for raw in text.splitlines():
        s = raw.strip()
        if not s:
            # keep a single blank line (handled later)
            lines.append("")
            continue
        # Drop common markdown header prefixes
        while s.startswith("#"):
            s = s.lstrip("#").strip()
        # Normalize bullets
        if s.startswith("-"):
            s = "• " + s.lstrip("-").strip()
        lines.append(s)

    # collapse multiple blank lines
    out = []
    blank = False
    for l in lines:
        if l == "":
            if blank:
                continue
            blank = True
            out.append("")
        else:
            blank = False
            out.append(l)
    return "\n".join(out).strip()


def send_text(text: str) -> None:
    token = _must_env("TELEGRAM_BOT_TOKEN")
    chat_id = _must_env("TELEGRAM_CHAT_ID")

    url = f"https://api.telegram.org/bot{token}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": _shorten(_clean_for_telegram(text)),
        "disable_web_page_preview": True,
    }
    r = requests.post(url, json=payload, timeout=30)
    r.raise_for_status()


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--ideas", type=Path, required=True)
    args = ap.parse_args()

    text = args.ideas.read_text(encoding="utf-8")
    send_text(text)


if __name__ == "__main__":
    main()
