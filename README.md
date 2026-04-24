# trend-bot

Weekly (Monday) trend scan -> 5 execution-ready project ideas.

## Setup

1) Create `.env`:
```bash
cp .env.example .env
# fill keys
```

2) Build:
```bash
docker build -t trend-bot .
```

3) Run once:
```bash
docker run --rm --env-file .env -v "$PWD":/app -w /app trend-bot python -m trend_bot.run --out /app/out
```

Output:
- `out/trends.json`
- `out/ideas.md`

## Cron (OpenClaw)
Once `.env` is set, we’ll schedule a Monday cron to run the docker command and post the summary.

## Free hosting (recommended): GitHub Actions + Telegram

You **don’t need 24×7 servers** for this; you just need a reliable weekly scheduler.

This repo includes a GitHub Actions workflow:
- `.github/workflows/weekly.yml`

### What you get
- Runs every **Monday 09:30 IST** (04:00 UTC)
- Fetches trends (Tavily) → generates 5 ideas (Groq)
- Sends the full `out/ideas.md` to Telegram
- Uploads `out/` as an artifact you can download

### Setup
1) Push this folder to a GitHub repo.

2) Add GitHub **Repo Secrets**:
- `TAVILY_API_KEY`
- `GROQ_API_KEY`
- `GROQ_MODEL` (recommended: `llama-3.3-70b-versatile`)
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`

3) Create Telegram bot + channel:
- Create a bot via **@BotFather** → get `TELEGRAM_BOT_TOKEN`
- Create a private channel (or just use your own chat)
- Add the bot as **admin** in the channel
- Get chat_id:
  - easiest: message the bot once, then use a helper like @RawDataBot to read chat_id

### Trigger manually
GitHub → Actions → “Weekly Trend Bot” → Run workflow
