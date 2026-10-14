# BUG-10: `classifier.ts` — `index.ts` hem API hem data layer'ına atanıyor

## Kritiklik: ORTA

## Dosya
`src/classifier.ts` satır 46-47 ve 93

## Mevcut Kod

```typescript
// API layer kontrolü (satır 46-47)
basename === 'index.ts' ||
basename === 'index.js' ||

// Data layer kontrolü (satır 93)
basename === 'types.ts' ||
```

## Bug Açıklaması

`index.ts` ve `index.js` dosyaları API layer'ına atanıyor. Ama `types.ts` data layer'ına atanıyor. Bu tutarsızlık şu soruna yol açar:

- `src/types.ts` → `data` layer'ı
- `src/index.ts` → `api` layer'ı
- Ama `src/index.ts` genellikle sadece re-export yapan bir dosya, API entrypoint değil!

## Etki

- `index.ts` dosyaları yanlışlıkla API layer'ına atanır.
- Agent'lar `index.ts` dosyalarını API entrypoint olarak görebilir.
- Atlas map yanlış mimari gösterimi yapar.

## Beklenen Davranış

`index.ts` ve `index.js` için daha spesifik kontrol eklenmeli:

```typescript
// Sadece gerçek API entrypoint'ler
basename === 'index.ts' && normalized.includes('/api/') ||
basename === 'index.js' && normalized.includes('/api/') ||
```

Veya `index.ts` hiçbir layer'a atanmamalı, `other` layer'ına atamalı.

## Test Senaryosu

1. Proje yapısı: `src/index.ts` (sadece re-export yapan dosya)
2. `code-atlas` çalıştır
3. **Beklenen:** `src/index.ts` → `other` layer'ı
4. **Mevcut davranış:** `src/index.ts` → `api` layer'ı
