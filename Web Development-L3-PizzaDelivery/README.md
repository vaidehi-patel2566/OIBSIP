# Forno — Pizza Delivery

## Overview
A full-stack pizza counter. Customers register, verify email, build or pick a pizza, pay with Razorpay in test mode, and watch the ticket move from Order Received to In Kitchen to Sent to Delivery. The kitchen desk is a separate admin login for stock, thresholds, and order status.

## Tech Stack
- React.js (Vite)
- Node.js + Express.js
- MongoDB (Mongoose)
- JWT authentication
- Razorpay test mode
- Nodemailer
- node-cron

## Features
### Customer
- Registration with an email verification link
- Login with JWT authorisation
- Forgot password, with a reset link that expires in 30 minutes
- Menu of house pizzas
- Custom builder: base, sauce, cheese, then vegetables (multiple)
- Order summary before payment
- Razorpay checkout. In test mode, Success confirms the order
- Order status on the dashboard, refreshed every 4 seconds

### Kitchen (admin)
- Admin login is a separate account. Customer registration cannot create it
- Inventory for bases, sauces, cheeses, and vegetables
- Paid orders decrement that stock
- Each item can be updated by hand, including its alert threshold
- A scheduled job checks every 30 seconds and emails the admin when stock is under the threshold
- Order list with a status control. The customer dashboard shows the new status on the next refresh

## How to Run
1. Install [Node.js](https://nodejs.org/) 18 or newer.
2. Open a terminal in this folder.
3. Install dependencies:

```
npm run setup
```

4. Copy `backend/.env.example` to `backend/.env`.
5. Start the API and the customer app:

```
npm run dev
```

6. Open http://localhost:5173
7. Admin desk (not linked from signup): http://localhost:5173/admin/login

On a fresh database the kitchen account is:

- Email: `admin@forno.test`
- Password: `Admin@12345`

Change `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `backend/.env` before the first launch if you want different credentials. They are only used when no admin exists yet.

## MongoDB
The Atlas cluster for this account is paused until you press **Resume** on the Clusters page. After it is running, choose Connect, copy the driver connection string, and set `MONGODB_URI` in `backend/.env`. Use the database name `forno` in that string.

If `MONGODB_URI` is empty, the API starts an in-memory MongoDB so you can try the app. That data disappears when the API stops. Use Atlas when you want orders and stock to persist.

## Email
Verification, password reset, and low-stock alerts use Nodemailer.

For Gmail, create an app password and set:

- `SMTP_HOST=smtp.gmail.com`
- `SMTP_PORT=587`
- `SMTP_USER` your Gmail address
- `SMTP_PASS` the app password
- `SMTP_FROM` the same address
- `ADMIN_NOTIFY_EMAIL` where low-stock mail should go

Until SMTP is set, the API prints each email in its terminal. In development the same link is also shown on the register and forgot-password screens so you can finish the flow.

Low-stock mail is sent once per drop. Raise the stock to the threshold or above, then let it fall under the threshold again, to receive another alert.

## Razorpay test mode
1. Create a Razorpay account and open test mode.
2. Copy the test Key Id and Key Secret into `backend/.env`:

```
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...
```

3. Restart `npm run dev`.
4. Place an order and choose **Success** in the Razorpay window.

Stock is held when checkout opens and released if you close the window or leave it for 15 minutes. A successful payment keeps the order and the reduced stock.

## Project Structure
- `backend/` — Express API, models, auth, payments, cron
- `frontend/` — React customer app and kitchen desk
- `scripts/dev.js` — runs both

## Purpose
Created as part of the Oasis Infobyte Web Development & Designing Level 3 internship, Task 1: Pizza Delivery Full-Stack Application.
