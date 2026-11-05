const path = require("path");
const { spawn } = require("child_process");

const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const root = path.join(__dirname, "..");

function run(cwd) {
  return spawn(npm, ["run", "dev"], {
    cwd,
    stdio: "inherit",
    shell: true
  });
}

const api = run(path.join(root, "backend"));
const web = run(path.join(root, "frontend"));
let stopping = false;

function stop(code) {
  if (stopping) return;
  stopping = true;
  if (!api.killed) api.kill();
  if (!web.killed) web.kill();
  setTimeout(() => process.exit(code), 100);
}

[api, web].forEach((child) => {
  child.on("exit", (code, signal) => {
    if (signal || stopping) return;
    if (code) stop(code);
  });
});

process.on("SIGINT", () => stop(0));
process.on("SIGTERM", () => stop(0));
