# BUG-08: `scanner.ts` — `maxFiles` sınırı `break` yerine `return` kullanıyor

## Kritiklik: DÜŞÜK

## Dosya
`src/scanner.ts` satır 97-98

## Mevcut Kod

```typescript
function traverse(currentDir: string): void {
    if (collectedFiles.length >= maxFiles) return;  // ← return kullanılmış

    let entries: fs.Dirent[];
    try {
        entries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch {
        return;
    }

    for (const entry of entries) {
        if (collectedFiles.length >= maxFiles) break;  // ← break kullanılmış
        // ...
    }
}
```

## Bug Açıklaması

`traverse` fonksiyonunun başında `return` kullanılmış ama `for` döngüsünde `break`. Bu tutarsızlık şu soruna yol açar:

- Eğer `maxFiles` sınırı aşılırsa, `traverse` fonksiyonu tamamen durur (`return`).
- Ama `for` döngüsü sadece mevcut klasördeki işlemi durdurur (`break`).
- Bu, bazı klasörlerin tamamen atlanmasına neden olabilir.

## Etki

- `--max-files 100` verildiğinde, bazı klasörler tamamen taranmayabilir.
- Tutarsız dosya tarama sonuçları.

## Beklenen Davranış

İki yerde de `break` kullanılmalı veya `traverse` fonksiyonu farklı bir yapıda olmalı:

```typescript
function traverse(currentDir: string): void {
    if (collectedFiles.length >= maxFiles) return;

    // ...

    for (const entry of entries) {
        if (collectedFiles.length >= maxFiles) return;  // ← return kullanılmalı
        // ...
    }
}
```

## Test Senaryosu

1. `--max-files 10` ile `code-atlas` çalıştır
2. **Beklenen:** Tam 10 dosya taranmalı
3. **Mevcut davranış:** 10 dosya sonra tamamen durur, bazı klasörler atlanır
