# ATM Interface

## Overview
A console ATM where a customer signs in with a user ID and PIN, then withdraws, deposits, transfers, and reviews the transactions made during that visit.

## Tech Stack
- Java 17
- Console input and output
- Object-oriented design

## Features
- User ID and PIN login
- Access denied after 3 incorrect attempts
- Transaction history for the current session
- Withdraw with an insufficient-funds check
- Deposit
- Transfer to another account, updating both balances
- Quit
- Every completed transaction is stored in an ArrayList

## Demo Accounts
| User ID | PIN | Opening balance |
| --- | --- | --- |
| 1001 | 1234 | 5000.00 |
| 1002 | 2345 | 3000.00 |
| 1003 | 3456 | 8000.00 |

## How to Run
1. Open a terminal in this folder.
2. Compile:

```
javac -encoding UTF-8 -d out src/com/oibsip/atm/*.java
```

3. Run:

```
java -cp out com.oibsip.atm.Main
```

## Project Structure
- src/com/oibsip/atm/Main.java — starts the bank and the ATM
- src/com/oibsip/atm/ATM.java — login and the transaction menu
- src/com/oibsip/atm/Bank.java — accounts and transfers
- src/com/oibsip/atm/Account.java — balance and transaction list
- src/com/oibsip/atm/Transaction.java — one logged transaction
- README.md — project documentation

## Purpose
Created as part of the Oasis Infobyte Java Development internship, Task 3: ATM Interface.
