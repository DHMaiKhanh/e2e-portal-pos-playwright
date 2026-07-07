# Contributing

## Branching

- `main` — stable. `develop` — integration. Feature branches: `feature/<short-desc>`.
- Open PRs into `develop`; CI (lint + typecheck + Playwright) must pass.

## Before you commit

Git hooks (Husky) run automatically:

- **pre-commit** → `lint-staged` (eslint --fix + prettier on staged files)
- **pre-push** → `npm run typecheck`

Run them manually anytime:

```bash
npm run lint
npm run format
npm run typecheck
```

## Adding a new screen

1. Add the route to `src/constants/urls.ts`.
2. Create the Page Object under `src/pages/<feature>/<Name>Page.ts` extending `BasePage`.
3. Register it in `src/fixtures/pages.fixture.ts` (and export from `src/pages/index.ts`).
4. Add specs under `tests/e2e/<feature>/` importing `{ test, expect } from '@fixtures/index'`.
5. Tag the suite with values from `@/types/testTags`.

## Adding an API endpoint

1. Add/extend the model in `src/api/models/`.
2. Add a method to the relevant service in `src/api/services/` (or create a new one).
3. Register the service in `src/fixtures/api.fixture.ts`.

## Conventions

- Selectors live in Page Objects, never in specs. Prefer role/label/test-id locators.
- No hard `waitForTimeout`; wait on locators/URLs/network instead.
- Keep specs deterministic and independent so they can run in parallel.
- Never commit real `.env.*` files or secrets.
