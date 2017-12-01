import { ChildProcess, fork } from "child_process";
import * as path from "path";
import * as vscode from "vscode";

const previewUri = vscode.Uri.parse("ungit://view");
const modulePath = path.join(__dirname, "..", "..", "node_modules", "ungit", "bin", "ungit");
let child: ChildProcess;

export class TextDocumentContentProvider implements vscode.TextDocumentContentProvider {
    private onDidChangeEmitter = new vscode.EventEmitter<vscode.Uri>();
    private ungitReady = false;

    get onDidChange(): vscode.Event<vscode.Uri> {
        return this.onDidChangeEmitter.event;
    }

    set ready(ready: boolean) {
        this.ungitReady = ready;
        this.onDidChangeEmitter.fire(previewUri);
    }

    public provideTextDocumentContent(uri: vscode.Uri): string {
        if (this.ungitReady) {
            return this.getUngitHtml();
        } else {
            return this.getLoadingHtml();
        }
    }

    private getLoadingHtml(): string {
        const imagePath = path.join(__dirname, "..", "..", "images", "logo.png");
        return `
        <div style="position: fixed; height: 100%; width: 100%; margin-left: -20px; background: #252833; display: flex; justify-content: space-around; flex-direction: column; align-items: center;">
            <image src="${imagePath}" />
            <h1 style="color: #d8d8d8;">
                Loading ...
            </h1>
        </div>
        `;
    }

    private getUngitHtml(): string {
        const location = vscode.workspace.rootPath || "";
        const url = `http://localhost:8448/#/repository?path=${location}`;
        return `
        <div style="position: fixed; height: 100%; width: 100%; margin-left: -20px;">
            <iframe src="${url}" style="border: none;" height="100%" width="100%"></iframe>
        </div>
        `;
    }
}

function executeCommand(provider: TextDocumentContentProvider): void {
    vscode.commands.executeCommand("vscode.previewHtml", previewUri, vscode.ViewColumn.Two, "Ungit").then(() => {
        return;
    }, (reason: string) => {
        vscode.window.showErrorMessage(reason);
    });

    child = fork(modulePath, ["--no-b", "--ungitVersionCheckOverride"], { silent: true });
    child.stdout.on("data", (message: Buffer) => {
        const started =
            (message.toString().indexOf("## Ungit started ##") !== -1) ||
            (message.toString().indexOf("Ungit server already running") !== -1);
        if (started) {
            provider.ready = true;
        }
    });
}

export function activate(context: vscode.ExtensionContext): void {
    const provider = new TextDocumentContentProvider();
    const registration = vscode.workspace.registerTextDocumentContentProvider("ungit", provider);
    const disposable = vscode.commands.registerCommand("extension.ungit", () => {
        executeCommand(provider);
    });
    context.subscriptions.push(disposable, registration);
}

export function deactivate(): void {
    child.kill();
}
