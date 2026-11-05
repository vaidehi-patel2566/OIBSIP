import json
import os
import queue
import re
import smtplib
import sys
import threading
from datetime import datetime
from email.message import EmailMessage
from urllib.parse import quote, quote_plus

import requests
import webbrowser

try:
    import speech_recognition as sr
except ImportError:
    sr = None

try:
    import pyttsx3
except ImportError:
    pyttsx3 = None

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
COMMANDS_PATH = os.path.join(BASE_DIR, "commands.json")
EMAIL_PATH = os.path.join(BASE_DIR, "email_config.json")

LOCAL_FACTS = {
    "oasis infobyte": "Oasis Infobyte is an internship program with project tracks in web development, Java, Android, data science, and Python.",
}

WEATHER_CODES = {
    0: "clear",
    1: "mainly clear",
    2: "partly cloudy",
    3: "overcast",
    45: "foggy",
    48: "foggy",
    51: "light drizzle",
    53: "drizzle",
    55: "heavy drizzle",
    56: "freezing drizzle",
    57: "freezing drizzle",
    61: "light rain",
    63: "rain",
    65: "heavy rain",
    66: "freezing rain",
    67: "freezing rain",
    71: "light snow",
    73: "snow",
    75: "heavy snow",
    77: "snow",
    80: "rain showers",
    81: "rain showers",
    82: "heavy rain showers",
    85: "snow showers",
    86: "snow showers",
    95: "a thunderstorm",
    96: "a thunderstorm",
    99: "a thunderstorm",
}


class Speaker:
    def __init__(self):
        self._queue = queue.Queue()
        self._thread = threading.Thread(target=self._loop, daemon=True)
        self._thread.start()

    def say(self, text, wait=False):
        print(f"Assistant: {text}")
        done = threading.Event()
        self._queue.put((text, done))
        if wait:
            done.wait(timeout=20)

    def _loop(self):
        engine = None
        if pyttsx3 is not None:
            try:
                if sys.platform.startswith("win"):
                    try:
                        import pythoncom
                        pythoncom.CoInitialize()
                    except ImportError:
                        pass
                engine = pyttsx3.init()
                engine.setProperty("rate", 175)
            except Exception as exc:
                print(f"Text-to-speech is unavailable ({exc}). Responses will be printed.")
                engine = None
        else:
            print("pyttsx3 is not installed. Responses will be printed.")
        while True:
            text, done = self._queue.get()
            if engine is not None:
                try:
                    engine.say(text)
                    engine.runAndWait()
                except Exception as exc:
                    print(f"Text-to-speech failed ({exc}).")
            done.set()


def normalize(text):
    return re.sub(r"\s+", " ", text.lower()).strip()


def load_commands():
    if not os.path.exists(COMMANDS_PATH):
        data = {"custom": []}
        save_commands(data)
        return data
    try:
        with open(COMMANDS_PATH, "r", encoding="utf-8") as handle:
            data = json.load(handle)
    except (OSError, json.JSONDecodeError):
        return {"custom": []}
    if not isinstance(data, dict) or not isinstance(data.get("custom"), list):
        return {"custom": []}
    return data


def save_commands(data):
    with open(COMMANDS_PATH, "w", encoding="utf-8") as handle:
        json.dump(data, handle, indent=2)


def detect_intent(text, custom_commands):
    cleaned = normalize(text)
    ordered = sorted(
        [item for item in custom_commands if isinstance(item, dict)],
        key=lambda item: len(str(item.get("phrase", ""))),
        reverse=True,
    )
    for command in ordered:
        phrase = normalize(str(command.get("phrase", "")))
        if len(phrase) < 2:
            continue
        if re.search(r"\b" + re.escape(phrase) + r"\b", cleaned):
            return {"intent": "custom", "command": command}
    if re.search(r"\b(exit|quit|goodbye|stop listening)\b", cleaned):
        return {"intent": "exit"}
    if re.search(r"\b(add|create|save)\b.*\b(command|shortcut)\b", cleaned):
        return {"intent": "add_command"}
    if re.search(r"\b(send|write|compose)\b.*\b(email|mail|e-mail)\b", cleaned):
        return {"intent": "email", "text": cleaned}
    if re.search(r"\b(remind|reminder|timer|alarm)\b", cleaned):
        return {"intent": "reminder", "text": cleaned}
    if re.search(r"\b(weather|temperature|forecast)\b", cleaned):
        return {"intent": "weather", "city": extract_place(cleaned)}
    if re.search(r"\b(search|google|look up|browse)\b", cleaned):
        return {"intent": "search", "query": extract_search_query(cleaned)}
    if re.search(r"\btime\b", cleaned):
        return {"intent": "time"}
    if re.search(r"\b(date|day|today)\b", cleaned):
        return {"intent": "date"}
    if re.search(r"\b(hello|hi|hey|good morning|good afternoon|good evening)\b", cleaned):
        return {"intent": "greeting"}
    if re.search(r"\b(who|what|when|where|why|how|define|explain|tell me)\b", cleaned):
        return {"intent": "question", "text": cleaned}
    return {"intent": "unknown"}


