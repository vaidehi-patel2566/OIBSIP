# BMI Calculator

## Overview
A desktop BMI calculator. Enter a weight in kilograms and a height in metres, see the BMI and health category in colour, and save results for more than one person. Saved results stay in a local database and can be drawn as a trend line.

## Tech Stack
- Python 3
- tkinter for the window
- sqlite3 for saved records
- matplotlib for the trend chart

## Features
- Name, weight, and height fields, with Calculate, Save Record, and Show Trend buttons
- BMI = weight / (height × height), shown to two decimal places
- Underweight below 18.5, Normal from 18.5 to 24.9, Overweight from 25 to 29.9, Obese at 30 and above
- Colour for the result: blue for underweight, green for normal, orange for overweight, red for obese
- Separate saved histories for different names
- Records stored in bmi_records.db
- A line chart of one person's BMI over time
- Messages instead of a crash when a value is not a number, is negative, or the database cannot be read or written

## How to Run
1. Open a terminal in this folder.
2. Install the chart library:

```
pip install -r requirements.txt
```

3. Start the calculator:

```
python bmi_calculator.py
```

Type a name before saving. Choose that name again and press Show Trend to open the chart. The database file is created in this folder the first time the app opens.

## Project Structure
- bmi_calculator.py — calculation, validation, database, window, and chart
- requirements.txt — matplotlib
- README.md — project documentation

## Purpose
Created as part of the Oasis Infobyte Python Programming internship, Task 2: BMI Calculator.
