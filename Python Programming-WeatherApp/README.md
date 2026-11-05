# Weather App

## Overview
A desktop weather app. Enter a city or ZIP code and the window shows the current conditions, the next six hours, and a five-day forecast. Temperatures can be switched between Celsius and Fahrenheit.

## Tech Stack
- Python 3
- tkinter for the window
- requests for the weather services
- Pillow for the condition icons
- Open-Meteo by default, with optional OpenWeatherMap support

## Features
- City or ZIP search, with an empty search rejected in the window
- Current temperature in both °C and °F, plus humidity, a condition description, and wind speed
- Condition icons loaded from OpenWeatherMap's icon images
- Next 6 hours
- Five-day forecast, including today
- A button to switch the displayed unit between Celsius and Fahrenheit
- Use my location, which asks ipinfo.io for the city of the current network address
- City-not-found, timeout, network, and invalid-key errors are shown in the window
- With no API key, forecasts come from Open-Meteo and no key is required
- If OPENWEATHER_API_KEY is set, or a key is placed in api_key.txt, forecasts come from OpenWeatherMap instead. An invalid key is reported in the window. The free OpenWeatherMap forecast is published in 3-hour steps, so that mode can show fewer than six rows inside a six-hour window

## How to Run
1. Open a terminal in this folder.
2. Install the libraries:

```
pip install -r requirements.txt
```

3. Start the app:

```
python weather_app.py
```

4. Optional: create `api_key.txt` in this folder and paste an OpenWeatherMap key on the first line, or set the OPENWEATHER_API_KEY environment variable. Leave it unset to use Open-Meteo. A five-digit ZIP sent to OpenWeatherMap is treated as a US ZIP code.

## Project Structure
- weather_app.py — location lookup, both weather providers, and the window
- requirements.txt — requests and Pillow
- README.md — project documentation

## Purpose
Created as part of the Oasis Infobyte Python Programming internship, Task 4: Basic Weather App.
