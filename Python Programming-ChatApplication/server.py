import hashlib
import hmac
import json
import os
import re
import socket
import sqlite3
import threading
from datetime import datetime

HOST = "127.0.0.1"
PORT = 5555
DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "chat.db")

EMOJIS = {
    ":smile:": "\U0001F604",
    ":sad:": "\U0001F622",
    ":laugh:": "\U0001F602",
    ":heart:": "\u2764\ufe0f",
    ":thumbsup:": "\U0001F44D",
    ":thumbsdown:": "\U0001F44E",
    ":fire:": "\U0001F525",
    ":wave:": "\U0001F44B",
    ":ok:": "\U0001F44C",
    ":clap:": "\U0001F44F",
}


def render_emoji(text):
    for shortcode, symbol in EMOJIS.items():
        text = text.replace(shortcode, symbol)
    return text


def hash_password(password, salt=None):
    if salt is None:
        salt = os.urandom(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 120000)
    return salt.hex(), digest.hex()


def verify_password(password, salt_hex, digest_hex):
    salt = bytes.fromhex(salt_hex)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 120000)
    return hmac.compare_digest(digest.hex(), digest_hex)


def valid_username(username):
    if not isinstance(username, str) or not re.fullmatch(r"[A-Za-z0-9_]{3,20}", username):
        return "Username must be 3 to 20 characters and use only letters, numbers, and underscore."
    return ""


def valid_password(password):
    if not isinstance(password, str) or not password.strip() or len(password) < 4 or len(password) > 128:
        return "Password must be 4 to 128 characters."
    return ""


def valid_room(name):
    if not isinstance(name, str) or not re.fullmatch(r"[A-Za-z0-9 ]{1,30}", name.strip()):
        return "Room names can use letters, numbers, and spaces, up to 30 characters."
    return ""


