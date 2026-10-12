# 🤝 Contributing to Code Atlas (`ai-code-atlas`)

Thank you for your interest in contributing to **Code Atlas** (`ai-code-atlas`)! 

Code Atlas is an open-source tool designed to help developers and AI agents navigate codebases with surgical precision while saving 90–95%+ on token costs.

---

## 🛠️ Local Development Setup

### 1. Prerequisites
- **Node.js** >= 18.0.0
- **npm** >= 9.0.0

### 2. Clone & Install
```bash
git clone https://github.com/hsnacar/code-atlas.git
cd code-atlas
npm install
```

### 3. Run Development Build & Tests
```bash
# Watch mode for building
npm run dev

# Run unit tests
npm test

# Typecheck
npm run lint

# Build production bundle
npm run build
```

---

## 🧩 Adding a New Language Parser

Adding support for a new language (e.g. Rust, C#, PHP, Ruby, Kotlin) is straightforward:

1. Create a new parser file in `src/parsers/<lang>-parser.ts`.
2. Implement a function matching this signature:
   ```typescript
   import { SymbolSignature } from '../types.js';

   export interface ParsedCodeFile {
     symbols: SymbolSignature[];
     dependencies: string[];
     description?: string;
   }

   export function parseMyLang(content: string, filename: string): ParsedCodeFile {
     // Extract exported functions, structs/classes, interfaces, and imports
     // Strip out function implementation bodies!
   }
   ```
3. Register the extension in `src/parsers/index.ts`.
4. Add unit tests in `test/atlas.test.ts`.

---

## 🧪 Testing Guidelines

- Make sure all existing and new tests pass:
  ```bash
  npm test
  ```
- Ensure zero TypeScript compiler errors:
  ```bash
  npm run lint
  ```

---

## 📜 Pull Request Guidelines

1. Fork the repo and create your branch from `main`:
   ```bash
   git checkout -b feat/my-new-feature
   ```
2. Commit with meaningful conventional commit messages:
   - `feat(...)`: New feature or parser
   - `fix(...)`: Bug fix
   - `docs(...)`: Documentation update
   - `test(...)`: Test additions
3. Open a Pull Request on GitHub with a clear explanation of what was added or changed.

Thank you for making the AI coding ecosystem better for everyone! 🚀
