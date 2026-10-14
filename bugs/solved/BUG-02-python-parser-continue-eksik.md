# BUG-02: `python-parser.ts` — Import sonrası `continue` eksik, symbol çakışması

## Kritiklik: YÜKSEK

## Dosya
`src/parsers/python-parser.ts` satır 22-26

## Mevcut Kod

```typescript
// Imports
const importMatch = line.match(/^(?:from\s+([a-zA-Z0-9_.]+)\s+import|import\s+([a-zA-Z0-9_.]+))/);
if (importMatch) {
    dependencies.add(importMatch[1] || importMatch[2]);
    continue;  // ← Bu satır var
}

// Top-level / Class Def
const classMatch = line.match(/^class\s+([a-zA-Z0-9_]+)(?:\((.*?)\))?:/);
if (classMatch) {
    // ...
    continue;  // ← Bu satır var
}

// Function def
const funcMatch = line.match(/^(?:async\s+)?def\s+([a-zA-Z0-9_]+)\s*\((.*?)\)(?:\s*->\s*([^:]+))?:/);
if (funcMatch) {
    // ...
    // ← continue YOK!
}
```

## Bug Açıklaması

`funcMatch` bloğunda `continue` ifadesi yok. Bu şu soruna yol açar:

- Eğer bir satır `import` ile başlıyorsa ve aynı zamanda `def` içeriyorsa (örn. `import os; def foo():`), iki bloğu da tetikler.
- Daha önemlisi, `import` satırından sonra `continue` olmadığı için aynı satır `class` veya `func` pattern'ine karşı da test edilir.

Asıl sorun: `importMatch` bloğunda `continue` var ama `funcMatch` bloğunda yok. Bu tutarsızlık, import satırlarının yanlışlıkla symbol olarak eklenmesine neden olabilir.

## Etki

- Python dosyalarında yanlış symbol çıkarımı.
- Import satırları symbol listesine eklenebilir.
- Atlas map yanlış dependency gösterimi yapar.

## Beklenen Davranış

Tüm bloklarda `continue` tutarlı olmalı:

```typescript
if (funcMatch) {
    // ...
    continue;  // ← Eklenecek
}
```

## Test Senaryosu

1. Python dosyası: `import os\ndef foo():\n    pass`
2. `code-atlas` çalıştır
3. **Beklenen:** Sadece `foo` fonksiyonu symbol olarak gösterilmeli
4. **Mevcut davranış:** `import` satırı da symbol olarak gösterilebilir
