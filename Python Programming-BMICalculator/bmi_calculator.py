import os
import sqlite3
import tkinter as tk
from datetime import datetime
from tkinter import messagebox, ttk

import matplotlib
matplotlib.use("TkAgg")
from matplotlib.backends.backend_tkagg import FigureCanvasTkAgg
from matplotlib.figure import Figure

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "bmi_records.db")

CATEGORY_STYLES = {
    "Underweight": ("#1d4ed8", "#dbeafe"),
    "Normal": ("#15803d", "#dcfce7"),
    "Overweight": ("#c2410c", "#ffedd5"),
    "Obese": ("#b91c1c", "#fee2e2"),
}


def calculate_bmi(weight_kg, height_m):
    return round(weight_kg / (height_m ** 2), 2)


def classify_bmi(bmi):
    points = int(round(bmi * 100))
    if points < 1850:
        return "Underweight"
    if points < 2500:
        return "Normal"
    if points < 3000:
        return "Overweight"
    return "Obese"


def parse_measurement(value, label):
    text = value.strip()
    if not text:
        raise ValueError(f"Enter a {label}.")
    try:
        number = float(text)
    except ValueError:
        raise ValueError(f"{label.capitalize()} must be a number. Example: 70 or 1.75.")
    if number < 0:
        raise ValueError(f"{label.capitalize()} cannot be negative.")
    if number == 0:
        raise ValueError(f"{label.capitalize()} must be greater than zero.")
    return number


class BMIDatabase:
    def __init__(self, path=DB_PATH):
        self.path = path
        self._create()

    def _connect(self):
        connection = sqlite3.connect(self.path)
        connection.row_factory = sqlite3.Row
        return connection

    def _create(self):
        try:
            connection = self._connect()
            try:
                connection.execute(
                    """
                    CREATE TABLE IF NOT EXISTS records (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        username TEXT NOT NULL,
                        weight_kg REAL NOT NULL,
                        height_m REAL NOT NULL,
                        bmi REAL NOT NULL,
                        category TEXT NOT NULL,
                        recorded_at TEXT NOT NULL
                    )
                    """
                )
                connection.commit()
            finally:
                connection.close()
        except sqlite3.Error as exc:
            raise RuntimeError(f"Could not prepare the BMI database. {exc}") from exc

    def save(self, username, weight_kg, height_m, bmi, category, recorded_at):
        try:
            connection = self._connect()
            try:
                connection.execute(
                    """
                    INSERT INTO records (username, weight_kg, height_m, bmi, category, recorded_at)
                    VALUES (?, ?, ?, ?, ?, ?)
                    """,
                    (username, weight_kg, height_m, bmi, category, recorded_at),
                )
                connection.commit()
            finally:
                connection.close()
        except sqlite3.Error as exc:
            raise RuntimeError(f"Could not save the BMI record. {exc}") from exc

    def users(self):
        try:
            connection = self._connect()
            try:
                rows = connection.execute(
                    "SELECT DISTINCT username FROM records ORDER BY username COLLATE NOCASE"
                ).fetchall()
            finally:
                connection.close()
        except sqlite3.Error as exc:
            raise RuntimeError(f"Could not read saved users. {exc}") from exc
        return [row["username"] for row in rows]

    def records_for(self, username):
        try:
            connection = self._connect()
            try:
                rows = connection.execute(
                    """
                    SELECT username, weight_kg, height_m, bmi, category, recorded_at
                    FROM records
                    WHERE username = ? COLLATE NOCASE
                    ORDER BY recorded_at ASC, id ASC
                    """,
                    (username,),
                ).fetchall()
            finally:
                connection.close()
        except sqlite3.Error as exc:
            raise RuntimeError(f"Could not read BMI records. {exc}") from exc
        return [dict(row) for row in rows]