def extract_place(text):
    match = re.search(r"\b(?:in|for|at)\s+([a-z][a-z\s]+)$", text)
    if not match:
        return ""
    city = re.sub(r"\b(please|now|today|currently)\b", "", match.group(1))
    return re.sub(r"\s+", " ", city).strip()


def extract_search_query(text):
    match = re.search(r"\b(?:search(?: for)?|google|look up|browse(?: for)?)\s+(.+)$", text)
    if not match:
        return ""
    return match.group(1).strip()


def parse_reminder(text):
    match = re.search(r"(\d+)\s*(second|seconds|sec|minute|minutes|min|hour|hours|hr)\b", text, re.IGNORECASE)
    if not match:
        return None, None
    amount = int(match.group(1))
    unit = match.group(2).lower()
    if unit.startswith("hour") or unit == "hr":
        seconds = amount * 3600
    elif unit.startswith("min"):
        seconds = amount * 60
    else:
        seconds = amount
    message_match = re.search(r"\b(?:to|that|about)\s+(.+)$", text, re.IGNORECASE)
    message = message_match.group(1).strip() if message_match else ""
    return seconds, message


def parse_email(text):
    match = re.search(r"\bto\s+(\S+)\s+subject\s+(.+?)\s+body\s+(.+)$", text, re.IGNORECASE)
    if not match:
        return None
    return {
        "to": speech_email(match.group(1)),
        "subject": match.group(2).strip(),
        "body": match.group(3).strip(),
    }


def speech_email(text):
    cleaned = normalize(text)
    cleaned = cleaned.replace(" at ", "@").replace(" dot ", ".")
    cleaned = re.sub(r"\s+", "", cleaned)
    return cleaned


def valid_email(address):
    return re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", address) is not None


def duration_phrase(seconds):
    if seconds < 60:
        unit = "second" if seconds == 1 else "seconds"
        return f"{seconds} {unit}"
    if seconds % 3600 == 0:
        hours = seconds // 3600
        unit = "hour" if hours == 1 else "hours"
        return f"{hours} {unit}"
    if seconds % 60 == 0:
        minutes = seconds // 60
        unit = "minute" if minutes == 1 else "minutes"
        return f"{minutes} {unit}"
    return f"{seconds} seconds"


def fetch_weather(city):
    geo = requests.get(
        "https://geocoding-api.open-meteo.com/v1/search",
        params={"name": city, "count": 1, "language": "en", "format": "json"},
        timeout=10,
    )
    geo.raise_for_status()
    results = geo.json().get("results") or []
    if not results:
        return None
    place = results[0]
    forecast = requests.get(
        "https://api.open-meteo.com/v1/forecast",
        params={
            "latitude": place["latitude"],
            "longitude": place["longitude"],
            "current": "temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m",
            "timezone": "auto",
            "wind_speed_unit": "kmh",
        },
        timeout=10,
    )
    forecast.raise_for_status()
    current = forecast.json().get("current") or {}
    if current.get("temperature_2m") is None:
        return None
    description = WEATHER_CODES.get(int(current.get("weather_code", -1)), "unknown conditions")
    name = place.get("name", city)
    return (
        f"The weather in {name} is {description}. "
        f"It is {current['temperature_2m']:.0f} degrees Celsius, "
        f"humidity is {current.get('relative_humidity_2m')} percent, "
        f"and the wind is {current.get('wind_speed_10m')} kilometers per hour."
    )


