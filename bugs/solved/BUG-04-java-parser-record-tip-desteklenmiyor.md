# BUG-04: `java-parser.ts` — `record` tipi desteklenmiyor

## Kritiklik: ORTA

## Dosya
`src/parsers/java-parser.ts` satır 20-31

## Mevcut Cod

```typescript
// Class / Record / Interface / Enum
const typeMatch = line.match(/(?:public|protected)?\s*(?:final|abstract|sealed)?\s*(class|record|interface|enum)\s+([A-Za-z0-9_]+)(?:<[^>]+>)?(?:\s+(?:extends|implements)\s+[^{]+)?/);
if (typeMatch) {
    const kind = typeMatch[1] as 'class' | 'interface' | 'enum';  // ← 'record' yok!
    const name = typeMatch[2];
    symbols.push({
        name,
        kind,  // ← 'record' tipi kind olarak eklenmiyor
        signature: `${typeMatch[1]} ${name}`,
        isExported: line.includes('public')
    });
    continue;
}
```

## Bug Açıklaması

Regex `record` tipini yakalıyor ama `kind` tipi `'class' | 'interface' | 'enum'` olarak sınırlı. `record` tipi `kind` değişkenine `'class'` olarak atanır (çünkü type assertion yapıyor).

Ayrıca `SymbolSignature` tipinde `kind` alanı şu şekilde tanımlı:

```typescript
kind: 'class' | 'interface' | 'function' | 'method' | 'type' | 'struct' | 'enum' | 'const';
```

`'record'` değeri bu union'da yok!

## Etki

- Java 16+ record'ları yanlış gösterilir.
- `signature` alanında `record Foo` yazıyor ama `kind` olarak `class` gösteriliyor.
- Agent'lar record'ları class'la karıştırabilir.

## Beklenen Davranış

1. `SymbolSignature` tipine `'record'` eklenmeli.
2. `kind` doğru şekilde `'record'` olarak atanmalı.

```typescript
kind: 'class' | 'interface' | 'function' | 'method' | 'type' | 'struct' | 'enum' | 'const' | 'record';
```

## Test Senaryosu

1. Java dosyası: `public record UserDTO(String name, int age) {}`
2. `code-atlas` çalıştır
3. **Beklenen:** `kind: 'record'`, `signature: 'record UserDTO'`
4. **Mevcut davranış:** `kind: 'class'`, `signature: 'record UserDTO'` (tutarsız)
