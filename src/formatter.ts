import { AtlasMap, ArchitectureLayer, FileAnalysis } from './types.js';
import { FocusMatch } from './focus.js';

const LAYER_TITLES: Record<ArchitectureLayer, { title: string; icon: string }> = {
  api: { title: 'API & Entrypoints', icon: '🌐' },
  service: { title: 'Business Logic & Services', icon: '⚙️' },
  data: { title: 'Data, Models & Schemas', icon: '💾' },
  config: { title: 'Configuration & Middlewares', icon: '🔧' },
  util: { title: 'Utilities & Helpers', icon: '🧰' },
  test: { title: 'Test Suites', icon: '🧪' },
  other: { title: 'Miscellaneous Modules', icon: '📁' }
};

export function formatMarkdownMap(map: AtlasMap, focusMatches?: FocusMatch[], focusQuery?: string): string {
  const lines: string[] = [];

  // 1. Header & Compression Metrics
  lines.push('# 🧭 Code Atlas: Architectural Map for AI Agents');
  lines.push('');
  lines.push(`> 📊 **Original Codebase:** ~${map.originalTokens.toLocaleString()} tokens (${map.totalFiles} files, ${map.totalLines.toLocaleString()} lines)`);
  lines.push(`> ⚡ **Atlas Map:** ~${map.mapTokens.toLocaleString()} tokens (**${(map.compressionRatio * 100).toFixed(1)}% token reduction**)`);
  lines.push(`> 🏷️ **Primary Stack:** ${map.primaryLanguage}`);
  lines.push(`> 🕒 **Generated:** ${map.generatedAt}`);
  lines.push('');

  // 2. Focused Targets (if task specified)
  if (focusMatches && focusMatches.length > 0 && focusQuery) {
    lines.push('---');
    lines.push('');
    lines.push(`## 🎯 Task Focus Targets (Query: "${focusQuery}")`);
    lines.push('> The AI Agent should prioritize inspecting and editing these target files first:');
    lines.push('');

    for (const match of focusMatches) {
      const f = match.file;
      lines.push(`### \`${f.path}\` (Score: ${match.score}, ${f.lineCount} lines)`);
      if (match.reasons.length > 0) {
        lines.push(`- 💡 *Relevance:* ${match.reasons.join('; ')}`);
      }
      if (f.symbols.length > 0) {
        lines.push('- *Key Symbols:*');
        for (const s of f.symbols.slice(0, 6)) {
          lines.push(`  - \`${s.signature}\``);
        }
      }
      if (f.dependencies.length > 0) {
        lines.push(`- 🔗 *Dependencies:* \`${f.dependencies.slice(0, 5).join('`, `')}\``);
      }
      lines.push('');
    }
  }

  lines.push('---');
  lines.push('');
  lines.push('## 🗺️ Architectural Layer Map');
  lines.push('');

  // 3. Layer by Layer breakdown
  const layerOrder: ArchitectureLayer[] = ['api', 'service', 'data', 'config', 'util', 'test', 'other'];

  for (const layer of layerOrder) {
    const files = map.layers[layer];
    if (!files || files.length === 0) continue;

    const meta = LAYER_TITLES[layer];
    lines.push(`### ${meta.icon} ${meta.title} (${files.length} files)`);
    lines.push('');

    for (const file of files) {
      lines.push(renderFileSummary(file));
    }
    lines.push('');
  }

  return lines.join('\n');
}

function renderFileSummary(file: FileAnalysis): string {
  const parts: string[] = [];
  parts.push(`- **\`${file.path}\`** (${file.lineCount} lines)`);

  if (file.description) {
    parts.push(`  - 📝 *Summary:* ${file.description}`);
  }

  if (file.symbols.length > 0) {
    const symbolList = file.symbols
      .slice(0, 5)
      .map(s => `\`${s.signature}\``)
      .join(', ');
    const extra = file.symbols.length > 5 ? ` *(+${file.symbols.length - 5} more)*` : '';
    parts.push(`  - 🧩 *Exports:* ${symbolList}${extra}`);
  }

  if (file.dependencies.length > 0) {
    const deps = file.dependencies.slice(0, 4).join(', ');
    const extra = file.dependencies.length > 4 ? ` (+${file.dependencies.length - 4})` : '';
    parts.push(`  - 🔗 *Uses:* \`${deps}\`${extra}`);
  }

  return parts.join('\n');
}

export function formatJsonMap(map: AtlasMap, focusMatches?: FocusMatch[]): string {
  return JSON.stringify(
    {
      meta: {
        totalFiles: map.totalFiles,
        totalLines: map.totalLines,
        originalTokens: map.originalTokens,
        mapTokens: map.mapTokens,
        compressionRatio: map.compressionRatio,
        primaryLanguage: map.primaryLanguage,
        generatedAt: map.generatedAt
      },
      focusTargets: focusMatches?.map(m => ({
        path: m.file.path,
        score: m.score,
        reasons: m.reasons,
        symbols: m.file.symbols.map(s => s.signature),
        dependencies: m.file.dependencies
      })),
      layers: map.layers
    },
    null,
    2
  );
}