def answer_question(text):
    cleaned = normalize(text)
    for key, fact in LOCAL_FACTS.items():
        if key in cleaned:
            return fact
    query = re.sub(
        r"^(please\s+)?((can|could|would)\s+you\s+)?(tell me\s+|explain\s+|define\s+)?",
        "",
        cleaned,
    )
    query = re.sub(r"^(who is|who was|what is|what are|what was|where is|when was|why is|how does|how do)\s+", "", query)
    query = query.strip(" ?.")
    if not query:
        return None
    extract = wikipedia_summary(query.replace(" ", "_"))
    if extract:
        return first_sentence(extract)
    search = requests.get(
        "https://en.wikipedia.org/w/api.php",
        params={
            "action": "opensearch",
            "search": query,
            "limit": 1,
            "namespace": 0,
            "format": "json",
        },
        timeout=10,
        headers={"User-Agent": "OIBSIPVoiceAssistant/1.0"},
    )
    search.raise_for_status()
    payload = search.json()
    if len(payload) < 2 or not payload[1]:
        return None
    extract = wikipedia_summary(payload[1][0].replace(" ", "_"))
    if not extract:
        return None
    return first_sentence(extract)


def wikipedia_summary(title):
    response = requests.get(
        f"https://en.wikipedia.org/api/rest_v1/page/summary/{quote(title)}",
        timeout=10,
        headers={"User-Agent": "OIBSIPVoiceAssistant/1.0"},
    )
    if response.status_code == 404:
        return None
    response.raise_for_status()
    extract = response.json().get("extract", "").strip()
    return extract or None


def first_sentence(extract):
    sentence = extract.split(". ")[0].strip()
    if len(sentence) > 400:
        sentence = sentence[:397].rstrip() + "..."
    if sentence and not sentence.endswith("."):
        sentence += "."
    return sentence


def send_email(to_address, subject, body):
    if not os.path.exists(EMAIL_PATH):
        raise RuntimeError("missing-config")
    with open(EMAIL_PATH, "r", encoding="utf-8") as handle:
        config = json.load(handle)
    user = str(config.get("smtp_user", "")).strip()
    password = str(config.get("smtp_password", "")).strip()
    host = str(config.get("smtp_host", "")).strip()
    sender = str(config.get("from_address", "")).strip() or user
    port = int(config.get("smtp_port", 587))
    if not all([user, password, host, sender]) or "your.test.account" in user or password == "your-app-password":
        raise RuntimeError("missing-config")
    if not valid_email(to_address):
        raise ValueError("bad-address")
    message = EmailMessage()
    message["From"] = sender
    message["To"] = to_address
    message["Subject"] = subject
    message.set_content(body)
    with smtplib.SMTP(host, port, timeout=20) as server:
        server.ehlo()
        server.starttls()
        server.ehlo()
        server.login(user, password)
        server.send_message(message)


