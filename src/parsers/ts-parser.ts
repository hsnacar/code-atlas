import ts from 'typescript';
import { SymbolSignature } from '../types.js';

export interface ParsedCodeFile {
  symbols: SymbolSignature[];
  dependencies: string[];
  description?: string;
}

export function parseTypeScript(content: string, filename: string): ParsedCodeFile {
  const isJsx = filename.endsWith('.tsx') || filename.endsWith('.jsx');
  const sourceFile = ts.createSourceFile(
    filename,
    content,
    ts.ScriptTarget.Latest,
    true,
    isJsx ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  );

  const symbols: SymbolSignature[] = [];
  const dependencies: Set<string> = new Set();
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

  function visit(node: ts.Node) {
    // 1. Imports
    if (ts.isImportDeclaration(node)) {
      if (ts.isStringLiteral(node.moduleSpecifier)) {
        dependencies.add(node.moduleSpecifier.text);
      }
    }

    // 2. Export declarations (re-exports)
    if (ts.isExportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      dependencies.add(node.moduleSpecifier.text);
    }

    // 3. Functions
    if (ts.isFunctionDeclaration(node) && node.name) {
      const isExported = isExportedNode(node);
      const params = node.parameters.map(p => formatParam(p)).join(', ');
      const retType = node.type ? node.type.getText(sourceFile) : 'void';
      symbols.push({
        name: node.name.text,
        kind: 'function',
        signature: `${node.name.text}(${params}): ${retType}`,
        doc: getDocComment(node),
        isExported
      });
    }

    // 4. Classes
    if (ts.isClassDeclaration(node) && node.name) {
      const isExported = isExportedNode(node);
      const className = node.name.text;
      const methods: string[] = [];

      node.members.forEach(member => {
        if (ts.isMethodDeclaration(member) && member.name) {
          const name = member.name.getText(sourceFile);
          const params = member.parameters.map(p => formatParam(p)).join(', ');
          const retType = member.type ? member.type.getText(sourceFile) : '';
          methods.push(`${name}(${params})${retType ? `: ${retType}` : ''}`);
        } else if (ts.isConstructorDeclaration(member)) {
          const params = member.parameters.map(p => formatParam(p)).join(', ');
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

    // 5. Interfaces
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

    // 6. Type Aliases
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

    // 7. Enums
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

    // 8. Exported Arrow Functions / Consts
    if (ts.isVariableStatement(node)) {
      const isExported = isExportedNode(node);
      if (isExported) {
        node.declarationList.declarations.forEach(decl => {
          if (decl.name && ts.isIdentifier(decl.name)) {
            const name = decl.name.text;
            if (decl.initializer && (ts.isArrowFunction(decl.initializer) || ts.isFunctionExpression(decl.initializer))) {
              const params = decl.initializer.parameters.map(p => formatParam(p)).join(', ');
              const ret = decl.initializer.type ? decl.initializer.type.getText(sourceFile) : '';
              symbols.push({
                name,
                kind: 'function',
                signature: `${name}(${params})${ret ? `: ${ret}` : ''}`,
                doc: getDocComment(node),
                isExported: true
              });
            } else {
              symbols.push({
                name,
                kind: 'const',
                signature: `const ${name}`,
                doc: getDocComment(node),
                isExported: true
              });
            }
          }
        });
      }
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

function formatParam(p: ts.ParameterDeclaration): string {
  const name = p.name.getText();
  const type = p.type ? `: ${p.type.getText()}` : '';
  const optional = p.questionToken ? '?' : '';
  return `${name}${optional}${type}`;
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
