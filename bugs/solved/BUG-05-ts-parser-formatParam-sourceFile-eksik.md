# BUG-05: `ts-parser.ts` — `formatParam` çağrılarında `sourceFile` parametresi eksik

## Kritiklik: DÜŞÜK

## Dosya
`src/parsers/ts-parser.ts` satır 223-232

## Mevcut Kod

```typescript
function formatParam(p: ts.ParameterDeclaration, sourceFile?: ts.SourceFile): string {
  try {
    const name = p.name ? (sourceFile ? p.name.getText(sourceFile) : p.name.getText()) : '_';
    const type = p.type ? `: ${sourceFile ? p.type.getText(sourceFile) : p.type.getText()}` : '';
    const optional = p.questionToken ? '?' : '';
    return `${name}${optional}${type}`;
  } catch {
    return '_';
  }
}
```

Çağrı yerleri:
```typescript
// Satır 92
const params = node.parameters.map(p => formatParam(p)).join(', ');

// Satır 112
const params = member.parameters.map(p => formatParam(p)).join(', ');

// Satır 116
const params = member.parameters.map(p => formatParam(p)).join(', ');

// Satır 188
const params = decl.initializer.parameters.map(p => formatParam(p)).join(', ');
```

## Bug Açıklaması

`formatParam` fonksiyonu `sourceFile` parametresi alıyor ama hiçbir çağrı yerinde bu parametre geçilmiyor. Bu şu anlama gelir:

- `p.name.getText(sourceFile)` yerine `p.name.getText()` çağrısı yapılır.
- `sourceFile` parametresi her zaman `undefined` olur.
- Bu, bazı TypeScript sürümlerinde veya özel durumlarda yanlış metin çıkarma yapabilir.

## Etki

- Parametre isimleri ve tipleri yanlış gösterilebilir.
- Özellikle generic tiplerde veya nested fonksiyonlarda sorun çıkarabilir.

## Beklenen Davranış

Çağrı yerlerinde `sourceFile` parametresi geçilmeli:

```typescript
const params = node.parameters.map(p => formatParam(p, sourceFile)).join(', ');
```

## Test Senaryosu

1. TypeScript dosyası: `function foo<T>(bar: T): void {}`
2. `code-atlas` çalıştır
3. **Beklenen:** `foo<T>(bar: T): void`
4. **Mevcut davranış:** Parametre tipi yanlış gösterilebilir
