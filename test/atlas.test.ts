import { describe, it, expect } from 'vitest';
import { generateAtlas } from '../src/atlas.js';
import { scanRepository } from '../src/scanner.js';
import { classifyFileLayer } from '../src/classifier.js';
import { filterByFocus } from '../src/focus.js';
import { parseFileContent } from '../src/parsers/index.js';
import { formatMarkdownMap } from '../src/formatter.js';

describe('Code Atlas Unit & Edge Case Tests', () => {
  it('should scan current directory ignoring node_modules and dist', () => {
    const files = scanRepository({ cwd: process.cwd() });
    expect(files.length).toBeGreaterThan(0);
    expect(files.some(f => f.includes('node_modules'))).toBe(false);
    expect(files.some(f => f.includes('dist/'))).toBe(false);
    expect(files.some(f => f === 'src/atlas.ts')).toBe(true);
  });

  it('should accurately classify architecture layers across naming conventions', () => {
    expect(classifyFileLayer('src/controllers/user.controller.ts')).toBe('api');
    expect(classifyFileLayer('api/v1/auth.go')).toBe('api');
    expect(classifyFileLayer('src/resolvers/user.resolver.ts')).toBe('api');
    expect(classifyFileLayer('src/services/payment.service.ts')).toBe('service');
    expect(classifyFileLayer('src/models/user.model.ts')).toBe('data');
    expect(classifyFileLayer('models/Category.go')).toBe('data');
    expect(classifyFileLayer('src/entity/Customer.java')).toBe('data');
    expect(classifyFileLayer('src/config/database.ts')).toBe('config');
    expect(classifyFileLayer('src/security/jwt.go')).toBe('config');
    expect(classifyFileLayer('src/utils/format.ts')).toBe('util');
    expect(classifyFileLayer('src/tests/user.test.ts')).toBe('test');
    expect(classifyFileLayer('src/user_test.go')).toBe('test');
  });

  it('should parse TypeScript functions, classes, interfaces, and imports', () => {
    const code = `
      import fs from 'node:fs';
      export interface User { id: string; name: string; }
      export class UserService {
        getUser(id: string): User { return { id, name: 'test' }; }
      }
      export function calculateTotal(price: number, tax: number): number {
        return price + tax;
      }
    `;

    const parsed = parseFileContent(code, 'test.ts');
    expect(parsed.dependencies).toContain('node:fs');
    expect(parsed.symbols.some(s => s.name === 'User' && s.kind === 'interface')).toBe(true);
    expect(parsed.symbols.some(s => s.name === 'UserService' && s.kind === 'class')).toBe(true);
    expect(parsed.symbols.some(s => s.name === 'calculateTotal' && s.kind === 'function')).toBe(true);
  });

  it('should parse CommonJS exports and require calls correctly', () => {
    const code = `
      const bcrypt = require('bcrypt');
      const { Router } = require('express');

      function login(req, res) {}
      function register(req, res) {}

      module.exports = {
        login,
        register
      };
    `;

    const parsed = parseFileContent(code, 'auth.js');
    expect(parsed.dependencies).toContain('bcrypt');
    expect(parsed.dependencies).toContain('express');
    expect(parsed.symbols.some(s => s.name === 'login')).toBe(true);
    expect(parsed.symbols.some(s => s.name === 'register')).toBe(true);
  });

  it('should parse Python classes, functions, and imports', () => {
    const code = `
      import os
      from typing import List

      class OrderManager:
          def process(self, order_id: str) -> bool:
              return True

      def calculate_vat(amount: float) -> float:
          return amount * 0.2
    `;

    const parsed = parseFileContent(code, 'app.py');
    expect(parsed.dependencies).toContain('os');
    expect(parsed.dependencies).toContain('typing');
    expect(parsed.symbols.some(s => s.name === 'OrderManager' && s.kind === 'class')).toBe(true);
    expect(parsed.symbols.some(s => s.name === 'calculate_vat' && s.kind === 'function')).toBe(true);
  });

  it('should parse Go structs, interfaces, and functions', () => {
    const code = `
      package main
      import (
        "fmt"
        "net/http"
      )
      type Server struct {
        port int
      }
      func (s *Server) Start() error {
        return nil
      }
      func HandleRequest(w http.ResponseWriter, r *http.Request) {
      }
    `;

    const parsed = parseFileContent(code, 'main.go');
    expect(parsed.dependencies).toContain('fmt');
    expect(parsed.dependencies).toContain('net/http');
    expect(parsed.symbols.some(s => s.name === 'Server' && s.kind === 'struct')).toBe(true);
    expect(parsed.symbols.some(s => s.name === 'Start' && s.kind === 'method')).toBe(true);
    expect(parsed.symbols.some(s => s.name === 'HandleRequest' && s.kind === 'function')).toBe(true);
  });

  it('should parse Java classes, interfaces, and methods', () => {
    const code = `
      package com.example.service;
      import java.util.List;
      import org.springframework.stereotype.Service;

      public interface PaymentGateway {
        boolean processPayment(double amount);
      }

      public class OrderService {
        public void cancelOrder(String id) {}
      }
    `;

    const parsed = parseFileContent(code, 'OrderService.java');
    expect(parsed.dependencies).toContain('java.util.List');
    expect(parsed.dependencies).toContain('org.springframework.stereotype.Service');
    expect(parsed.symbols.some(s => s.name === 'PaymentGateway' && s.kind === 'interface')).toBe(true);
    expect(parsed.symbols.some(s => s.name === 'OrderService' && s.kind === 'class')).toBe(true);
  });

  it('should pinpoint target files with focus query and rank properly', () => {
    const files = [
      {
        path: 'src/services/discount.service.ts',
        extension: '.ts',
        layer: 'service' as const,
        lineCount: 100,
        byteSize: 2000,
        estimatedTokens: 500,
        symbols: [{ name: 'calculateCoupon', kind: 'function' as const, signature: 'calculateCoupon()', isExported: true }],
        dependencies: []
      },
      {
        path: 'src/controllers/auth.controller.ts',
        extension: '.ts',
        layer: 'api' as const,
        lineCount: 50,
        byteSize: 1000,
        estimatedTokens: 250,
        symbols: [{ name: 'login', kind: 'function' as const, signature: 'login()', isExported: true }],
        dependencies: []
      }
    ];

    const matches = filterByFocus(files, 'coupon discount calculation');
    expect(matches.length).toBe(1);
    expect(matches[0].file.path).toBe('src/services/discount.service.ts');
    expect(matches[0].matchedTerms).toContain('discount');
    expect(matches[0].matchedTerms).toContain('coupon');
  });

  it('should generate complete AtlasMap with markdown and token reduction', () => {
    const { map, output } = generateAtlas({ cwd: process.cwd() });
    expect(map.totalFiles).toBeGreaterThan(0);
    expect(map.originalTokens).toBeGreaterThan(map.mapTokens);
    expect(map.compressionRatio).toBeGreaterThan(0.7); // At least 70% compression
    expect(output).toContain('# 🧭 Code Atlas: Architectural Map for AI Agents');
    expect(output).toContain('token reduction');
  });

  it('should support compact mode rendering', () => {
    const { output } = generateAtlas({ cwd: process.cwd(), compact: true });
    expect(output).toContain('Mode: Compact High-Density');
    expect(output).toMatch(/\(\d+L\)/); // compact line notation like (80L)
  });

  it('should support Mermaid architectural flowchart rendering', () => {
    const { output } = generateAtlas({ cwd: process.cwd(), diagram: true });
    expect(output).toContain('## 📊 Architecture Flowchart');
    expect(output).toContain('```mermaid');
    expect(output).toContain('graph TD');
  });

  it('should respect token budget cap', () => {
    const { output } = generateAtlas({ cwd: process.cwd(), budget: 200 });
    expect(output).toContain('Budget Cap: ~200 tokens');
    expect(output).toContain('omitted to respect token budget');
  });

  it('should handle empty or malformed files gracefully without throwing', () => {
    expect(() => parseFileContent('', 'empty.ts')).not.toThrow();
    expect(() => parseFileContent('const a = ;;; invalid syntax', 'broken.ts')).not.toThrow();
    expect(() => parseFileContent('', 'empty.py')).not.toThrow();
    expect(() => parseFileContent('', 'empty.go')).not.toThrow();
  });
});
