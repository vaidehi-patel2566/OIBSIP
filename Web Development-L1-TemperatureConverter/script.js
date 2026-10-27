const form = document.getElementById("converter-form");
const input = document.getElementById("temp-input");
const unitSelect = document.getElementById("from-unit");
const errorEl = document.getElementById("error");
const results = document.getElementById("results");
const resultC = document.getElementById("result-c");
const resultF = document.getElementById("result-f");
const resultK = document.getElementById("result-k");

function parseTemperature(raw) {
    const value = raw.trim();
    if (value === "") {
        return { error: "Please enter a temperature value." };
    }
    if (!/^-?(?:\d+\.?\d*|\.\d+)$/.test(value) || value === "-" || value === "." || value === "-.") {
        return { error: "Please enter a valid number. Letters and symbols are not allowed." };
    }
    const number = Number(value);
    if (!Number.isFinite(number)) {
        return { error: "Please enter a valid number." };
    }
    return { value: number };
}

function isBelowAbsoluteZero(value, unit) {
    if (unit === "C") {
        return value < -273.15;
    }
    if (unit === "F") {
        return value < -459.67;
    }
    return value < 0;
}

function toCelsius(value, unit) {
    if (unit === "C") {
        return value;
    }
    if (unit === "F") {
        return (value - 32) * (5 / 9);
    }
    return value - 273.15;
}

function formatValue(value) {
    return (Math.round(value * 100) / 100).toFixed(2);
}

form.addEventListener("submit", function (event) {
    event.preventDefault();
    errorEl.textContent = "";
    results.classList.add("hidden");

    const parsed = parseTemperature(input.value);
    if (parsed.error) {
        errorEl.textContent = parsed.error;
        return;
    }

    const unit = unitSelect.value;
    if (isBelowAbsoluteZero(parsed.value, unit)) {
        errorEl.textContent = "Temperature cannot be below absolute zero (−273.15°C / −459.67°F / 0 K).";
        return;
    }

    const celsius = toCelsius(parsed.value, unit);
    const fahrenheit = celsius * (9 / 5) + 32;
    const kelvin = celsius + 273.15;

    resultC.textContent = formatValue(celsius);
    resultF.textContent = formatValue(fahrenheit);
    resultK.textContent = formatValue(kelvin);

    document.querySelectorAll(".result-box").forEach(function (box) {
        box.classList.toggle("active", box.getAttribute("data-unit") === unit);
    });

    results.classList.remove("hidden");
});
