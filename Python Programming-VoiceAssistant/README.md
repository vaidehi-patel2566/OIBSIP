# Voice Assistant

## Overview
A voice assistant that listens for a command, works out what you are asking, and answers out loud. You can ask for the time and date, search the web, check the weather, set a reminder, send a test email, ask a general-knowledge question, and save your own commands.

## Tech Stack
- Python 3
- speech_recognition for the microphone
- pyttsx3 for spoken replies
- datetime, webbrowser, smtplib, and threading
- requests for live weather and Wikipedia answers

## Features
- Listens through the microphone and turns speech into text
- Says a greeting when you say hello
- Speaks the current time and today's date
- Opens a Google search for a topic you name
- Asks you to repeat a command when the audio is unclear or the request is not recognized
- Speaks every reply
- Understands full sentences such as "could you tell me the time" and "what's the weather in Jaipur"
- Sends email through SMTP after you add a test account
- Sets a reminder and speaks it when the time is up
- Reads a live weather report for a city
- Answers general-knowledge questions from a small local note and Wikipedia
- Lets you add a custom command by voice, and stores it in commands.json
- Includes one saved example command: "open youtube"

## Privacy
- In voice mode, the recorded phrase is sent to Google's speech recognition service by the speech_recognition library. The audio is not written to a file.
- Weather requests send the city name to the Open-Meteo geocoding and forecast services.
- General-knowledge questions are sent to the English Wikipedia API. One local fact about Oasis Infobyte is answered on this computer.
- Email commands send the address, subject, and message to the SMTP server you put in email_config.json. That file stays on this computer and is not part of the project download.
- Custom commands are saved only in commands.json in this folder.
- Reminders are kept in memory until they fire or you close the program. They are not saved.
- Typed mode (`--text`) does not use the microphone. A typed command still uses the network when you ask for weather, a web search, Wikipedia, or email.

## How to Run
1. Open a terminal in this folder.
2. Install the libraries:

```
pip install -r requirements.txt
pip install pyaudio
```

On Windows, if `pyaudio` does not install, download a matching wheel from [PyAudio wheels](https://www.lfd.uci.edu/~gohlke/pythonlibs/#pyaudio) and install that file with pip. A microphone and an internet connection are required for voice mode.

3. Start the assistant:

```
python assistant.py
```

If the microphone cannot be opened, the assistant switches to typed commands. You can also start typed mode directly:

```
python assistant.py --text
```

4. To send email, copy `email_config.example.json` to `email_config.json` and replace the placeholders with a test mailbox. A Gmail account needs an app password. Do not put a real personal password in the file.

## Try these commands
- Hello
- What time is it?
- What is today's date?
- Search for Python tutorials
- What's the weather in London?
- Remind me in 10 seconds to stretch
- Send an email
- Who is Ada Lovelace?
- Add a custom command
- Open YouTube
- Goodbye

Say "cancel" to leave a multi-step email, reminder, or custom-command prompt.

## Project Structure
- assistant.py — listening loop, intent parsing, reminders, weather, email, and custom commands
- commands.json — saved custom commands
- email_config.example.json — sample SMTP settings with no real account
- requirements.txt — third-party libraries
- README.md — project documentation

## Purpose
Created as part of the Oasis Infobyte Python Programming internship, Task 1: Voice Assistant.
