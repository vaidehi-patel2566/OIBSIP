# Number Guessing Game

## Overview
A console game that picks a secret number and tells you whether each guess is too high, too low, or correct. You can play several rounds and see how many attempts each round took.

## Tech Stack
- Java 17
- Console input and output

## Features
- A new secret number at the start of every round
- Easy (1–50, 10 attempts), Medium (1–100, 7 attempts), and Hard (1–200, 5 attempts)
- Too High!, Too Low!, or Correct! after each guess
- Attempt counter shown throughout the round
- You Lost! and the secret number when the attempt limit is reached
- Play again prompt after each round
- Score summary in the form Round X — guessed in Y attempts
- Guesses that are empty, not whole numbers, or outside the range do not use an attempt

## How to Run
1. Open a terminal in this folder.
2. Compile:

```
javac -encoding UTF-8 -d out src/com/oibsip/guessing/NumberGuessingGame.java
```

3. Run:

```
java -cp out com.oibsip.guessing.NumberGuessingGame
```

## Project Structure
- src/com/oibsip/guessing/NumberGuessingGame.java — game loop, hints, and score summary
- README.md — project documentation

## Purpose
Created as part of the Oasis Infobyte Java Development internship, Task 2: Number Guessing Game.
