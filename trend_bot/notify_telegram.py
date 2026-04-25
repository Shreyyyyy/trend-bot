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
    """Minimal cleaning to ensure exactly one line per project."""
    lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
    return "\n".join(lines[:5])


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
