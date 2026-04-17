import os
import requests
import threading
import time
from flask import Flask, render_template, request
from flask_socketio import SocketIO, emit
from datetime import datetime

app = Flask(__name__)
app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "change-this-in-production")
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="eventlet")

TELEGRAM_BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHAT_ID   = os.environ.get("TELEGRAM_CHAT_ID", "")

# Maps Telegram message_id → visitor socket session_id
# We keep ALL message_ids for a session so any reply in the thread works
pending_replies = {}   # tg_msg_id -> sid
session_tg_ids  = {}   # sid -> list of tg_msg_ids (so we can reply to any)
last_update_id  = 0


# ── Telegram polling ───────────────────────────────────────────────
def tg_poll():
    global last_update_id
    while True:
        if not TELEGRAM_BOT_TOKEN:
            time.sleep(5)
            continue
        try:
            r = requests.get(
                f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/getUpdates",
                params={"offset": last_update_id + 1, "timeout": 10},
                timeout=15,
            )
            if r.ok:
                for update in r.json().get("result", []):
                    last_update_id = update["update_id"]
                    msg = update.get("message", {})
                    if str(msg.get("chat", {}).get("id")) != str(TELEGRAM_CHAT_ID):
                        continue
                    reply_to = msg.get("reply_to_message")
                    text     = msg.get("text", "").strip()
                    if reply_to and text:
                        orig_id = reply_to.get("message_id")
                        # Try direct lookup first
                        sid = pending_replies.get(orig_id)
                        if sid:
                            socketio.emit("owner_reply", {
                                "text": text,
                                "timestamp": datetime.utcnow().strftime("%H:%M"),
                            }, to=sid)
                        # Also check if any session has this msg_id in their thread
                        else:
                            for s, ids in session_tg_ids.items():
                                if orig_id in ids:
                                    socketio.emit("owner_reply", {
                                        "text": text,
                                        "timestamp": datetime.utcnow().strftime("%H:%M"),
                                    }, to=s)
                                    break
        except Exception:
            pass
        time.sleep(2)

threading.Thread(target=tg_poll, daemon=True).start()


# ── Routes ─────────────────────────────────────────────────────────
@app.route("/")
def index():
    return render_template("index.html")

@app.route("/health")
def health():
    return {"status": "ok"}


# ── Socket.IO ──────────────────────────────────────────────────────
@socketio.on("visitor_message")
def handle_visitor_message(data):
    text      = data.get("text", "").strip()
    name      = data.get("name", "Anonymous").strip() or "Anonymous"
    topic     = data.get("topic", "other").strip()
    sid       = request.sid
    timestamp = datetime.utcnow().strftime("%H:%M UTC")

    if not text:
        return

    topic_labels = {
        "about":       "👩‍💻 About Nare",
        "education":   "🎓 Education",
        "experience":  "💼 Experience",
        "projects":    "💡 Projects",
        "skills":      "⚙️ Skills",
        "other":       "💬 Something Else",
        "collaboration": "🤝 Collaboration",
        "hiring":      "💼 Hiring / Internship",
        "actuarial":   "📊 Actuarial Work",
        "ai":          "🤖 AI & Data Science",
    }
    topic_label = topic_labels.get(topic, topic)

    tg_text = (
        f"💬 *New message on your portfolio*\n"
        f"👤 *From:* {name}\n"
        f"📌 *Topic:* {topic_label}\n"
        f"🕐 {timestamp}\n\n"
        f"{text}\n\n"
        f"_Reply to this message to respond on the website._"
    )

    try:
        resp = requests.post(
            f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
            json={
                "chat_id": TELEGRAM_CHAT_ID,
                "text": tg_text,
                "parse_mode": "Markdown",
            },
            timeout=5,
        )
        if resp.ok:
            tg_message_id = resp.json()["result"]["message_id"]
            # Store mapping both ways
            pending_replies[tg_message_id] = sid
            if sid not in session_tg_ids:
                session_tg_ids[sid] = []
            session_tg_ids[sid].append(tg_message_id)
            emit("message_sent", {"status": "delivered"})
        else:
            emit("message_sent", {"status": "error"})
    except Exception:
        emit("message_sent", {"status": "error"})


@socketio.on("disconnect")
def handle_disconnect():
    # Clean up session data on disconnect
    sid = request.sid
    if sid in session_tg_ids:
        for tg_id in session_tg_ids[sid]:
            pending_replies.pop(tg_id, None)
        del session_tg_ids[sid]


if __name__ == "__main__":
    socketio.run(app, host="0.0.0.0", port=5000, debug=False)
