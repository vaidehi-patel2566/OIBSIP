import json
import socket
import sys
import threading
import tkinter as tk
from tkinter import messagebox

HOST = "127.0.0.1"
PORT = 5555

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


class ChatClient:
    def __init__(self, host, port):
        self.host = host
        self.port = port
        self.socket = None
        self.username = None
        self.room = None
        self.closing = False
        self.root = tk.Tk()
        self.root.title("Chat")
        self.root.geometry("900x600")
        self.root.minsize(760, 500)
        self.root.configure(bg="#f4f6f8")
        self.username_var = tk.StringVar()
        self.password_var = tk.StringVar()
        self.room_var = tk.StringVar()
        self.message_var = tk.StringVar()
        self._build_auth()
        self._build_main()
        self.main.pack_forget()
        self.root.protocol("WM_DELETE_WINDOW", self.close)
        self.root.bind("<FocusIn>", self.clear_notice)
        self.connect()

    def _build_auth(self):
        self.auth = tk.Frame(self.root, bg="#f4f6f8", padx=28, pady=28)
        self.auth.pack(fill="both", expand=True)
        tk.Label(self.auth, text="Chat", bg="#f4f6f8", fg="#0f172a", font=("Segoe UI", 22, "bold")).pack(anchor="w")
        tk.Label(
            self.auth,
            text=f"Connects to {self.host}:{self.port}. Register once, then sign in on this computer.",
            bg="#f4f6f8",
            fg="#475569",
            font=("Segoe UI", 10),
        ).pack(anchor="w", pady=(4, 18))
        tk.Label(self.auth, text="Username", bg="#f4f6f8", fg="#0f172a", font=("Segoe UI", 10)).pack(anchor="w")
        tk.Entry(self.auth, textvariable=self.username_var, font=("Segoe UI", 12), width=32).pack(anchor="w", pady=(4, 10), ipady=4)
        tk.Label(self.auth, text="Password", bg="#f4f6f8", fg="#0f172a", font=("Segoe UI", 10)).pack(anchor="w")
        tk.Entry(self.auth, textvariable=self.password_var, show="*", font=("Segoe UI", 12), width=32).pack(anchor="w", pady=(4, 12), ipady=4)
        actions = tk.Frame(self.auth, bg="#f4f6f8")
        actions.pack(anchor="w")
        tk.Button(actions, text="Login", command=self.login, bg="#1d4ed8", fg="white", relief="flat", padx=14, pady=6).pack(side="left")
        tk.Button(actions, text="Register", command=self.register, bg="#0f172a", fg="white", relief="flat", padx=14, pady=6).pack(side="left", padx=8)
        tk.Button(actions, text="Retry connection", command=self.connect, bg="#334155", fg="white", relief="flat", padx=14, pady=6).pack(side="left")
        self.auth_status = tk.Label(self.auth, text="", bg="#f4f6f8", fg="#b91c1c", font=("Segoe UI", 10), wraplength=520, justify="left")
        self.auth_status.pack(anchor="w", pady=(14, 0))

    def _build_main(self):
        self.main = tk.Frame(self.root, bg="#f4f6f8")
        sidebar = tk.Frame(self.main, bg="#0f172a", width=220, padx=12, pady=12)
        sidebar.pack(side="left", fill="y")
        sidebar.pack_propagate(False)
        tk.Label(sidebar, text="Rooms", bg="#0f172a", fg="white", font=("Segoe UI", 13, "bold")).pack(anchor="w")
        self.room_list = tk.Listbox(sidebar, bg="#1e293b", fg="white", selectbackground="#1d4ed8", relief="flat", highlightthickness=0, font=("Segoe UI", 10), activestyle="none")
        self.room_list.pack(fill="both", expand=True, pady=(8, 8))
        tk.Entry(sidebar, textvariable=self.room_var, font=("Segoe UI", 10)).pack(fill="x", pady=(0, 6))
        tk.Button(sidebar, text="Create room", command=self.create_room, bg="#1d4ed8", fg="white", relief="flat").pack(fill="x", pady=2)
        tk.Button(sidebar, text="Join selected", command=self.join_selected, bg="#334155", fg="white", relief="flat").pack(fill="x", pady=2)
        tk.Button(sidebar, text="Refresh rooms", command=self.refresh_rooms, bg="#334155", fg="white", relief="flat").pack(fill="x", pady=2)
        self.user_label = tk.Label(sidebar, text="", bg="#0f172a", fg="#cbd5e1", font=("Segoe UI", 9))
        self.user_label.pack(anchor="w", pady=(12, 0))

        content = tk.Frame(self.main, bg="#f4f6f8", padx=12, pady=12)
        content.pack(side="left", fill="both", expand=True)
        self.notice = tk.Label(content, text="", bg="#fef3c7", fg="#92400e", font=("Segoe UI", 10), anchor="w")
        self.room_title = tk.Label(content, text="General", bg="#f4f6f8", fg="#0f172a", font=("Segoe UI", 14, "bold"))
        self.room_title.pack(anchor="w")
        self.chat = tk.Text(content, wrap="word", state="disabled", font=("Segoe UI", 11), bg="white", relief="flat", padx=10, pady=10)
        self.chat.pack(fill="both", expand=True, pady=(8, 8))
        composer = tk.Frame(content, bg="#f4f6f8")
        composer.pack(fill="x")
        entry = tk.Entry(composer, textvariable=self.message_var, font=("Segoe UI", 11))
        entry.pack(side="left", fill="x", expand=True, ipady=6)
        entry.bind("<Return>", lambda event: self.send_message())
        tk.Button(composer, text="Send", command=self.send_message, bg="#1d4ed8", fg="white", relief="flat", padx=14).pack(side="left", padx=(8, 0))
        self.chat_status = tk.Label(content, text="Emoji shortcodes such as :smile: and :wave: are shown as emoji.", bg="#f4f6f8", fg="#64748b", font=("Segoe UI", 9))
        self.chat_status.pack(anchor="w", pady=(8, 0))

    def connect(self):
        if self.socket is not None:
            try:
                self.socket.close()
            except OSError:
                pass
            self.socket = None
        try:
            self.socket = socket.create_connection((self.host, self.port), timeout=5)
            self.socket.settimeout(None)
        except OSError:
            self.auth_status.configure(text="Could not connect. Start server.py, then press Retry connection.")
            return
        self.auth_status.configure(text=f"Connected to {self.host}:{self.port}.")
        threading.Thread(target=self.read_loop, daemon=True).start()

    def read_loop(self):
        buffer = ""
        current = self.socket
        try:
            while True:
                data = current.recv(4096)
                if not data:
                    break
                buffer += data.decode("utf-8", errors="replace")
                while "\n" in buffer:
                    line, buffer = buffer.split("\n", 1)
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        payload = json.loads(line)
                    except json.JSONDecodeError:
                        continue
                    self.root.after(0, lambda payload=payload: self.on_payload(payload))
        except OSError:
            pass
        if self.socket is current and not self.closing:
            try:
                self.root.after(0, self.on_disconnect)
            except tk.TclError:
                pass

    def send(self, payload):
        if self.socket is None:
            self.auth_status.configure(text="Not connected to the server.")
            return
        try:
            self.socket.sendall((json.dumps(payload) + "\n").encode("utf-8"))
        except OSError:
            self.on_disconnect()

    def login(self):
        self.send({"type": "login", "username": self.username_var.get().strip(), "password": self.password_var.get()})

    def register(self):
        self.send({"type": "register", "username": self.username_var.get().strip(), "password": self.password_var.get()})

    def create_room(self):
        self.send({"type": "create_room", "name": self.room_var.get()})

    def join_selected(self):
        selection = self.room_list.curselection()
        if not selection:
            self.chat_status.configure(text="Select a room, then join it.")
            return
        self.send({"type": "join_room", "name": self.room_list.get(selection[0])})

    def refresh_rooms(self):
        self.send({"type": "list_rooms"})

    def send_message(self):
        text = self.message_var.get().strip()
        if not text:
            return
        self.send({"type": "message", "text": text})
        self.message_var.set("")

    def on_payload(self, payload):
        kind = payload.get("type")
        if kind == "auth_ok":
            self.username = payload.get("username", "")
            self.auth.pack_forget()
            self.main.pack(fill="both", expand=True)
            self.user_label.configure(text=f"Signed in as {self.username}")
            self.root.title(f"Chat — {self.username}")
        elif kind == "rooms":
            current = self.room
            self.room_list.delete(0, "end")
            for name in payload.get("rooms", []):
                self.room_list.insert("end", name)
                if name == current:
                    self.room_list.selection_set("end")
        elif kind == "history":
            self.room = payload.get("room", "")
            self.room_title.configure(text=self.room)
            self.chat.configure(state="normal")
            self.chat.delete("1.0", "end")
            self.chat.configure(state="disabled")
            for item in payload.get("messages", []):
                self.append_line(f"[{item.get('time', '')}] {item.get('user', '')}: {render_emoji(str(item.get('text', '')))}")
        elif kind == "chat":
            user = payload.get("user", "")
            text = render_emoji(str(payload.get("text", "")))
            self.append_line(f"[{payload.get('time', '')}] {user}: {text}")
            if user != self.username and not self.window_focused():
                self.notify(user)
        elif kind == "notice":
            self.append_line(f"— {payload.get('message', '')}")
            message = str(payload.get("message", ""))
            if message.startswith("Joined "):
                self.chat_status.configure(text=message)
        elif kind == "error":
            message = payload.get("message", "Something went wrong.")
            if self.username:
                self.chat_status.configure(text=message)
            else:
                self.auth_status.configure(text=message)

    def append_line(self, line):
        if not self.root.winfo_exists():
            return
        self.chat.configure(state="normal")
        self.chat.insert("end", line + "\n")
        self.chat.configure(state="disabled")
        self.chat.see("end")

    def window_focused(self):
        try:
            return bool(self.root.focus_displayof())
        except tk.TclError:
            return False

    def notify(self, user):
        self.root.bell()
        try:
            import winsound
            winsound.MessageBeep()
        except Exception:
            pass
        self.root.title(f"New message from {user}")
        self.notice.pack(fill="x", pady=(0, 6), before=self.room_title)
        self.notice.configure(text=f"New message from {user}")

    def clear_notice(self, event=None):
        if self.username:
            self.root.title(f"Chat — {self.username}")
        self.notice.pack_forget()

    def on_disconnect(self):
        self.socket = None
        if self.closing or not self.root.winfo_exists():
            return
        if self.username:
            self.append_line("— Disconnected from the server.")
            self.chat_status.configure(text="Disconnected from the server.")
        else:
            self.auth_status.configure(text="Disconnected from the server. Start server.py and press Retry connection.")

    def close(self):
        self.closing = True
        try:
            if self.socket is not None:
                self.socket.close()
        except OSError:
            pass
        self.root.destroy()

    def run(self):
        self.root.mainloop()


def main():
    host = sys.argv[1] if len(sys.argv) > 1 else HOST
    port = int(sys.argv[2]) if len(sys.argv) > 2 else PORT
    ChatClient(host, port).run()


if __name__ == "__main__":
    main()
