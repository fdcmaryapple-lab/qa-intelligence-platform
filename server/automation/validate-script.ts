import ts from "typescript";

export interface ScriptValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Checks that a script is syntactically valid TypeScript — WITHOUT
 * executing it. ts.transpileModule() parses and transpiles the source;
 * it never runs the resulting JavaScript, so this is safe to call on
 * arbitrary (including AI-generated) code.
 *
 * Scope: this catches syntax errors (malformed TypeScript) only, not
 * semantic/type errors — transpileModule() doesn't resolve imports or
 * their types, so it won't know whether `@playwright/test`'s API is
 * being called correctly (e.g. a typo'd method name). Full semantic
 * checking would need a real ts.Program with node_modules type
 * resolution wired up — meaningfully more infrastructure than justified
 * for a "does this even parse" sanity check.
 */
export function validateScriptSyntax(code: string): ScriptValidationResult {
  const result = ts.transpileModule(code, {
    reportDiagnostics: true,
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.Preserve,
    },
  });

  const errors = (result.diagnostics ?? []).map((diagnostic) => {
    const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
    if (diagnostic.file && diagnostic.start !== undefined) {
      const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
      return `Line ${line + 1}, Col ${character + 1}: ${message}`;
    }
    return message;
  });

  return { isValid: errors.length === 0, errors };
}
