# Nare Portfolio — Deployment Guide

## Step 1 — Get Telegram credentials

1. Open Telegram → search **@BotFather** → `/newbot` → copy the **Bot Token**
2. Send any message to your new bot
3. Visit `https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates`
4. Find `"id"` inside `"chat"` — that is your **Chat ID**

---

## Step 2 — Server setup (Ubuntu/Debian)

```bash
sudo apt update
sudo apt install python3-venv python3-pip nginx certbot python3-certbot-nginx -y

sudo mkdir -p /var/www/nare-portfolio
sudo chown $USER:$USER /var/www/nare-portfolio
cp -r . /var/www/nare-portfolio/

cd /var/www/nare-portfolio
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

---

## Step 3 — Register Telegram webhook

```bash
curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://<YOUR_DOMAIN>/telegram/webhook/<TOKEN>"
# Expected response: {"ok":true,"result":true}
```

---

## Step 4 — Fill in secrets

Edit `nare-portfolio.service`:
- `SECRET_KEY`  — generate with: `python3 -c "import secrets; print(secrets.token_hex(32))"`
- `TELEGRAM_BOT_TOKEN` — from BotFather
- `TELEGRAM_CHAT_ID`   — your personal ID from Step 1

---

## Step 5 — Start the service

```bash
sudo cp nare-portfolio.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable nare-portfolio
sudo systemctl start nare-portfolio
sudo systemctl status nare-portfolio   # should say "active (running)"
```

---

## Step 6 — Configure Nginx

```bash
sudo cp nginx/portfolio.conf /etc/nginx/sites-available/nare-portfolio
sudo ln -s /etc/nginx/sites-available/nare-portfolio /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## Step 7 — Free SSL

```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Then uncomment the HTTPS block in `nginx/portfolio.conf`.

---

## How the chat works

| Who | Action | What happens |
|-----|--------|-------------|
| Visitor | Types & sends message | Goes via Socket.IO to Flask |
| Flask | Receives message | Forwards to your Telegram as a bot notification |
| You | **Reply** to that Telegram message | Webhook fires → Flask routes reply back |
| Visitor | Sees reply live | Socket.IO pushes it to their browser |

> **Important:** You must use Telegram's **Reply** feature (long-press the notification → Reply). This is how Flask knows which visitor to send your answer to. A plain new message to the bot won't work.

---

## Useful commands

```bash
# View live logs
sudo journalctl -u nare-portfolio -f

# Restart after code changes
sudo systemctl restart nare-portfolio
```
