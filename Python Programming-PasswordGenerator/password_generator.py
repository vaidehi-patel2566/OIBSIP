import secrets
import string
import tkinter as tk
from tkinter import messagebox

import pyperclip

UPPER = string.ascii_uppercase
LOWER = string.ascii_lowercase
DIGITS = string.digits
SYMBOLS = "!@#$%^&*()-_=+[]{}:;,.?"
AMBIGUOUS = set("0OoIl1")


def filter_characters(characters, exclude_ambiguous):
    if not exclude_ambiguous:
        return characters
    return "".join(character for character in characters if character not in AMBIGUOUS)


def secure_shuffle(items):
    for index in range(len(items) - 1, 0, -1):
        swap = secrets.randbelow(index + 1)
        items[index], items[swap] = items[swap], items[index]


def generate_password(length, use_upper, use_lower, use_digits, use_symbols, exclude_ambiguous):
    if not isinstance(length, int) or isinstance(length, bool):
        raise ValueError("Password length must be a whole number.")
    if length < 8:
        raise ValueError("Password length must be at least 8 characters.")
    if length > 64:
        raise ValueError("Password length must be 64 characters or fewer.")
    selected = []
    if use_upper:
        selected.append(filter_characters(UPPER, exclude_ambiguous))
    if use_lower:
        selected.append(filter_characters(LOWER, exclude_ambiguous))
    if use_digits:
        selected.append(filter_characters(DIGITS, exclude_ambiguous))
    if use_symbols:
        selected.append(filter_characters(SYMBOLS, exclude_ambiguous))
    if len(selected) < 2:
        raise ValueError("Select at least two character types.")
    if any(not pool for pool in selected):
        raise ValueError("One of the selected character types has no characters left. Clear the ambiguous-character option or choose another type.")
    characters = [secrets.choice(pool) for pool in selected]
    combined = "".join(selected)
    while len(characters) < length:
        characters.append(secrets.choice(combined))
    secure_shuffle(characters)
    return "".join(characters)


def password_strength(password):
    variety = 0
    if any(character.isupper() for character in password):
        variety += 1
    if any(character.islower() for character in password):
        variety += 1
    if any(character.isdigit() for character in password):
        variety += 1
    if any(not character.isalnum() for character in password):
        variety += 1
    score = variety
    length = len(password)
    if length >= 8:
        score += 1
    if length >= 12:
        score += 1
    if length >= 16:
        score += 1
    if score <= 3:
        return "Weak", 0.34, "#b91c1c"
    if score <= 5:
        return "Medium", 0.67, "#d97706"
    return "Strong", 1.0, "#15803d"


