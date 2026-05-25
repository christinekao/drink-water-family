#!/usr/bin/env python3
import json
import mimetypes
import sqlite3
import uuid
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from pathlib import Path
from urllib.parse import unquote, urlparse

ROOT = Path(__file__).resolve().parent
DB_PATH = ROOT / "drink_water.sqlite3"
BOTTLE_ML = 500


def connect():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    with connect() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS members (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                avatar TEXT NOT NULL,
                goal INTEGER NOT NULL,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS entries (
                id TEXT PRIMARY KEY,
                member_id TEXT NOT NULL,
                date TEXT NOT NULL,
                amount_ml INTEGER NOT NULL DEFAULT 500,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(member_id) REFERENCES members(id) ON DELETE CASCADE
            )
        """)
        count = conn.execute("SELECT COUNT(*) AS count FROM members").fetchone()["count"]
        if count == 0:
            for name, avatar, goal in [("珍珍", "capybara", 5), ("郁郁", "bunny", 4), ("菜菜", "cat", 5)]:
                conn.execute(
                    "INSERT INTO members (id, name, avatar, goal) VALUES (?, ?, ?, ?)",
                    (str(uuid.uuid4()), name, avatar, goal),
                )
        elif count == 3:
            rows = conn.execute("SELECT id, name, avatar FROM members ORDER BY created_at").fetchall()
            legacy_sets = [
                (["媽媽", "爸爸", "阿嬤"], ["💧", "🦫", "🐧"]),
                (["媽媽", "妹妹", "我"], ["mom", "sister", "student"]),
            ]
            if any([row["name"] for row in rows] == names and [row["avatar"] for row in rows] == avatars for names, avatars in legacy_sets):
                updates = [
                    ("珍珍", "capybara", 5),
                    ("郁郁", "bunny", 4),
                    ("菜菜", "cat", 5),
                ]
                for row, (name, avatar, goal) in zip(rows, updates):
                    conn.execute(
                        "UPDATE members SET name = ?, avatar = ?, goal = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                        (name, avatar, goal, row["id"]),
                    )


def read_state():
    with connect() as conn:
        members = [
            {"id": row["id"], "name": row["name"], "avatar": row["avatar"], "goal": row["goal"]}
            for row in conn.execute("SELECT id, name, avatar, goal FROM members ORDER BY created_at")
        ]
        entries = [
            {"id": row["id"], "memberId": row["member_id"], "date": row["date"], "amountMl": row["amount_ml"]}
            for row in conn.execute("SELECT id, member_id, date, amount_ml FROM entries ORDER BY date, created_at")
        ]
    return {"members": members, "entries": entries}


def replace_state(payload):
    members = payload.get("members", [])
    entries = payload.get("entries", [])
    if not members:
        return

    with connect() as conn:
        conn.execute("DELETE FROM entries")
        conn.execute("DELETE FROM members")
        for member in members:
            conn.execute(
                "INSERT INTO members (id, name, avatar, goal) VALUES (?, ?, ?, ?)",
                (member["id"], member["name"], member["avatar"], int(member["goal"])),
            )
        valid_member_ids = {member["id"] for member in members}
        fallback_member_id = members[0]["id"]
        for entry in entries:
            member_id = entry.get("memberId")
            if member_id not in valid_member_ids:
                member_id = fallback_member_id
            conn.execute(
                "INSERT INTO entries (id, member_id, date, amount_ml) VALUES (?, ?, ?, ?)",
                (entry.get("id", str(uuid.uuid4())), member_id, entry["date"], int(entry.get("amountMl", BOTTLE_ML))),
            )


def add_drink(payload):
    member_id = payload["memberId"]
    date = payload["date"]
    with connect() as conn:
        conn.execute(
            "INSERT INTO entries (id, member_id, date, amount_ml) VALUES (?, ?, ?, ?)",
            (str(uuid.uuid4()), member_id, date, BOTTLE_ML),
        )


def set_history(payload):
    member_id = payload["memberId"]
    date = payload["date"]
    bottle_count = max(0, int(payload["bottleCount"]))
    with connect() as conn:
        conn.execute("DELETE FROM entries WHERE member_id = ? AND date = ?", (member_id, date))
        for _ in range(bottle_count):
            conn.execute(
                "INSERT INTO entries (id, member_id, date, amount_ml) VALUES (?, ?, ?, ?)",
                (str(uuid.uuid4()), member_id, date, BOTTLE_ML),
            )


def create_member(payload):
    member_id = str(uuid.uuid4())
    with connect() as conn:
        conn.execute(
            "INSERT INTO members (id, name, avatar, goal) VALUES (?, ?, ?, ?)",
            (member_id, payload["name"], payload["avatar"], int(payload["goal"])),
        )
    return member_id


def update_member(member_id, payload):
    with connect() as conn:
        conn.execute(
            "UPDATE members SET name = ?, avatar = ?, goal = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            (payload["name"], payload["avatar"], int(payload["goal"]), member_id),
        )


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/state":
            self.send_json(read_state())
            return
        self.serve_file(parsed.path)

    def do_POST(self):
        parsed = urlparse(self.path)
        payload = self.read_json()
        if parsed.path == "/api/import":
            replace_state(payload)
            self.send_json(read_state())
            return
        if parsed.path == "/api/drinks":
            add_drink(payload)
            self.send_json(read_state())
            return
        if parsed.path == "/api/history":
            set_history(payload)
            self.send_json(read_state())
            return
        if parsed.path == "/api/members":
            member_id = create_member(payload)
            state = read_state()
            state["selectedMemberId"] = member_id
            self.send_json(state)
            return
        self.send_error(404)

    def do_PUT(self):
        parsed = urlparse(self.path)
        payload = self.read_json()
        if parsed.path.startswith("/api/members/"):
            member_id = unquote(parsed.path.rsplit("/", 1)[-1])
            update_member(member_id, payload)
            self.send_json(read_state())
            return
        self.send_error(404)

    def read_json(self):
        length = int(self.headers.get("Content-Length", "0"))
        body = self.rfile.read(length).decode("utf-8")
        return json.loads(body or "{}")

    def send_json(self, payload):
        encoded = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(encoded)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(encoded)

    def serve_file(self, request_path):
        safe_path = "index.html" if request_path in ("", "/") else request_path.lstrip("/")
        target = (ROOT / safe_path).resolve()
        if ROOT not in target.parents and target != ROOT:
            self.send_error(403)
            return
        if not target.exists() or not target.is_file():
            self.send_error(404)
            return
        content = target.read_bytes()
        content_type = mimetypes.guess_type(str(target))[0] or "application/octet-stream"
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(content)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(content)

    def log_message(self, fmt, *args):
        print("%s - %s" % (self.address_string(), fmt % args))


if __name__ == "__main__":
    init_db()
    server = ThreadingHTTPServer(("0.0.0.0", 4173), Handler)
    print("Family water server running at http://0.0.0.0:4173/")
    print("Data file:", DB_PATH)
    server.serve_forever()
