# Portal POS — E2E Test Automation

Enterprise-grade [Playwright](https://playwright.dev) framework for end-to-end and API testing of the **Portal POS** web app. Built on the Page Object Model with merged fixtures, a typed API client layer, multi-environment config, and rich reporting (HTML + JUnit + Allure).

> Structure modeled on the `volt-pos-playwright` framework, adapted for a web portal (login + storageState session reuse).

## Requirements

- Node.js `>=18` (see `.nvmrc`)
- A running Portal POS instance reachable at `BASE_URL`

## Setup

```bash
npm install            # installs deps + Playwright Chromium (postinstall)
cp configs/env/.env.example configs/env/.env.local
# edit configs/env/.env.local — set BASE_URL, ADMIN_USERNAME, ADMIN_PASSWORD
```

## Running tests

```bash
npm test                 # all tests, ENV=local
npm run test:smoke       # only @smoke
npm run test:regression  # only @regression
npm run test:e2e         # tests/e2e
npm run test:api         # api project (no browser)
npm run test:headed      # headed browser
npm run test:ui          # Playwright UI mode
npm run test:debug       # PWDEBUG inspector

npm run test:stage       # ENV=stage
npm run test:prod        # ENV=prod
```

## Reports

```bash
npm run report           # open the HTML report
npm run report:allure    # generate + open Allure report
```

## Project structure

```
e2e_portal_pos/
├─ configs/
│  ├─ constants/timeouts.ts      # shared timeout constants
│  └─ env/                       # loadEnv.ts + .env.<env> files
├─ scripts/
│  └─ check-server.mjs           # pretest reachability check
├─ src/
│  ├─ api/                       # API layer
│  │  ├─ clients/                # BaseApiClient (REST wrapper)
│  │  ├─ models/                 # response/DTO types
│  │  └─ services/               # per-domain API services
│  ├─ components/                # reusable UI components (modal, table, sidebar)
│  ├─ constants/                 # urls, error messages
│  ├─ data/
│  │  ├─ static/                 # fixed test data (users, …)
│  │  └─ dynamic/                # generated data + auth/ storageState (gitignored)
│  ├─ fixtures/                  # Playwright fixtures (pages, api) merged in index.ts
│  ├─ helpers/                   # cross-page flows (e.g. loginAs)
│  ├─ pages/                     # Page Objects (BasePage + auth/, dashboard/, …)
│  ├─ types/                     # testTags, global.d.ts
│  └─ utils/                     # logger, date/string helpers
├─ tests/
│  ├─ global.setup.ts            # logs in once → STORAGE_STATE
│  ├─ e2e/                       # UI journeys by feature
│  ├─ api/                       # API tests
│  ├─ smoke/  regression/  visual/
│  └─ README.md
├─ playwright.config.ts          # projects: setup → chromium, api
├─ tsconfig.json                 # path aliases (@pages, @fixtures, …)
└─ package.json
```

## Path aliases

Import via aliases instead of long relative paths (configured in `tsconfig.json`):

```ts
import { test, expect } from '@fixtures/index';
import { LoginPage } from '@pages/auth/LoginPage';
import { Urls } from '@constants/urls';
import { USERS } from '@data/static/users';
```

## Test data factories

Dynamic data is generated with [`@faker-js/faker`](https://fakerjs.dev) under
`src/data/dynamic/factories`. Each entity exposes a `Create*Input` builder, a
full-entity builder, and array builders — all accepting overrides:

```ts
import { buildCustomerInput, buildOrder, buildProducts } from '@data/dynamic/factories';

const input = buildCustomerInput({ email: 'qa.fixed@example.com' }); // for API/UI creation
const products = buildProducts(5);
const order = buildOrder({ products, status: 'paid' });             // full entity for mocks
```

Set `FAKER_SEED=<number>` in the env to make generated data reproducible across runs.

## Conventions

- **Page Objects** hold all selectors and page logic; specs read like user stories.
- **Fixtures** (`@fixtures/index`) inject page objects and API services into tests.
- **Tags** from `@/types/testTags` drive `--grep` filtering (`@smoke`, `@regression`, …).
- **Auth**: `global.setup.ts` saves a logged-in session; UI specs reuse it via the
  project `storageState`. Auth specs opt out with an empty storageState.
- **Env**: never commit real `.env.*` files — only `.env.example` is tracked.

## Adapting the scaffold

The selectors in `LoginPage`, `DashboardPage`, and the `Sidebar`/`DataTable` components
are sensible defaults (`getByLabel`, `getByRole`) — point them at the real Portal POS DOM.
Add new pages under `src/pages/<feature>/`, register them in `pages.fixture.ts`, and add
their routes to `src/constants/urls.ts`.
