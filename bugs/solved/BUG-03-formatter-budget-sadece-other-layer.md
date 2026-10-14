# BUG-03: `formatter.ts` — Budget kontrolü sadece `other` layer'ında yapılıyor

## Kritiklik: ORTA

## Dosya
`src/formatter.ts` satır 139

## Mevcut Kod

```typescript
for (const layer of layerOrder) {
    const files = map.layers[layer];
    if (!files || files.length === 0) continue;

    // ...

    for (const file of files) {
        if (opts.budget && currentEstimatedTokens >= opts.budget) {
            const remaining = files.length - fileIndex;
            lines.push(`- ... *(+${remaining} more files in this layer omitted to respect token budget)*`);
            budgetReached = true;
            break;
        }
        // ...
    }

    lines.push('');

    if (opts.budget && budgetReached && layer === 'other') {  // ← BUG: Sadece 'other'da kontrol
        break;
    }
}
```

## Bug Açıklaması

`budgetReached` kontrolü sadece `layer === 'other'` durumunda yapılıyor. Bu şu anlama gelir:

- Eğer `api`, `service`, `data`, `config`, `util` veya `test` layer'ında budget dolarsa, döngü devam eder.
- Sonraki layer'lar tamamen render edilir.
- Budget aşımı olur.

## Etki

- `--budget 8000` verildiğinde çok daha fazla token üretilir.
- Agent'lar büyük map dosyalarıyla karşılaşır.
- Token bütçesi aşılır.

## Beklenen Davranış

```typescript
if (opts.budget && budgetReached) {
    break;  // Tüm layer'larda kontrol
}
```

## Test Senaryosu

1. `--budget 1000` ile `code-atlas` çalıştır
2. **Beklenen:** Toplam output ~1000 token olmalı
3. **Mevcut davranış:** `other` layer'ına kadar tüm layer'lar render edilir, budget aşılır
