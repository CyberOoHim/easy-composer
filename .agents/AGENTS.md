# Project Guidelines

- **Development Workflow**: Use `npm run dev` (or `bun run dev`) instead of `npm run build` when possible for faster iteration and live Hot Module Replacement (HMR).
- **Fast Pre-Commit Verification**: Use `bun run lint && bun run typecheck` for pre-commit verification. Do NOT run full `bun run build` before routine commits unless specifically testing build packaging or static export, as full Next.js builds are resource-intensive on low-resource environments.
- **Static Export & API Routes**: GitHub Actions builds with `STATIC_EXPORT=true` (`output: 'export'`). Pure client-side SPA score editor with zero backend API dependencies to ensure static export build compatibility.
