# Calculator

## Overview
An Android calculator for addition, subtraction, multiplication, and division. The keypad is a responsive grid, and dividing by zero shows Error instead of crashing.

## Tech Stack
- Android Studio
- Java
- XML
- GridLayout

## Features
- Display for the current input, pending expression, and result
- Number buttons 0–9 and a decimal point
- Operators: +, −, ×, ÷
- Equals, Clear, and Backspace
- Division by zero shows Error
- Repeated taps do not crash the app

## How to Run
1. Open this folder in Android Studio.
2. Let Gradle sync finish.
3. Run the app on an emulator or a physical device.

## Project Structure
- app/src/main/java/com/oibsip/calculator/MainActivity.java — keypad handling and arithmetic
- app/src/main/res/layout/activity_main.xml — display and button grid
- app/src/main/res/values — colours, strings, and theme

## Purpose
Created as part of the Oasis Infobyte Android App Development internship, Task 3: Calculator.
