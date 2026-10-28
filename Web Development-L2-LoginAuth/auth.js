const USERS_KEY = "oasis-auth-users";
const SESSION_KEY = "oasis-auth-session";

function getUsers() {
    try {
        const raw = localStorage.getItem(USERS_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch (error) {
        return [];
    }
}

function saveUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function getSession() {
    try {
        const raw = localStorage.getItem(SESSION_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch (error) {
        return null;
    }
}

function setSession(user) {
    localStorage.setItem(SESSION_KEY, JSON.stringify({
        username: user.username,
        email: user.email
    }));
}

function clearSession() {
    localStorage.removeItem(SESSION_KEY);
}

function bytesToHex(buffer) {
    return Array.from(new Uint8Array(buffer))
        .map(function (byte) {
            return byte.toString(16).padStart(2, "0");
        })
        .join("");
}

function fallbackHash(value) {
    let hash = 2166136261;
    for (let i = 0; i < value.length; i += 1) {
        hash ^= value.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    let extra = "";
    for (let i = 0; i < value.length; i += 1) {
        extra += (value.charCodeAt(i) + 13).toString(16).padStart(2, "0");
    }
    return Math.abs(hash).toString(16).padStart(8, "0") + extra;
}

async function hashPassword(password) {
    const salted = password + "::oasis-auth";
    if (window.crypto && window.crypto.subtle) {
        const data = new TextEncoder().encode(salted);
        const digest = await window.crypto.subtle.digest("SHA-256", data);
        return bytesToHex(digest);
    }
    return fallbackHash(salted);
}

function findUser(identity) {
    const needle = identity.trim().toLowerCase();
    return getUsers().find(function (user) {
        return user.username.toLowerCase() === needle || user.email.toLowerCase() === needle;
    });
}

function userExists(username, email) {
    const users = getUsers();
    const name = username.trim().toLowerCase();
    const mail = email.trim().toLowerCase();
    return users.some(function (user) {
        return user.username.toLowerCase() === name || user.email.toLowerCase() === mail;
    });
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPassword(password) {
    return password.length >= 8 && /\d/.test(password);
}

async function registerUser(username, email, password) {
    const users = getUsers();
    users.push({
        username: username.trim(),
        email: email.trim().toLowerCase(),
        passwordHash: await hashPassword(password)
    });
    saveUsers(users);
}

async function authenticateUser(identity, password) {
    const user = findUser(identity);
    if (!user) {
        return null;
    }
    const hash = await hashPassword(password);
    if (hash !== user.passwordHash) {
        return null;
    }
    return user;
}
