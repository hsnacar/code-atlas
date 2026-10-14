import ts from 'typescript';
import { SymbolSignature } from '../types.js';

export interface ParsedCodeFile {
  symbols: SymbolSignature[];
  dependencies: string[];
  description?: string;
}

export function parseTypeScript(content: string, filename: string): ParsedCodeFile {
  const isJsx = filename.endsWith('.tsx') || filename.endsWith('.jsx');
  const isJs = filename.endsWith('.js') || filename.endsWith('.jsx') || filename.endsWith('.mjs') || filename.endsWith('.cjs');

  const sourceFile = ts.createSourceFile(
    filename,
    content,
    ts.ScriptTarget.Latest,
    true,
    isJsx ? ts.ScriptKind.TSX : (isJs ? ts.ScriptKind.JS : ts.ScriptKind.TS)
  );

  const symbols: SymbolSignature[] = [];
  const dependencies: Set<string> = new Set();
  const commonJsExports: Set<string> = new Set();
  let fileDescription: string | undefined;

  // Extract leading file comment if present
  const leadingComments = ts.getLeadingCommentRanges(content, 0);
  if (leadingComments && leadingComments.length > 0) {
    const firstComment = content.substring(leadingComments[0].pos, leadingComments[0].end);
    fileDescription = cleanComment(firstComment);
  }

  function getDocComment(node: ts.Node): string | undefined {
    const comments = ts.getLeadingCommentRanges(content, node.pos);
    if (comments && comments.length > 0) {
      const last = comments[comments.length - 1];
      return cleanComment(content.substring(last.pos, last.end));
    }
    return undefined;
  }

  function isExportedNode(node: ts.Node): boolean {
    const modifiers = ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined;
    return !!modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword);
  }

  // Pre-scan for CommonJS module.exports = { ... } or exports.foo = ...
  ts.forEachChild(sourceFile, node => {
    if (ts.isExpressionStatement(node) && ts.isBinaryExpression(node.expression)) {
      const bin = node.expression;
      if (bin.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
        const left = bin.left.getText(sourceFile);
        if (left === 'module.exports' && ts.isObjectLiteralExpression(bin.right)) {
          bin.right.properties.forEach(prop => {
            if (prop.name) commonJsExports.add(prop.name.getText(sourceFile));
          });
        } else if (left.startsWith('exports.')) {
          commonJsExports.add(left.replace('exports.', ''));
        }
      }
    }
  });

  function visit(node: ts.Node) {
    // 1. ESM Imports
    if (ts.isImportDeclaration(node)) {
      if (ts.isStringLiteral(node.moduleSpecifier)) {
        dependencies.add(node.moduleSpecifier.text);
      }
    }

    // 2. CommonJS require('...')
    if (ts.isCallExpression(node)) {
      if (ts.isIdentifier(node.expression) && node.expression.text === 'require' && node.arguments.length > 0) {
        const firstArg = node.arguments[0];
        if (ts.isStringLiteral(firstArg)) {
          dependencies.add(firstArg.text);
        }
      }
    }

    // 3. Export declarations (re-exports)
    if (ts.isExportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      dependencies.add(node.moduleSpecifier.text);
    }

    // 4. Functions
    if (ts.isFunctionDeclaration(node) && node.name) {
      const name = node.name.text;
      const isExported = isExportedNode(node) || commonJsExports.has(name) || (isJs && node.parent === sourceFile);
      const params = node.parameters.map(p => formatParam(p, sourceFile)).join(', ');
      const retType = node.type ? `: ${node.type.getText(sourceFile)}` : '';
      symbols.push({
        name,
        kind: 'function',
        signature: `${name}(${params})${retType}`,
        doc: getDocComment(node),
        isExported
      });
    }

    // 5. Classes
    if (ts.isClassDeclaration(node) && node.name) {
      const className = node.name.text;
      const isExported = isExportedNode(node) || commonJsExports.has(className) || (isJs && node.parent === sourceFile);
      const methods: string[] = [];

      node.members.forEach(member => {
        if (ts.isMethodDeclaration(member) && member.name) {
          const name = member.name.getText(sourceFile);
          const params = member.parameters.map(p => formatParam(p, sourceFile)).join(', ');
          const retType = member.type ? `: ${member.type.getText(sourceFile)}` : '';
          methods.push(`${name}(${params})${retType}`);
        } else if (ts.isConstructorDeclaration(member)) {
          const params = member.parameters.map(p => formatParam(p, sourceFile)).join(', ');
          methods.push(`constructor(${params})`);
        }
      });

      const signature = methods.length > 0
        ? `class ${className} { ${methods.slice(0, 5).join('; ')}${methods.length > 5 ? '; ...' : ''} }`
        : `class ${className}`;

      symbols.push({
        name: className,
        kind: 'class',
        signature,
        doc: getDocComment(node),
        isExported
      });
    }

    // 6. Interfaces
    if (ts.isInterfaceDeclaration(node)) {
      const isExported = isExportedNode(node);
      const members = node.members.map(m => {
        if (m.name) return m.name.getText(sourceFile);
        return '';
      }).filter(Boolean);

      symbols.push({
        name: node.name.text,
        kind: 'interface',
        signature: `interface ${node.name.text} { ${members.slice(0, 4).join(', ')}${members.length > 4 ? ', ...' : ''} }`,
        doc: getDocComment(node),
        isExported
      });
    }

    // 7. Type Aliases
    if (ts.isTypeAliasDeclaration(node)) {
      const isExported = isExportedNode(node);
      symbols.push({
        name: node.name.text,
        kind: 'type',
        signature: `type ${node.name.text}`,
        doc: getDocComment(node),
        isExported
      });
    }

    // 8. Enums
    if (ts.isEnumDeclaration(node)) {
      const isExported = isExportedNode(node);
      const members = node.members.map(m => m.name.getText(sourceFile));
      symbols.push({
        name: node.name.text,
        kind: 'enum',
        signature: `enum ${node.name.text} { ${members.join(', ')} }`,
        doc: getDocComment(node),
        isExported
      });
    }

    // 9. Arrow Functions / Top-level Const Functions
    if (ts.isVariableStatement(node)) {
      const isTopLevel = node.parent === sourceFile;
      const isExplicitExport = isExportedNode(node);

      node.declarationList.declarations.forEach(decl => {
        if (decl.name && ts.isIdentifier(decl.name)) {
          const name = decl.name.text;
          const isExported = isExplicitExport || commonJsExports.has(name) || (isJs && isTopLevel);

          if (isExported) {
            if (decl.initializer && (ts.isArrowFunction(decl.initializer) || ts.isFunctionExpression(decl.initializer))) {
              const params = decl.initializer.parameters.map(p => formatParam(p, sourceFile)).join(', ');
              const ret = decl.initializer.type ? `: ${decl.initializer.type.getText(sourceFile)}` : '';
              symbols.push({
                name,
                kind: 'function',
                signature: `${name}(${params})${ret}`,
                doc: getDocComment(node),
                isExported: true
              });
            } else if (isExplicitExport || commonJsExports.has(name)) {
              symbols.push({
                name,
                kind: 'const',
                signature: `const ${name}`,
                doc: getDocComment(node),
                isExported: true
              });
            }
          }
        }
      });
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  return {
    symbols,
    dependencies: Array.from(dependencies),
    description: fileDescription
  };
}

function formatParam(p: ts.ParameterDeclaration, sourceFile?: ts.SourceFile): string {
  try {
    const name = p.name ? (sourceFile ? p.name.getText(sourceFile) : p.name.getText()) : '_';
    const type = p.type ? `: ${sourceFile ? p.type.getText(sourceFile) : p.type.getText()}` : '';
    const optional = p.questionToken ? '?' : '';
    return `${name}${optional}${type}`;
  } catch {
    return '_';
  }
}

function cleanComment(comment: string): string {
  return comment
    .replace(/^\/\*\*?/, '')
    .replace(/\*\/$/, '')
    .replace(/^\s*\*\s?/gm, '')
    .replace(/\/\//g, '')
    .trim()
    .split('\n')[0]
    .slice(0, 120);
}