class ChatServer:
    def __init__(self, host=HOST, port=PORT, db_path=DB_PATH):
        self.host = host
        self.port = port
        self.db = sqlite3.connect(db_path, check_same_thread=False)
        self.db.row_factory = sqlite3.Row
        self.db_lock = threading.Lock()
        self.clients_lock = threading.Lock()
        self.handlers = set()
        self.rooms = {}
        self.listener = None
        self._prepare_db()

    def _prepare_db(self):
        with self.db_lock:
            self.db.execute(
                """
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT NOT NULL COLLATE NOCASE UNIQUE,
                    salt TEXT NOT NULL,
                    password_hash TEXT NOT NULL
                )
                """
            )
            self.db.execute(
                """
                CREATE TABLE IF NOT EXISTS rooms (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL COLLATE NOCASE UNIQUE
                )
                """
            )
            self.db.execute(
                """
                CREATE TABLE IF NOT EXISTS messages (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    room_name TEXT NOT NULL,
                    username TEXT NOT NULL,
                    body TEXT NOT NULL,
                    created_at TEXT NOT NULL
                )
                """
            )
            self.db.execute("INSERT OR IGNORE INTO rooms (name) VALUES (?)", ("General",))
            self.db.commit()

    def serve_forever(self):
        self.listener = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self.listener.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        self.listener.bind((self.host, self.port))
        self.listener.listen()
        print(f"Chat server listening on {self.host}:{self.port}")
        while True:
            try:
                connection, address = self.listener.accept()
            except OSError:
                break
            handler = ClientHandler(self, connection, address)
            with self.clients_lock:
                self.handlers.add(handler)
            handler.start()

    def close(self):
        if self.listener is not None:
            try:
                self.listener.close()
            except OSError:
                pass
        with self.clients_lock:
            handlers = list(self.handlers)
        for handler in handlers:
            try:
                handler.connection.close()
            except OSError:
                pass
        self.db.close()

    def room_names(self):
        with self.db_lock:
            rows = self.db.execute("SELECT name FROM rooms ORDER BY name COLLATE NOCASE").fetchall()
        return [row["name"] for row in rows]

    def send_room_list(self, handler):
        handler.send({"type": "rooms", "rooms": self.room_names()})

    def register(self, handler, username, password):
        if handler.username:
            handler.send({"type": "error", "message": "You are already signed in."})
            return
        problem = valid_username(username) or valid_password(password)
        if problem:
            handler.send({"type": "error", "message": problem})
            return
        salt, digest = hash_password(password)
        try:
            with self.db_lock:
                self.db.execute(
                    "INSERT INTO users (username, salt, password_hash) VALUES (?, ?, ?)",
                    (username, salt, digest),
                )
                self.db.commit()
        except sqlite3.IntegrityError:
            handler.send({"type": "error", "message": "That username is already registered."})
            return
        except sqlite3.Error:
            handler.send({"type": "error", "message": "Could not save the new account."})
            return
        print(f"Registered {username}")
        self._finish_login(handler, username)

    def login(self, handler, username, password):
        if handler.username:
            handler.send({"type": "error", "message": "You are already signed in."})
            return
        problem = valid_username(username) or valid_password(password)
        if problem:
            handler.send({"type": "error", "message": "The username or password is incorrect."})
            return
        with self.db_lock:
            row = self.db.execute(
                "SELECT username, salt, password_hash FROM users WHERE username = ? COLLATE NOCASE",
                (username,),
            ).fetchone()
        if row is None or not verify_password(password, row["salt"], row["password_hash"]):
            handler.send({"type": "error", "message": "The username or password is incorrect."})
            return
        self._finish_login(handler, row["username"])

    def _finish_login(self, handler, username):
        handler.username = username
        handler.send({"type": "auth_ok", "username": username})
        self.send_room_list(handler)
        self.join_room(handler, "General")
        print(f"{username} signed in")

    def create_room(self, handler, name):
        if not handler.username:
            handler.send({"type": "error", "message": "Sign in before creating a room."})
            return
        problem = valid_room(name)
        if problem:
            handler.send({"type": "error", "message": problem})
            return
        clean = " ".join(name.strip().split())
        try:
            with self.db_lock:
                self.db.execute("INSERT INTO rooms (name) VALUES (?)", (clean,))
                self.db.commit()
        except sqlite3.IntegrityError:
            handler.send({"type": "error", "message": "That room already exists. Join it instead."})
            return
        except sqlite3.Error:
            handler.send({"type": "error", "message": "Could not create the room."})
            return
        print(f"{handler.username} created room {clean}")
        self.join_room(handler, clean)
        self._push_room_lists()

    def join_room(self, handler, name):
        if not handler.username:
            handler.send({"type": "error", "message": "Sign in before joining a room."})
            return
        if not isinstance(name, str):
            handler.send({"type": "error", "message": "That room does not exist."})
            return
        with self.db_lock:
            row = self.db.execute(
                "SELECT name FROM rooms WHERE name = ? COLLATE NOCASE",
                (name.strip(),),
            ).fetchone()
        if row is None:
            handler.send({"type": "error", "message": "That room does not exist."})
            return
        room = row["name"]
        with self.clients_lock:
            previous = handler.room
            if previous and handler in self.rooms.get(previous, set()):
                self.rooms[previous].discard(handler)
                self._broadcast_locked(previous, {"type": "notice", "message": f"{handler.username} left the room."})
            self.rooms.setdefault(room, set()).add(handler)
            handler.room = room
            self._broadcast_locked(
                room,
                {"type": "notice", "message": f"{handler.username} joined the room."},
                exclude=handler,
            )
        handler.send({"type": "history", "room": room, "messages": self.history(room)})
        handler.send({"type": "notice", "message": f"Joined {room}."})

    def post_message(self, handler, text):
        if not handler.username or not handler.room:
            handler.send({"type": "error", "message": "Join a room before sending a message."})
            return
        if not isinstance(text, str):
            handler.send({"type": "error", "message": "Enter a message."})
            return
        body = render_emoji(text.strip())
        if not body:
            handler.send({"type": "error", "message": "Enter a message."})
            return
        if len(body) > 500:
            handler.send({"type": "error", "message": "Message is too long. Keep it under 500 characters."})
            return
        created_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        stamp = created_at[11:16]
        try:
            with self.db_lock:
                self.db.execute(
                    "INSERT INTO messages (room_name, username, body, created_at) VALUES (?, ?, ?, ?)",
                    (handler.room, handler.username, body, created_at),
                )
                self.db.commit()
        except sqlite3.Error:
            handler.send({"type": "error", "message": "Could not store that message."})
            return
        self.broadcast(handler.room, {"type": "chat", "time": stamp, "user": handler.username, "text": body})

    def history(self, room):
        try:
            with self.db_lock:
                rows = self.db.execute(
                    "SELECT username, body, created_at FROM messages WHERE room_name = ? ORDER BY id ASC",
                    (room,),
                ).fetchall()
        except sqlite3.Error:
            return []
        return [
            {"time": row["created_at"][11:16], "user": row["username"], "text": row["body"]}
            for row in rows
        ]

    def broadcast(self, room, payload, exclude=None):
        with self.clients_lock:
            self._broadcast_locked(room, payload, exclude)

    def _broadcast_locked(self, room, payload, exclude=None):
        for handler in list(self.rooms.get(room, set())):
            if handler is not exclude:
                handler.send(payload)

    def _push_room_lists(self):
        payload = {"type": "rooms", "rooms": self.room_names()}
        with self.clients_lock:
            for handler in list(self.handlers):
                if handler.username:
                    handler.send(payload)

    def disconnect(self, handler):
        with self.clients_lock:
            self.handlers.discard(handler)
            if handler.room and handler in self.rooms.get(handler.room, set()):
                self.rooms[handler.room].discard(handler)
                if handler.username:
                    self._broadcast_locked(
                        handler.room,
                        {"type": "notice", "message": f"{handler.username} disconnected."},
                    )
            room = handler.room
            handler.room = None
        try:
            handler.connection.close()
        except OSError:
            pass
        if handler.username:
            print(f"{handler.username} disconnected from {room}")


