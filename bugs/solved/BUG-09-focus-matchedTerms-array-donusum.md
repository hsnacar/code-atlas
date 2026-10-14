# BUG-09: `focus.ts` — `matchedTerms` Set'ten array'e dönüşüm sorunu

## Kritiklik: DÜŞÜK

## Dosya
`src/focus.ts` satır 57-64

## Mevcut Kod

```typescript
if (score > 0) {
    matches.push({
        file,
        score,
        matchedTerms: Array.from(matchedTerms),  // ← Set'ten array'e dönüşüm
        reasons: Array.from(new Set(reasons)).slice(0, 3)
    });
}
```

## Bug Açıklaması

`matchedTerms` değişkeni `Set<string>` olarak tanımlanmış:

```typescript
const matchedTerms = new Set<string>();
```

`Array.from(matchedTerms)` kullanımı doğru ama, `matchedTerms` her dosya için sıfırlanmıyor! Bu, önceki dosyanın matched terms'lerinin sonraki dosyaya taşmasına neden olur.

## Etki

- Yanlış matched terms gösterimi.
- Agent'lar yanlış dosyalara yönlendirilebilir.

## Beklenen Davranış

`matchedTerms` her dosya için sıfırlanmalı:

```typescript
for (const file of files) {
    let score = 0;
    const matchedTerms = new Set<string>();  // ← İçeride tanımlanmalı
    const reasons: string[] = [];
    // ...
}
```

## Test Senaryosu

1. İki dosya: `auth.ts` (içerir: "login") ve `user.ts` (içermez: "login")
2. `--focus "login"` ile `code-atlas` çalıştır
3. **Beklenen:** Sadece `auth.ts` matched terms içermeli
4. **Mevcut davranış:** `user.ts` da matched terms içerebilir
