---
paths:
  - "src/**/ui/**"
  - "src/shared/ui/**"
  - "src/app/**"
---

# TV UI rules

- The design (1920×1080) is the source of truth. Use `scale(px)` from `shared/ui` and copy design pixel values 1:1.
- Colors, radii, and fonts come from `shared/ui/tokens.ts` only. No hard-coded hex values in components.
- Every interactive element uses the shared focus primitives (`FocusButton`, `FocusCard`) and has a visible focus state: 3 px lime border, scale 1.05; primary buttons fill lime.
- Disabled actions stay focusable with the grey style and do nothing on press, so focus never jumps unexpectedly.
- Each screen declares its initial focus and Back key behavior explicitly (see `docs/ARCHITECTURE.md`).
- Never show error codes or technical details to users. Map errors to the defined UI variants.
- Copy lives in the module's `content.ts`.
- Performance on a 1 GB stick: memoize list items, avoid inline object/array props in hot paths, animate with `useNativeDriver: true`, throttle live values during tests.
- No ads, IAP, or Pro UI in v1.
