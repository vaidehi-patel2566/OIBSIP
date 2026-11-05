package com.oibsip.atm;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

public class Transaction {

    private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ofPattern("dd MMM yyyy HH:mm:ss");

    private final String type;
    private final BigDecimal amount;
    private final String details;
    private final LocalDateTime time;

    public Transaction(String type, BigDecimal amount, String details) {
        this.type = type;
        this.amount = amount;
        this.details = details;
        this.time = LocalDateTime.now();
    }

    public String getType() {
        return type;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public String getDetails() {
        return details;
    }

    @Override
    public String toString() {
        return time.format(FORMATTER) + " | " + type + " | " + amount.toPlainString() + " | " + details;
    }
}
