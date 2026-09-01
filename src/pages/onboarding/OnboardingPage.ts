import { type Locator, type Page, expect } from '@playwright/test';
import { BasePage } from '@pages/BasePage';
import { Sidebar } from '@components/sidebar/Sidebar';
import { Urls } from '@constants/urls';
import { Timeouts } from '@configs/constants/timeouts';

/**
 * The seven wizard steps, in order, as `step` values on the URL.
 *
 * The bundle validates `step` with a zod enum of exactly these values and
 * defaults to `validate`; anything else falls into the app's error boundary
 * (see {@link OnboardingPage.errorBoundaryTitle}).
 */
export const OnboardingStep = {
  VALIDATE: 'validate',
  MERCHANT_INFO: 'merchant-info',
  WORK_HOURS: 'work-hours',
  PHOTOS: 'photos',
  POS_PACKAGE: 'pos-package',
  PAYMENT_TRANSACTIONS: 'payment-transactions',
  COMPLETE: 'complete',
} as const;

export type OnboardingStepValue = (typeof OnboardingStep)[keyof typeof OnboardingStep];

/** Every step slug in wizard order — index 0 is step 1. */
export const ONBOARDING_STEP_SLUGS = [
  OnboardingStep.VALIDATE,
  OnboardingStep.MERCHANT_INFO,
  OnboardingStep.WORK_HOURS,
  OnboardingStep.PHOTOS,
  OnboardingStep.POS_PACKAGE,
  OnboardingStep.PAYMENT_TRANSACTIONS,
  OnboardingStep.COMPLETE,
] as const;

/** Stepper labels as rendered, in order — asserted by the layout cases. */
export const ONBOARDING_STEP_LABELS = [
  'Validate',
  'Business Information',
  'Work Hours',
  'Photos',
  'Package',
  'Payment & Transactions',
  'Complete',
] as const;

/** The six steps the routing guard bounces back to `validate` without a `whmcsId`. */
export const GUARDED_STEP_SLUGS = ONBOARDING_STEP_SLUGS.filter(
  (slug) => slug !== OnboardingStep.VALIDATE,
);

/** Days of the week, as the Work Hours rows label them. */
export const WEEKDAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;

/** The four tender switches on step 6, with the `name` each posts under. */
export const PAYMENT_METHODS = [
  { label: 'Credit Card', name: 'card', description: 'Visa, Mastercard, Amex, Discover' },
  { label: 'Cash', name: 'cash', description: 'Physical cash accepted at the drawer' },
  { label: 'Gift Cards', name: 'gift_card', description: 'Store-issued gift cards and balances' },
  { label: 'Others', name: 'other', description: 'Checks, external terminals, house account' },
] as const;

/** Integration rows on the step-1 status panel. */
export const INTEGRATION_SYSTEMS = ['DTS', 'Business App', 'Fastboypay'] as const;

/** Badge labels the status panel can render (enumerated from the bundle). */
export const INTEGRATION_BADGES = [
  'Ready',
  'Not Ready',
  'Optional',
  'Integrated',
  'Not Integrated',
  'Failed Connect',
] as const;

/** Success toasts, per step. */
export const ONBOARDING_TOASTS = {
  MERCHANT_CREATED: 'Merchant created successfully',
  MERCHANT_UPDATED: 'Merchant updated successfully',
  WORK_HOURS: 'Work hours saved successfully',
  PHOTOS: 'Photos saved successfully',
  PACKAGE: 'POS package saved successfully',
  PAYMENT: 'Payment settings saved successfully',
} as const;

/** The exact error strings the screen can print. */
export const ONBOARDING_ERRORS = {
  /** Client-side, `role="alert"`, fired by the `^\d+$` check on submit. */
  NUMERIC: 'WHMCS ID must be numeric',
  /** Business rule — only the *form* branch runs it (see TC-ONB-169). */
  ALREADY_ONBOARDED: 'This merchant has already been onboarded. Please use a different WHMCS ID.',
  /** App error boundary, reached by a bad `step` slug or a non-numeric `whmcsId`. */
  BOUNDARY_TITLE: 'POS is unavailable right now',
} as const;

/**
 * Every description sentence an Integration Status row can render.
 *
 * Enumerated from the bundle plus the live scan (2026-08-19). The Fastboypay
 * row prints the API's own reason verbatim when it has one and falls back to
 * {@link INTEGRATION_DESCRIPTIONS.FASTBOYPAY_NO_INTEGRATION} when it does not.
 */
export const INTEGRATION_DESCRIPTIONS = {
  DTS_READY: 'Merchant has been created in the DTS system.',
  DTS_OPTIONAL: 'DTS system has not been configured yet.',
  BUSINESS_APP_READY: 'Owner merchant login has been verified.',
  BUSINESS_APP_NOT_READY: 'Owner merchant login has not been completed.',
  FASTBOYPAY_READY: 'Payment setup is ready and configured.',
  FASTBOYPAY_ID_NOT_FOUND: 'Whmcs ID not found.',
  FASTBOYPAY_MERCHANT_NOT_FOUND: 'Merchant not found.',
  FASTBOYPAY_NO_INTEGRATION:
    'No supported payment integration was found in FastboyPay. Please integrate Magensa or Bamboo before continuing.',
  FAILED_CONNECT: 'Failed to connect. Please contact support.',
  /** Magensa / Bamboo cards live in the bundle but were never seen on the DOM. */
  MAGENSA_INTEGRATED: 'Integrated in FastboyPay. Enables Windows POS (B24).',
  MAGENSA_NOT_INTEGRATED: 'Not integrated. Windows POS (B24) will be unavailable.',
  BAMBOO_INTEGRATED: 'Integrated in FastboyPay. Enables Android POS (P8).',
  BAMBOO_NOT_INTEGRATED: 'Not integrated. Android POS (P8) will be unavailable.',
} as const;

/** The two summary sentences under the system rows. */
export const INTEGRATION_SUMMARIES = {
  READY: 'Required systems are ready. You can proceed to create the merchant.',
  NOT_READY:
    'Merchant is not ready for onboarding. Please ensure all required systems are configured before proceeding.',
} as const;

/**
 * Read-only DEV merchants whose Integration Status the scan pinned down.
 *
 * Specs still declare their own `const WHMCS_ID = '3660'` for the merchant they
 * deep-link; this map exists for the status-matrix cases (TC-ONB-041…053) that
 * need a *second* id with a known badge combination. Values are DEV data and
 * can drift — assert the badge, never the merchant behind it.
 */
export const ONBOARDING_SAMPLE_IDS = {
  /** Fully onboarded, all three systems Ready — the deep-link merchant. */
  ONBOARDED: '3660',
  /** Onboarded; DTS Optional, the other two Ready. */
  DTS_OPTIONAL: '4',
  /** DTS Optional, Business App Ready, Fastboypay Ready. */
  READY_ALT: '3550',
  /** All three Ready. */
  READY_DTS: '100004',
  /** Business App Not Ready → `Create Merchant` disabled. */
  BUSINESS_APP_NOT_READY: '3412',
  /** Fastboypay answers `Merchant not found.` */
  MERCHANT_NOT_FOUND: '999999',
  /** Fastboypay answers `Whmcs ID not found.` */
  ID_NOT_FOUND: '99999999',
  /** Not onboarded — the form branch reaches the panel for this one. */
  NOT_ONBOARDED: '12345678',
} as const;

/** Sidebar `Internal` group: label + the href the scan recorded (TC-ONB-008). */
export const INTERNAL_NAV_LINKS = [
  { label: 'Merchants', href: '/pos/merchants' },
  { label: 'Onboarding', href: '/pos/onboarding' },
  { label: 'Packages', href: '/pos/admin/packages' },
  { label: 'All Orders', href: '/pos/admin/orders' },
  { label: 'Devices', href: '/pos/admin/devices' },
  { label: 'Monitor', href: '/pos/admin/monitor' },
  { label: 'Versions', href: '/pos/admin/versions' },
  { label: 'Settings', href: '/pos/admin/setting' },
] as const;

/**
 * Path tails of the store-scoped Operations/Management links.
 *
 * On this admin route they render as `/pos/undefined/<tail>` because the layout
 * has no store id to interpolate — the bug TC-ONB-009 reports.
 */
export const STORE_SCOPED_NAV_TAILS = [
  'overview',
  'orders',
  'batch',
  'income',
  'payroll',
  'staffs',
  'services',
  'customers',
  'setting',
] as const;

/** Product-context buttons on the far-left icon rail. */
export const PRODUCT_SWITCHER_BUTTONS = ['POS', 'Payment', 'Business', 'Gift Card'] as const;

