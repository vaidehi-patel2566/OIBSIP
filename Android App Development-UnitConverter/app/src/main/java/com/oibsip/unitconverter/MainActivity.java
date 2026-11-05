package com.oibsip.unitconverter;

import android.os.Bundle;
import android.view.View;
import android.widget.AdapterView;
import android.widget.ArrayAdapter;
import android.widget.EditText;
import android.widget.Spinner;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

import com.google.android.material.button.MaterialButton;

import java.math.BigDecimal;
import java.math.RoundingMode;

public class MainActivity extends AppCompatActivity {

    private static final String[] CATEGORIES = {"Length", "Weight", "Temperature"};

    private static final String[] LENGTH_UNITS = {
            "Millimetre", "Centimetre", "Metre", "Kilometre",
            "Inch", "Foot", "Yard", "Mile"
    };

    private static final double[] LENGTH_IN_METRES = {
            0.001,
            0.01,
            1.0,
            1000.0,
            0.0254,
            0.3048,
            0.9144,
            1609.344
    };

    private static final String[] WEIGHT_UNITS = {
            "Milligram", "Gram", "Kilogram", "Tonne", "Ounce", "Pound"
    };

    private static final double[] WEIGHT_IN_KILOGRAMS = {
            0.000001,
            0.001,
            1.0,
            1000.0,
            0.028349523125,
            0.45359237
    };

    private static final String[] TEMPERATURE_UNITS = {
            "Celsius", "Fahrenheit", "Kelvin"
    };

    private EditText valueInput;
    private Spinner categorySpinner;
    private Spinner fromSpinner;
    private Spinner toSpinner;
    private TextView resultView;
    private int categoryIndex;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        valueInput = findViewById(R.id.valueInput);
        categorySpinner = findViewById(R.id.categorySpinner);
        fromSpinner = findViewById(R.id.fromSpinner);
        toSpinner = findViewById(R.id.toSpinner);
        resultView = findViewById(R.id.resultView);
        MaterialButton convertButton = findViewById(R.id.convertButton);

        int initialFrom = 0;
        int initialTo = 1;
        if (savedInstanceState != null) {
            categoryIndex = savedInstanceState.getInt("category");
            initialFrom = savedInstanceState.getInt("from");
            initialTo = savedInstanceState.getInt("to");
            valueInput.setText(savedInstanceState.getString("input", ""));
            resultView.setText(savedInstanceState.getString(
                    "result", getString(R.string.result_placeholder)));
        }

        ArrayAdapter<String> categoryAdapter = new ArrayAdapter<>(
                this, R.layout.item_spinner, CATEGORIES);
        categoryAdapter.setDropDownViewResource(R.layout.item_spinner_dropdown);
        categorySpinner.setAdapter(categoryAdapter);
        categorySpinner.setSelection(categoryIndex);
        bindUnits(initialFrom, initialTo, false);

        categorySpinner.post(() -> categorySpinner.setOnItemSelectedListener(new AdapterView.OnItemSelectedListener() {
            @Override
            public void onItemSelected(AdapterView<?> parent, View view, int position, long id) {
                if (position == categoryIndex) {
                    return;
                }
                categoryIndex = position;
                String[] units = unitsFor(categoryIndex);
                int defaultTo = units.length > 1 ? 1 : 0;
                bindUnits(0, defaultTo, true);
            }

            @Override
            public void onNothingSelected(AdapterView<?> parent) {
            }
        }));

        convertButton.setOnClickListener(v -> convert());
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        outState.putInt("category", categoryIndex);
        outState.putInt("from", Math.max(fromSpinner.getSelectedItemPosition(), 0));
        outState.putInt("to", Math.max(toSpinner.getSelectedItemPosition(), 0));
        outState.putString("input", valueInput.getText().toString());
        outState.putString("result", resultView.getText().toString());
    }

    private void bindUnits(int fromIndex, int toIndex, boolean clearResult) {
        String[] units = unitsFor(categoryIndex);
        fromSpinner.setAdapter(unitAdapter(units));
        toSpinner.setAdapter(unitAdapter(units.clone()));
        fromSpinner.setSelection(safeIndex(fromIndex, units.length));
        toSpinner.setSelection(safeIndex(toIndex, units.length));
        if (clearResult) {
            resultView.setText(R.string.result_placeholder);
        }
    }

    private ArrayAdapter<String> unitAdapter(String[] units) {
        ArrayAdapter<String> adapter = new ArrayAdapter<>(this, R.layout.item_spinner, units);
        adapter.setDropDownViewResource(R.layout.item_spinner_dropdown);
        return adapter;
    }

    private String[] unitsFor(int category) {
        if (category == 1) {
            return WEIGHT_UNITS;
        }
        if (category == 2) {
            return TEMPERATURE_UNITS;
        }
        return LENGTH_UNITS;
    }

    private int safeIndex(int index, int length) {
        if (index < 0 || index >= length) {
            return 0;
        }
        return index;
    }

    private void convert() {
        String raw = valueInput.getText().toString().trim();
        if (raw.isEmpty()) {
            Toast.makeText(this, R.string.error_empty, Toast.LENGTH_SHORT).show();
            return;
        }

        double value;
        try {
            value = Double.parseDouble(raw);
        } catch (NumberFormatException exception) {
            Toast.makeText(this, R.string.error_number, Toast.LENGTH_SHORT).show();
            return;
        }
        if (Double.isNaN(value) || Double.isInfinite(value)) {
            Toast.makeText(this, R.string.error_number, Toast.LENGTH_SHORT).show();
            return;
        }

        int fromIndex = fromSpinner.getSelectedItemPosition();
        int toIndex = toSpinner.getSelectedItemPosition();
        if (fromIndex < 0 || toIndex < 0) {
            Toast.makeText(this, R.string.error_number, Toast.LENGTH_SHORT).show();
            return;
        }

        double result = convertValue(value, categoryIndex, fromIndex, toIndex);
        if (Double.isNaN(result) || Double.isInfinite(result)) {
            Toast.makeText(this, R.string.error_number, Toast.LENGTH_SHORT).show();
            return;
        }

        String unit = toSpinner.getSelectedItem().toString();
        resultView.setText(format(result) + " " + unit);
    }

    private double convertValue(double value, int category, int fromIndex, int toIndex) {
        if (category == 2) {
            return fromCelsius(toCelsius(value, fromIndex), toIndex);
        }
        double[] factors = category == 1 ? WEIGHT_IN_KILOGRAMS : LENGTH_IN_METRES;
        return value * factors[fromIndex] / factors[toIndex];
    }

    private double toCelsius(double value, int unit) {
        if (unit == 1) {
            return (value - 32.0) * 5.0 / 9.0;
        }
        if (unit == 2) {
            return value - 273.15;
        }
        return value;
    }

    private double fromCelsius(double celsius, int unit) {
        if (unit == 1) {
            return celsius * 9.0 / 5.0 + 32.0;
        }
        if (unit == 2) {
            return celsius + 273.15;
        }
        return celsius;
    }

    private String format(double value) {
        return BigDecimal.valueOf(value)
                .setScale(6, RoundingMode.HALF_UP)
                .stripTrailingZeros()
                .toPlainString();
    }
}