class BMIApp:
    def __init__(self, root, database):
        self.root = root
        self.database = database
        self.chart_window = None
        self.root.title("BMI Calculator")
        self.root.geometry("720x560")
        self.root.configure(bg="#f4f6f8")
        self.root.minsize(640, 520)
        self.name_var = tk.StringVar()
        self.weight_var = tk.StringVar()
        self.height_var = tk.StringVar()
        self._build()
        self.refresh_users()

    def _build(self):
        header = tk.Frame(self.root, bg="#1d4ed8", padx=20, pady=16)
        header.pack(fill="x")
        tk.Label(header, text="BMI Calculator", bg="#1d4ed8", fg="white", font=("Segoe UI", 18, "bold")).pack(anchor="w")
        tk.Label(
            header,
            text="Weight in kilograms and height in metres",
            bg="#1d4ed8",
            fg="#dbeafe",
            font=("Segoe UI", 10),
        ).pack(anchor="w")

        form = tk.Frame(self.root, bg="#f4f6f8", padx=20, pady=16)
        form.pack(fill="x")
        self._field(form, "Name", self.name_var, combo=True, row=0)
        self._field(form, "Weight (kg)", self.weight_var, row=1)
        self._field(form, "Height (m)", self.height_var, row=2)

        buttons = tk.Frame(form, bg="#f4f6f8")
        buttons.grid(row=3, column=1, sticky="w", pady=(12, 0))
        tk.Button(buttons, text="Calculate", command=self.calculate, bg="#1d4ed8", fg="white", relief="flat", padx=14, pady=6).pack(side="left")
        tk.Button(buttons, text="Save Record", command=self.save_record, bg="#0f172a", fg="white", relief="flat", padx=14, pady=6).pack(side="left", padx=8)
        tk.Button(buttons, text="Show Trend", command=self.show_trend, bg="#334155", fg="white", relief="flat", padx=14, pady=6).pack(side="left")

        self.result = tk.Label(
            self.root,
            text="Enter weight and height, then calculate.",
            bg="#e2e8f0",
            fg="#0f172a",
            font=("Segoe UI", 14, "bold"),
            padx=16,
            pady=14,
        )
        self.result.pack(fill="x", padx=20, pady=(0, 8))
        tk.Label(
            self.root,
            text="Underweight < 18.5    Normal 18.5-24.9    Overweight 25-29.9    Obese 30 or above",
            bg="#f4f6f8",
            fg="#475569",
            font=("Segoe UI", 9),
        ).pack(anchor="w", padx=20)

        history_frame = tk.Frame(self.root, bg="#f4f6f8", padx=20, pady=12)
        history_frame.pack(fill="both", expand=True)
        tk.Label(history_frame, text="Saved records", bg="#f4f6f8", fg="#0f172a", font=("Segoe UI", 11, "bold")).pack(anchor="w")
        self.history = tk.Listbox(history_frame, font=("Segoe UI", 10), activestyle="none", relief="flat", highlightthickness=1, highlightbackground="#cbd5e1")
        self.history.pack(fill="both", expand=True, pady=(6, 0))
        self.root.bind("<Return>", lambda event: self.calculate())

    def _field(self, parent, label, variable, row, combo=False):
        tk.Label(parent, text=label, bg="#f4f6f8", fg="#0f172a", font=("Segoe UI", 10)).grid(row=row, column=0, sticky="w", pady=6, padx=(0, 12))
        if combo:
            self.name_box = ttk.Combobox(parent, textvariable=variable, width=32)
            self.name_box.grid(row=row, column=1, sticky="w", pady=6)
            self.name_box.bind("<<ComboboxSelected>>", lambda event: self.load_history())
        else:
            tk.Entry(parent, textvariable=variable, width=34, font=("Segoe UI", 11)).grid(row=row, column=1, sticky="w", pady=6)

    def refresh_users(self):
        try:
            names = self.database.users()
        except RuntimeError as exc:
            messagebox.showerror("BMI Calculator", str(exc))
            return
        self.name_box["values"] = names

    def read_inputs(self):
        weight = parse_measurement(self.weight_var.get(), "weight")
        height = parse_measurement(self.height_var.get(), "height")
        bmi = calculate_bmi(weight, height)
        category = classify_bmi(bmi)
        return weight, height, bmi, category

    def calculate(self):
        try:
            weight, height, bmi, category = self.read_inputs()
        except ValueError as exc:
            messagebox.showerror("Check the measurements", str(exc))
            return None
        foreground, background = CATEGORY_STYLES[category]
        self.result.configure(text=f"BMI: {bmi:.2f}  —  {category}", fg=foreground, bg=background)
        return weight, height, bmi, category

    def save_record(self):
        name = self.name_var.get().strip()
        if not name:
            messagebox.showerror("Check the name", "Enter a name before saving a BMI record.")
            return
        if len(name) > 40:
            messagebox.showerror("Check the name", "Use a name of 40 characters or fewer.")
            return
        result = self.calculate()
        if result is None:
            return
        weight, height, bmi, category = result
        recorded_at = datetime.now().strftime("%Y-%m-%d %H:%M")
        try:
            self.database.save(name, weight, height, bmi, category, recorded_at)
        except RuntimeError as exc:
            messagebox.showerror("BMI Calculator", str(exc))
            return
        self.refresh_users()
        self.load_history()
        messagebox.showinfo("BMI Calculator", f"Saved {bmi:.2f} ({category}) for {name}.")

    def load_history(self):
        name = self.name_var.get().strip()
        self.history.delete(0, "end")
        if not name:
            return
        try:
            records = self.database.records_for(name)
        except RuntimeError as exc:
            messagebox.showerror("BMI Calculator", str(exc))
            return
        for record in records:
            self.history.insert(
                "end",
                f"{record['recorded_at']}    BMI {record['bmi']:.2f}    {record['category']}    {record['weight_kg']} kg, {record['height_m']} m",
            )

    def show_trend(self):
        name = self.name_var.get().strip()
        if not name:
            messagebox.showerror("Check the name", "Choose a name to see that person's BMI trend.")
            return
        try:
            records = self.database.records_for(name)
        except RuntimeError as exc:
            messagebox.showerror("BMI Calculator", str(exc))
            return
        if not records:
            messagebox.showinfo("BMI Calculator", f"There are no saved records for {name} yet.")
            return
        if self.chart_window is not None and self.chart_window.winfo_exists():
            self.chart_window.destroy()
        window = tk.Toplevel(self.root)
        self.chart_window = window
        window.title(f"BMI trend — {name}")
        window.geometry("720x460")
        window.configure(bg="white")
        moments = [datetime.strptime(record["recorded_at"], "%Y-%m-%d %H:%M") for record in records]
        values = [record["bmi"] for record in records]
        figure = Figure(figsize=(7, 4.2), dpi=100)
        axis = figure.add_subplot(111)
        axis.plot(moments, values, color="#1d4ed8", marker="o", linewidth=2)
        axis.set_title(f"BMI trend for {name}")
        axis.set_ylabel("BMI")
        axis.grid(True, alpha=0.3)
        figure.autofmt_xdate()
        figure.tight_layout()
        canvas = FigureCanvasTkAgg(figure, master=window)
        canvas.draw()
        canvas.get_tk_widget().pack(fill="both", expand=True)


def main():
    root = tk.Tk()
    try:
        database = BMIDatabase()
    except RuntimeError as exc:
        messagebox.showerror("BMI Calculator", str(exc))
        root.destroy()
        return
    BMIApp(root, database)
    root.mainloop()


if __name__ == "__main__":
    main()
