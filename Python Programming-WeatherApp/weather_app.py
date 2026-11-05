import os
import re
import threading
import tkinter as tk
from datetime import datetime, timedelta, timezone
from io import BytesIO

import requests
from PIL import Image, ImageTk

DESCRIPTIONS = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Rime fog",
    51: "Light drizzle",
    53: "Drizzle",
    55: "Heavy drizzle",
    56: "Freezing drizzle",
    57: "Heavy freezing drizzle",
    61: "Light rain",
    63: "Rain",
    65: "Heavy rain",
    66: "Freezing rain",
    67: "Heavy freezing rain",
    71: "Light snow",
    73: "Snow",
    75: "Heavy snow",
    77: "Snow grains",
    80: "Light showers",
    81: "Showers",
    82: "Heavy showers",
    85: "Snow showers",
    86: "Heavy snow showers",
    95: "Thunderstorm",
    96: "Thunderstorm with hail",
    99: "Thunderstorm with heavy hail",
}

ICONS = {
    0: "01d",
    1: "02d",
    2: "03d",
    3: "04d",
    45: "50d",
    48: "50d",
    51: "09d",
    53: "09d",
    55: "09d",
    56: "09d",
    57: "09d",
    61: "10d",
    63: "10d",
    65: "10d",
    66: "13d",
    67: "13d",
    71: "13d",
    73: "13d",
    75: "13d",
    77: "13d",
    80: "09d",
    81: "09d",
    82: "09d",
    85: "13d",
    86: "13d",
    95: "11d",
    96: "11d",
    99: "11d",
}


class WeatherError(Exception):
    pass


def load_api_key():
    key = os.environ.get("OPENWEATHER_API_KEY", "").strip()
    if key:
        return key
    path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "api_key.txt")
    if not os.path.exists(path):
        return ""
    try:
        with open(path, "r", encoding="utf-8") as handle:
            return handle.read().strip()
    except OSError as exc:
        raise WeatherError(f"Could not read api_key.txt. {exc}") from exc


def describe(code):
    return DESCRIPTIONS.get(int(code), "Unknown conditions")


def icon_name(code):
    return ICONS.get(int(code), "03d")


def geocode_nominatim(query):
    response = requests.get(
        "https://nominatim.openstreetmap.org/search",
        params={"q": query, "format": "json", "limit": 1},
        headers={"User-Agent": "OIBSIPWeatherApp/1.0"},
        timeout=10,
    )
    response.raise_for_status()
    rows = response.json()
    if not rows:
        return None
    row = rows[0]
    short_name = row.get("display_name", query).split(",")[0].strip() or query
    return {
        "name": short_name,
        "latitude": float(row["lat"]),
        "longitude": float(row["lon"]),
    }


def geocode(query):
    cleaned = query.strip()
    if not cleaned:
        raise WeatherError("Enter a city name or ZIP code.")
    if any(character.isdigit() for character in cleaned):
        located = _call(lambda: geocode_nominatim(cleaned), "location")
        if located:
            return located
    response = _get(
        "https://geocoding-api.open-meteo.com/v1/search",
        {"name": cleaned, "count": 1, "language": "en", "format": "json"},
    )
    results = response.json().get("results") or []
    if results:
        place = results[0]
        label = place.get("name", cleaned)
        if place.get("country"):
            label = f"{label}, {place['country']}"
        return {"name": label, "latitude": place["latitude"], "longitude": place["longitude"]}
    located = _call(lambda: geocode_nominatim(cleaned), "location")
    if located:
        return located
    raise WeatherError(f"City not found for {cleaned}.")


def _get(url, params):
    try:
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        return response
    except requests.Timeout as exc:
        raise WeatherError("The weather service timed out. Check your connection and try again.") from exc
    except requests.ConnectionError as exc:
        raise WeatherError("Could not reach the weather service. Check your network connection.") from exc
    except requests.HTTPError as exc:
        raise WeatherError("The weather service returned an error.") from exc
    except requests.RequestException as exc:
        raise WeatherError("Could not reach the weather service. Check your network connection.") from exc


def _call(func, label):
    try:
        return func()
    except requests.Timeout as exc:
        raise WeatherError(f"The {label} service timed out. Check your connection and try again.") from exc
    except requests.ConnectionError as exc:
        raise WeatherError(f"Could not reach the {label} service. Check your network connection.") from exc
    except requests.RequestException as exc:
        raise WeatherError(f"Could not reach the {label} service. Check your network connection.") from exc


