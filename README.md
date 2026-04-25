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

## Web UI (Vercel)

The repo now includes a premium Next.js dashboard located in the `/web` folder.

### Deployment
1) Create a new project on **Vercel**.
2) Set the **Root Directory** to `web`.
3) Add Environment Variables:
   - `GROQ_API_KEY`
   - `GROQ_MODEL` (e.g., `llama-3.3-70b-versatile`)
4) Deploy!

### Features
- **Interactive Radar Chart**: A high-tech SVG Pie Chart HUD that expands on hover/tap to reveal deep strategic insights.
- **Rainbow Intelligence**: Vibrant, color-coded segments that prioritize signals visually.
- **AI Strategic Consultant**: A context-aware chatbot that helps you break down and execute specific trends.
- **Zero-Scroll Dashboard**: A "Single Pane of Glass" design optimized for deep focus.
- **Mobile First**: Fully responsive design with touch-optimized controls for on-the-go intelligence.
- **Auto-Sync**: Automatically updates via GitHub Actions or manual "Live Sync" in the UI.

## Trigger manually
GitHub → Actions → “Weekly Trend Bot” → Run workflow
