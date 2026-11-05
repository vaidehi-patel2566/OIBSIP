package com.oibsip.calculator;

import android.os.Bundle;
import android.view.View;
import android.widget.TextView;

import androidx.appcompat.app.AppCompatActivity;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Locale;

public class MainActivity extends AppCompatActivity {

    private static final int[] KEY_IDS = {
            R.id.keyClear, R.id.keyBack, R.id.keyDivide,
            R.id.key7, R.id.key8, R.id.key9, R.id.keyMultiply,
            R.id.key4, R.id.key5, R.id.key6, R.id.keyMinus,
            R.id.key1, R.id.key2, R.id.key3, R.id.keyPlus,
            R.id.key0, R.id.keyDot, R.id.keyEquals
    };

    private TextView expressionView;
    private TextView displayView;

    private String current = "0";
    private String operator = "";
    private String expression = "";
    private Double stored = null;
    private boolean replaceInput;
    private boolean hasError;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        expressionView = findViewById(R.id.expressionView);
        displayView = findViewById(R.id.displayView);

        if (savedInstanceState != null) {
            current = savedInstanceState.getString("current", "0");
            operator = savedInstanceState.getString("operator", "");
            expression = savedInstanceState.getString("expression", "");
            replaceInput = savedInstanceState.getBoolean("replaceInput");
            hasError = savedInstanceState.getBoolean("hasError");
            if (savedInstanceState.getBoolean("hasStored")) {
                stored = savedInstanceState.getDouble("stored");
            }
        }

        View.OnClickListener listener = this::onKey;
        for (int id : KEY_IDS) {
            findViewById(id).setOnClickListener(listener);
        }
        refresh();
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        outState.putString("current", current);
        outState.putString("operator", operator);
        outState.putString("expression", expression);
        outState.putBoolean("replaceInput", replaceInput);
        outState.putBoolean("hasError", hasError);
        outState.putBoolean("hasStored", stored != null);
        if (stored != null) {
            outState.putDouble("stored", stored);
        }
    }

    private void onKey(View view) {
        try {
            Object tag = view.getTag();
            if (!(tag instanceof String)) {
                return;
            }
            String key = (String) tag;
            if ("C".equals(key)) {
                clearAll();
            } else if ("B".equals(key)) {
                backspace();
            } else if ("=".equals(key)) {
                equals();
            } else if (".".equals(key)) {
                decimal();
            } else if ("+".equals(key) || "−".equals(key) || "×".equals(key) || "÷".equals(key)) {
                chooseOperator(key);
            } else {
                digit(key);
            }
        } catch (RuntimeException exception) {
            showError();
        }
    }

    private void digit(String value) {
        if (hasError) {
            clearAll();
        }
        if (replaceInput || current.contains("E") || current.contains("e")) {
            current = value;
            replaceInput = false;
        } else if ("0".equals(current)) {
            current = value;
        } else if (digitCount(current) < 12) {
            current = current + value;
        }
        refresh();
    }

    private void decimal() {
        if (hasError) {
            clearAll();
        }
        if (replaceInput || current.contains("E") || current.contains("e")) {
            current = "0.";
            replaceInput = false;
        } else if (!current.contains(".")) {
            current = current + ".";
        }
        refresh();
    }

    private void chooseOperator(String nextOperator) {
        if (hasError) {
            return;
        }
        if (stored != null && !operator.isEmpty() && !replaceInput) {
            Double result = apply(stored, readCurrent(), operator);
            if (result == null) {
                showError();
                return;
            }
            stored = result;
            current = format(result);
        } else {
            stored = readCurrent();
            current = format(stored);
        }
        operator = nextOperator;
        replaceInput = true;
        expression = current + " " + operator;
        refresh();
    }

    private void equals() {
        if (hasError || stored == null || operator.isEmpty()) {
            return;
        }
        double right = readCurrent();
        String rightText = format(right);
        Double result = apply(stored, right, operator);
        if (result == null) {
            showError();
            return;
        }
        expression = format(stored) + " " + operator + " " + rightText + " =";
        current = format(result);
        stored = null;
        operator = "";
        replaceInput = true;
        refresh();
    }

    private void backspace() {
        if (hasError) {
            clearAll();
            return;
        }
        if (replaceInput && !operator.isEmpty()) {
            return;
        }
        if (current.contains("E") || current.contains("e")) {
            current = "0";
            replaceInput = false;
            refresh();
            return;
        }
        replaceInput = false;
        if (current.length() <= 1 || (current.startsWith("-") && current.length() == 2)) {
            current = "0";
        } else {
            current = current.substring(0, current.length() - 1);
            if ("-".equals(current) || ".".equals(current) || "-.".equals(current)) {
                current = "0";
            }
        }
        refresh();
    }

    private void clearAll() {
        current = "0";
        operator = "";
        expression = "";
        stored = null;
        replaceInput = false;
        hasError = false;
        refresh();
    }

    private void showError() {
        hasError = true;
        current = "Error";
        operator = "";
        expression = "";
        stored = null;
        replaceInput = true;
        expressionView.setText("");
        displayView.setText("Error");
    }

    private void refresh() {
        if (hasError) {
            expressionView.setText("");
            displayView.setText("Error");
            return;
        }
        expressionView.setText(expression);
        displayView.setText(current);
    }

    private double readCurrent() {
        String raw = current;
        if (raw.endsWith(".")) {
            raw = raw.substring(0, raw.length() - 1);
        }
        if (raw.isEmpty() || "-".equals(raw)) {
            return 0.0;
        }
        return Double.parseDouble(raw);
    }

    private Double apply(double left, double right, String op) {
        double result;
        switch (op) {
            case "+":
                result = left + right;
                break;
            case "−":
                result = left - right;
                break;
            case "×":
                result = left * right;
                break;
            case "÷":
                if (right == 0.0) {
                    return null;
                }
                result = left / right;
                break;
            default:
                return null;
        }
        if (Double.isNaN(result) || Double.isInfinite(result)) {
            return null;
        }
        return result;
    }

    private String format(double value) {
        String plain = BigDecimal.valueOf(value)
                .setScale(8, RoundingMode.HALF_UP)
                .stripTrailingZeros()
                .toPlainString();
        if (plain.length() > 14) {
            return String.format(Locale.US, "%.8E", value);
        }
        return plain;
    }

    private int digitCount(String value) {
        int count = 0;
        for (int i = 0; i < value.length(); i++) {
            if (Character.isDigit(value.charAt(i))) {
                count++;
            }
        }
        return count;
    }
}
