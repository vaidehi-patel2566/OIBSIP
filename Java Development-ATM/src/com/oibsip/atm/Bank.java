package com.oibsip.atm;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.Map;

public class Bank {

    private final Map<String, Account> accounts = new LinkedHashMap<>();

    public void addAccount(Account account) {
        accounts.put(account.getUserId(), account);
    }

    public Account authenticate(String userId, String pin) {
        Account account = accounts.get(userId);
        if (account == null || !account.matchesPin(pin)) {
            return null;
        }
        return account;
    }

    public Account findAccount(String userId) {
        return accounts.get(userId);
    }

    public String transfer(Account from, String recipientId, BigDecimal amount) {
        if (from.getUserId().equals(recipientId)) {
            return "same";
        }
        Account recipient = accounts.get(recipientId);
        if (recipient == null) {
            return "missing";
        }
        if (!from.debit(amount, "Transfer", "Transfer to " + recipientId)) {
            return "funds";
        }
        recipient.credit(amount, "Transfer", "Transfer from " + from.getUserId());
        return "ok";
    }
}
