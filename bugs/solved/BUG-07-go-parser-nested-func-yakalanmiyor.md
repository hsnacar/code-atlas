# BUG-07: `go-parser.ts` — Nested fonksiyonlar ve struct methodları yakalanmıyor

## Kritiklik: DÜŞÜK

## Dosya
`src/parsers/go-parser.ts` satır 52-81

## Mevcut Kod

```typescript
// Func or Method
// Method: func (r *Receiver) MethodName(params) returns
const methodMatch = line.match(/^func\s+\((?:[^)]+)\)\s+([A-Za-z0-9_]+)\s*\((.*?)\)(?:\s*(.*))?$/);
if (methodMatch) {
    // ...
    continue;
}

// Plain func: func FuncName(params) returns
const funcMatch = line.match(/^func\s+([A-Za-z0-9_]+)\s*\((.*?)\)(?:\s*(.*))?$/);
if (funcMatch) {
    // ...
}
```

## Bug Açıklaması

Go parser sadece **top-level** fonksiyonları ve methodları yakalar. Şu durumlar desteklenmiyor:

1. **Nested fonksiyonlar** — Fonksiyon içinde tanımlanan fonksiyonlar yakalanmaz.
2. **Function literals** — `func() { ... }` şeklinde anonim fonksiyonlar yakalanmaz.
3. **Method receivers with generics** — `func (r *Receiver[T]) MethodName()` yakalanmaz.

Ayrıca, `methodMatch` regex'i `func (r *Receiver) MethodName` pattern'ini yakalıyor ama `continue` ifadesi yok. Bu, aynı satırın `funcMatch` tarafından da işlenmesine neden olabilir.

## Etki

- Go projelerinde eksik symbol listesi.
- Agent'lar nested fonksiyonları göremez.
- Atlas map yanlış dependency gösterimi yapar.

## Beklenen Davranış

1. `methodMatch` bloğuna `continue` eklenmeli.
2. Nested fonksiyonlar için ayrı bir regex eklenmeli.

## Test Senaryosu

1. Go dosyası:
```go
package main

func outer() {
    inner := func() {
        // nested func
    }
}
```
2. `code-atlas` çalıştır
3. **Beklenen:** `outer` ve `inner` fonksiyonları gösterilmeli
4. **Mevcut davranış:** Sadece `outer` gösterilir
