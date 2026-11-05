package com.oibsip.atm;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;

public class Account {

    private final String userId;
    private final String pin;
    private BigDecimal balance;
    private final ArrayList<Transaction> transactions = new ArrayList<>();

    public Account(String userId, String pin, BigDecimal openingBalance) {
        this.userId = userId;
        this.pin = pin;
        this.balance = openingBalance.setScale(2, RoundingMode.HALF_UP);
    }

    public String getUserId() {
        return userId;
    }

    public BigDecimal getBalance() {
        return balance;
    }

    public ArrayList<Transaction> getTransactions() {
        return transactions;
    }

    public boolean matchesPin(String enteredPin) {
        return pin.equals(enteredPin);
    }

    public void credit(BigDecimal amount, String type, String details) {
        balance = balance.add(amount).setScale(2, RoundingMode.HALF_UP);
        transactions.add(new Transaction(type, amount, details));
    }

    public boolean debit(BigDecimal amount, String type, String details) {
        if (balance.compareTo(amount) < 0) {
            return false;
        }
        balance = balance.subtract(amount).setScale(2, RoundingMode.HALF_UP);
        transactions.add(new Transaction(type, amount, details));
        return true;
    }
}
