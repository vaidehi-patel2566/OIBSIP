const expressionEl = document.getElementById("expression");
const currentEl = document.getElementById("current");
const errorEl = document.getElementById("error");
const keypad = document.querySelector(".keypad");

let current = "0";
let previous = null;
let operator = null;
let freshInput = true;
let errorState = false;

function formatNumber(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) {
        return null;
    }
    const rounded = Math.round(number * 1e10) / 1e10;
    const asString = String(rounded);
    if (asString.replace("-", "").length > 12) {
        return rounded.toExponential(6);
    }
    return asString;
}

function render() {
    currentEl.textContent = current;
    if (previous !== null && operator !== null) {
        expressionEl.textContent = previous + " " + operator;
    } else {
        expressionEl.textContent = "";
    }
}

function showError(message) {
    errorState = true;
    errorEl.textContent = message;
    currentEl.textContent = "Error";
    expressionEl.textContent = "";
}

function clearAll() {
    current = "0";
    previous = null;
    operator = null;
    freshInput = true;
    errorState = false;
    errorEl.textContent = "";
    render();
}

function inputDigit(digit) {
    if (errorState) {
        clearAll();
    }
    if (freshInput || current === "0") {
        current = digit;
        freshInput = false;
    } else {
        current += digit;
    }
    render();
}

function inputDecimal() {
    if (errorState) {
        clearAll();
    }
    if (freshInput) {
        current = "0.";
        freshInput = false;
    } else if (current.indexOf(".") === -1) {
        current += ".";
    }
    render();
}

function calculate(left, right, op) {
    const a = parseFloat(left);
    const b = parseFloat(right);
    switch (op) {
        case "+":
            return a + b;
        case "−":
            return a - b;
        case "×":
            return a * b;
        case "÷":
            if (b === 0) {
                return null;
            }
            return a / b;
        default:
            return b;
    }
}

function chooseOperator(op) {
    if (errorState) {
        return;
    }
    if (!freshInput && previous !== null && operator !== null) {
        const result = calculate(previous, current, operator);
        if (result === null) {
            showError("Cannot divide by zero");
            previous = null;
            operator = null;
            return;
        }
        const formatted = formatNumber(result);
        if (formatted === null) {
            showError("Error");
            previous = null;
            operator = null;
            return;
        }
        current = formatted;
        previous = formatted;
    } else {
        previous = current;
    }
    operator = op;
    freshInput = true;
    render();
}

function equals() {
    if (errorState || operator === null || previous === null || freshInput) {
        return;
    }
    const result = calculate(previous, current, operator);
    if (result === null) {
        showError("Cannot divide by zero");
        previous = null;
        operator = null;
        return;
    }
    const formatted = formatNumber(result);
    if (formatted === null) {
        showError("Error");
        previous = null;
        operator = null;
        return;
    }
    current = formatted;
    previous = null;
    operator = null;
    freshInput = true;
    render();
}

function backspace() {
    if (errorState) {
        clearAll();
        return;
    }
    if (freshInput) {
        return;
    }
    if (current.length <= 1 || (current.length === 2 && current.charAt(0) === "-")) {
        current = "0";
        freshInput = true;
    } else {
        current = current.slice(0, -1);
    }
    render();
}

keypad.addEventListener("click", function (event) {
    const button = event.target.closest("button");
    if (!button) {
        return;
    }
    if (button.dataset.number !== undefined) {
        inputDigit(button.dataset.number);
        return;
    }
    if (button.dataset.decimal !== undefined) {
        inputDecimal();
        return;
    }
    if (button.dataset.operator !== undefined) {
        chooseOperator(button.dataset.operator);
        return;
    }
    if (button.dataset.action === "equals") {
        equals();
        return;
    }
    if (button.dataset.action === "clear") {
        clearAll();
        return;
    }
    if (button.dataset.action === "backspace") {
        backspace();
    }
});

render();
