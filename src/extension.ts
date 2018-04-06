import { ChildProcess, fork } from "child_process";
import * as path from "path";
import * as vscode from "vscode";

const previewUri = vscode.Uri.parse("ungit://view");
const modulePath = path.join(__dirname, "..", "..", "node_modules", "ungit", "bin", "ungit");
let child: ChildProcess;

export class TextDocumentContentProvider implements vscode.TextDocumentContentProvider {
    public provideTextDocumentContent(uri: vscode.Uri): string {
        const location = vscode.workspace.rootPath || "";
        const url = `http://localhost:8448/#/repository?path=${location}`;
        return `
        <div style="position: fixed; height: 100%; width: 100%; margin-left: -20px;">
            <iframe src="${url}" style="border: none;" height="100%" width="100%"></iframe>
        </div>
        `;
    }
}

function executeCommand(): void {
    vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: "Starting Ungit",
        cancellable: true,
    }, (progress, token) => {
        token.onCancellationRequested(() => {
            if (child) {
                child.kill();
            }
        });
        return new Promise((resolve, reject) => {
            child = fork(modulePath, ["--no-b", "--ungitVersionCheckOverride"], { silent: true });
            child.stdout.on("data", (message: Buffer) => {
                const started =
                    (message.toString().includes("## Ungit started ##")) ||
                    (message.toString().includes("Ungit server already running"));
                if (started) {
                    progress.report({
                        increment: 100,
                    });
                    vscode.commands.executeCommand("vscode.previewHtml", previewUri, vscode.ViewColumn.Two, "Ungit").then(() => {
                        resolve();
                    }, (reason: string) => {
                        vscode.window.showErrorMessage(reason);
                        reject();
                    });
                }
            });
        });
    });
}

export function activate(context: vscode.ExtensionContext): void {
    const provider = new TextDocumentContentProvider();
    const registration = vscode.workspace.registerTextDocumentContentProvider("ungit", provider);
    const disposable = vscode.commands.registerCommand("extension.ungit", executeCommand);
    context.subscriptions.push(disposable, registration);
}

export function deactivate(): void {
    if (child) {
        child.kill();
    }
}
