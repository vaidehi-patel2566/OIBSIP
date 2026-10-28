const session = getSession();

if (!session) {
    window.location.replace("index.html");
} else {
    document.getElementById("session-username").textContent = session.username;
    document.getElementById("session-email").textContent = session.email;
}

document.getElementById("logout-button").addEventListener("click", function () {
    clearSession();
    window.location.href = "index.html";
});