class ClientHandler(threading.Thread):
    def __init__(self, server, connection, address):
        super().__init__(daemon=True)
        self.server = server
        self.connection = connection
        self.address = address
        self.username = None
        self.room = None
        self.buffer = ""

    def run(self):
        print(f"Client connected from {self.address[0]}:{self.address[1]}")
        try:
            while True:
                data = self.connection.recv(4096)
                if not data:
                    break
                self.buffer += data.decode("utf-8", errors="replace")
                if len(self.buffer) > 65536:
                    self.send({"type": "error", "message": "That message is too large."})
                    break
                while "\n" in self.buffer:
                    line, self.buffer = self.buffer.split("\n", 1)
                    self.handle_line(line.strip())
        except (ConnectionError, OSError):
            pass
        finally:
            self.server.disconnect(self)

    def handle_line(self, line):
        if not line:
            return
        try:
            payload = json.loads(line)
        except json.JSONDecodeError:
            self.send({"type": "error", "message": "That message could not be read."})
            return
        if not isinstance(payload, dict):
            self.send({"type": "error", "message": "That message could not be read."})
            return
        kind = payload.get("type")
        if kind == "register":
            self.server.register(self, payload.get("username", ""), payload.get("password", ""))
        elif kind == "login":
            self.server.login(self, payload.get("username", ""), payload.get("password", ""))
        elif kind == "create_room":
            self.server.create_room(self, payload.get("name", ""))
        elif kind == "join_room":
            self.server.join_room(self, payload.get("name", ""))
        elif kind == "list_rooms":
            if self.username:
                self.server.send_room_list(self)
            else:
                self.send({"type": "error", "message": "Sign in first."})
        elif kind == "message":
            self.server.post_message(self, payload.get("text", ""))
        else:
            self.send({"type": "error", "message": "Unknown request."})

    def send(self, payload):
        try:
            self.connection.sendall((json.dumps(payload) + "\n").encode("utf-8"))
        except OSError:
            pass


def main():
    server = ChatServer()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("Server stopped.")
    finally:
        server.close()


if __name__ == "__main__":
    main()
