import { SymbolSignature } from '../types.js';
import { ParsedCodeFile } from './ts-parser.js';

export function parseGo(content: string): ParsedCodeFile {
  const symbols: SymbolSignature[] = [];
  const dependencies: Set<string> = new Set();
  const lines = content.split('\n');

  let inImportBlock = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Import block
    if (line.startsWith('import (')) {
      inImportBlock = true;
      continue;
    }
    if (inImportBlock) {
      if (line === ')') {
        inImportBlock = false;
        continue;
      }
      const match = line.match(/"([^"]+)"/);
      if (match) dependencies.add(match[1]);
      continue;
    }

    // Single import
    const singleImport = line.match(/^import\s+"([^"]+)"/);
    if (singleImport) {
      dependencies.add(singleImport[1]);
      continue;
    }

    // Struct or Interface
    const typeMatch = line.match(/^type\s+([A-Za-z0-9_]+)\s+(struct|interface)/);
    if (typeMatch) {
      const name = typeMatch[1];
      const kind = typeMatch[2] === 'struct' ? 'struct' : 'interface';
      const isExported = /^[A-Z]/.test(name);
      symbols.push({
        name,
        kind,
        signature: `type ${name} ${kind}`,
        isExported
      });
      continue;
    }

    // Func or Method
    // Method: func (r *Receiver) MethodName(params) returns
    const methodMatch = line.match(/^func\s+\((?:[^)]+)\)\s+([A-Za-z0-9_]+)\s*\((.*?)\)(?:\s*(.*))?$/);
    if (methodMatch) {
      const name = methodMatch[1];
      const params = methodMatch[2].trim();
      const ret = methodMatch[3] ? ` ${methodMatch[3].replace(/\{.*$/, '').trim()}` : '';
      const isExported = /^[A-Z]/.test(name);
      symbols.push({
        name,
        kind: 'method',
        signature: `func ${name}(${params})${ret}`,
        isExported
      });
      continue;
    }

    // Plain func: func FuncName(params) returns
    const funcMatch = line.match(/^func\s+([A-Za-z0-9_]+)\s*\((.*?)\)(?:\s*(.*))?$/);
    if (funcMatch) {
      const name = funcMatch[1];
      const params = funcMatch[2].trim();
      const ret = funcMatch[3] ? ` ${funcMatch[3].replace(/\{.*$/, '').trim()}` : '';
      const isExported = /^[A-Z]/.test(name);
      symbols.push({
        name,
        kind: 'function',
        signature: `func ${name}(${params})${ret}`,
        isExported
      });
      continue;
    }

    // Function closure or nested func: name := func(params) returns
    const closureMatch = line.match(/^([A-Za-z0-9_]+)\s*:=\s*func\s*\((.*?)\)(?:\s*(.*))?$/);
    if (closureMatch) {
      const name = closureMatch[1];
      const params = closureMatch[2].trim();
      const ret = closureMatch[3] ? ` ${closureMatch[3].replace(/\{.*$/, '').trim()}` : '';
      symbols.push({
        name,
        kind: 'function',
        signature: `func ${name}(${params})${ret}`,
        isExported: false
      });
      continue;
    }
  }

  return {
    symbols,
    dependencies: Array.from(dependencies)
  };
}