/** Step 2 text fields: HTML id, visible label, placeholder and input type. */
export const MERCHANT_INFO_FIELDS = [
  { id: 'businessName', label: 'Business Name', placeholder: 'Enter business name', type: 'text' },
  { id: 'legalName', label: 'Legal Name', placeholder: 'Enter legal name', type: 'text' },
  { id: 'address', label: 'Address', placeholder: 'Enter address', type: 'text' },
  { id: 'city', label: 'City', placeholder: 'Enter city', type: 'text' },
  { id: 'postalCode', label: 'Zip', placeholder: 'Enter zip code', type: 'text' },
  { id: 'phoneNumber', label: 'Phone', placeholder: '(205) 555-0123', type: 'tel' },
  { id: 'email', label: 'Email', placeholder: 'email@example.com', type: 'email' },
  { id: 'website', label: 'Website URL', placeholder: 'https://example.com', type: 'url' },
] as const;

/** Step 4 upload slots: file-input id, visible label, and hint line. */
export const PHOTO_UPLOADS = [
  { id: 'storeLogoObjFid', label: 'Business logo', hint: 'PNG or JPG, max 5MB.' },
  {
    id: 'coverPhotoObjFid',
    label: 'Welcome sign image',
    hint: 'Welcome sign image for store. PNG or JPG, max 5MB.',
  },
] as const;

/** The five features every package card previews before "View all N features". */
export const PACKAGE_FEATURE_PREVIEW = [
  'Card Payment',
  'Cash Payment',
  'GiftCard Payment',
  'Other Payment',
  'Split Order',
] as const;

/** The 14 group headings inside the "View all N features" dialog. */
export const PACKAGE_FEATURE_GROUPS = [
  'Payment & Transaction Features',
  'Employee Management',
  'Services & Products',
  'Tax & Pricing Rules',
  'Promo & Reward',
  'Timekeeping',
  'Receipt',
  'Reporting',
  'Print Check',
  'Turn Suggestion',
  'Shortcuts',
  'Device Management',
  'Integration',
  'Fastboy Support',
] as const;

/** The two tip-timing choices, with the badge and processor chain each shows. */
export const TIP_TIMING_OPTIONS = [
  {
    value: 'before_payment',
    label: 'Before Payment',
    badge: 'SALE',
    description:
      'Tip is collected before the card is charged. Sent as a Sale — the tip cannot be adjusted after checkout.',
    chain: ['Order', 'Tip', 'Sale'],
  },
  {
    value: 'after_payment',
    label: 'After Payment',
    badge: 'AUTHORIZE',
    description:
      'Card is authorized for the order amount, then captured with the final tip included.',
    chain: ['Order', 'Authorize', 'Tip', 'Capture'],
  },
] as const;

/** `9:00 AM` — the label a Work Hours time trigger carries once a time is set. */
export const TIME_LABEL_PATTERN = /^\d{1,2}:\d{2}\s?(AM|PM)$/;

/** `Jul 21, 2026, 10:32 AM (UTC+7)` — the step-7 `Created` value (TC-ONB-126). */
export const COMPLETE_CREATED_PATTERN =
  /^[A-Z][a-z]{2} \d{1,2}, \d{4}, \d{1,2}:\d{2} (AM|PM) \(UTC[+-]\d+\)$/;

/** Step 6 percentage fields: HTML id + visible label, in render order. */
export const TAX_PRICING_FIELDS = [
  { id: 'taxPercentage', label: 'Tax Rate (%)' },
  { id: 'cashDiscountPercentage', label: 'Cash Discount (%)' },
  { id: 'serviceFeePercentage', label: 'Service Fee (%)' },
] as const;

/** The two `Tip type` toggles, in render order — `Percentage` starts pressed. */
export const TIP_TYPE_OPTIONS = ['Percentage', 'Fixed Amount'] as const;

export type TipTypeOption = (typeof TIP_TYPE_OPTIONS)[number];

/** `before_payment` | `after_payment` — what the tip-timing radios post. */
export type TipTimingValue = (typeof TIP_TIMING_OPTIONS)[number]['value'];

/** A bare percentage, as the Tax & Pricing fields hold it (`8.25`, `0`). */
export const PERCENT_VALUE_PATTERN = /^\d+(?:\.\d+)?$/;

/** A preset chip's label while `Percentage` mode is pressed, e.g. `20%`. */
export const TIP_PRESET_LABEL_PATTERN = /^\d+(?:\.\d+)?%$/;

/** An element whose entire text is one integration status word. */
export const INTEGRATION_BADGE_PATTERN = new RegExp(
  `^(${INTEGRATION_BADGES.map(escapeRegExp).join('|')})$`,
);

/**
 * Step 7's merchant-scoped action links: visible label + the path tail each
 * points at, i.e. `/pos/<whmcsId>/<tail>`.
 *
 * This is the ONE place the screen carries a `/pos/<id>/` segment, and the id
 * is the WHMCS id from the query string — never `env.STORE_ID`. Build the
 * matcher with {@link merchantPathPattern}.
 */
export const COMPLETE_ACTION_LINKS = [
  { label: 'View Merchant', tail: 'setting' },
  { label: 'Add Services', tail: 'services' },
  { label: 'Add Staff', tail: 'staffs' },
] as const;

/** `Go to Dashboard` is the only step-7 link that is not merchant-scoped. */
export const GO_TO_DASHBOARD_HREF = '/';

/** Every step-7 action link's visible label, in render order (TC-ONB-132). */
export const COMPLETE_ACTION_LABELS = [
  'View Merchant',
  'Go to Dashboard',
  'Add Services',
  'Add Staff',
] as const;

/** The two shortcut cards below the step-7 actions: title, subtitle, path tail. */
export const COMPLETE_QUICK_ACTIONS = [
  { title: 'Add Services', subtitle: 'Configure services & products', tail: 'services' },
  { title: 'Add Staff', subtitle: 'Set up staff members', tail: 'staffs' },
] as const;

/**
 * The API calls this screen makes, as `page.route` globs.
 *
 * `MERCHANT_SETTINGS` backs the duplicate check on step 1 and the step-2
 * prefill; `MERCHANT_ONBOARDING` backs the Integration Status panel;
 * `TIP_SETTINGS` backs step 6's presets. Host on DEV is
 * `https://volt-pos.v2.dev-fastboypay.com`.
 */
export const ONBOARDING_API = {
  MERCHANT_SETTINGS: '**/merchant_settings/**',
  MERCHANT_ONBOARDING: '**/merchant_onboarding/**',
  TIP_SETTINGS: '**/merchant_setting_tip_settings**',
} as const;

/**
 * Viewports the responsive cases resize to.
 *
 * playwright.config ships a single 1920x1080 chromium project, so these are
 * applied in-test with `page.setViewportSize` — the reuseContext fixture gives
 * every test its own Page, so a resize cannot leak into a sibling.
 */
export const ONBOARDING_VIEWPORTS = {
  DESKTOP: { width: 1920, height: 1080 },
  LAPTOP: { width: 1366, height: 768 },
  TABLET: { width: 768, height: 1024 },
  MOBILE: { width: 375, height: 812 },
} as const;

