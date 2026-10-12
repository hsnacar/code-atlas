import fs from 'node:fs';
import path from 'node:path';
import ignore, { Ignore } from 'ignore';

const DEFAULT_IGNORES = [
  '.git',
  '.svn',
  '.hg',
  'node_modules',
  'dist',
  'build',
  'out',
  'target',
  '.gradle',
  '.idea',
  '.vscode',
  'coverage',
  '.next',
  '.nuxt',
  '.turbo',
  '.cache',
  'vendor',
  '*.lock',
  'package-lock.json',
  'pnpm-lock.yaml',
  'yarn.lock',
  '*.min.js',
  '*.min.css',
  '*.map',
  '*.log',
  '*.svg',
  '*.png',
  '*.jpg',
  '*.jpeg',
  '*.gif',
  '*.ico',
  '*.pdf',
  '*.zip',
  '*.tar',
  '*.gz',
  '*.jar',
  '*.war',
  '*.class',
  '*.exe',
  '*.dll',
  '*.so',
  '*.dylib'
];

const CODE_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
  '.py', '.pyw',
  '.go',
  '.java',
  '.rs',
  '.rb',
  '.php',
  '.cs',
  '.c', '.cpp', '.cc', '.cxx', '.h', '.hpp',
  '.swift', '.kt', '.kts',
  '.scala',
  '.sql',
  '.sh', '.bash', '.zsh',
  '.json', '.yaml', '.yml', '.toml'
]);

export interface ScanOptions {
  cwd: string;
  exclude?: string[];
  maxFiles?: number;
}

export function scanRepository(options: ScanOptions): string[] {
  const rootDir = path.resolve(options.cwd);
  const ig: Ignore = ignore();

  ig.add(DEFAULT_IGNORES);

  // Load .gitignore if present
  const gitignorePath = path.join(rootDir, '.gitignore');
  if (fs.existsSync(gitignorePath)) {
    try {
      const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
      ig.add(gitignoreContent);
    } catch {
      // Ignore reading error
    }
  }

  if (options.exclude && options.exclude.length > 0) {
    ig.add(options.exclude);
  }

  const collectedFiles: string[] = [];
  const maxFiles = options.maxFiles || 1500;

  function traverse(currentDir: string): void {
    if (collectedFiles.length >= maxFiles) return;

    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (collectedFiles.length >= maxFiles) break;

      const fullPath = path.join(currentDir, entry.name);
      const relativePath = path.relative(rootDir, fullPath);

      if (!relativePath || relativePath === '') continue;

      const normalizedRel = relativePath.replace(/\\/g, '/');

      // Check ignore
      const checkPath = entry.isDirectory() ? `${normalizedRel}/` : normalizedRel;
      if (ig.ignores(checkPath)) {
        continue;
      }

      if (entry.isDirectory()) {
        traverse(fullPath);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (CODE_EXTENSIONS.has(ext)) {
          collectedFiles.push(normalizedRel);
        }
      }
    }
  }

  traverse(rootDir);
  return collectedFiles.sort();
}
