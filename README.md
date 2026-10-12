# 🧭 Code Atlas (`code-atlas`)

> **Smart codebase architectural map generator for AI coding agents.**  
> *Compress entire repositories by 90–95%+ into high-density semantic maps. Give Cursor, Claude Code, Windsurf, and Copilot surgical precision without burning your token budget.*

[![npm version](https://img.shields.io/npm/v/code-atlas.svg)](https://www.npmjs.com/package/code-atlas)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node: >=18](https://img.shields.io/badge/Node-%3E%3D18-brightgreen.svg)](https://nodejs.org/)

---

## 🎯 The Problem

When you prompt an AI coding agent (Cursor, Claude Code, Windsurf, Devin):
> *"Update the discount coupon calculation rule in the checkout flow"*

The agent typically:
1. **Blindly greps or opens 30+ files**, ingesting `node_modules`, models, tests, and irrelevant utilities.
2. **Burns 50,000 to 100,000+ tokens** just trying to locate where the logic lives.
3. **Suffers from *"Lost-in-the-Middle"*** context degradation, hallucinating variable names or modifying the wrong service.

---

## ⚡ The Solution: `code-atlas`

`code-atlas` crawls your repository, parses the AST, and builds an ultra-compact **Architectural Map (`AGENT_MAP.md`)**:

- ✂️ **Signatures Without Bloat:** Strips out function and class bodies (`{ ... }`), preserving only export names, parameter types, return signatures, and interfaces.
- 🎯 **Task Focus Pinpointing:** Run `npx code-atlas --focus "coupon discount"` to instantly highlight the exact 2 or 3 target files the agent needs to touch.
- 🏗️ **Architectural Layer Tagging:** Automatically categorizes files into `[API / Entrypoints]`, `[Services & Business Logic]`, `[Data & Models]`, `[Utils]`, and `[Config]`.
- 🌐 **Multi-Language Support:** First-class support for **TypeScript, JavaScript, Python, Go, and Java**.
- 📉 **90–95%+ Token Reduction:** Shrinks a 60,000-token codebase into an ~800-token high-density briefing.

---

## 🚀 Quickstart

Run directly in any project root with `npx`:

```bash
# Generate AGENT_MAP.md in the current directory
npx code-atlas
```

### 🎯 Task Pinpointer Mode (Recommended for AI prompts)

When you're about to ask an AI agent to solve a specific task, run:

```bash
npx code-atlas --focus "discount coupon calculation"
```

This places a prominent **`🎯 Task Focus Targets`** section at the very top of the map, pinpointing the exact files and symbols responsible for that feature.

---

## 📋 Example Generated Map

```markdown
# 🧭 Code Atlas: Architectural Map for AI Agents

> 📊 Original Codebase: ~65,400 tokens (42 files, 4,210 lines)
> ⚡ Atlas Map: ~1,150 tokens (98.2% token reduction)
> 🏷️ Primary Stack: TypeScript / Node.js

---

## 🎯 Task Focus Targets (Query: "discount coupon calculation")
> The AI Agent should prioritize inspecting and editing these target files first:

### `src/services/discount.service.ts` (Score: 25, 140 lines)
- 💡 Relevance: Symbol `calculateDiscount` matches "discount"; Path contains "discount"
- Key Symbols:
  - `class DiscountService { applyCoupon(cart, code): Promise<DiscountResult>; calculateDiscount(cart, code): number }`
- 🔗 Dependencies: `../models/cart.js`, `../models/coupon.js`

---

## 🗺️ Architectural Layer Map

### 🌐 API & Entrypoints (4 files)
- **`src/controllers/order.controller.ts`** (120 lines)
  - 🧩 *Exports:* `class OrderController { createOrder(req, res); getOrder(req, res) }`
  - 🔗 *Uses:* `../services/order.service.js`

### ⚙️ Business Logic & Services (6 files)
- **`src/services/order.service.ts`** (240 lines)
  - 🧩 *Exports:* `class OrderService { placeOrder(userId, items): Promise<Order>; cancelOrder(orderId) }`
  - 🔗 *Uses:* `../models/order.js`, `./discount.service.js`

### 💾 Data, Models & Schemas (8 files)
- **`src/models/order.ts`** (45 lines)
  - 🧩 *Exports:* `interface Order`, `type OrderStatus`
```

---

## 💡 How to Use with AI Agents

### 1. In Cursor (`.cursorrules`)
Generate the map once and reference it in `.cursorrules`:
```markdown
Always refer to AGENT_MAP.md to understand the codebase structure and module locations before opening files.
```

### 2. In Claude Code / Terminal Prompts
Pipe the focused map directly to your agent prompt:
```bash
npx code-atlas --focus "user authentication" --stdout | pbcopy
```
Paste it into your prompt along with your task instruction!

---

## 🛠️ CLI Options

| Flag | Description | Default |
| :--- | :--- | :--- |
| `[directory]` | Target repository directory to scan | `.` (current dir) |
| `-f, --focus <task>` | Task query to pinpoint target files | `undefined` |
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
  focus: 'payment webhook'
});

console.log(`Compressed by ${(map.compressionRatio * 100).toFixed(1)}%!`);
console.log(output);
```

---

## 📄 License

MIT © [Hasan Acar](https://github.com/hsnacar)
