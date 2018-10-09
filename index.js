// const ungit = require('ungit');
const childProcess = require("child_process");
const path = require("path");

const modulePath = path.join(__dirname, "node_modules", "ungit", "bin", "ungit");

const child = childProcess.fork(modulePath, ["--no-b", "--ungitVersionCheckOverride"], {
    silent: true,
});
child.stdout.on("data", (message) => {
    debugger;
});

child.on("message", (message) => {
    debugger;
});

process.stdin.resume();