class Assistant:
    def __init__(self, text_mode=False):
        self.speaker = Speaker()
        self.text_mode = text_mode
        self.pending = None
        self.commands = load_commands()
        self.recognizer = sr.Recognizer() if sr is not None else None
        self.microphone = None
        if not text_mode:
            self._prepare_microphone()

    def _prepare_microphone(self):
        if sr is None:
            self.speaker.say("speech_recognition is not installed. Switching to typed commands.")
            self.text_mode = True
            return
        try:
            self.microphone = sr.Microphone()
            with self.microphone as source:
                self.recognizer.adjust_for_ambient_noise(source, duration=0.6)
        except Exception as exc:
            print(f"Microphone is unavailable ({exc}).")
            self.speaker.say("The microphone is unavailable. Switching to typed commands.")
            self.text_mode = True
            self.microphone = None

    def run(self):
        print("Commands: hello, what time is it, what is today's date,")
        print("search for a topic, weather in a city, remind me in 10 seconds to stretch,")
        print("send an email, who is Ada Lovelace, add a custom command, open youtube, goodbye.")
        if self.text_mode:
            print("Typed mode is on. Type a command and press Enter.")
        else:
            print("Voice mode is on. Speak after the word Listening.")
        self.speaker.say("Hello. I am your voice assistant. How can I help?")
        while True:
            try:
                if not self.text_mode:
                    print("Listening...")
                text = self.capture()
            except KeyboardInterrupt:
                self.speaker.say("Goodbye.", wait=True)
                break
            if sr is not None and isinstance(text, tuple):
                kind, detail = text
                if kind == "unknown":
                    self.speaker.say("I could not understand that. Please repeat.")
                elif kind == "timeout":
                    self.speaker.say("I did not hear anything. Please repeat.")
                else:
                    print(detail)
                    self.speaker.say("The speech service is unavailable. Please repeat.")
                continue
            if text is None:
                continue
            if not self.text_mode:
                print(f"You: {text}")
            if not text.strip():
                self.speaker.say("I could not understand that. Please repeat.")
                continue
            if not self.handle(text):
                break

    def capture(self):
        if self.text_mode:
            try:
                return input("You: ")
            except EOFError:
                return "exit"
        try:
            with self.microphone as source:
                audio = self.recognizer.listen(source, timeout=8, phrase_time_limit=12)
            return self.recognizer.recognize_google(audio)
        except sr.UnknownValueError:
            return ("unknown", "")
        except sr.WaitTimeoutError:
            return ("timeout", "")
        except sr.RequestError as exc:
            return ("request", exc)

    def handle(self, text):
        if normalize(text) in {"exit", "quit", "goodbye", "stop listening"}:
            self.pending = None
            self.speaker.say("Goodbye.", wait=True)
            return False
        if self.pending is not None:
            return self.continue_pending(text)
        intent = detect_intent(text, self.commands.get("custom", []))
        kind = intent["intent"]
        if kind == "exit":
            self.speaker.say("Goodbye.", wait=True)
            return False
        if kind == "greeting":
            self.speaker.say("Hello. I can tell you the time and date, search the web, check the weather, set a reminder, and send an email.")
        elif kind == "time":
            self.speaker.say(f"The time is {datetime.now().strftime('%I:%M %p')}.")
        elif kind == "date":
            self.speaker.say(f"Today is {datetime.now().strftime('%A, %B %d, %Y')}.")
        elif kind == "search":
            self.search(intent.get("query", ""))
        elif kind == "weather":
            self.weather(intent.get("city", ""))
        elif kind == "reminder":
            self.reminder(text)
        elif kind == "email":
            self.email(text)
        elif kind == "question":
            self.question(text)
        elif kind == "add_command":
            self.pending = {"type": "command_phrase"}
            self.speaker.say("What phrase should trigger the new command?")
        elif kind == "custom":
            self.run_custom(intent["command"])
        else:
            self.speaker.say("I did not understand that. Please repeat.")
        return True

    def continue_pending(self, text):
        if normalize(text) in {"cancel", "stop", "never mind", "nevermind"}:
            self.pending = None
            self.speaker.say("Cancelled.")
            return True
        kind = self.pending["type"]
        if kind == "search_query":
            self.pending = None
            self.search(text)
        elif kind == "weather_city":
            self.pending = None
            self.weather(text)
        elif kind == "reminder_when":
            self.collect_reminder(text)
        elif kind == "reminder_message":
            seconds = self.pending["seconds"]
            self.pending = None
            self.schedule_reminder(seconds, text.strip())
        elif kind == "email_to":
            address = speech_email(text)
            if not valid_email(address):
                self.speaker.say("That does not look like an email address. Please repeat the address.")
                return True
            self.pending = {"type": "email_subject", "to": address}
            self.speaker.say("What is the subject?")
        elif kind == "email_subject":
            subject = text.strip()
            if not subject:
                self.speaker.say("The subject was empty. Please repeat.")
                return True
            self.pending = {"type": "email_body", "to": self.pending["to"], "subject": subject}
            self.speaker.say("What should the email say?")
        elif kind == "email_body":
            body = text.strip()
            if not body:
                self.speaker.say("The message was empty. Please repeat.")
                return True
            to_address = self.pending["to"]
            subject = self.pending["subject"]
            self.pending = None
            self.deliver_email(to_address, subject, body)
        elif kind == "command_phrase":
            phrase = text.strip()
            if len(phrase) < 2:
                self.speaker.say("That phrase is too short. Please repeat.")
                return True
            self.pending = {"type": "command_action", "phrase": phrase}
            self.speaker.say("Say open for a website, or speak for a spoken reply.")
        elif kind == "command_action":
            action = normalize(text)
            phrase = self.pending["phrase"]
            if "open" in action or "website" in action or "url" in action:
                self.pending = {"type": "command_url", "phrase": phrase}
                self.speaker.say("Which website should I open?")
            elif "speak" in action or "say" in action or "reply" in action:
                self.pending = {"type": "command_say", "phrase": phrase}
                self.speaker.say("What should I say when I hear that phrase?")
            else:
                self.speaker.say("Please say open or speak.")
        elif kind == "command_url":
            url = text.strip()
            if not re.match(r"https?://", url, re.IGNORECASE):
                url = "https://" + re.sub(r"\s+", "", url)
            self.store_custom(self.pending["phrase"], "url", url)
            self.pending = None
        elif kind == "command_say":
            reply = text.strip()
            if not reply:
                self.speaker.say("The reply was empty. Please repeat.")
                return True
            self.store_custom(self.pending["phrase"], "speak", reply)
            self.pending = None
        return True

    def search(self, query):
        query = query.strip()
        if not query:
            self.pending = {"type": "search_query"}
            self.speaker.say("What should I search for?")
            return
        webbrowser.open(f"https://www.google.com/search?q={quote_plus(query)}")
        self.speaker.say(f"Searching the web for {query}.")

    def weather(self, city):
        city = city.strip()
        if not city:
            self.pending = {"type": "weather_city"}
            self.speaker.say("Which city?")
            return
        try:
            report = fetch_weather(city)
        except requests.Timeout:
            self.speaker.say("The weather service timed out. Please repeat.")
            return
        except requests.RequestException:
            self.speaker.say("I could not reach the weather service. Please repeat.")
            return
        if not report:
            self.speaker.say(f"I could not find the weather for {city}. Please repeat the city.")
            return
        self.speaker.say(report)

    def reminder(self, text):
        seconds, message = parse_reminder(text)
        if seconds is None:
            self.pending = {"type": "reminder_when"}
            self.speaker.say("When should I remind you? For example, say in 10 seconds or in 5 minutes.")
            return
        if not self.valid_delay(seconds):
            return
        if not message:
            self.pending = {"type": "reminder_message", "seconds": seconds}
            self.speaker.say("What should I remind you about?")
            return
        self.schedule_reminder(seconds, message)

    def collect_reminder(self, text):
        seconds, message = parse_reminder(text)
        if seconds is None:
            self.speaker.say("Tell me a duration, such as 10 seconds or 5 minutes.")
            return
        if not self.valid_delay(seconds):
            return
        if not message:
            self.pending = {"type": "reminder_message", "seconds": seconds}
            self.speaker.say("What should I remind you about?")
            return
        self.pending = None
        self.schedule_reminder(seconds, message)

    def valid_delay(self, seconds):
        if seconds <= 0:
            self.speaker.say("The duration needs to be greater than zero. Please repeat.")
            return False
        if seconds > 24 * 3600:
            self.speaker.say("Please choose a reminder within 24 hours.")
            return False
        return True

    def schedule_reminder(self, seconds, message):
        message = message.strip() or "your reminder"

        def alert(reminder=message):
            self.speaker.say(f"Reminder: {reminder}")

        timer = threading.Timer(seconds, alert)
        timer.daemon = True
        timer.start()
        self.speaker.say(f"Reminder set for {duration_phrase(seconds)}.")

    def email(self, text):
        parsed = parse_email(text)
        if parsed and valid_email(parsed["to"]):
            self.deliver_email(parsed["to"], parsed["subject"], parsed["body"])
            return
        self.pending = {"type": "email_to"}
        self.speaker.say("What is the recipient email address?")

    def deliver_email(self, to_address, subject, body):
        try:
            send_email(to_address, subject, body)
        except RuntimeError:
            self.speaker.say("Email is not set up. Copy email_config.example.json to email_config.json and add a test account.")
        except ValueError:
            self.speaker.say("That email address is not valid. Please repeat the command.")
        except (smtplib.SMTPException, OSError, json.JSONDecodeError) as exc:
            print(f"Email failed: {exc}")
            self.speaker.say("I could not send the email. Check the test account settings and try again.")
        else:
            self.speaker.say(f"Email sent to {to_address}.")

    def question(self, text):
        try:
            result = answer_question(text)
        except requests.Timeout:
            self.speaker.say("The knowledge service timed out. Please repeat.")
            return
        except requests.RequestException:
            self.speaker.say("I could not reach the knowledge service. Please repeat.")
            return
        if not result:
            self.speaker.say("I could not find an answer. Please repeat the question.")
            return
        self.speaker.say(result)

    def run_custom(self, command):
        action = command.get("type")
        value = str(command.get("value", "")).strip()
        if action == "url" and value:
            webbrowser.open(value)
            self.speaker.say(f"Opening {command.get('phrase', 'that page')}.")
        elif action == "speak" and value:
            self.speaker.say(value)
        else:
            self.speaker.say("That custom command is incomplete. Please add it again.")

    def store_custom(self, phrase, action, value):
        custom = [item for item in self.commands.get("custom", []) if normalize(str(item.get("phrase", ""))) != normalize(phrase)]
        custom.append({"phrase": phrase, "type": action, "value": value})
        self.commands["custom"] = custom
        try:
            save_commands(self.commands)
        except OSError:
            self.speaker.say("I could not save that command. Please repeat.")
            return
        self.speaker.say("Saved that command.")


def main():
    text_mode = "--text" in sys.argv
    Assistant(text_mode=text_mode).run()


if __name__ == "__main__":
    main()
