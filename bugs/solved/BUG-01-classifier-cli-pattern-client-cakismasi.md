# BUG-01: `classifier.ts` — `/cli` pattern'i `/client/` klasörlerini de yakalıyor

## Kritiklik: YÜKSEK

## Dosya
`src/classifier.ts` satır 36

## Mevcut Kod

```typescript
if (
    normalized.includes('/controllers/') ||
    normalized.includes('/controller/') ||
    normalized.includes('/routes/') ||
    normalized.includes('/route/') ||
    normalized.includes('/handlers/') ||
    normalized.includes('/handler/') ||
    normalized.includes('/endpoints/') ||
    normalized.includes('/endpoint/') ||
    normalized.includes('/api/') ||
    normalized.includes('/cli') ||          // ← BUG: /client/ içinde de eşleşir!
    normalized.includes('/resolvers/') ||
    normalized.includes('/resolver/') ||
    // ...
) {
    return 'api';
}
```

## Bug Açıklaması

`normalized.includes('/cli')` kontrolü, `/client/`, `/clients/`, `/client-side/` gibi klasörleri de API layer'ına atar. `client` kelimesi `/cli` içerdiği için false positive oluşur.

## Etki

- Frontend client kodları API layer'ına yanlışlıkla atanır.
- Atlas map yanlış mimari gösterimi yapar.
- Agent'lar yanlış dosyalara odaklanır.

## Beklenen Davranış

Daha spesifik pattern kullanılmalı:

```typescript
normalized.includes('/cli/') ||
normalized.endsWith('/cli') ||
basename === 'cli.ts' ||
basename === 'cli.js' ||
```

## Test Senaryosu

1. Proje yapısı: `src/client/api/client.ts`
2. `code-atlas` çalıştır
3. **Beklenen:** `client.ts` → `service` veya `util` layer'ında
4. **Mevcut davranış:** `client.ts` → `api` layer'ında (yanlış)
