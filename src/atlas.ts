import fs from 'node:fs';
import path from 'node:path';
import { AtlasMap, AtlasOptions, ArchitectureLayer, FileAnalysis } from './types.js';
import { scanRepository } from './scanner.js';
import { parseFileContent } from './parsers/index.js';
import { classifyFileLayer } from './classifier.js';
import { filterByFocus, FocusMatch } from './focus.js';
import { formatMarkdownMap, formatJsonMap } from './formatter.js';

export function generateAtlas(options: AtlasOptions = {}): { map: AtlasMap; output: string; focusMatches?: FocusMatch[] } {
  const cwd = path.resolve(options.cwd || process.cwd());
  const files = scanRepository({
    cwd,
    exclude: options.exclude,
    maxFiles: options.maxFiles
  });

  const layers: Record<ArchitectureLayer, FileAnalysis[]> = {
    api: [],
    service: [],
    data: [],
    config: [],
    util: [],
    test: [],
    other: []
  };

  const allFiles: FileAnalysis[] = [];
  let totalLines = 0;
  let totalBytes = 0;
  const langCount: Record<string, number> = {};

  for (const relPath of files) {
    const fullPath = path.join(cwd, relPath);
    let content: string;
    try {
      content = fs.readFileSync(fullPath, 'utf8');
    } catch {
      continue;
    }

    const lines = content.split('\n').length;
    const bytes = Buffer.byteLength(content, 'utf8');
    const ext = path.extname(relPath).toLowerCase();

    langCount[ext] = (langCount[ext] || 0) + 1;
    totalLines += lines;
    totalBytes += bytes;

    // Parse AST
    const parsed = parseFileContent(content, relPath);
    const layer = classifyFileLayer(relPath);

    // Estimate ~4 characters per token
    const estimatedTokens = Math.ceil(bytes / 4);

    const analysis: FileAnalysis = {
      path: relPath,
      extension: ext,
      layer,
      lineCount: lines,
      byteSize: bytes,
      estimatedTokens,
      symbols: parsed.symbols,
      dependencies: parsed.dependencies,
      description: parsed.description
    };

    layers[layer].push(analysis);
    allFiles.push(analysis);
  }

  // Detect primary language
  let topLang = 'TypeScript / JavaScript';
  let maxCount = 0;
  for (const [ext, count] of Object.entries(langCount)) {
    if (count > maxCount) {
      maxCount = count;
      if (ext === '.go') topLang = 'Go';
      else if (ext === '.py') topLang = 'Python';
      else if (ext === '.java') topLang = 'Java';
      else if (ext === '.rs') topLang = 'Rust';
      else if (ext === '.ts' || ext === '.tsx') topLang = 'TypeScript';
      else if (ext === '.js' || ext === '.jsx') topLang = 'JavaScript';
    }
  }

  // Estimate total original tokens
  const originalTokens = Math.ceil(totalBytes / 4);

  // Focus matching if query provided
  let focusMatches: FocusMatch[] | undefined;
  if (options.focus) {
    focusMatches = filterByFocus(allFiles, options.focus);
  }

  const rawMap: AtlasMap = {
    rootDir: cwd,
    generatedAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
    totalFiles: allFiles.length,
    totalLines,
    originalTokens,
    mapTokens: 0,
    compressionRatio: 0,
    primaryLanguage: topLang,
    layers,
    allFiles
  };

  const formatOpts = {
    focusMatches,
    focusQuery: options.focus,
    compact: options.compact,
    diagram: options.diagram,
    budget: options.budget
  };

  // Initial pass to measure output length and token ratio
  const previewText = formatMarkdownMap(rawMap, formatOpts);
  const mapTokens = Math.ceil(Buffer.byteLength(previewText, 'utf8') / 4);
  const compressionRatio = originalTokens > 0 ? Math.max(0, 1 - mapTokens / originalTokens) : 0;

  rawMap.mapTokens = mapTokens;
  rawMap.compressionRatio = compressionRatio;

  // Final formatted output with accurate metrics in header
  const finalOutput = options.json
    ? formatJsonMap(rawMap, focusMatches)
    : formatMarkdownMap(rawMap, formatOpts);

  return {
    map: rawMap,
    output: finalOutput,
    focusMatches
  };
}
