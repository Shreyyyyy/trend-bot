from __future__ import annotations

import os

from groq import Groq


def generate_ideas(system_prompt: str, trends_text: str) -> str:
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        raise RuntimeError("GROQ_API_KEY missing")

    model = os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile")

    client = Groq(api_key=api_key)

    def _call(m: str) -> str:
        resp = client.chat.completions.create(
            model=m,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"INPUT TRENDS:\n{trends_text}"},
            ],
            temperature=0.4,
        )
        return resp.choices[0].message.content

    try:
        return _call(model)
    except Exception as e:
        # Common case: model decommissioned. Retry with a known-good default.
        fallback = "llama-3.3-70b-versatile"
        if model != fallback:
            return _call(fallback)
        raise
