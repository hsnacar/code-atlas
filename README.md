# 🧭 Code Atlas (`code-atlas`)

> **Smart Codebase Architectural Map Generator for AI Coding Agents.**  
> *Compress entire repositories by 90–95%+ into high-density semantic maps. Give Cursor, Claude Code, Windsurf, Copilot, and Aider surgical precision without burning your token budget.*

[![npm version](https://img.shields.io/npm/v/code-atlas.svg?color=cb3837&style=flat-square)](https://www.npmjs.com/package/code-atlas)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![Node: >=18](https://img.shields.io/badge/Node-%3E%3D18-brightgreen.svg?style=flat-square)](https://nodejs.org/)
[![Tests](https://img.shields.io/badge/Tests-100%25%20Passing-success.svg?style=flat-square)](https://github.com/hsnacar/code-atlas)

---

## 🎯 The Problem

When you prompt an AI coding agent (Cursor, Claude Code, Windsurf, Copilot, Devin):
> *"Update the discount coupon calculation rule in the checkout flow"*

The agent typically:
1. **Blindly greps or opens 30+ files**, ingesting `node_modules`, database models, tests, and irrelevant utilities.
2. **Burns 50,000 to 200,000+ tokens** just trying to locate where the logic lives.
3. **Suffers from *"Lost-in-the-Middle"*** context degradation, hallucinating variable names or modifying the wrong service.

---

## ⚡ The Solution: `code-atlas`

`code-atlas` crawls your repository, parses the AST, and builds an ultra-compact **Architectural Map (`AGENT_MAP.md`)** in milliseconds:

- ✂️ **AST Signatures Without Bloat:** Strips out function and class bodies (`{ ... }`), preserving only export names, parameter types, return signatures, interfaces, and struct definitions.
- 🎯 **Task Focus Pinpointing:** Run `npx code-atlas --focus "coupon discount"` to instantly highlight the exact 2 or 3 target files the agent needs to touch.
- 🏗️ **Architectural Layer Tagging:** Automatically categorizes files into `[API & Entrypoints]`, `[Services & Business Logic]`, `[Data & Models]`, `[Utils]`, and `[Config]`.
- 📊 **Mermaid Flowchart Generation:** Run with `--diagram` to generate visual architecture flowcharts.
- 🎯 **Token Budget Capping:** Run with `--budget 10000` or `--compact` for massive monorepos to guarantee it fits your LLM context window.
- 🌐 **Polyglot Multi-Language Support:** First-class AST parsing for **TypeScript, JavaScript (ESM & CommonJS), Python, Go, and Java**.
- 📉 **90–95%+ Token Reduction:** Shrinks a 60,000-token codebase into ~1,000 tokens of high-density briefing.

---

## 📊 How Does `code-atlas` Compare?

| Feature | `code-atlas` 🧭 | Repomix / Packagers | Raw `grep` / `find` | Vector RAG Embeddings |
| :--- | :---: | :---: | :---: | :---: |
| **Token Efficiency** | **90–95% Reduction** | 0% (Copies all code bodies) | N/A (unstructured) | Medium |
| **AST Symbol Extraction** | ✅ (Functions, Classes, Structs) | ❌ Raw text only | ❌ Line hits only | ❌ Chunk fragments |
| **Architectural Layering** | ✅ (API, Service, Model, Config) | ❌ Flat directory list | ❌ None | ❌ None |
| **Task Pinpointer Mode** | ✅ Top-ranked target files | ❌ None | ❌ Regex hits only | ⚠️ Semantic similarity |
| **Speed** | ⚡ **< 100ms** (sub-second) | ⚠️ Slow on large repos | ⚡ Fast | 🐢 Slow (API latency) |
| **External API / Costs** | 🆓 **Zero API calls / 100% Offline** | 🆓 Offline | 🆓 Offline | 💸 Vector DB & Embedding fees |

---

## 🚀 Quickstart

Run directly in any project root with `npx` (no install required):

```bash
# Generate AGENT_MAP.md in the current directory
npx code-atlas
```

### 🎯 1. Task Pinpointer Mode (Recommended for AI Prompts)

When you're about to ask an AI agent to solve a specific task, run:

```bash
npx code-atlas --focus "client login jwt token"
```

This places a prominent **`🎯 Task Focus Targets`** section at the very top of the map, pinpointing the exact target files and symbols responsible for that feature.

### ⚡ 2. Compact High-Density Mode

For larger projects where you want single-line file summaries:

```bash
npx code-atlas --compact
```

### 📊 3. Visual Architecture Diagram

Generate an interactive Mermaid diagram inside your map:

```bash
npx code-atlas --diagram
```

### 💰 4. Token Budget Cap (For Large Repos & Monorepos)

Guarantee your map never exceeds a given token limit:

```bash
npx code-atlas --budget 8000
```

---

## 📋 Example Generated Map

```markdown
# 🧭 Code Atlas: Architectural Map for AI Agents

> 📊 Original Codebase: ~58,096 tokens (143 files, 9,705 lines)
> ⚡ Atlas Map: ~4,454 tokens (92.3% token reduction)
> 🏷️ Primary Stack: JavaScript / Node.js

---

## 🎯 Task Focus Targets (Query: "client login jwt token")
> The AI Agent should prioritize inspecting and editing these target files first:

### `src/services/user/jwt-token.js` (Score: 85, 20 lines)
- 💡 Relevance: Path contains "jwt"; Symbol `generateJWToken` matches "jwt"
- Key Symbols:
  - `generateJWToken(user)`
  - `generateJWTokenForClient(client)`
- 🔗 Dependencies: `jsonwebtoken`

### `src/models/client-login-fail.js` (Score: 74, 48 lines)
- 💡 Relevance: Path contains "client"; Path contains "login"
- Key Symbols:
  - `ClientLoginFails(sequelize, DataTypes)`
- 🔗 Dependencies: `sequelize`

---

## 🗺️ Architectural Layer Map

### 🌐 API & Entrypoints (39 files)
- **`src/controller/client/auth.js`** (118 lines)
  - 🧩 *Exports:* `login(req, res, next)`, `register(...)`, `search(...)`, `session(...)`
  - 🔗 *Uses:* `../../services/client/auth, ../../services/user/jwt-token, http-errors`

### ⚙️ Business Logic & Services (12 files)
- **`src/services/project/index.js`** (228 lines)
  - 🧩 *Exports:* `create(...)`, `retrieve(...)`, `adminSearch(...)`
  - 🔗 *Uses:* `../../models, sequelize`

### 💾 Data, Models & Schemas (47 files)
- **`src/models/client.js`** (83 lines)
  - 🧩 *Exports:* `class Client { associate(models) }`
  - 🔗 *Uses:* `bcrypt, sequelize`
```

---

## 💡 How to Integrate with AI Coding Assistants

### 1. In Cursor (`.cursorrules`)
Add this line to your project's `.cursorrules`:
```markdown
Before modifying code or inspecting modules, always read `AGENT_MAP.md` to locate the exact layers, exported symbols, and target files.
```

### 2. In Claude Code (`CLAUDE.md`)
Add this to your project's `CLAUDE.md`:
```markdown
# Codebase Orientation
Refer to `AGENT_MAP.md` for the architectural structure and module symbols.
To refresh the map for a task: `npx code-atlas --focus "<task>"`
```

### 3. In Windsurf (`.windsurfrules`)
```markdown
Check `AGENT_MAP.md` before navigating the codebase to minimize token usage and identify relevant service exports.
```

### 4. Direct Terminal Pipe
Copy the focused map directly to your clipboard:
```bash
# macOS
npx code-atlas --focus "checkout payment" --stdout | pbcopy

# Linux
npx code-atlas --focus "checkout payment" --stdout | xclip -selection clipboard
```

---

## 🛠️ CLI Options

| Flag | Description | Default |
| :--- | :--- | :--- |
| `[directory]` | Target repository directory to scan | `.` (current dir) |
| `-f, --focus <task>` | Task query to pinpoint target files | `undefined` |
| `-c, --compact` | Render files in a compact high-density single-line format | `false` |
| `-d, --diagram` | Include Mermaid architectural flowchart in the map | `false` |
| `-b, --budget <tokens>` | Cap output to a maximum estimated token budget | `undefined` |
| `-o, --output <file>`| Custom output filepath | `AGENT_MAP.md` |
| `--json` | Output in structured JSON format | `false` |
| `--stdout` | Print map to terminal instead of writing to a file | `false` |
| `-e, --exclude <globs...>` | Extra folders or patterns to ignore | `[]` |
| `--max-files <number>` | Safety limit on scanned files | `1500` |

---

## 💻 Programmatic SDK Usage

You can also use `code-atlas` inside your own Node.js / TypeScript scripts or tools:

```typescript
import { generateAtlas } from 'code-atlas';

const { map, output, focusMatches } = generateAtlas({
  cwd: './my-project',
  focus: 'payment webhook',
  compact: true,
  diagram: true
});

console.log(`Original: ~${map.originalTokens} tokens`);
console.log(`Atlas Map: ~${map.mapTokens} tokens`);
console.log(`Compression: ${(map.compressionRatio * 100).toFixed(1)}% reduction!`);
```

---

## 🌐 Supported Languages & AST Parsers

- **TypeScript** (`.ts`, `.tsx`) — Full AST via official TypeScript Compiler API.
- **JavaScript** (`.js`, `.jsx`, `.mjs`, `.cjs`) — ESM and CommonJS (`module.exports`, `exports`, `require`).
- **Python** (`.py`) — Classes, `def` functions, type hints, docstrings, and imports.
- **Go** (`.go`) — Packages, structs, interfaces, methods, functions, and imports.
- **Java** (`.java`) — Classes, records, interfaces, method signatures, and imports.

---

## 🤝 Contributing

Contributions, feedback, and parser extensions (Rust, C#, PHP, Ruby, etc.) are warmly welcome!  
Please see [CONTRIBUTING.md](CONTRIBUTING.md) for local development guidelines.

---

## 📄 License

MIT © [Hasan Acar](https://github.com/hsnacar)
