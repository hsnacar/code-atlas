import { SymbolSignature } from '../types.js';
import { ParsedCodeFile } from './ts-parser.js';

export function parseJava(content: string): ParsedCodeFile {
  const symbols: SymbolSignature[] = [];
  const dependencies: Set<string> = new Set();
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Import
    const importMatch = line.match(/^import\s+(?:static\s+)?([a-zA-Z0-9_.*]+);/);
    if (importMatch) {
      dependencies.add(importMatch[1]);
      continue;
    }

    // Class / Record / Interface / Enum
    const typeMatch = line.match(/(?:public|protected)?\s*(?:final|abstract|sealed)?\s*(class|record|interface|enum)\s+([A-Za-z0-9_]+)(?:<[^>]+>)?(?:\s+(?:extends|implements)\s+[^{]+)?/);
    if (typeMatch) {
      const kind = typeMatch[1] as 'class' | 'interface' | 'enum';
      const name = typeMatch[2];
      symbols.push({
        name,
        kind,
        signature: `${typeMatch[1]} ${name}`,
        isExported: line.includes('public')
      });
      continue;
    }

    // Public / Protected methods
    const methodMatch = line.match(/(?:public|protected)\s+(?:static\s+)?(?:final\s+)?([A-Za-z0-9_<>[\], ]+)\s+([A-Za-z0-9_]+)\s*\((.*?)\)\s*(?:throws\s+[^{]+)?\s*\{?/);
    if (methodMatch) {
      const retType = methodMatch[1].trim();
      const name = methodMatch[2];
      const params = methodMatch[3].trim();
      // Skip constructors or control statements
      if (name !== 'if' && name !== 'while' && name !== 'for' && name !== 'switch') {
        symbols.push({
          name,
          kind: 'method',
          signature: `${name}(${params}): ${retType}`,
          isExported: true
        });
      }
    }
  }

  return {
    symbols,
    dependencies: Array.from(dependencies)
  };
}
