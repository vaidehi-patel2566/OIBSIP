# Login Authentication System

## Overview
A client-side authentication flow with registration, login, a protected
dashboard and logout. User records are stored in localStorage. Passwords
are hashed with SHA-256 before they are saved.

## Tech Stack
- HTML5
- CSS3
- Vanilla JavaScript
- Web Crypto API (SHA-256)
- localStorage

## Features
- Registration with username, email and password
- Password rules: minimum 8 characters and at least 1 number
- Duplicate username or email is rejected
- Login with username or email
- Generic error for incorrect credentials
- Dashboard is blocked unless a session exists
- Logout clears the session and returns to login
- Empty form submissions are blocked

## How to Run
1. Open the project folder.
2. Open `index.html` in a web browser.
3. Register an account, then log in to reach the dashboard.
4. Open `dashboard.html` directly while logged out to confirm the redirect.

## Project Structure
- index.html — Login page
- register.html — Registration page
- dashboard.html — Protected page
- style.css — Shared styling
- auth.js — Hashing, storage and session helpers
- login.js — Login page logic
- register.js — Registration page logic
- dashboard.js — Session check and logout
- README.md — Project documentation

## Purpose
Created as part of the Oasis Infobyte Web Development & Designing
Level 2 internship, Task 4: Login Authentication System.
