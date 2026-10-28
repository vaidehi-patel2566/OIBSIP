const form = document.getElementById("login-form");
const errorEl = document.getElementById("login-error");

if (getSession()) {
    window.location.replace("dashboard.html");
}

form.addEventListener("submit", async function (event) {
    event.preventDefault();
    errorEl.textContent = "";

    const identity = document.getElementById("login-identity").value.trim();
    const password = document.getElementById("login-password").value;

    if (!identity || !password) {
        errorEl.textContent = "Please fill in all fields.";
        return;
    }

    const user = await authenticateUser(identity, password);
    if (!user) {
        errorEl.textContent = "Invalid credentials. Please try again.";
        return;
    }

    setSession(user);
    window.location.href = "dashboard.html";
});