class PasswordApp:
    def __init__(self, root):
        self.root = root
        self.history = []
        self.current_password = ""
        self.root.title("Password Generator")
        self.root.geometry("640x560")
        self.root.configure(bg="#f4f6f8")
        self.root.minsize(580, 520)
        self.length_var = tk.StringVar(value="16")
        self.upper_var = tk.BooleanVar(value=True)
        self.lower_var = tk.BooleanVar(value=True)
        self.digit_var = tk.BooleanVar(value=True)
        self.symbol_var = tk.BooleanVar(value=False)
        self.ambiguous_var = tk.BooleanVar(value=False)
        self.password_var = tk.StringVar()
        self._build()

    def _build(self):
        header = tk.Frame(self.root, bg="#0f172a", padx=20, pady=16)
        header.pack(fill="x")
        tk.Label(header, text="Password Generator", bg="#0f172a", fg="white", font=("Segoe UI", 18, "bold")).pack(anchor="w")
        tk.Label(header, text="Cryptographically secure passwords for this session only", bg="#0f172a", fg="#cbd5e1", font=("Segoe UI", 10)).pack(anchor="w")

        body = tk.Frame(self.root, bg="#f4f6f8", padx=20, pady=16)
        body.pack(fill="both", expand=True)

        length_row = tk.Frame(body, bg="#f4f6f8")
        length_row.pack(fill="x")
        tk.Label(length_row, text="Length (8-64)", bg="#f4f6f8", fg="#0f172a", font=("Segoe UI", 10)).pack(side="left")
        self.length_spin = tk.Spinbox(length_row, from_=8, to=64, textvariable=self.length_var, width=6, font=("Segoe UI", 12))
        self.length_spin.pack(side="left", padx=12)

        checks = tk.Frame(body, bg="#f4f6f8")
        checks.pack(fill="x", pady=(14, 0))
        self._check(checks, "Uppercase", self.upper_var)
        self._check(checks, "Lowercase", self.lower_var)
        self._check(checks, "Numbers", self.digit_var)
        self._check(checks, "Symbols", self.symbol_var)
        tk.Checkbutton(
            body,
            text="Exclude ambiguous characters (0, O, o, l, 1, I)",
            variable=self.ambiguous_var,
            bg="#f4f6f8",
            activebackground="#f4f6f8",
            font=("Segoe UI", 10),
        ).pack(anchor="w", pady=(10, 0))

        tk.Button(body, text="Generate", command=self.generate, bg="#1d4ed8", fg="white", relief="flat", padx=16, pady=8).pack(anchor="w", pady=(16, 10))

        strength_row = tk.Frame(body, bg="#f4f6f8")
        strength_row.pack(fill="x")
        self.strength_label = tk.Label(strength_row, text="Strength: —", bg="#f4f6f8", fg="#0f172a", font=("Segoe UI", 11, "bold"))
        self.strength_label.pack(anchor="w")
        self.bar = tk.Canvas(strength_row, width=240, height=16, bg="#e2e8f0", highlightthickness=0)
        self.bar.pack(anchor="w", pady=(6, 0))
        self.bar_fill = self.bar.create_rectangle(0, 0, 0, 16, fill="#94a3b8", width=0)

        tk.Label(body, text="Generated password", bg="#f4f6f8", fg="#0f172a", font=("Segoe UI", 10)).pack(anchor="w", pady=(16, 4))
        self.password_entry = tk.Entry(body, textvariable=self.password_var, font=("Consolas", 14), state="readonly", readonlybackground="white", relief="flat")
        self.password_entry.pack(fill="x", ipady=6)
        tk.Button(body, text="Copy to Clipboard", command=self.copy_password, bg="#0f172a", fg="white", relief="flat", padx=12, pady=6).pack(anchor="w", pady=(8, 0))

        tk.Label(body, text="Last 5 passwords this session (not saved to a file)", bg="#f4f6f8", fg="#475569", font=("Segoe UI", 10)).pack(anchor="w", pady=(16, 4))
        self.history_list = tk.Listbox(body, height=5, font=("Consolas", 11), activestyle="none", relief="flat", highlightthickness=1, highlightbackground="#cbd5e1")
        self.history_list.pack(fill="x")

    def _check(self, parent, text, variable):
        tk.Checkbutton(parent, text=text, variable=variable, bg="#f4f6f8", activebackground="#f4f6f8", font=("Segoe UI", 10)).pack(side="left", padx=(0, 12))

    def read_length(self):
        raw = self.length_spin.get().strip()
        if not raw.isdecimal():
            raise ValueError("Password length must be a whole number of at least 8.")
        return int(raw)

    def generate(self):
        try:
            password = generate_password(
                self.read_length(),
                self.upper_var.get(),
                self.lower_var.get(),
                self.digit_var.get(),
                self.symbol_var.get(),
                self.ambiguous_var.get(),
            )
        except ValueError as exc:
            messagebox.showerror("Check the options", str(exc))
            return
        self.current_password = password
        self.password_entry.configure(state="normal")
        self.password_var.set(password)
        self.password_entry.configure(state="readonly")
        label, ratio, color = password_strength(password)
        self.strength_label.configure(text=f"Strength: {label}", fg=color)
        self.bar.coords(self.bar_fill, 0, 0, 240 * ratio, 16)
        self.bar.itemconfigure(self.bar_fill, fill=color)
        self.history.insert(0, password)
        del self.history[5:]
        self.history_list.delete(0, "end")
        for item in self.history:
            self.history_list.insert("end", item)
        self.copy_password(silent=True)

    def copy_password(self, silent=False):
        if not self.current_password:
            if not silent:
                messagebox.showinfo("Password Generator", "Generate a password first.")
            return
        try:
            pyperclip.copy(self.current_password)
        except pyperclip.PyperclipException:
            if not silent:
                messagebox.showerror("Password Generator", "Could not copy to the clipboard.")
            else:
                messagebox.showwarning("Password Generator", "The password was generated, but it could not be copied to the clipboard.")


def main():
    root = tk.Tk()
    PasswordApp(root)
    root.mainloop()


if __name__ == "__main__":
    main()
