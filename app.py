import os
import requests
import time
import eventlet
eventlet.monkey_patch()

from flask import Flask, render_template, request
from flask_socketio import SocketIO, emit
from datetime import datetime

app = Flask(__name__)
app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "change-this-in-production")
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="eventlet")

TELEGRAM_BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHAT_ID   = os.environ.get("TELEGRAM_CHAT_ID", "")

tg_id_to_sid  = {}
sid_to_tg_ids = {}
last_update_id = 0


def tg_poll():
    global last_update_id
    while True:
        if not TELEGRAM_BOT_TOKEN:
            eventlet.sleep(5)
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
                    msg     = update.get("message", {})
                    chat_id = str(msg.get("chat", {}).get("id", ""))
                    if chat_id != str(TELEGRAM_CHAT_ID):
                        continue
                    reply_to = msg.get("reply_to_message")
                    text     = msg.get("text", "").strip()
                    if not (reply_to and text):
                        continue
                    orig_id = reply_to.get("message_id")
                    sid = tg_id_to_sid.get(orig_id)
                    if sid:
                        socketio.emit("owner_reply", {
                            "text": text,
                            "timestamp": datetime.utcnow().strftime("%H:%M"),
                        }, room=sid)
                        print(f"[reply] -> sid={sid}")
                    else:
                        print(f"[reply] no sid for tg_id={orig_id}, known={list(tg_id_to_sid.keys())}")
        except Exception as e:
            print(f"[poll error] {e}")
        eventlet.sleep(2)


# Use eventlet.spawn instead of threading.Thread
eventlet.spawn(tg_poll)


@app.route("/")
def index():
    return render_template("index.html")

@app.route("/health")
def health():
    return {"status": "ok"}


@socketio.on("visitor_message")
def handle_visitor_message(data):
    text  = data.get("text", "").strip()
    name  = data.get("name", "Anonymous").strip() or "Anonymous"
    topic = data.get("topic", "other").strip()
    sid   = request.sid

    if not text:
        return

    topic_labels = {
        "about": "👩‍💻 About Nare", "education": "🎓 Education",
        "experience": "💼 Experience", "projects": "💡 Projects",
        "skills": "⚙️ Skills", "other": "💬 Something Else",
    }
    tg_text = (
        f"💬 *New message on your portfolio*\n"
        f"👤 *From:* {name}\n"
        f"📌 *Topic:* {topic_labels.get(topic, topic)}\n"
        f"🕐 {datetime.utcnow().strftime('%H:%M UTC')}\n\n"
        f"{text}\n\n"
        f"_Reply to this message to respond on the website._"
    )
    try:
        resp = requests.post(
            f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
            json={"chat_id": TELEGRAM_CHAT_ID, "text": tg_text, "parse_mode": "Markdown"},
            timeout=5,
        )
        if resp.ok:
            tg_msg_id = resp.json()["result"]["message_id"]
            tg_id_to_sid[tg_msg_id] = sid
            if sid not in sid_to_tg_ids:
                sid_to_tg_ids[sid] = set()
            sid_to_tg_ids[sid].add(tg_msg_id)
            print(f"[sent] tg_id={tg_msg_id} sid={sid}")
            emit("message_sent", {"status": "delivered"})
        else:
            emit("message_sent", {"status": "error"})
    except Exception as e:
        print(f"[send error] {e}")
        emit("message_sent", {"status": "error"})


@socketio.on("disconnect")
def handle_disconnect():
    sid = request.sid
    if sid in sid_to_tg_ids:
        for tg_id in sid_to_tg_ids[sid]:
            tg_id_to_sid.pop(tg_id, None)
        del sid_to_tg_ids[sid]
    print(f"[disconnect] sid={sid}")


if __name__ == "__main__":
    socketio.run(app, host="0.0.0.0", port=5000, debug=False)
