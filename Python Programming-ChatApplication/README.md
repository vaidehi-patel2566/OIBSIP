# Chat Application

## Overview
A local chat app with a server and a desktop client. Two or more people can register, sign in, join named rooms, and exchange messages in real time. Past messages in a room are loaded when someone joins.

## Tech Stack
- Python 3
- socket and threading
- tkinter for the chat window
- sqlite3 for accounts, rooms, and message history

The client and server use the Python standard library only.

## Features
- Server listens on 127.0.0.1 port 5555
- Client connects to that server, including two clients on the same computer
- Messages move both ways while both clients are connected
- Each message is shown as [14:35] Alice: Hello
- When someone disconnects, the other people in that room see a disconnection notice
- Register and login with a username and password
- Create a room or join one, including the default General room
- Opening a room loads its earlier messages
- A sound, a window-title change, and a banner when a new message arrives while the window is not focused
- Shortcodes such as :smile:, :wave:, :heart:, :laugh:, :thumbsup:, and :fire: are shown as emoji

## How messages are stored
- Accounts, room names, and messages are stored in chat.db in this folder.
- Passwords are stored as PBKDF2-HMAC-SHA256 hashes with a random salt. The password itself is not stored.
- Message text is stored in plaintext. It is not encrypted on disk.
- The connection between the client and the server is plain TCP on localhost. There is no TLS and no end-to-end encryption. Anyone who can read chat.db can read the message history.
- This is intended for a local internship demo, not for private communication on a public network.

## How to Run
1. Open a terminal in this folder and start the server:

```
python server.py
```

2. Open a second terminal in this folder and start a client:

```
python client.py
```

3. Open another terminal and start a second client the same way. Register a different username in each window. Both people land in General and can message each other. Create a room from the sidebar, press Refresh rooms in the other window, and join it. Closing one client shows a disconnection notice in the other.

The server can be stopped with Ctrl+C.

## Project Structure
- server.py — connections, accounts, rooms, history, and delivery
- client.py — login window and chat window
- README.md — project documentation

## Purpose
Created as part of the Oasis Infobyte Python Programming internship, Task 5: Chat Application.
