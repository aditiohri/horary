# Claude Code Agent Guidelines

## PR Workflow

Claude Code agents are authorized to create branches, open PRs, self-review, and merge into `main`. Follow this workflow for every change.

### 1. Branch naming

Always work on a dedicated branch — never commit directly to `main`.

```
claude/<short-description>
```

Examples: `claude/fix-aspect-display`, `claude/add-openai-fallback`

```bash
git checkout -b claude/<short-description>
git push -u origin claude/<short-description>
```

### 2. Make changes and commit

Write clear, atomic commits:

```bash
git add <specific files>
git commit -m "brief description of what and why"
```

### 3. Open a PR

```bash
gh pr create \
  --base main \
  --title "<concise title>" \
  --body "$(cat <<'EOF'
## Summary
- bullet points describing what changed and why

## Test plan
- [ ] Tests pass (`npm run test:run`)
- [ ] TypeScript compiles (`npm run build`)
- [ ] Manual verification steps if applicable
EOF
)"
```

### 4. Wait for CI

The `ci` workflow runs `npm run test:run` and `npm run build` on every PR. Do not merge until it passes.

```bash
gh pr checks --watch
```

### 5. Review and merge

Once CI is green, agents may self-approve and merge:

```bash
gh pr review --approve
gh pr merge --squash --delete-branch
```

Use `--squash` to keep `main` history clean.

---

## Project overview

- **Stack:** Vue 3 + TypeScript + Vite, tested with Vitest, deployed on Netlify
- **Tests:** `npm run test:run` (single run) or `npm test` (watch)
- **Build:** `npm run build` (type-check + bundle)
- **Functions:** Netlify serverless functions in `netlify/functions/`
- **Env vars:** See `.env.example` — local dev needs `GROQ_FREE_TIER_KEY`

## Code conventions

- Keep components small and focused
- Prefer editing existing files over creating new ones
- No gratuitous comments or docs on code you didn't change
- No backwards-compat shims for removed code — delete it cleanly
- Security: never expose API keys client-side; all LLM calls go through `netlify/functions/llm-proxy.ts`
