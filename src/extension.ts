import { ChildProcess, fork } from "child_process";
import { dirname, join } from "path";
import { commands, ExtensionContext, ProgressLocation, Uri, ViewColumn, window, workspace, WorkspaceFolder } from "vscode";

const modulePath = join(__dirname, "..", "..", "node_modules", "ungit", "bin", "ungit");
let iconPath: string;
let child: ChildProcess;

function getWebViewHTML(uri: Uri, title: string): string {
    const url = `http://localhost:8448/#/repository?path=${uri.fsPath}`;
    return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8" />
            <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; frame-src http:;" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>${title}</title>
            <style>
            html, body {
                height: 100%;
                width: 100%;
                padding: 0;
            }
            iframe {
                display: block;
                height: 100%;
                width: 100%;
                border: none;
            }
            </style>
        </head>
        <body>
            <iframe src="${url}" height="100%" width="100%" frameborder="0"></iframe>
        </body>
        </html>`;
}

/**
 * Determine the Ungit root from the current active file.
 * Let the user pick a workspace if there is no open file.
 */
function executeCommand(): void {
    const activeTextEditor = window.activeTextEditor;
    let workspaceFolderPromise: Thenable<WorkspaceFolder | undefined>;
    if (activeTextEditor && activeTextEditor.document.uri.scheme === "file") {
        workspaceFolderPromise = Promise.resolve(workspace.getWorkspaceFolder(activeTextEditor.document.uri));
    } else if (workspace.workspaceFolders && workspace.workspaceFolders.length === 1) {
        workspaceFolderPromise = Promise.resolve(workspace.workspaceFolders[0]);
    } else {
        workspaceFolderPromise = window.showWorkspaceFolderPick();
    }
    workspaceFolderPromise.then((workspaceFolder) => {
        if (typeof workspaceFolder === "undefined") {
            window.showErrorMessage("Can't open Ungit outside a workspace.");
        } else if (workspaceFolder.uri.scheme !== "file") {
            window.showErrorMessage("Can't open Ungit on remote workpaces.");
        } else {
            openInWorkspace(workspaceFolder);
        }
    }, () => {
        window.showErrorMessage("Can't open Ungit: Unable to determine workspace.");
    });
}

function openInWorkspace(workspaceFolder: WorkspaceFolder): void {
    const ungitUri = workspaceFolder.uri.with({scheme: "ungit"});
    const ungitTabTitle = `Ungit - ${workspaceFolder.name}`;
    window.withProgress({
        location: ProgressLocation.Notification,
        title: "Starting Ungit",
        cancellable: true,
    }, (progress, token) => {
        token.onCancellationRequested(() => {
            if (child) {
                child.kill();
            }
        });
        return new Promise((resolve, reject) => {
            const parameter = ["--no-b", "--ungitVersionCheckOverride"];
            const gitPath = workspace.getConfiguration("git").get<string>("path");
            if (gitPath) {
                parameter.push(`--gitBinPath=${dirname(gitPath)}`);
            }
            child = fork(modulePath, parameter, { silent: true });
            const showInActiveColumn = workspace.getConfiguration("ungit", workspaceFolder.uri).get<boolean>("showInActiveColumn") === true;
            const viewColumn = showInActiveColumn ? ViewColumn.Active : ViewColumn.Beside;
            child.stdout.on("data", (message: Buffer) => {
                const started =
                    (message.toString().includes("## Ungit started ##")) ||
                    (message.toString().includes("Ungit server already running")) ||
                    (message.toString().includes("Error: listen EADDRINUSE 127.0.0.1:8448"));
                if (started) {
                    progress.report({
                        increment: 100,
                    });
                    const panel = window.createWebviewPanel("ungit", ungitTabTitle, {
                        viewColumn,
                        preserveFocus: true,
                    }, {
                        retainContextWhenHidden: true,
                        enableScripts: true,
                    });
                    panel.webview.html = getWebViewHTML(ungitUri, ungitTabTitle);
                    panel.iconPath = Uri.file(iconPath);
                    resolve();
                }
            });
        });
    });
}

export function activate(context: ExtensionContext): void {
    iconPath = join(context.extensionPath, "images", "icon.png");
    const disposable = commands.registerCommand("extension.ungit", executeCommand);
    context.subscriptions.push(disposable);
}

export function deactivate(): void {
    if (child) {
        child.kill();
    }
}