def fetch_weather(query, api_key=""):
    cleaned = query.strip()
    if not cleaned:
        raise WeatherError("Enter a city name or ZIP code.")
    if api_key:
        return fetch_openweather(cleaned, api_key)
    return fetch_open_meteo(cleaned)


def fetch_open_meteo(query):
    place = geocode(query)
    response = _get(
        "https://api.open-meteo.com/v1/forecast",
        {
            "latitude": place["latitude"],
            "longitude": place["longitude"],
            "current": "temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m",
            "hourly": "temperature_2m,weather_code",
            "daily": "weather_code,temperature_2m_max,temperature_2m_min",
            "timezone": "auto",
            "forecast_days": 5,
            "wind_speed_unit": "kmh",
        },
    )
    payload = response.json()
    current = payload.get("current") or {}
    if current.get("temperature_2m") is None:
        raise WeatherError("The weather service returned an incomplete response.")
    current_hour = str(current.get("time", ""))[:13]
    hourly = []
    times = payload.get("hourly", {}).get("time", [])
    temps = payload.get("hourly", {}).get("temperature_2m", [])
    codes = payload.get("hourly", {}).get("weather_code", [])
    start = 0
    found = False
    for index, stamp in enumerate(times):
        if stamp[:13] >= current_hour:
            start = index
            found = True
            break
    if not found and times:
        start = max(0, len(times) - 6)
    for index in range(start, min(start + 6, len(times))):
        code = int(codes[index])
        hourly.append({
            "label": times[index][11:16],
            "temp_c": temps[index],
            "description": describe(code),
            "icon": icon_name(code),
        })
    daily = []
    day_times = payload.get("daily", {}).get("time", [])
    day_codes = payload.get("daily", {}).get("weather_code", [])
    day_max = payload.get("daily", {}).get("temperature_2m_max", [])
    day_min = payload.get("daily", {}).get("temperature_2m_min", [])
    for index, day in enumerate(day_times[:5]):
        code = int(day_codes[index])
        parsed = datetime.strptime(day, "%Y-%m-%d")
        daily.append({
            "label": parsed.strftime("%a %d %b"),
            "min_c": day_min[index],
            "max_c": day_max[index],
            "description": describe(code),
            "icon": icon_name(code),
        })
    code = int(current.get("weather_code", -1))
    return {
        "place": place["name"],
        "temp_c": current["temperature_2m"],
        "humidity": current.get("relative_humidity_2m"),
        "wind_kmh": current.get("wind_speed_10m"),
        "description": describe(code),
        "icon": icon_name(code),
        "hourly": hourly,
        "daily": daily,
        "source": "Open-Meteo",
    }


def openweather_payload(url, params):
    try:
        response = requests.get(url, params=params, timeout=10)
    except requests.Timeout as exc:
        raise WeatherError("The weather service timed out. Check your connection and try again.") from exc
    except requests.ConnectionError as exc:
        raise WeatherError("Could not reach the weather service. Check your network connection.") from exc
    except requests.RequestException as exc:
        raise WeatherError("Could not reach the weather service. Check your network connection.") from exc
    try:
        payload = response.json()
    except ValueError as exc:
        raise WeatherError("The weather service returned an unreadable response.") from exc
    code = str(payload.get("cod", response.status_code))
    if code == "401":
        raise WeatherError("The API key is invalid.")
    if code == "404":
        raise WeatherError("City not found.")
    if response.status_code >= 400 or code not in {"200", "0"}:
        message = payload.get("message") or "The weather service returned an error."
        raise WeatherError(str(message))
    return payload


