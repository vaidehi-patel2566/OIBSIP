const STORAGE_KEY = "taskflow-todos";
const form = document.getElementById("task-form");
const input = document.getElementById("task-input");
const pendingList = document.getElementById("pending-list");
const completedList = document.getElementById("completed-list");
const pendingCount = document.getElementById("pending-count");
const completedCount = document.getElementById("completed-count");
const pendingEmpty = document.getElementById("pending-empty");
const completedEmpty = document.getElementById("completed-empty");

let tasks = loadTasks();

function loadTasks() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch (error) {
        return [];
    }
}

function saveTasks() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function formatTime(value) {
    return new Date(value).toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit"
    });
}

function createId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function addTask(text) {
    tasks.unshift({
        id: createId(),
        text: text,
        completed: false,
        createdAt: Date.now(),
        completedAt: null
    });
    saveTasks();
    render();
}

function deleteTask(id) {
    tasks = tasks.filter(function (task) {
        return task.id !== id;
    });
    saveTasks();
    render();
}

function toggleTask(id) {
    tasks = tasks.map(function (task) {
        if (task.id !== id) {
            return task;
        }
        const completed = !task.completed;
        return {
            id: task.id,
            text: task.text,
            completed: completed,
            createdAt: task.createdAt,
            completedAt: completed ? Date.now() : null
        };
    });
    saveTasks();
    render();
}

function updateTask(id, text) {
    tasks = tasks.map(function (task) {
        if (task.id !== id) {
            return task;
        }
        return {
            id: task.id,
            text: text,
            completed: task.completed,
            createdAt: task.createdAt,
            completedAt: task.completedAt
        };
    });
    saveTasks();
    render();
}

function createButton(label, className, onClick) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.className = className;
    button.addEventListener("click", onClick);
    return button;
}

function startEdit(task, titleEl, actionsEl) {
    const field = document.createElement("input");
    field.type = "text";
    field.value = task.text;
    field.className = "task-edit";
    field.maxLength = 120;
    titleEl.replaceWith(field);
    field.focus();
    field.select();

    function commit() {
        const next = field.value.trim();
        if (next) {
            updateTask(task.id, next);
        } else {
            render();
        }
    }

    field.addEventListener("keydown", function (event) {
        if (event.key === "Enter") {
            event.preventDefault();
            commit();
        }
        if (event.key === "Escape") {
            render();
        }
    });
    field.addEventListener("blur", commit);
    actionsEl.querySelector(".edit").disabled = true;
}

function renderTask(task) {
    const item = document.createElement("li");
    item.className = task.completed ? "task done" : "task";

    const title = document.createElement("p");
    title.className = "task-title";
    title.textContent = task.text;

    const time = document.createElement("time");
    if (task.completed && task.completedAt) {
        time.textContent = "Added " + formatTime(task.createdAt) + " · Completed " + formatTime(task.completedAt);
    } else {
        time.textContent = "Added " + formatTime(task.createdAt);
    }

    const actions = document.createElement("div");
    actions.className = "task-actions";

    actions.appendChild(createButton(
        task.completed ? "Mark Pending" : "Mark Complete",
        "complete",
        function () {
            toggleTask(task.id);
        }
    ));
    const editButton = createButton("Edit", "edit", function () {
        startEdit(task, title, actions);
    });
    actions.appendChild(editButton);
    actions.appendChild(createButton("Delete", "delete", function () {
        deleteTask(task.id);
    }));

    item.appendChild(title);
    item.appendChild(time);
    item.appendChild(actions);
    return item;
}

function render() {
    pendingList.innerHTML = "";
    completedList.innerHTML = "";

    const pending = tasks.filter(function (task) {
        return !task.completed;
    });
    const completed = tasks.filter(function (task) {
        return task.completed;
    });

    pending.forEach(function (task) {
        pendingList.appendChild(renderTask(task));
    });
    completed.forEach(function (task) {
        completedList.appendChild(renderTask(task));
    });

    pendingCount.textContent = pending.length + " pending";
    completedCount.textContent = completed.length + " completed";
    pendingEmpty.classList.toggle("hidden", pending.length > 0);
    completedEmpty.classList.toggle("hidden", completed.length > 0);
}

form.addEventListener("submit", function (event) {
    event.preventDefault();
    const text = input.value.trim();
    if (!text) {
        return;
    }
    addTask(text);
    input.value = "";
    input.focus();
});

render();
