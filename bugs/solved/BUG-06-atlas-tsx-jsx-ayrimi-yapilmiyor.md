# BUG-06: `atlas.ts` — `.tsx` ve `.jsx` uzantıları primary language tespitinde ayrılmıyor

## Kritiklik: DÜŞÜK

## Dosya
`src/atlas.ts` satır 76-86

## Mevcut Kod

```typescript
// Detect primary language
let topLang = 'TypeScript / JavaScript';
let maxCount = 0;
for (const [ext, count] of Object.entries(langCount)) {
    if (count > maxCount) {
        maxCount = count;
        if (ext === '.go') topLang = 'Go';
        else if (ext === '.py') topLang = 'Python';
        else if (ext === '.java') topLang = 'Java';
        else if (ext === '.rs') topLang = 'Rust';
        else if (ext === '.ts' || ext === '.tsx') topLang = 'TypeScript';
        else if (ext === '.js' || ext === '.jsx') topLang = 'JavaScript';
    }
}
```

## Bug Açıklaması

Bu kod aslında `.tsx` ve `.jsx` uzantılarını doğru şekilde yakalıyor. Ancak `langCount` objesi `path.extname()` kullanıyor ve bu fonksiyon `.tsx` ve `.jsx` için doğru uzantıyı döndürür.

Gerçek sorun: Eğer bir projede sadece `.tsx` dosyaları varsa (React projesi), `topLang` olarak `TypeScript` gösterilir ama proje aslında React/JSX projesidir. Bu, agent'ların yanlış yönlendirilmesine neden olabilir.

## Etki

- React projeleri `TypeScript` olarak gösterilir, `React` veya `JSX` olarak değil.
- Agent'lar React bileşenlerini anlamak için ekstra çaba harcar.

## Beklenen Davranış

`.tsx` ve `.jsx` için ayrı bir kontrol eklenmeli:

```typescript
else if (ext === '.tsx') topLang = 'React (TSX)';
else if (ext === '.jsx') topLang = 'React (JSX)';
```

## Test Senaryosu

1. Proje: Sadece `.tsx` dosyaları içeren React projesi
2. `code-atlas` çalıştır
3. **Beklenen:** `Primary Stack: React (TSX)`
4. **Mevcut davranış:** `Primary Stack: TypeScript`
