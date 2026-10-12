import fs from 'node:fs';
import path from 'node:path';
import { Command } from 'commander';
import pc from 'picocolors';
import { generateAtlas } from './atlas.js';

const program = new Command();

program
  .name('code-atlas')
  .description('🧭 Smart Codebase Architectural Map Generator for AI Coding Agents')
  .version('0.1.0')
  .argument('[directory]', 'Target repository directory (defaults to current dir)', '.')
  .option('-o, --output <file>', 'Output map file path (default: AGENT_MAP.md)')
  .option('-f, --focus <task>', 'Task-focused query to pinpoint relevant files (e.g. "auth login token")')
  .option('-c, --compact', 'Render files in a compact high-density single-line format')
  .option('-d, --diagram', 'Include a Mermaid architectural flowchart in the map')
  .option('-b, --budget <tokens>', 'Cap output to a maximum estimated token budget (e.g. 8000)')
  .option('--json', 'Output map in structured JSON format')
  .option('--stdout', 'Print map to stdout instead of writing to a file')
  .option('-e, --exclude <patterns...>', 'Additional glob patterns or folders to exclude')
  .option('--max-files <number>', 'Maximum number of files to scan (default: 1500)', '1500')
  .action((dir, opts) => {
    const cwd = path.resolve(dir);

    console.log(pc.bold(pc.cyan('\n🧭 Code Atlas')) + pc.gray(' v0.1.0 — Generating architectural map for AI agents...\n'));

    const startTime = Date.now();
    const result = generateAtlas({
      cwd,
      output: opts.output,
      json: opts.json,
      focus: opts.focus,
      compact: opts.compact,
      diagram: opts.diagram,
      budget: opts.budget ? parseInt(opts.budget, 10) : undefined,
      exclude: opts.exclude,
      maxFiles: parseInt(opts.maxFiles, 10),
      stdout: opts.stdout
    });

    const elapsed = Date.now() - startTime;
    const map = result.map;

    if (opts.stdout) {
      process.stdout.write(result.output);
      return;
    }

    const defaultFilename = opts.json ? 'agent-map.json' : 'AGENT_MAP.md';
    const outputPath = path.resolve(cwd, opts.output || defaultFilename);

    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, result.output, 'utf8');

    // Display beautiful summary table in terminal
    console.log(pc.green('✔') + ' ' + pc.bold('Map generated successfully!') + pc.gray(` in ${elapsed}ms\n`));

    console.log(pc.bold('📊 Compression Metrics:'));
    console.log(pc.gray('  ├─ ') + 'Files Scanned:       ' + pc.white(pc.bold(map.totalFiles.toString())) + pc.gray(` (${map.totalLines.toLocaleString()} lines)`));
    console.log(pc.gray('  ├─ ') + 'Original Codebase:   ' + pc.yellow(`~${map.originalTokens.toLocaleString()} tokens`));
    console.log(pc.gray('  ├─ ') + 'Atlas Map Size:      ' + pc.green(pc.bold(`~${map.mapTokens.toLocaleString()} tokens`)));
    console.log(pc.gray('  ├─ ') + 'Token Reduction:     ' + pc.cyan(pc.bold(`${(map.compressionRatio * 100).toFixed(1)}% saved`)));
    console.log(pc.gray('  └─ ') + 'Primary Stack:       ' + pc.magenta(map.primaryLanguage));

    if (opts.focus && result.focusMatches && result.focusMatches.length > 0) {
      console.log('\n' + pc.bold(pc.yellow('🎯 Task Focus Targets:')) + pc.gray(` (Query: "${opts.focus}")`));
      for (const m of result.focusMatches) {
        console.log(pc.gray('  • ') + pc.cyan(pc.bold(m.file.path)) + pc.gray(` (relevance: ${m.score})`));
        if (m.reasons.length > 0) {
          console.log(pc.gray('    └─ ') + pc.italic(m.reasons.slice(0, 2).join(', ')));
        }
      }
    }

    console.log('\n' + pc.gray('📍 Saved to: ') + pc.underline(pc.white(outputPath)));
    console.log(pc.gray('💡 Tip: Mention ') + pc.cyan(path.basename(outputPath)) + pc.gray(' in your prompt or add to ') + pc.cyan('.cursorrules') + pc.gray(' for instant agent orientation!\n'));
  });

program.parse(process.argv);
