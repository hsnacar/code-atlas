import { SymbolSignature } from '../types.js';
import { ParsedCodeFile } from './ts-parser.js';

export function parsePython(content: string): ParsedCodeFile {
  const symbols: SymbolSignature[] = [];
  const dependencies: Set<string> = new Set();
  const lines = content.split('\n');

  let fileDescription: string | undefined;

  // Check top docstring
  const docMatch = content.match(/^(?:"""([\s\S]*?)"""|'''([\s\S]*?)''')/m);
  if (docMatch) {
    const raw = docMatch[1] || docMatch[2];
    fileDescription = raw.trim().split('\n')[0].slice(0, 120);
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Imports
    const importMatch = line.match(/^(?:from\s+([a-zA-Z0-9_.]+)\s+import|import\s+([a-zA-Z0-9_.]+))/);
    if (importMatch) {
      dependencies.add(importMatch[1] || importMatch[2]);
      continue;
    }

    // Top-level / Class Def
    const classMatch = line.match(/^class\s+([a-zA-Z0-9_]+)(?:\((.*?)\))?:/);
    if (classMatch) {
      const name = classMatch[1];
      const bases = classMatch[2] ? `(${classMatch[2]})` : '';
      symbols.push({
        name,
        kind: 'class',
        signature: `class ${name}${bases}`,
        isExported: !name.startsWith('_')
      });
      continue;
    }

    // Function def
    const funcMatch = line.match(/^(?:async\s+)?def\s+([a-zA-Z0-9_]+)\s*\((.*?)\)(?:\s*->\s*([^:]+))?:/);
    if (funcMatch) {
      const name = funcMatch[1];
      const params = funcMatch[2].trim();
      const ret = funcMatch[3] ? ` -> ${funcMatch[3].trim()}` : '';
      symbols.push({
        name,
        kind: 'function',
        signature: `def ${name}(${params})${ret}`,
        isExported: !name.startsWith('_')
      });
    }
  }

  return {
    symbols,
    dependencies: Array.from(dependencies),
    description: fileDescription
  };
}
