import * as assert from "assert";
import * as vscode from "vscode";
import * as ungitExtension from "../src/extension";

suite("TextDocumentContentProvider", () => {
    test("provideTextDocumentContent returns loading screen", () => {
        const previewUri = vscode.Uri.parse("ungit://view");
        const provider = new ungitExtension.TextDocumentContentProvider();
        assert.ok(provider.provideTextDocumentContent(previewUri).indexOf("iframe") === -1);
    });

    test("provideTextDocumentContent returns iframe when ready", () => {
        const previewUri = vscode.Uri.parse("ungit://view");
        const provider = new ungitExtension.TextDocumentContentProvider();
        provider.ready = true;
        assert.ok(provider.provideTextDocumentContent(previewUri).indexOf("iframe") !== -1);
    });
});