def fetch_openweather(query, api_key):
    if re.fullmatch(r"\d{5}", query):
        params = {"zip": f"{query},us", "appid": api_key, "units": "metric"}
    else:
        params = {"q": query, "appid": api_key, "units": "metric"}
    current = openweather_payload("https://api.openweathermap.org/data/2.5/weather", params)
    forecast = openweather_payload("https://api.openweathermap.org/data/2.5/forecast", params)
    weather = (current.get("weather") or [{}])[0]
    main = current.get("main") or {}
    if main.get("temp") is None:
        raise WeatherError("The weather service returned an incomplete response.")
    place = current.get("name", query)
    country = (current.get("sys") or {}).get("country", "")
    if country:
        place = f"{place}, {country}"
    now = datetime.now(timezone.utc)
    hourly = []
    for item in forecast.get("list", []):
        moment = datetime.fromtimestamp(item.get("dt", 0), timezone.utc)
        if now <= moment <= now + timedelta(hours=6):
            item_weather = (item.get("weather") or [{}])[0]
            hourly.append({
                "label": moment.astimezone().strftime("%H:%M"),
                "temp_c": item["main"]["temp"],
                "description": str(item_weather.get("description", "")).title(),
                "icon": item_weather.get("icon") or "03d",
            })
    if not hourly and forecast.get("list"):
        item = forecast["list"][0]
        item_weather = (item.get("weather") or [{}])[0]
        moment = datetime.fromtimestamp(item.get("dt", 0), timezone.utc)
        hourly.append({
            "label": moment.astimezone().strftime("%H:%M"),
            "temp_c": item["main"]["temp"],
            "description": str(item_weather.get("description", "")).title(),
            "icon": item_weather.get("icon") or "03d",
        })
    grouped = {}
    for item in forecast.get("list", []):
        day = item.get("dt_txt", "")[:10]
        if day:
            grouped.setdefault(day, []).append(item)
    daily = []
    for day, items in list(grouped.items())[:5]:
        temps = [item["main"]["temp"] for item in items]
        sample = items[len(items) // 2]
        sample_weather = (sample.get("weather") or [{}])[0]
        parsed = datetime.strptime(day, "%Y-%m-%d")
        daily.append({
            "label": parsed.strftime("%a %d %b"),
            "min_c": min(temps),
            "max_c": max(temps),
            "description": str(sample_weather.get("description", "")).title(),
            "icon": sample_weather.get("icon") or "03d",
        })
    wind = (current.get("wind") or {}).get("speed")
    return {
        "place": place,
        "temp_c": main["temp"],
        "humidity": main.get("humidity"),
        "wind_kmh": None if wind is None else wind * 3.6,
        "description": str(weather.get("description", "")).title(),
        "icon": weather.get("icon") or "03d",
        "hourly": hourly,
        "daily": daily,
        "source": "OpenWeatherMap",
    }


def detect_city():
    try:
        response = requests.get("https://ipinfo.io/json", timeout=10)
        response.raise_for_status()
        city = str(response.json().get("city", "")).strip()
    except requests.Timeout as exc:
        raise WeatherError("Location detection timed out. Enter a city instead.") from exc
    except requests.RequestException as exc:
        raise WeatherError("Could not detect your location. Enter a city instead.") from exc
    if not city:
        raise WeatherError("Could not detect your city. Enter a city instead.")
    return city


def download_icons(names):
    blobs = {}
    for name in names:
        if not name or name in blobs:
            continue
        try:
            response = requests.get(f"https://openweathermap.org/img/wn/{name}@2x.png", timeout=10)
            response.raise_for_status()
            blobs[name] = response.content
        except requests.RequestException:
            blobs[name] = None
    return blobs


class WeatherApp:
    def __init__(self, root):
        self.root = root
        self.unit = "C"
        self.report = None
        self.photos = []
        self.busy = False
        self.root.title("Weather")
        self.root.geometry("920x680")
        self.root.minsize(820, 620)
        self.root.configure(bg="#e8eef5")
        self.city_var = tk.StringVar()
        try:
            self.api_key = load_api_key()
        except WeatherError as exc:
            self.api_key = ""
            self.startup_error = str(exc)
        else:
            self.startup_error = ""
        self._build()
        if self.startup_error:
            self.show_error(self.startup_error)

    def _build(self):
        header = tk.Frame(self.root, bg="#0f2744", padx=18, pady=14)
        header.pack(fill="x")
        tk.Label(header, text="Weather", bg="#0f2744", fg="white", font=("Segoe UI", 18, "bold")).pack(side="left")
        self.unit_button = tk.Button(header, text="Switch to \u00b0F", command=self.toggle_unit, bg="#1d4ed8", fg="white", relief="flat", padx=10, pady=4)
        self.unit_button.pack(side="right")

        search = tk.Frame(self.root, bg="#e8eef5", padx=18, pady=12)
        search.pack(fill="x")
        tk.Label(search, text="City or ZIP", bg="#e8eef5", fg="#0f172a", font=("Segoe UI", 10)).pack(side="left")
        tk.Entry(search, textvariable=self.city_var, font=("Segoe UI", 12), width=28).pack(side="left", padx=8, ipady=4)
        self.fetch_button = tk.Button(search, text="Get Weather", command=self.request_weather, bg="#1d4ed8", fg="white", relief="flat", padx=12, pady=6)
        self.fetch_button.pack(side="left")
        tk.Button(search, text="Use my location", command=self.use_location, bg="#0f172a", fg="white", relief="flat", padx=12, pady=6).pack(side="left", padx=8)

        self.status = tk.Label(self.root, text="", bg="#e8eef5", fg="#b91c1c", font=("Segoe UI", 10), anchor="w", wraplength=860, justify="left")
        self.status.pack(fill="x", padx=18)

        current = tk.Frame(self.root, bg="white", padx=16, pady=14, highlightthickness=1, highlightbackground="#dbe3ee")
        current.pack(fill="x", padx=18, pady=(8, 10))
        self.current_icon = tk.Label(current, bg="white")
        self.current_icon.pack(side="left", padx=(0, 12))
        text_block = tk.Frame(current, bg="white")
        text_block.pack(side="left", fill="x", expand=True)
        self.place_label = tk.Label(text_block, text="Search for a city", bg="white", fg="#0f172a", font=("Segoe UI", 16, "bold"))
        self.place_label.pack(anchor="w")
        self.temp_label = tk.Label(text_block, text="", bg="white", fg="#0f172a", font=("Segoe UI", 28, "bold"))
        self.temp_label.pack(anchor="w")
        self.both_label = tk.Label(text_block, text="", bg="white", fg="#475569", font=("Segoe UI", 11))
        self.both_label.pack(anchor="w")
        self.detail_label = tk.Label(text_block, text="", bg="white", fg="#334155", font=("Segoe UI", 11))
        self.detail_label.pack(anchor="w", pady=(4, 0))

        self.hourly_title = tk.Label(self.root, text="Next 6 hours", bg="#e8eef5", fg="#0f172a", font=("Segoe UI", 12, "bold"))
        self.hourly_title.pack(anchor="w", padx=18)
        hourly_frame = tk.Frame(self.root, bg="#e8eef5")
        hourly_frame.pack(fill="x", padx=18, pady=(4, 10))
        self.hourly_slots = [self._slot(hourly_frame, 110) for _ in range(6)]

        tk.Label(self.root, text="5-day forecast", bg="#e8eef5", fg="#0f172a", font=("Segoe UI", 12, "bold")).pack(anchor="w", padx=18)
        daily_frame = tk.Frame(self.root, bg="#e8eef5")
        daily_frame.pack(fill="x", padx=18, pady=(4, 8))
        self.daily_slots = [self._slot(daily_frame, 140) for _ in range(5)]
        self.source_label = tk.Label(self.root, text="", bg="#e8eef5", fg="#64748b", font=("Segoe UI", 9))
        self.source_label.pack(anchor="w", padx=18, pady=(0, 8))
        self.root.bind("<Return>", lambda event: self.request_weather())
        self.root.protocol("WM_DELETE_WINDOW", self.on_close)

    def _slot(self, parent, width):
        frame = tk.Frame(parent, bg="white", width=width, height=150, highlightthickness=1, highlightbackground="#dbe3ee")
        frame.pack(side="left", expand=True, fill="both", padx=4)
        frame.pack_propagate(False)
        title = tk.Label(frame, text="", bg="white", fg="#0f172a", font=("Segoe UI", 9, "bold"))
        title.pack(pady=(8, 0))
        icon = tk.Label(frame, bg="white")
        icon.pack()
        temp = tk.Label(frame, text="", bg="white", fg="#0f172a", font=("Segoe UI", 10))
        temp.pack()
        detail = tk.Label(frame, text="", bg="white", fg="#64748b", font=("Segoe UI", 8), wraplength=width - 16)
        detail.pack()
        return {"frame": frame, "title": title, "icon": icon, "temp": temp, "detail": detail}

    def toggle_unit(self):
        self.unit = "F" if self.unit == "C" else "C"
        self.unit_button.configure(text="Switch to \u00b0C" if self.unit == "F" else "Switch to \u00b0F")
        if self.report:
            self.render(self.report)

    def request_weather(self):
        city = self.city_var.get()
        if not city.strip():
            self.show_error("Enter a city name or ZIP code.")
            return
        self.start_fetch(city.strip())

    def use_location(self):
        if self.busy:
            return
        self.set_busy(True)
        self.status.configure(text="Detecting location...", fg="#1d4ed8")

        def worker():
            try:
                city = detect_city()
            except WeatherError as exc:
                self.root.after(0, lambda message=str(exc): self.finish_error(message))
                return
            self.root.after(0, lambda city=city: self.after_location(city))

        threading.Thread(target=worker, daemon=True).start()

    def after_location(self, city):
        self.city_var.set(city)
        self.set_busy(False)
        self.start_fetch(city)

    def start_fetch(self, city):
        if self.busy:
            return
        self.set_busy(True)
        self.status.configure(text="Fetching weather...", fg="#1d4ed8")

        def worker():
            try:
                report = fetch_weather(city, self.api_key)
                names = [report["icon"]]
                names.extend(item["icon"] for item in report["hourly"])
                names.extend(item["icon"] for item in report["daily"])
                icons = download_icons(names)
            except WeatherError as exc:
                self.root.after(0, lambda message=str(exc): self.finish_error(message))
                return
            self.root.after(0, lambda report=report, icons=icons: self.finish_report(report, icons))

        threading.Thread(target=worker, daemon=True).start()

    def finish_error(self, message):
        self.set_busy(False)
        self.show_error(message)

    def finish_report(self, report, icons):
        self.set_busy(False)
        self.icon_blobs = icons
        self.report = report
        self.render(report)
        self.status.configure(text="Weather updated.", fg="#15803d")

    def show_error(self, message):
        self.status.configure(text=message, fg="#b91c1c")

    def set_busy(self, busy):
        self.busy = busy
        self.fetch_button.configure(state="disabled" if busy else "normal")

    def format_temp(self, celsius):
        if celsius is None:
            return "--"
        if self.unit == "F":
            return f"{(celsius * 9 / 5) + 32:.1f}\u00b0F"
        return f"{celsius:.1f}\u00b0C"

    def both_temps(self, celsius):
        if celsius is None:
            return ""
        fahrenheit = (celsius * 9 / 5) + 32
        return f"{celsius:.1f}\u00b0C  /  {fahrenheit:.1f}\u00b0F"

    def photo_for(self, name, size):
        blob = getattr(self, "icon_blobs", {}).get(name)
        if not blob:
            return None
        try:
            image = Image.open(BytesIO(blob)).convert("RGBA")
            image = image.resize((size, size), Image.Resampling.LANCZOS)
            return ImageTk.PhotoImage(image)
        except OSError:
            return None

    def on_close(self):
        for slot in self.hourly_slots + self.daily_slots:
            slot["icon"].configure(image="")
        self.current_icon.configure(image="")
        self.photos.clear()
        self.root.destroy()

    def render(self, report):
        photos = []
        self.place_label.configure(text=report["place"])
        self.temp_label.configure(text=self.format_temp(report["temp_c"]))
        self.both_label.configure(text=self.both_temps(report["temp_c"]))
        humidity = report.get("humidity")
        humidity_text = "--" if humidity is None else f"{int(round(humidity))}%"
        wind = report.get("wind_kmh")
        wind_text = "--" if wind is None else f"{wind:.1f} km/h"
        self.detail_label.configure(text=f"{report['description']}    Humidity {humidity_text}    Wind {wind_text}")
        current_photo = self.photo_for(report["icon"], 86)
        if current_photo is not None:
            photos.append(current_photo)
            self.current_icon.configure(image=current_photo)
        else:
            self.current_icon.configure(image="")
        self._fill_slots(self.hourly_slots, report["hourly"], True, photos)
        self._fill_slots(self.daily_slots, report["daily"], False, photos)
        self.photos = photos
        self.source_label.configure(text=f"Source: {report['source']}")

    def _fill_slots(self, slots, rows, hourly, photos):
        for index, slot in enumerate(slots):
            if index >= len(rows):
                slot["title"].configure(text="")
                slot["icon"].configure(image="")
                slot["temp"].configure(text="")
                slot["detail"].configure(text="")
                continue
            row = rows[index]
            slot["title"].configure(text=row["label"])
            photo = self.photo_for(row["icon"], 52)
            if photo is not None:
                photos.append(photo)
                slot["icon"].configure(image=photo)
            else:
                slot["icon"].configure(image="")
            if hourly:
                slot["temp"].configure(text=self.format_temp(row["temp_c"]))
            else:
                slot["temp"].configure(text=f"{self.format_temp(row['min_c'])}  {self.format_temp(row['max_c'])}")
            slot["detail"].configure(text=row["description"])


def main():
    root = tk.Tk()
    WeatherApp(root)
    root.mainloop()


if __name__ == "__main__":
    main()
