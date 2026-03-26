# Smoke Plan (v1 scaffold)

1. Validate manifest shape.
2. Load plugin in isolated test config.
3. Run `openclaw memory status`.
4. Run `openclaw memory search "hello"`.
5. Simulate backend down and verify fallback output.
6. Run intent/rerank verification script:
   - `npm run verify:intent-rerank`