/** Where an unauthenticated visit lands. */
export const LOGIN_URL_PATTERN = /\/login(?:[/?#]|$)/;

/** The return path `/login` is expected to carry back (TC-ONB-163). */
export const LOGIN_REDIRECT_PATTERN = /redirect=%2Fpos%2Fonboarding/i;

/**
 * Payloads the security cases push through `whmcsId` and the text fields.
 *
 * SAFETY: type them, read the DOM back, and never save — step 2's
 * `Save Changes & Continue` is a real write on DEV.
 */
export const XSS_PAYLOAD = '<script>alert(1)</script>';

/** The three hostile `whmcsId` values TC-ONB-167 walks through. */
export const MALICIOUS_WHMCS_IDS = [XSS_PAYLOAD, '1 OR 1=1', '../../etc/passwd'] as const;

/** Wording that must never reach this screen's DOM (TC-ONB-168). */
export const SENSITIVE_TEXT_PATTERNS = [
  /api[_-]?key/i,
  /\bsecret\b/i,
  /\btoken\b/i,
  /\bpassword\b/i,
  /\bcredential/i,
  /bearer\s+[A-Za-z0-9._-]{8,}/i,
  /private[_-]?key/i,
  /encryption key/i,
] as const;

/**
 * A merchant-scoped path, e.g. `merchantPathPattern('setting', 3660)` →
 * `/\/pos\/3660\/setting(?:[/?#]|$)/`.
 *
 * Only step 7's links are scoped this way, and they are scoped by the WHMCS id
 * on the URL. Nothing else on this screen may assert a `/pos/<id>/` segment.
 */
export function merchantPathPattern(tail: string, whmcsId: string | number): RegExp {
  return new RegExp(`/pos/${escapeRegExp(String(whmcsId))}/${escapeRegExp(tail)}(?:[/?#]|$)`);
}

/**
 * URL matcher for one wizard step, e.g.
 * `stepUrlPattern(OnboardingStep.PHOTOS, 3660)` →
 * `/\/pos\/onboarding\?[^#]*step=photos[^#]*whmcsId=3660/`.
 *
 * Never store-scoped: this route carries no `/pos/<id>/` segment.
 */
export function stepUrlPattern(step: string, whmcsId?: string | number): RegExp {
  const tail = whmcsId === undefined ? '' : `[^#]*whmcsId=${escapeRegExp(String(whmcsId))}`;
  return new RegExp(`/pos/onboarding\\?[^#]*step=${escapeRegExp(step)}${tail}`);
}

/**
 * Merchant Onboarding (Internal) — the 7-step wizard at `/pos/onboarding`.
 *
 * An admin route, NOT store-scoped: there is no `/pos/<id>/` segment and
 * `env.STORE_ID` plays no part, so nothing here may assert a store id. Landing
 * on the bare path normalises the URL to `?step=validate`.
 *
 * Two properties of the screen shape every locator below:
 *
 *  - **It exposes no `data-testid` at all** (scan 2026-08-19), so everything is
 *    reached by role / text / element id. Where the app gives a field an HTML id
 *    (`#whmcsId`, `#businessName`, …) that id is the most stable handle there
 *    is and is used directly.
 *  - **It renders slowly on DEV — 7–12 s.** `waitForLoadState('networkidle')`
 *    returns a blank page here, so every wait is an `expect(locator)` with a
 *    generous timeout instead.
 *
 * Wizard position lives entirely in the URL (`?step=<slug>&whmcsId=<number>`),
 * which makes {@link gotoStep} how read-only tests reach a given step — steps
 * 2–7 are guarded and bounce to `validate` when `whmcsId` is absent.
 */
export class OnboardingPage extends BasePage {
  protected readonly path = Urls.ONBOARDING;

  readonly sidebar: Sidebar;

  /**
   * `#whmcsId` (name="whmcsId", type=text) — the step-1 form's only input.
   * Reached by id because the field carries no accessible label (TC-ONB-148).
   */
  readonly whmcsIdInput: Locator;
  readonly validateButton: Locator;

  /** Icon-rail logo, `link "FastboyPay home"` → `/`. */
  readonly homeLink: Locator;
  /** Avatar trigger at the foot of the icon rail. */
  readonly userMenuButton: Locator;
  /** Sidebar collapse control. Present at every width, visible below tablet. */
  readonly toggleSidebarButton: Locator;
  /** The sonner outlet, `region "Notifications alt+T"` — toasts land here. */
  readonly notificationsRegion: Locator;

  constructor(page: Page) {
    super(page);
    this.sidebar = new Sidebar(page);
    this.whmcsIdInput = page.locator('#whmcsId');
    this.validateButton = page.getByRole('button', { name: 'Validate', exact: true });
    this.homeLink = page.getByRole('link', { name: 'FastboyPay home' });
    this.userMenuButton = page.getByRole('button', { name: 'Open user menu' });
    this.toggleSidebarButton = page.getByRole('button', { name: 'Toggle Sidebar' });
    this.notificationsRegion = page.getByRole('region', { name: /notifications/i });
  }

  /**
   * Ready = the wizard chrome is up.
   *
   * Keyed on the page title rather than a step-specific element so it holds for
   * whichever step the URL selected. The long timeout is the DEV render cost,
   * not slack.
   */
  async waitForReady(): Promise<void> {
    await expect(this.pageTitle).toBeVisible({ timeout: Timeouts.LONG });
  }

  /** Page header — the string "Merchant Onboarding". */
  get pageTitle(): Locator {
    return this.page.getByText('Merchant Onboarding', { exact: true }).first();
  }

  // ---- chrome: icon rail + sidebar ---------------------------------------

  /** A product-context button on the icon rail — see {@link PRODUCT_SWITCHER_BUTTONS}. */
  productSwitcherButton(name: string): Locator {
    return this.page.getByRole('button', { name, exact: true });
  }

  /** Sidebar link addressed by its exact href — the way to disambiguate the two "Settings" / "Orders" labels. */
  navLinkByHref(href: string): Locator {
    return this.page.locator(`a[href="${href}"]`);
  }

  /**
   * Every `href` in the sidebar's link lists, in DOM order.
   *
   * Scoped to `li a[href]` because the nav renders each item as a listitem —
   * content links (step 7's shortcuts) are not listitems and stay out.
   */
  async navHrefs(): Promise<string[]> {
    return this.page
      .locator('li a[href]')
      .evaluateAll((els) => els.map((el) => el.getAttribute('href') ?? ''));
  }

  /** Every `href` carried by sidebar links with this label (labels repeat across groups). */
  async navHrefsFor(name: string | RegExp): Promise<string[]> {
    return this.sidebar
      .item(name)
      .evaluateAll((els) => els.map((el) => el.getAttribute('href') ?? ''));
  }

  /** Links the nav marks as the current page — `aria-current="page"`. */
  get activeNavLinks(): Locator {
    return this.page.locator('li a[aria-current="page"]');
  }

  // ---- navigation ------------------------------------------------------

  /**
   * Deep-link a wizard step, optionally for a given merchant.
   *
   * Steps 2–7 without a `whmcsId` are redirected to `?step=validate` by the
   * app's guard — that redirect is the subject of several cases, so this does
   * NOT assert the requested step was reached; read the URL afterwards.
   *
   * `whmcsId` is typed loosely because the negative cases deep-link values the
   * schema rejects (`abc`, `-5`, `0`).
   */
  async gotoStep(step: string, whmcsId?: string | number): Promise<void> {
    const query = new URLSearchParams({ step });
    if (whmcsId !== undefined) query.set('whmcsId', String(whmcsId));
    await this.page.goto(`${this.path}?${query.toString()}`, { waitUntil: 'domcontentloaded' });
  }

  /** Navigate with arbitrary query params (for the malformed-URL cases). */
  async gotoWithQuery(query: Record<string, string>): Promise<void> {
    const search = new URLSearchParams(query).toString();
    await this.page.goto(`${this.path}?${search}`, { waitUntil: 'domcontentloaded' });
  }

  /** The `step` value currently on the URL, or '' when absent. */
  currentStep(): string {
    return new URL(this.page.url()).searchParams.get('step') ?? '';
  }

  /** The `whmcsId` value currently on the URL, or '' when absent. */
  currentWhmcsId(): string {
    return new URL(this.page.url()).searchParams.get('whmcsId') ?? '';
  }

  /**
   * Wait for the routing guard's landing state: `?step=validate` with the
   * WHMCS ID form up. Used by the cases that deep-link steps 2–7 without an id.
   */
  async expectGuardRedirect(): Promise<void> {
    await expect(this.page).toHaveURL(/[?&]step=validate/, { timeout: Timeouts.MEDIUM });
    await expect(this.enterWhmcsIdHeading).toBeVisible({ timeout: Timeouts.LONG });
  }

  // ---- stepper ---------------------------------------------------------

  /**
   * A step label in the left-hand stepper.
   *
   * Scanned as plain `div`/`span` — not buttons or links — so these are read,
   * not clicked (TC-ONB-021 pins that they do not navigate).
   */
  stepperItem(label: string): Locator {
    return this.page.getByText(label, { exact: true }).first();
  }

  /** Every stepper label as one locator set, for order and count assertions. */
  get stepperLabels(): Locator {
    return this.page.getByText(
      new RegExp(`^(${ONBOARDING_STEP_LABELS.map(escapeRegExp).join('|')})$`),
    );
  }

  /**
   * The seven stepper cells — each one the circle, its label, and the connector.
   *
   * Matched on the wrapper's own utility classes (`flex shrink-0 items-center
   * md:flex-col md:items-stretch` in the bundle) narrowed to cells that carry a
   * step label, so nothing else on the page can be swept in. This is the only
   * handle that separates the stepper's "Business Information" from step 2's
   * heading of the same name.
   */
  get stepperItems(): Locator {
    return this.page
      .locator('div.shrink-0.md\\:flex-col')
      .filter({ hasText: new RegExp(`(${ONBOARDING_STEP_LABELS.map(escapeRegExp).join('|')})`) });
  }

  /** One stepper cell by its label, e.g. `stepperCell('Work Hours')`. */
  stepperCell(label: string): Locator {
    return this.stepperItems.filter({
      hasText: new RegExp(`^\\d?\\s*${escapeRegExp(label)}$`),
    });
  }

  /**
   * The numbered circle inside a stepper cell.
   *
   * Its text is the step number while the step is current or pending, and empty
   * once the step is complete — the number is swapped for a tick icon.
   */
  stepperBadge(label: string): Locator {
    return this.stepperCell(label).locator('div.rounded-full').first();
  }

  /**
   * Each stepper cell's visible text, whitespace-collapsed, in wizard order —
   * e.g. `['Validate', 'Business Information', '3 Work Hours', …]` on step 3,
   * where the first two have lost their number to a completion tick.
   *
   * The cheapest way to assert step order, numbering and completion at once
   * (TC-ONB-004 / 005 / 006 / 131).
   */
  async stepperCellTexts(): Promise<string[]> {
    const texts = await this.stepperItems.allInnerTexts();
    return texts.map((text) => text.replace(/\s+/g, ' ').trim());
  }

  /**
   * A cell's state, read off the circle's background utility class:
   * `bg-success` = done, `bg-primary` = current, `bg-muted` = not reached.
   */
  async stepperState(label: string): Promise<'complete' | 'current' | 'pending'> {
    const className = (await this.stepperBadge(label).getAttribute('class')) ?? '';
    if (className.includes('bg-success')) return 'complete';
    if (className.includes('bg-primary')) return 'current';
    return 'pending';
  }

  // ---- step 1: form state ----------------------------------------------

  get enterWhmcsIdHeading(): Locator {
    return this.page.getByRole('heading', { name: 'Enter WHMCS ID' });
  }

  get validateDescription(): Locator {
    return this.page.getByText('Verify integration readiness across all systems');
  }

  /** Client-side error, announced as `role="alert"`: "WHMCS ID must be numeric". */
  get numericError(): Locator {
    return this.page.getByRole('alert').filter({ hasText: /WHMCS ID must be numeric/i });
  }

  /** Business-rule error shown under the input for an already-onboarded merchant. */
  get alreadyOnboardedError(): Locator {
    return this.page.getByText(/This merchant has already been onboarded/i);
  }

  /** Fill the id and submit. Does not wait for a result — cases assert their own. */
  async submitWhmcsId(value: string): Promise<void> {
    await this.whmcsIdInput.fill(value);
    await this.validateButton.click();
  }

  /** Fill the id and submit with Enter instead of the button (TC-ONB-034). */
  async submitWhmcsIdWithEnter(value: string): Promise<void> {
    await this.whmcsIdInput.fill(value);
    await this.whmcsIdInput.press('Enter');
  }

  /**
   * The pending spinner inside the Validate button (`svg.animate-spin`).
   *
   * Only on screen while `merchant_settings` is in flight, so a case that wants
   * to see it has to slow or stall that request first.
   */
  get validateSpinner(): Locator {
    return this.validateButton.locator('svg.animate-spin');
  }

  // ---- step 1: integration status panel ---------------------------------

  get integrationStatusHeading(): Locator {
    return this.page.getByRole('heading', { name: 'Integration Status' });
  }

  /** The "WHMCS ID: <id>" chip in the panel header. */
  whmcsIdChip(id: string | number): Locator {
    return this.page.getByText(`WHMCS ID: ${id}`);
  }

  /**
   * One integration row, scoped by its system label.
   *
   * The rows carry no landmark role, so this takes the innermost `div` whose
   * text starts with the system name — enough to read that row's badge and
   * description without catching a sibling system.
   */
  integrationRow(system: string): Locator {
    return this.page
      .locator('div')
      .filter({ hasText: new RegExp(`^${escapeRegExp(system)}`) })
      .last();
  }

  /** The status badge inside a system's row, e.g. "Ready" / "Optional". */
  integrationBadge(system: string): Locator {
    return this.integrationRow(system)
      .getByText(new RegExp(`^(${INTEGRATION_BADGES.map(escapeRegExp).join('|')})$`))
      .first();
  }

  get readySummary(): Locator {
    return this.page.getByText(
      /Required systems are ready\. You can proceed to create the merchant/i,
    );
  }

  get notReadySummary(): Locator {
    return this.page.getByText(/Merchant is not ready for onboarding/i);
  }

  get createMerchantButton(): Locator {
    return this.page.getByRole('button', { name: 'Create Merchant' });
  }

  get checkAgainButton(): Locator {
    return this.page.getByRole('button', { name: 'Check Again' });
  }

  /**
   * The `<p>` sentence under a system row.
   *
   * The rows carry no role, so this matches the sentence itself rather than
   * digging through the row's DOM — pass a value from
   * {@link INTEGRATION_DESCRIPTIONS}, or a RegExp when the API supplies the text.
   */
  integrationDescription(text: string | RegExp): Locator {
    return this.page.getByText(text, { exact: typeof text === 'string' });
  }

  /** Text of a system row's badge, e.g. `'Ready'` — '' when the row is missing. */
  async integrationBadgeText(system: string): Promise<string> {
    const badge = this.integrationBadge(system);
    if ((await badge.count()) === 0) return '';
    return (await badge.innerText()).trim();
  }

  /**
   * The status badge of one system row — the DOM-verified handle.
   *
   * Prefer this over {@link integrationBadge}: that one filters `div`s whose
   * text *starts with* the system name, which resolves to the icon + label pair,
   * and the badge is that node's **sibling**, so it matches nothing on the live
   * DOM (checked 2026-08-19, see `TC4-step1-integration-status`). This walks up
   * two `div` ancestors from the label instead and takes the descendant whose
   * whole text is one status word.
   */
  integrationRowBadge(system: string): Locator {
    return this.page
      .getByText(system, { exact: true })
      .locator('xpath=ancestor::div[2]')
      .getByText(INTEGRATION_BADGE_PATTERN);
  }

  /** The three system labels as one locator set, for a count/order assertion. */
  get integrationSystemLabels(): Locator {
    return this.page.getByText(
      new RegExp(`^(${INTEGRATION_SYSTEMS.map(escapeRegExp).join('|')})$`),
    );
  }

  /**
   * The Magensa / Bamboo sub-cards.
   *
   * Present in the bundle but absent from every scan — treat as unverified and
   * scaffold anything that depends on them.
   */
  integrationCard(name: 'Magensa Integration' | 'Bamboo Integration'): Locator {
    return this.page.getByText(name, { exact: true });
  }

  // ---- step 2: Business Information --------------------------------------

  get businessInformationHeading(): Locator {
    return this.page.getByRole('heading', { name: 'Business Information' });
  }

  get contactOwnerHeading(): Locator {
    return this.page.getByRole('heading', { name: 'Contact Owner' });
  }

  get businessNameInput(): Locator {
    return this.page.locator('#businessName');
  }

  get legalNameInput(): Locator {
    return this.page.locator('#legalName');
  }

  get addressInput(): Locator {
    return this.page.locator('#address');
  }

  get cityInput(): Locator {
    return this.page.locator('#city');
  }

  get postalCodeInput(): Locator {
    return this.page.locator('#postalCode');
  }

  get phoneNumberInput(): Locator {
    return this.page.locator('#phoneNumber');
  }

  get emailInput(): Locator {
    return this.page.locator('#email');
  }

  get websiteInput(): Locator {
    return this.page.locator('#website');
  }

  get countryCombobox(): Locator {
    return this.page.getByRole('combobox', { name: /country/i }).first();
  }

  get stateCombobox(): Locator {
    return this.page.getByRole('combobox', { name: /state/i }).first();
  }

  /** Step 2's only button — the step has neither Back nor Skip. */
  get saveChangesAndContinueButton(): Locator {
    return this.page.getByRole('button', { name: 'Save Changes & Continue' });
  }

  /**
   * Open the State picker and return its search box.
   *
   * The combobox opens a `role="dialog"` holding a `Search state...` textbox and
   * a `listbox "Suggestions"`, not a plain native listbox.
   */
  async openStatePicker(): Promise<Locator> {
    await this.stateCombobox.click();
    const search = this.page.getByRole('textbox', { name: /search state/i });
    await expect(search).toBeVisible({ timeout: Timeouts.MEDIUM });
    return search;
  }

  /** Open the Country picker and return its search box. */
  async openCountryPicker(): Promise<Locator> {
    await this.countryCombobox.click();
    const search = this.page.getByRole('textbox', { name: /search country/i });
    await expect(search).toBeVisible({ timeout: Timeouts.MEDIUM });
    return search;
  }

  /** Options inside an open Country/State picker. */
  get suggestionOptions(): Locator {
    return this.page.getByRole('option');
  }

  /** Any step-2 text field by its HTML id — see {@link MERCHANT_INFO_FIELDS}. */
  merchantInfoField(id: string): Locator {
    return this.page.locator(`#${id}`);
  }

  /**
   * A step-2 field's visible label.
   *
   * `TextField` renders the label as its own node *and* wires it to the input,
   * so the input's accessible name is the same string — either handle works.
   */
  merchantInfoLabel(label: string): Locator {
    return this.page.getByText(label, { exact: true });
  }

  /** Values of every step-2 text field, keyed by HTML id (TC-ONB-061). */
  async merchantInfoValues(): Promise<Record<string, string>> {
    const entries = await Promise.all(
      MERCHANT_INFO_FIELDS.map(async (field) => {
        const value = await this.merchantInfoField(field.id).inputValue();
        return [field.id, value] as const;
      }),
    );
    return Object.fromEntries(entries);
  }

  /** The popup a Country/State combobox opens — a `role="dialog"`, not a listbox. */
  get pickerDialog(): Locator {
    return this.page.getByRole('dialog');
  }

  /** The `listbox "Suggestions"` inside an open Country/State picker. */
  get suggestionsListbox(): Locator {
    return this.page.getByRole('listbox', { name: 'Suggestions' });
  }

  /** One option in an open picker. */
  suggestionOption(name: string | RegExp): Locator {
    return this.page.getByRole('option', { name });
  }

  /** The option the picker opens on — marked `selected` in the a11y tree. */
  get selectedSuggestion(): Locator {
    return this.page.getByRole('option', { selected: true });
  }

  /**
   * The picker's "nothing matched" placeholder.
   *
   * The exact wording was never observed (no scan typed a miss), so treat a
   * text assertion on this as unverified — count the options instead.
   */
  get pickerEmptyState(): Locator {
    return this.pickerDialog.getByText(/no .*(found|result)/i);
  }

  /**
   * Open the State picker, filter it, and pick an option.
   *
   * Edits the form only — nothing is persisted until `Save Changes & Continue`,
   * which this never touches.
   */
  async chooseState(name: string): Promise<void> {
    const search = await this.openStatePicker();
    await search.fill(name);
    await this.suggestionOption(new RegExp(`^${escapeRegExp(name)}$`))
      .first()
      .click();
  }

  /** Country twin of {@link chooseState}. Note the app clears `state` on change. */
  async chooseCountry(name: string): Promise<void> {
    const search = await this.openCountryPicker();
    await search.fill(name);
    await this.suggestionOption(new RegExp(`^${escapeRegExp(name)}$`))
      .first()
      .click();
  }

  // ---- step 3: Work Hours -------------------------------------------------

  get businessHoursHeading(): Locator {
    return this.page.getByRole('heading', { name: 'Business Hours' });
  }

  /** The per-day open/closed switch, e.g. `switch "Monday open status"`. */
  dayOpenSwitch(day: string): Locator {
    return this.page.getByRole('switch', { name: `${day} open status` });
  }

  /**
   * The two time triggers on a day's row: [0] opening, [1] closing.
   *
   * Scoped through the row that contains the day's switch, since the buttons
   * themselves are labelled only "Select time" (or the chosen time) and repeat
   * across all seven rows.
   */
  dayTimeButtons(day: string): Locator {
    return this.page
      .locator('div')
      .filter({ has: this.dayOpenSwitch(day) })
      .last()
      .getByRole('button', { name: /select time|\d{1,2}:\d{2}\s*(AM|PM)/i });
  }

  /** Every time trigger on the step, in row order. */
  get timeButtons(): Locator {
    return this.page.getByRole('button', { name: /select time|\d{1,2}:\d{2}\s*(AM|PM)/i });
  }

  /** The row for one weekday — the innermost block holding that day's switch. */
  dayRow(day: string): Locator {
    return this.page
      .locator('div')
      .filter({ has: this.dayOpenSwitch(day) })
      .last();
  }

  /** The day name as rendered next to its switch. */
  dayLabel(day: string): Locator {
    return this.page.getByText(day, { exact: true });
  }

  /** Labels of one day's two time triggers — `['9:00 AM', '5:00 PM']`. */
  async dayTimes(day: string): Promise<string[]> {
    const labels = await this.dayTimeButtons(day).allInnerTexts();
    return labels.map((label) => label.replace(/\s+/g, ' ').trim());
  }

  /** Open a day's opening (0) or closing (1) time picker. */
  async openTimePicker(day: string, which: 0 | 1): Promise<void> {
    await this.dayTimeButtons(day).nth(which).click();
    await expect(this.timePickerDialog).toBeVisible({ timeout: Timeouts.MEDIUM });
  }

  /** The popover the time triggers open. Shares `role="dialog"` with the pickers on step 2. */
  get timePickerDialog(): Locator {
    return this.page.getByRole('dialog');
  }

  /**
   * The picker's scroll columns: hour, minute, meridiem.
   *
   * Each is a `list` of `listitem`s. The probe captured six lists because it
   * left two pickers open at once — with a single picker open expect three, but
   * treat the exact count as unverified.
   */
  get timePickerColumns(): Locator {
    return this.timePickerDialog.getByRole('list');
  }

  /** Options in one picker column: 0 = hour, 1 = minute, 2 = AM/PM. */
  timePickerOptions(column: 0 | 1 | 2): Locator {
    return this.timePickerColumns.nth(column).getByRole('listitem');
  }

  /**
   * Pick hour / minute / meridiem in an already-open time picker.
   *
   * Values are matched exactly as rendered — hours and minutes are
   * zero-padded (`'10'`, `'30'`), and each column repeats its values as it
   * scrolls, so the first match in the column is taken.
   */
  async pickTime(hour: string, minute: string, meridiem: 'AM' | 'PM'): Promise<void> {
    const exact = (value: string): RegExp => new RegExp(`^${escapeRegExp(value)}$`);
    await this.timePickerOptions(0)
      .filter({ hasText: exact(hour) })
      .first()
      .click();
    await this.timePickerOptions(1)
      .filter({ hasText: exact(minute) })
      .first()
      .click();
    await this.timePickerOptions(2)
      .filter({ hasText: exact(meridiem) })
      .first()
      .click();
  }

  // ---- step 4: Photos ------------------------------------------------------

  get businessPhotosHeading(): Locator {
    return this.page.getByRole('heading', { name: 'Business Photos' });
  }

  get logoFileInput(): Locator {
    return this.page.locator('#storeLogoObjFid');
  }

  get coverPhotoFileInput(): Locator {
    return this.page.locator('#coverPhotoObjFid');
  }

  get uploadButtons(): Locator {
    return this.page.getByRole('button', { name: 'Click to upload' });
  }

  get businessPhotosDescription(): Locator {
    return this.page.getByText(
      'Your branding appears on receipts, booking pages, and customer communications.',
    );
  }

  /** An upload slot's visible label — `Business logo` / `Welcome sign image`. */
  photoUploadLabel(label: string): Locator {
    return this.page.getByText(label, { exact: true });
  }

  /** The size/format hint under an upload slot — see {@link PHOTO_UPLOADS}. */
  photoUploadHint(hint: string): Locator {
    return this.page.getByText(hint, { exact: true });
  }

  /** Either file input by its HTML id — see {@link PHOTO_UPLOADS}. */
  photoFileInput(id: string): Locator {
    return this.page.locator(`input[type="file"]#${id}`);
  }

  // ---- step 5: Package ------------------------------------------------------

  /** Every "View all N features" trigger — one per package card. */
  get viewAllFeaturesButtons(): Locator {
    return this.page.getByRole('button', { name: /view all \d+ features/i });
  }

  get selectPlanButtons(): Locator {
    return this.page.getByRole('button', { name: 'Select Plan' });
  }

  /** The in-use package's disabled action button. */
  get currentPlanButton(): Locator {
    return this.page.getByRole('button', { name: 'Current Plan' });
  }

  get currentBadge(): Locator {
    return this.page.getByText('Current', { exact: true });
  }

  get featureDialog(): Locator {
    return this.page.getByRole('dialog');
  }

  get selectThisPackageButton(): Locator {
    return this.featureDialog.getByRole('button', { name: 'Select This Package' });
  }

  get dialogCloseButton(): Locator {
    return this.featureDialog.getByRole('button', { name: /close/i });
  }

  /**
   * How many package cards the grid holds.
   *
   * Counted through the one control every card renders exactly once. Package
   * names are DEV junk (`123`, `HIHI`, `Copy of 2`) and must never be asserted.
   */
  async packageCount(): Promise<number> {
    return this.viewAllFeaturesButtons.count();
  }

  /** The five preview features every card lists — see {@link PACKAGE_FEATURE_PREVIEW}. */
  packageFeaturePreview(name: string): Locator {
    return this.page.getByText(name, { exact: true });
  }

  /** The `N` in a card's "View all N features" label. */
  async advertisedFeatureCount(cardIndex = 0): Promise<number> {
    const label = await this.viewAllFeaturesButtons.nth(cardIndex).innerText();
    return Number(label.match(/(\d+)/)?.[1] ?? 0);
  }

  /** Open a card's feature dialog and wait for it. */
  async openFeatureDialog(cardIndex = 0): Promise<void> {
    await this.viewAllFeaturesButtons.nth(cardIndex).click();
    await expect(this.featureDialog).toBeVisible({ timeout: Timeouts.MEDIUM });
  }

  /** The dialog's h2 — the package name, so read it, never assert a literal. */
  get featureDialogTitle(): Locator {
    return this.featureDialog.getByRole('heading', { level: 2 });
  }

  /** Every feature line in the dialog, across all 14 groups. */
  get featureDialogItems(): Locator {
    return this.featureDialog.getByRole('listitem');
  }

  /** A group heading inside the dialog — see {@link PACKAGE_FEATURE_GROUPS}. */
  featureGroupHeading(name: string): Locator {
    return this.featureDialog.getByText(name, { exact: true });
  }

  // ---- step 6: Payment & Transactions ----------------------------------------

  get paymentMethodsHeading(): Locator {
    return this.page.getByRole('heading', { name: 'Payment Methods' });
  }

  get taxPricingHeading(): Locator {
    return this.page.getByRole('heading', { name: 'Tax & Pricing' });
  }

  get tippingSettingsHeading(): Locator {
    return this.page.getByRole('heading', { name: 'Tipping Settings' });
  }

  /** A tender switch by its visible label, e.g. "Credit Card". */
  paymentMethodSwitch(label: string): Locator {
    return this.page.getByRole('switch', { name: label });
  }

  get taxRateInput(): Locator {
    return this.page.locator('#taxPercentage');
  }

  get cashDiscountInput(): Locator {
    return this.page.locator('#cashDiscountPercentage');
  }

  get serviceFeeInput(): Locator {
    return this.page.locator('#serviceFeePercentage');
  }

  get tipAcceptanceSwitch(): Locator {
    return this.page.getByRole('switch', { name: /tip acceptance/i });
  }

  get tipTimingGroup(): Locator {
    return this.page.getByRole('radiogroup', { name: /tip timing/i });
  }

  /** A tip-timing choice, e.g. /Before Payment/ or /After Payment/. */
  tipTimingOption(name: RegExp): Locator {
    return this.page.getByRole('radio', { name });
  }

  /** The Percentage / Fixed Amount toggle. */
  tipTypeButton(name: 'Percentage' | 'Fixed Amount'): Locator {
    return this.page.getByRole('button', { name, exact: true });
  }

  /** Every "Remove <n>% tip preset" button — one per preset chip. */
  get removePresetButtons(): Locator {
    return this.page.getByRole('button', { name: /remove .* tip preset/i });
  }

  get addPresetButton(): Locator {
    return this.page.getByRole('button', { name: 'Add', exact: true });
  }

  get paymentMethodsDescription(): Locator {
    return this.page.getByText('Choose which tender types staff can accept at checkout.');
  }

  get tippingSettingsDescription(): Locator {
    return this.page.getByText(
      'Control whether tips are collected, when they are captured, and which presets appear on the customer screen.',
    );
  }

  /** A tender's helper sentence — see {@link PAYMENT_METHODS}. */
  paymentMethodDescription(text: string): Locator {
    return this.page.getByText(text, { exact: true });
  }

  /**
   * The hidden `<input type="checkbox">` a tender switch posts under.
   *
   * Use it to prove the wire name (`card`, `cash`, `gift_card`, `other`); the
   * visible control is {@link paymentMethodSwitch}.
   */
  paymentMethodInput(name: string): Locator {
    return this.page.locator(`input[name="${name}"]`);
  }

  /** The `tipActive` checkbox behind the Tip Acceptance switch. */
  get tipActiveInput(): Locator {
    return this.page.locator('input[name="tipActive"]');
  }

  /** A tip-timing radio input by the value it posts. */
  tipTimingInput(value: 'before_payment' | 'after_payment'): Locator {
    return this.page.locator(`input[name="tipTiming"][value="${value}"]`);
  }

  get tipTimingHeading(): Locator {
    return this.page.getByRole('heading', { name: 'Tip Timing', level: 4 });
  }

  get tipPresetsHeading(): Locator {
    return this.page.getByRole('heading', { name: 'Tip Presets', level: 4 });
  }

  /** `SALE` / `AUTHORIZE` — the badge on a tip-timing card. */
  tipTimingBadge(badge: 'SALE' | 'AUTHORIZE'): Locator {
    return this.page.getByText(badge, { exact: true });
  }

  /**
   * The processor chain under a tip-timing card, e.g. `Order › Tip › Sale`.
   *
   * Index 0 is the Before Payment card, 1 the After Payment card — the two
   * lists appear in that order inside the radiogroup.
   */
  tipTimingChainItems(cardIndex: 0 | 1): Locator {
    return this.tipTimingGroup.getByRole('list').nth(cardIndex).getByRole('listitem');
  }

  /** The `Percentage` / `Fixed Amount` toggle group. */
  get tipTypeGroup(): Locator {
    return this.page.getByRole('group', { name: 'Tip type' });
  }

  /**
   * The preset chips.
   *
   * Matched on the percentage label the `Percentage` mode renders. The
   * `Fixed Amount` label format was never observed — scaffold anything that
   * needs it. Merchant 3660 carries ~40 duplicated chips (TC-ONB-120), so read
   * the count, never expect a specific one to be unique.
   */
  get tipPresetChips(): Locator {
    return this.page.getByRole('button', { name: /^\d+(?:\.\d+)?%$/ });
  }

  /** One preset chip by its percentage, e.g. `tipPresetChip('20')`. */
  tipPresetChip(percent: string): Locator {
    return this.page.getByRole('button', { name: `${percent}%`, exact: true });
  }

  /** The chip's delete control, `Remove 15% tip preset`. */
  removePresetButton(percent: string): Locator {
    return this.page.getByRole('button', { name: `Remove ${percent}% tip preset` });
  }

  /** Every preset chip's label, in order. */
  async tipPresetLabels(): Promise<string[]> {
    const labels = await this.tipPresetChips.allInnerTexts();
    return labels.map((label) => label.trim());
  }

  /** The `Tip Acceptance` switch's helper sentence. */
  get tipAcceptanceDescription(): Locator {
    return this.page.getByText(
      'When off, the tip screen is skipped at checkout and no tip is collected on any order.',
    );
  }

  /** The `Tip Presets` helper sentence. */
  get tipPresetsDescription(): Locator {
    return this.page.getByText('Shown as quick-select buttons at checkout.');
  }

  /** All four tender switches as one set — for count and order assertions. */
  get paymentMethodSwitches(): Locator {
    return this.page.getByRole('switch', {
      name: new RegExp(
        `^(${PAYMENT_METHODS.map((method) => escapeRegExp(method.label)).join('|')})$`,
      ),
    });
  }

  /** A Tax & Pricing input by HTML id — see {@link TAX_PRICING_FIELDS}. */
  taxPricingField(id: string): Locator {
    return this.page.locator(`#${id}`);
  }

  /** A Tax & Pricing field's visible label, e.g. `Tax Rate (%)`. */
  taxPricingLabel(label: string): Locator {
    return this.page.getByText(label, { exact: true });
  }

  /** Values of the three percentage fields, keyed by HTML id (TC-ONB-109). */
  async taxPricingValues(): Promise<Record<string, string>> {
    const entries = await Promise.all(
      TAX_PRICING_FIELDS.map(async (field) => {
        const value = await this.taxPricingField(field.id).inputValue();
        return [field.id, value] as const;
      }),
    );
    return Object.fromEntries(entries);
  }

  /**
   * Whether a switch / radio / toggle reads as on.
   *
   * Radix controls announce state through `aria-checked`, falling back to
   * `data-state="checked"` on the few that render without it.
   */
  async isToggleOn(control: Locator): Promise<boolean> {
    const ariaChecked = await control.getAttribute('aria-checked');
    if (ariaChecked !== null) return ariaChecked === 'true';
    return (await control.getAttribute('data-state')) === 'checked';
  }

  /** Every tender's on/off state, keyed by visible label (TC-ONB-106 / 107). */
  async paymentMethodStates(): Promise<Record<string, boolean>> {
    const entries = await Promise.all(
      PAYMENT_METHODS.map(async (method) => {
        const on = await this.isToggleOn(this.paymentMethodSwitch(method.label));
        return [method.label, on] as const;
      }),
    );
    return Object.fromEntries(entries);
  }

  /**
   * Flip one tender switch.
   *
   * SAFE: this edits local form state only. Nothing reaches the DEV backend
   * until `Save Changes`, which no read-only test may click.
   */
  async togglePaymentMethod(label: string): Promise<void> {
    await this.paymentMethodSwitch(label).click();
  }

  /** Both tip-timing radios as one set — for the "exactly 2" assertion. */
  get tipTimingRadios(): Locator {
    return this.tipTimingGroup.getByRole('radio');
  }

  /** A tip-timing card's description sentence — see {@link TIP_TIMING_OPTIONS}. */
  tipTimingDescription(text: string): Locator {
    return this.page.getByText(text, { exact: true });
  }

  /** Which tip-timing value is selected right now, `''` when neither is. */
  async selectedTipTiming(): Promise<TipTimingValue | ''> {
    for (const option of TIP_TIMING_OPTIONS) {
      const radio = this.tipTimingOption(new RegExp(escapeRegExp(option.label))).first();
      if ((await radio.count()) > 0 && (await this.isToggleOn(radio))) return option.value;
    }
    return '';
  }

  /**
   * Pick a tip-timing option. Client-side only — nothing is persisted until
   * `Save Changes`, which this never touches.
   */
  async selectTipTiming(label: 'Before Payment' | 'After Payment'): Promise<void> {
    await this.tipTimingOption(new RegExp(escapeRegExp(label)))
      .first()
      .click();
  }

  /** Whether a `Tip type` toggle reads as pressed (`aria-pressed` / `data-state`). */
  async tipTypePressed(name: TipTypeOption): Promise<boolean> {
    const button = this.tipTypeButton(name);
    const pressed = await button.getAttribute('aria-pressed');
    if (pressed !== null) return pressed === 'true';
    const state = await button.getAttribute('data-state');
    return state === 'on' || state === 'active' || state === 'checked';
  }

  /** Switch preset mode. Client-side only — see {@link selectTipTiming}. */
  async selectTipType(name: TipTypeOption): Promise<void> {
    await this.tipTypeButton(name).click();
  }

  /** How many preset chips are on screen right now. */
  async tipPresetCount(): Promise<number> {
    return this.tipPresetChips.count();
  }

  /**
   * Preset labels that appear more than once.
   *
   * Merchant 3660 renders ~40 chips with `15%` / `18%` / `20%` / `25%` repeated
   * (TC-ONB-120): correct behaviour is an empty array, so a test asserting that
   * is EXPECTED TO FAIL until the de-duplication lands.
   */
  async duplicateTipPresetLabels(): Promise<string[]> {
    const labels = await this.tipPresetLabels();
    const seen = new Set<string>();
    const duplicates = new Set<string>();
    for (const label of labels) {
      if (seen.has(label)) duplicates.add(label);
      else seen.add(label);
    }
    return [...duplicates];
  }

  /**
   * [UNVERIFIED] The field the `Add` control is assumed to reveal.
   *
   * No scan ever clicked `Add`, so whether it opens an inline input or a dialog
   * is unknown (TC-ONB-118 / 121). Scaffold anything that depends on this
   * rather than asserting against it.
   */
  get tipPresetAddInput(): Locator {
    return this.page.getByRole('textbox', { name: /preset|tip|percent/i }).first();
  }

  // ---- step 7: Complete --------------------------------------------------------

  get completeHeading(): Locator {
    return this.page.getByRole('heading', { name: 'Merchant Onboarding Complete!' });
  }

  get viewMerchantLink(): Locator {
    return this.page.getByRole('link', { name: 'View Merchant' });
  }

  get onboardAnotherButton(): Locator {
    return this.page.getByRole('button', { name: 'Onboard Another' });
  }

  get goToDashboardLink(): Locator {
    return this.page.getByRole('link', { name: 'Go to Dashboard' });
  }

  get addServicesLink(): Locator {
    return this.page.getByRole('link', { name: /add services/i });
  }

  get addStaffLink(): Locator {
    return this.page.getByRole('link', { name: /add staff/i });
  }

  get completeDescription(): Locator {
    return this.page.getByText(
      'The merchant has been successfully created and configured. They can now log in to the Volt POS application.',
    );
  }

  /**
   * A summary row's value.
   *
   * The block is a two-column grid of `<span>` pairs, so the value is the
   * label span's next sibling. Business Name and Created are live merchant
   * data — assert shape ({@link COMPLETE_CREATED_PATTERN}), not content.
   */
  summaryValue(label: 'Business Name' | 'WHMCS ID' | 'Created'): Locator {
    return this.page.getByText(label, { exact: true }).locator('xpath=following-sibling::*[1]');
  }

  /** Trimmed text of a summary row's value. */
  async summaryValueText(label: 'Business Name' | 'WHMCS ID' | 'Created'): Promise<string> {
    return (await this.summaryValue(label).innerText()).replace(/\s+/g, ' ').trim();
  }

  /** A step-7 shortcut card by its title. */
  quickActionLink(title: 'Add Services' | 'Add Staff'): Locator {
    return this.page.getByRole('link', { name: new RegExp(`^${escapeRegExp(title)}\\b`) });
  }

  /** A shortcut card's subtitle, e.g. `Configure services & products`. */
  quickActionSubtitle(text: string): Locator {
    return this.page.getByText(text, { exact: true });
  }

  /**
   * The four step-7 action links as one set — see {@link COMPLETE_ACTION_LABELS}.
   *
   * Used by TC-ONB-132 to prove the step ships four links and one button and no
   * wizard footer at all.
   */
  get completeActionLinks(): Locator {
    return this.page.getByRole('link', {
      name: new RegExp(`^(${COMPLETE_ACTION_LABELS.map(escapeRegExp).join('|')})`),
    });
  }

  /** A link's `href`, or `''` when the attribute is absent. */
  async hrefOf(link: Locator): Promise<string> {
    return (await link.getAttribute('href')) ?? '';
  }

  /**
   * Every step-7 action link's `href`, keyed by its visible label.
   *
   * The merchant-scoped ones read `/pos/<whmcsId>/…` — assert them against the
   * WHMCS id on the URL with {@link merchantPathPattern}, never a store id.
   */
  async completeActionHrefs(): Promise<Record<string, string>> {
    const entries = await Promise.all(
      COMPLETE_ACTION_LABELS.map(async (label) => {
        const link = this.page
          .getByRole('link', { name: new RegExp(`^${escapeRegExp(label)}`) })
          .first();
        const href = (await link.count()) > 0 ? await this.hrefOf(link) : '';
        return [label, href] as const;
      }),
    );
    return Object.fromEntries(entries);
  }

  // ---- wizard footer -------------------------------------------------------------

  get backButton(): Locator {
    return this.page.getByRole('button', { name: 'Back', exact: true });
  }

  get skipButton(): Locator {
    return this.page.getByRole('button', { name: 'Skip', exact: true });
  }

  /** Steps 3–6 share this label; step 2's reads "Save Changes & Continue". */
  get saveChangesButton(): Locator {
    return this.page.getByRole('button', { name: 'Save Changes', exact: true });
  }

  // ---- error boundary -------------------------------------------------------------

  /** Shown for an invalid `step` slug or a non-numeric `whmcsId`. */
  get errorBoundaryTitle(): Locator {
    return this.page.getByText('POS is unavailable right now');
  }

  get tryAgainButton(): Locator {
    return this.page.getByRole('button', { name: 'Try again' });
  }

  /**
   * The raw zod payload the boundary prints beside its title — the `code` /
   * `path` / enum dump captured on 2026-08-19.
   *
   * Correct behaviour is for this to be absent, so TC-ONB-165 asserts it is
   * hidden and is expected to FAIL until the leak is closed.
   */
  get errorBoundaryDetails(): Locator {
    return this.page.getByText(/"(code|path|expected)"\s*:/);
  }

  /** Whole visible text of the error screen, whitespace-collapsed. */
  async errorBoundaryText(): Promise<string> {
    return (await this.errorBoundaryTitle.innerText()).replace(/\s+/g, ' ').trim();
  }

  // ---- wizard footer, shared -------------------------------------------------------

  /**
   * Every footer control on the current step, in render order.
   *
   * Steps 3–6 give `['Back', 'Skip', 'Save Changes']`, step 2 only
   * `['Save Changes & Continue']`, step 7 none.
   */
  get wizardFooterButtons(): Locator {
    return this.page.getByRole('button', {
      name: /^(Back|Skip|Save Changes|Save Changes & Continue)$/,
    });
  }

  /** Labels of the footer controls, in order. */
  async wizardFooterLabels(): Promise<string[]> {
    const labels = await this.wizardFooterButtons.allInnerTexts();
    return labels.map((label) => label.replace(/\s+/g, ' ').trim());
  }

  // ---- step waits ------------------------------------------------------------------

  /** Wait out the DEV render and land on step 1's WHMCS ID form. */
  async waitForValidateForm(): Promise<void> {
    await expect(this.enterWhmcsIdHeading).toBeVisible({ timeout: Timeouts.LONG });
  }

  /** Wait out the DEV render and land on step 1's Integration Status panel. */
  async waitForIntegrationPanel(): Promise<void> {
    await expect(this.integrationStatusHeading).toBeVisible({ timeout: Timeouts.LONG });
  }

  /**
   * Which of the two step-1 branches is on screen right now.
   *
   * `whmcsId=0` is expected to reach the panel but keeps the form (TC-ONB-133),
   * which is exactly what this reads.
   */
  async validateBranch(): Promise<'form' | 'panel' | 'neither'> {
    if (await this.integrationStatusHeading.isVisible()) return 'panel';
    if (await this.enterWhmcsIdHeading.isVisible()) return 'form';
    return 'neither';
  }

  // ---- API stubbing & connectivity (negative cases) ---------------------------------

  /**
   * Answer one API glob with a canned status — see {@link ONBOARDING_API}.
   *
   * Install it BEFORE navigating; the route lives as long as the page.
   */
  async stubApi(
    urlGlob: string,
    status: number,
    body: unknown = { message: 'stubbed' },
  ): Promise<void> {
    await this.page.route(urlGlob, async (route) => {
      await route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify(body),
      });
    });
  }

  /** Kill one API glob outright — the transport-failure twin of {@link stubApi}. */
  async abortApi(urlGlob: string): Promise<void> {
    await this.page.route(urlGlob, async (route) => {
      await route.abort('failed');
    });
  }

  /** Toggle the browser context offline (TC-ONB-136). Always restore in a `finally`. */
  async setOffline(offline: boolean): Promise<void> {
    await this.page.context().setOffline(offline);
  }

  /** Drop the session cookies without touching the storageState file (TC-ONB-139). */
  async clearSessionCookies(): Promise<void> {
    await this.page.context().clearCookies();
  }

  // ---- layout / responsive ----------------------------------------------------------

  /** Whether the document scrolls sideways — the responsive cases' red line. */
  async hasHorizontalOverflow(): Promise<boolean> {
    return this.page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    );
  }

  /** Bounding boxes of every match, in DOM order; boxes that do not render are dropped. */
  async boundingBoxes(
    locator: Locator,
  ): Promise<Array<{ x: number; y: number; width: number; height: number }>> {
    const total = await locator.count();
    const boxes: Array<{ x: number; y: number; width: number; height: number }> = [];
    for (let index = 0; index < total; index += 1) {
      const box = await locator.nth(index).boundingBox();
      if (box) boxes.push(box);
    }
    return boxes;
  }

  /**
   * How many distinct columns a set of elements occupies.
   *
   * `1` proves a grid collapsed to a single column (TC-ONB-145). The tolerance
   * absorbs sub-pixel layout drift.
   */
  async columnCount(locator: Locator, tolerance = 8): Promise<number> {
    const boxes = await this.boundingBoxes(locator);
    return countClusters(
      boxes.map((box) => box.x),
      tolerance,
    );
  }

  /**
   * How many distinct rows a set of elements occupies — `> 1` proves the chips
   * wrapped instead of forcing a sideways scroll (TC-ONB-147).
   */
  async rowCount(locator: Locator, tolerance = 8): Promise<number> {
    const boxes = await this.boundingBoxes(locator);
    return countClusters(
      boxes.map((box) => box.y),
      tolerance,
    );
  }

  /**
   * Whether the stepper is laid out left-to-right.
   *
   * The bundle stacks it with `md:flex-col`, so below the `md` breakpoint the
   * cells share a row — true here — and above it they share a column.
   */
  async stepperIsHorizontal(): Promise<boolean> {
    const boxes = await this.boundingBoxes(this.stepperItems);
    if (boxes.length < 2) return false;
    const [first, second] = boxes;
    return Math.abs(first.y - second.y) < Math.abs(first.x - second.x);
  }

  /** Whether an element sits fully inside the viewport horizontally (TC-ONB-146). */
  async isWithinViewport(locator: Locator): Promise<boolean> {
    const box = await locator.first().boundingBox();
    const viewport = this.page.viewportSize();
    if (!box || !viewport) return false;
    return box.x >= -1 && box.x + box.width <= viewport.width + 1;
  }

  // ---- accessibility ----------------------------------------------------------------

  /** The seven Work Hours switches as one set — names read `<Day> open status`. */
  get workHoursSwitches(): Locator {
    return this.page.getByRole('switch', { name: /open status$/i });
  }

  /**
   * Accessible names of every match, in DOM order.
   *
   * Resolved the way a screen reader would: `aria-label` → `aria-labelledby` →
   * the wired `<label>` → `placeholder` → `title` → text content. TC-ONB-148
   * turns on that distinction, because `#whmcsId` currently takes its name from
   * the placeholder alone.
   */
  async accessibleNames(locator: Locator): Promise<string[]> {
    return locator.evaluateAll((elements) =>
      elements.map((element) => {
        const clean = (value: string | null | undefined): string =>
          (value ?? '').replace(/\s+/g, ' ').trim();
        const ariaLabel = clean(element.getAttribute('aria-label'));
        if (ariaLabel) return ariaLabel;
        const labelledBy = element.getAttribute('aria-labelledby');
        if (labelledBy) {
          const text = clean(
            labelledBy
              .split(/\s+/)
              .map((id) => document.getElementById(id)?.textContent ?? '')
              .join(' '),
          );
          if (text) return text;
        }
        const id = element.getAttribute('id');
        if (id) {
          const text = clean(document.querySelector(`label[for="${CSS.escape(id)}"]`)?.textContent);
          if (text) return text;
        }
        const wrapping = clean(element.closest('label')?.textContent);
        if (wrapping) return wrapping;
        const placeholder = clean(element.getAttribute('placeholder'));
        if (placeholder) return placeholder;
        const title = clean(element.getAttribute('title'));
        if (title) return title;
        return clean(element.textContent);
      }),
    );
  }

  /** Accessible name of the first match — `''` when nothing matches. */
  async accessibleNameOf(locator: Locator): Promise<string> {
    const names = await this.accessibleNames(locator.first());
    return names[0] ?? '';
  }

  /** Text an element points at with `aria-describedby` — `''` when unwired (TC-ONB-149). */
  async describedByText(locator: Locator): Promise<string> {
    return locator.first().evaluate((element) => {
      const ids = element.getAttribute('aria-describedby');
      if (!ids) return '';
      return ids
        .split(/\s+/)
        .map((id) => document.getElementById(id)?.textContent ?? '')
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
    });
  }

  /**
   * Every rendered heading as `{ level, text }`, in DOM order (TC-ONB-155).
   *
   * Steps 1-6 head their card with an `h3` while step 7 uses an `h2` and the
   * page title is not an `h1` at all — this outline is what makes that jump
   * assertable.
   */
  async headingOutline(): Promise<Array<{ level: number; text: string }>> {
    return this.page.locator('h1, h2, h3, h4, h5, h6').evaluateAll((elements) =>
      elements
        .filter((element) => element.getClientRects().length > 0)
        .map((element) => ({
          level: Number(element.tagName.slice(1)),
          text: (element.textContent ?? '').replace(/\s+/g, ' ').trim(),
        })),
    );
  }

  /** Tag / role / name of whatever holds focus (TC-ONB-153 / 154). */
  async focusedElement(): Promise<{ tag: string; role: string; name: string }> {
    return this.page.evaluate(() => {
      const element = document.activeElement;
      if (!element) return { tag: '', role: '', name: '' };
      const name = (
        element.getAttribute('aria-label') ??
        element.getAttribute('placeholder') ??
        element.textContent ??
        ''
      )
        .replace(/\s+/g, ' ')
        .trim();
      return { tag: element.tagName.toLowerCase(), role: element.getAttribute('role') ?? '', name };
    });
  }

  /**
   * Whether a control carries a real `disabled` attribute rather than only
   * looking dimmed (TC-ONB-157). `aria-disabled` alone returns `false`.
   */
  async hasDisabledAttribute(control: Locator): Promise<boolean> {
    return control.first().evaluate((element) => element.hasAttribute('disabled'));
  }

  // ---- diagnostics & security -------------------------------------------------------

  /**
   * Start collecting console errors and uncaught page errors.
   *
   * Call it BEFORE navigating and read the array afterwards — the listeners
   * live as long as the page (TC-ONB-162).
   */
  captureConsoleErrors(): string[] {
    const errors: string[] = [];
    this.page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    this.page.on('pageerror', (error) => errors.push(error.message));
    return errors;
  }

  /**
   * Start collecting (and dismissing) native dialogs.
   *
   * An `alert(1)` fired by an injected payload lands here, so the XSS cases can
   * assert the array stayed empty (TC-ONB-166 / 167).
   */
  captureDialogs(): string[] {
    const messages: string[] = [];
    this.page.on('dialog', (dialog) => {
      messages.push(dialog.message());
      void dialog.dismiss();
    });
    return messages;
  }

  /** Milliseconds until a locator becomes visible — the performance cases' stopwatch. */
  async measureVisibleMs(locator: Locator, timeout: number = Timeouts.LONG): Promise<number> {
    const startedAt = Date.now();
    await expect(locator).toBeVisible({ timeout });
    return Date.now() - startedAt;
  }

  /** Whole visible text of the page, whitespace-collapsed (TC-ONB-168). */
  async visibleText(): Promise<string> {
    return (await this.page.locator('body').innerText()).replace(/\s+/g, ' ').trim();
  }

  /**
   * How many `<script>` elements in the document carry a marker string.
   *
   * `0` proves a typed payload was rendered as text and never parsed as HTML
   * (TC-ONB-166 / 167).
   */
  async injectedScriptCount(marker = 'alert(1)'): Promise<number> {
    return this.page.evaluate(
      (needle) =>
        Array.from(document.querySelectorAll('script')).filter((script) =>
          (script.textContent ?? '').includes(needle),
        ).length,
      marker,
    );
  }

  /** Assert the visit bounced to `/login` — see {@link LOGIN_URL_PATTERN}. */
  async expectRedirectedToLogin(): Promise<void> {
    await expect(this.page).toHaveURL(LOGIN_URL_PATTERN, { timeout: Timeouts.LONG });
  }
}

/** Escape a literal so it can be embedded in a RegExp. */
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Cluster near-equal coordinates and count the groups — how
 * {@link OnboardingPage.columnCount} and {@link OnboardingPage.rowCount} decide
 * how many columns or rows a set of boxes occupies.
 */
function countClusters(values: number[], tolerance: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  let clusters = 0;
  let anchor = Number.NEGATIVE_INFINITY;
  for (const value of sorted) {
    if (value - anchor > tolerance) {
      clusters += 1;
      anchor = value;
    }
  }
  return clusters;
}
