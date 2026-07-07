/**
 * Pre-test check: verify the Portal POS app is reachable at the configured
 * BASE_URL. Wired to the `pretest` npm hook so `npm test` fails fast with a
 * helpful message if the app hasn't been started yet.
 */
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

try {
  const res = await fetch(BASE_URL, { signal: AbortSignal.timeout(3000) });
  if (res.ok || res.status === 401 || res.status === 302) {
    console.log(`\x1b[32m✓ Portal POS app is reachable at ${BASE_URL}\x1b[0m`);
  } else {
    console.error(`\x1b[31m✗ Portal POS app returned ${res.status} at ${BASE_URL}\x1b[0m`);
    process.exit(1);
  }
} catch {
  console.error(`\x1b[31m✗ Portal POS app is not reachable at ${BASE_URL}\x1b[0m`);
  console.error(`\nStart the app first, or set BASE_URL to point at a running instance.`);
  process.exit(1);
}
