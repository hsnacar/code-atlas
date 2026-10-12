import path from 'node:path';
import { ParsedCodeFile, parseTypeScript } from './ts-parser.js';
import { parsePython } from './python-parser.js';
import { parseGo } from './go-parser.js';
import { parseJava } from './java-parser.js';

export function parseFileContent(content: string, filePath: string): ParsedCodeFile {
  const ext = path.extname(filePath).toLowerCase();

  switch (ext) {
    case '.ts':
    case '.tsx':
    case '.js':
    case '.jsx':
    case '.mjs':
    case '.cjs':
      return parseTypeScript(content, filePath);

    case '.py':
    case '.pyw':
      return parsePython(content);

    case '.go':
      return parseGo(content);

    case '.java':
      return parseJava(content);

    default:
      // Generic fallback for other files (json, yaml, etc.)
      return {
        symbols: [],
        dependencies: []
      };
  }
}
