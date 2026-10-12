# 🧭 Code Atlas Go CLI (Standalone Binary)

A lightweight, zero-dependency Go implementation of **Code Atlas**. It scans codebases and generates token-compressed architectural maps (`AGENT_MAP.md`) for AI coding agents without requiring Node.js or npm.

---

## ⚡ Highlights

- **Zero External Dependencies**: Built 100% on the Go standard library.
- **Fast Execution**: Maps 10,000+ line repositories in under 150ms.
- **Single Static Binary**: No Node.js runtime, no npm packages, single ~3MB executable.
- **Multi-Language Support**: Parsers for Go, TypeScript, JavaScript, Python, and Java.
- **Feature Parity**: Supports architectural categorization, Mermaid diagrams, compact mode, token budget capping, and task focus pinpointer.

---

## 🚀 Quick Start

### 1. Build from Source

Requires Go 1.20+:

```bash
cd extras/go-cli
go build -o code-atlas main.go
```

Or cross-compile for all operating systems (macOS, Linux, Windows):

```bash
chmod +x build.sh && ./build.sh
```

### 2. Basic Usage

Generate an `AGENT_MAP.md` in the current directory:

```bash
./code-atlas
```

Scan a specific project path:

```bash
./code-atlas /path/to/project
```

Print to `stdout` instead of saving to a file:

```bash
./code-atlas --stdout
```

---

## 🛠️ CLI Options

| Flag | Description | Example |
| :--- | :--- | :--- |
| `-o <path>` | Specify custom output file path (default: `AGENT_MAP.md`) | `./code-atlas -o DOCS.md` |
| `-f <query>` | Pinpoint target files matching a task prompt | `./code-atlas -f "fix auth refresh token"` |
| `-c` | Render in compact high-density format (one line per file) | `./code-atlas -c` |
| `-d` | Include Mermaid architectural flowchart in map | `./code-atlas -d` |
| `-b <budget>` | Cap output to estimated token budget | `./code-atlas -b 4000` |
| `--stdout` | Stream output directly to terminal stdout | `./code-atlas --stdout` |
| `--json` | Output full AST analysis as JSON | `./code-atlas --json` |
| `--max-files <n>` | Maximum files to scan (default: 1500) | `./code-atlas --max-files 2000` |

---

## 🎯 Task Focus Mode

When an AI coding agent receives a specific task, use `-f` to rank and highlight the most relevant target files at the top of the map:

```bash
./code-atlas -f "optimize database query caching"
```

The output will include a `## 🎯 Task Focus Targets` section ranking files with matching paths, function signatures, and imports.

---

## 📦 Precompiled Cross-Platform Binaries

Ready-to-use binaries are included in [`./bin/`](./bin/):

| Platform | Binary | Size |
| :--- | :--- | :--- |
| **macOS (Apple Silicon M1/M2/M3/M4)** | [`bin/code-atlas-darwin-arm64`](./bin/code-atlas-darwin-arm64) | ~2.8 MB |
| **macOS (Intel x86_64)** | [`bin/code-atlas-darwin-amd64`](./bin/code-atlas-darwin-amd64) | ~2.9 MB |
| **Linux (x86_64 / Docker / Ubuntu)** | [`bin/code-atlas-linux-amd64`](./bin/code-atlas-linux-amd64) | ~2.9 MB |
| **Linux (ARM64 / AWS Graviton)** | [`bin/code-atlas-linux-arm64`](./bin/code-atlas-linux-arm64) | ~2.8 MB |
| **Windows (x64)** | [`bin/code-atlas-windows-amd64.exe`](./bin/code-atlas-windows-amd64.exe) | ~3.1 MB |

To recompile them yourself at any time, simply run:
```bash
./build.sh
```
