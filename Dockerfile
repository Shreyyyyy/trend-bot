FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY trend_bot /app/trend_bot

CMD ["python", "-m", "trend_bot.scheduler"]
