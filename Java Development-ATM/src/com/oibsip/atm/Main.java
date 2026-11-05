package com.oibsip.atm;

import java.math.BigDecimal;
import java.util.Scanner;

public class Main {

    public static void main(String[] args) {
        Bank bank = new Bank();
        bank.addAccount(new Account("1001", "1234", new BigDecimal("5000.00")));
        bank.addAccount(new Account("1002", "2345", new BigDecimal("3000.00")));
        bank.addAccount(new Account("1003", "3456", new BigDecimal("8000.00")));
        ATM atm = new ATM(bank, new Scanner(System.in), System.out);
        atm.start();
    }
}
