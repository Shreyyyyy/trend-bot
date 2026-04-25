from __future__ import annotations

import os
import logging
from groq import Groq

logger = logging.getLogger(__name__)

def generate_ideas(system_prompt: str, trends_text: str) -> str:
    keys = [
        os.environ.get("GROQ_API_KEY_1"),
        os.environ.get("GROQ_API_KEY_2"),
        os.environ.get("GROQ_API_KEY") # fallback for legacy
    ]
    keys = [k for k in keys if k]
    
    if not keys:
        raise RuntimeError("No GROQ_API_KEY found")

    model = os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile")

    def _call(client: Groq, m: str) -> str:
        resp = client.chat.completions.create(
            model=m,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"INPUT TRENDS:\n{trends_text}"},
            ],
            temperature=0.4,
            max_tokens=700,
        )
        return resp.choices[0].message.content

    last_err = None
    for key in keys:
        client = Groq(api_key=key)
        try:
            return _call(client, model)
        except Exception as e:
            last_err = e
            # If it's a rate limit or other common error, try the next key
            logger.warning(f"Groq API call failed with key starting {key[:10]}: {e}")
            continue

    # If we get here, all keys failed. Try one last time with fallback model if not already used
    fallback_model = "llama-3.3-70b-versatile"
    if model != fallback_model:
        for key in keys:
            client = Groq(api_key=key)
            try:
                return _call(client, fallback_model)
            except:
                continue

    raise last_err or RuntimeError("All Groq API keys failed")
