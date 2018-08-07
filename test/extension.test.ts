import * as assert from "assert";
import { Uri } from "vscode";
import { UngitTextDocumentContentProvider } from "../src/extension";

suite("UngitTextDocumentContentProvider", () => {
    test("provideTextDocumentContent returns iframe with path", () => {
        const provider = new UngitTextDocumentContentProvider();
        const fsPath = "aaa";
        const text = provider.provideTextDocumentContent(Uri.parse(`ungit:${fsPath}`));
        assert.ok(text.includes("iframe"));
        assert.ok(text.includes(fsPath));
    });
});
