package com.oibsip.atm;

import java.io.PrintStream;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Scanner;

public class ATM {

    private final Bank bank;
    private final Scanner input;
    private final PrintStream output;

    public ATM(Bank bank, Scanner input, PrintStream output) {
        this.bank = bank;
        this.input = input;
        this.output = output;
    }

    public void start() {
        Account account = login();
        if (account == null) {
            return;
        }
        menu(account);
    }

    private Account login() {
        for (int attempt = 1; attempt <= 3; attempt++) {
            output.println("Attempt " + attempt + " of 3");
            output.print("Enter User ID: ");
            output.flush();
            String userId = readLine();
            if (userId == null) {
                return null;
            }
            output.print("Enter PIN: ");
            output.flush();
            String pin = readLine();
            if (pin == null) {
                return null;
            }
            Account account = bank.authenticate(userId.trim(), pin.trim());
            if (account != null) {
                output.println("Welcome, " + account.getUserId() + ".");
                return account;
            }
            output.println("Invalid credentials.");
        }
        output.println("Access denied. Too many incorrect attempts.");
        return null;
    }

    private void menu(Account account) {
        boolean running = true;
        while (running) {
            output.println();
            output.println("Balance: " + money(account.getBalance()));
            output.println("Main Menu");
            output.println("1. Transaction History");
            output.println("2. Withdraw");
            output.println("3. Deposit");
            output.println("4. Transfer");
            output.println("5. Quit");
            output.print("Enter choice: ");
            output.flush();
            String choice = readLine();
            if (choice == null) {
                break;
            }
            switch (choice.trim()) {
                case "1":
                    showHistory(account);
                    break;
                case "2":
                    running = withdraw(account);
                    break;
                case "3":
                    running = deposit(account);
                    break;
                case "4":
                    running = transfer(account);
                    break;
                case "5":
                    running = false;
                    break;
                default:
                    output.println("Enter a number from 1 to 5.");
            }
        }
        output.println("Thank you for using the ATM. Goodbye.");
    }

    private void showHistory(Account account) {
        ArrayList<Transaction> transactions = account.getTransactions();
        if (transactions.isEmpty()) {
            output.println("No transactions yet.");
            return;
        }
        output.println("Transaction History");
        for (int index = 0; index < transactions.size(); index++) {
            output.println((index + 1) + ". " + transactions.get(index));
        }
    }

    private boolean withdraw(Account account) {
        BigDecimal amount = readAmount("Enter amount to withdraw: ");
        if (amount == null) {
            return false;
        }
        if (account.getBalance().compareTo(amount) < 0) {
            output.println("Insufficient Funds");
            return true;
        }
        account.debit(amount, "Withdraw", "Cash withdrawal");
        output.println("Withdrawn " + money(amount) + ". New balance: " + money(account.getBalance()));
        return true;
    }

    private boolean deposit(Account account) {
        BigDecimal amount = readAmount("Enter amount to deposit: ");
        if (amount == null) {
            return false;
        }
        account.credit(amount, "Deposit", "Cash deposit");
        output.println("Deposited " + money(amount) + ". New balance: " + money(account.getBalance()));
        return true;
    }

    private boolean transfer(Account account) {
        output.print("Enter recipient User ID: ");
        output.flush();
        String recipientId = readLine();
        if (recipientId == null) {
            return false;
        }
        BigDecimal amount = readAmount("Enter amount to transfer: ");
        if (amount == null) {
            return false;
        }
        String result = bank.transfer(account, recipientId.trim(), amount);
        switch (result) {
            case "same":
                output.println("You cannot transfer to your own account.");
                break;
            case "missing":
                output.println("Account not found.");
                break;
            case "funds":
                output.println("Insufficient Funds");
                break;
            default:
                output.println("Transferred " + money(amount) + " to " + recipientId.trim() + ". New balance: " + money(account.getBalance()));
        }
        return true;
    }

    private BigDecimal readAmount(String prompt) {
        while (true) {
            output.print(prompt);
            output.flush();
            String line = readLine();
            if (line == null) {
                return null;
            }
            try {
                BigDecimal amount = new BigDecimal(line.trim()).setScale(2, RoundingMode.HALF_UP);
                if (amount.compareTo(BigDecimal.ZERO) <= 0) {
                    output.println("Enter an amount greater than zero.");
                    continue;
                }
                return amount;
            } catch (NumberFormatException exception) {
                output.println("Enter a valid amount.");
            }
        }
    }

    private String readLine() {
        if (!input.hasNextLine()) {
            return null;
        }
        return input.nextLine();
    }

    private String money(BigDecimal amount) {
        return amount.setScale(2, RoundingMode.HALF_UP).toPlainString();
    }
}
