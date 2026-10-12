export type ArchitectureLayer =
  | 'api'          // Controllers, Routes, Handlers, Endpoints, CLI entrypoints
  | 'service'      // Business logic, Services, UseCases, Managers, Processors
  | 'data'         // Models, Entities, Schemas, Repositories, DB migrations
  | 'util'         // Helpers, Shared utilities, Formatters
  | 'config'       // Configuration, Setup, Env, Clients, Middlewares
  | 'test'         // Unit, Integration, E2E tests
  | 'other';       // Miscellaneous

export interface SymbolSignature {
  name: string;
  kind: 'class' | 'interface' | 'function' | 'method' | 'type' | 'struct' | 'enum' | 'const';
  signature: string;
  doc?: string;
  isExported: boolean;
}

export interface FileAnalysis {
  path: string;           // Relative path e.g. "src/cart/discount.service.ts"
  extension: string;      // ".ts", ".go", ".py", ".java", etc.
  layer: ArchitectureLayer;
  lineCount: number;
  byteSize: number;
  estimatedTokens: number;
  symbols: SymbolSignature[];
  dependencies: string[]; // imported modules or files
  description?: string;
}

export interface AtlasMap {
  rootDir: string;
  generatedAt: string;
  totalFiles: number;
  totalLines: number;
  originalTokens: number;
  mapTokens: number;
  compressionRatio: number;
  primaryLanguage: string;
  layers: Record<ArchitectureLayer, FileAnalysis[]>;
  allFiles: FileAnalysis[];
}

export interface AtlasOptions {
  cwd?: string;
  output?: string;
  json?: boolean;
  focus?: string;          // Task-specific query
  exclude?: string[];
  maxFiles?: number;
  verbose?: boolean;
  stdout?: boolean;
}
