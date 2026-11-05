# Stopwatch

## Overview
An Android stopwatch with start, pause, reset, and lap controls. Elapsed time is based on the system clock, so the timer stays correct when the app is left and opened again.

## Tech Stack
- Android Studio
- Java
- XML

## Features
- Large time display in HH:MM:SS.cc
- Start begins timing from zero or from a paused time
- Pause freezes the current elapsed time
- Reset stops the timer and returns the display to 00:00:00.00
- Start, Pause, Lap, and Reset change colour when they are active or unavailable
- The timer keeps running across onPause and onResume
- Lap saves the current time into a scrollable list

## How to Run
1. Open this folder in Android Studio.
2. Let Gradle sync finish.
3. Run the app on an emulator or a physical device.

## Project Structure
- app/src/main/java/com/oibsip/stopwatch/MainActivity.java — timer, laps, and lifecycle
- app/src/main/res/layout/activity_main.xml — display, controls, and lap list
- app/src/main/res/values — colours, strings, and theme

## Purpose
Created as part of the Oasis Infobyte Android App Development internship, Task 5: Stopwatch.
