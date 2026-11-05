# Random Password Generator

## Overview
A desktop password generator. Choose a length and the character types to include, then generate a password that contains each chosen type. The result is copied to the clipboard, and the last five passwords stay visible until you close the window.

## Tech Stack
- Python 3
- tkinter for the window
- secrets for cryptographically secure choices
- pyperclip for the clipboard

## Features
- Length control from 8 to 64 characters
- Checkboxes for uppercase, lowercase, numbers, and symbols
- At least two character types are required
- Each selected type appears at least once
- Strength label and bar: Weak, Medium, or Strong, based on length and how many character types are present
- Copy to Clipboard button, and an automatic copy when a password is generated
- Option to leave out ambiguous characters: 0, O, o, l, 1, and I
- The last five passwords of the current session are listed and are not written to a file
- Another password can be generated from the same window

## How to Run
1. Open a terminal in this folder.
2. Install the clipboard library:

```
pip install -r requirements.txt
```

3. Start the generator:

```
python password_generator.py
```

## Project Structure
- password_generator.py — generation rules, strength rating, and window
- requirements.txt — pyperclip
- README.md — project documentation

## Purpose
Created as part of the Oasis Infobyte Python Programming internship, Task 3: Random Password Generator.
