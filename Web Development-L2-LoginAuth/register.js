const form = document.getElementById("register-form");
const errorEl = document.getElementById("register-error");
const successEl = document.getElementById("register-success");

form.addEventListener("submit", async function (event) {
    event.preventDefault();
    errorEl.textContent = "";
    successEl.textContent = "";

    const username = document.getElementById("register-username").value.trim();
    const email = document.getElementById("register-email").value.trim();
    const password = document.getElementById("register-password").value;

    if (!username || !email || !password) {
        errorEl.textContent = "Please fill in all fields.";
        return;
    }

    if (!isValidEmail(email)) {
        errorEl.textContent = "Please enter a valid email address.";
        return;
    }

    if (!isValidPassword(password)) {
        errorEl.textContent = "Password must be at least 8 characters and include 1 number.";
        return;
    }

    if (userExists(username, email)) {
        errorEl.textContent = "That username or email is already registered.";
        return;
    }

    await registerUser(username, email, password);
    successEl.textContent = "Account created. You can now log in.";
    form.reset();
    window.setTimeout(function () {
        window.location.href = "index.html";
    }, 900);
});
