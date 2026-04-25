import time
import subprocess
import os
import sys
from datetime import datetime

def run_bot():
    print(f"[{datetime.now()}] Starting trend update...")
    try:
        # Run the main bot logic
        subprocess.run([sys.executable, "-m", "trend_bot.run", "--out", "out"], check=True)
        
        # If Telegram credentials are provided, notify
        if os.environ.get("TELEGRAM_BOT_TOKEN") and os.environ.get("TELEGRAM_CHAT_ID"):
            print(f"[{datetime.now()}] Sending Telegram notification...")
            subprocess.run([sys.executable, "-m", "trend_bot.notify_telegram", "--ideas", "out/ideas.md"], check=True)
            
        print(f"[{datetime.now()}] Update successful.")
    except Exception as e:
        print(f"[{datetime.now()}] Error during update: {e}")

def main():
    # Run every 6 hours by default
    interval_hours = int(os.environ.get("UPDATE_INTERVAL_HOURS", "6"))
    interval_seconds = interval_hours * 3600
    
    print(f"TrendBot Scheduler started. Running every {interval_hours} hours.")
    
    while True:
        run_bot()
        print(f"[{datetime.now()}] Sleeping for {interval_hours} hours...")
        time.sleep(interval_seconds)

if __name__ == "__main__":
    main()
