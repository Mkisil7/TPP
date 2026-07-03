import { chromium } from "playwright-core";
import { totp } from "./totp-util.mjs";

const BASE = "http://localhost:3000";
const email = `totptest+${Date.now()}@adt.com`;
const password = "Totp-Test-12345";

const results = [];
const check = (name, ok, extra = "") => {
  results.push(ok);
  console.log(`${ok ? "✅" : "❌"} ${name}${extra ? "  — " + extra : ""}`);
};

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const page = await ctx.newPage();

// ---- 1. Sign up → enrollment screen with QR + secret ----
await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
await page.getByText("Need an account? Create one").click();
await page.fill("#email", email);
await page.fill("#password", password);
await page.getByRole("button", { name: "Create account" }).click();
await page.waitForURL(/\/verify/, { timeout: 20000 }).catch(() => {});
check("signup lands on /verify", page.url().includes("/verify"), page.url());
const bodyText = await page.locator("main").innerText();
check("enrollment screen shown", bodyText.includes("Set up two-factor sign-in"));
const secret = await page.getByTestId("totp-secret").innerText().catch(() => "");
check("QR + setup key rendered", secret.length >= 16, `secret=${secret.slice(0, 6)}…`);
if (!secret) { await browser.close(); process.exit(1); }

// ---- 2. Wrong code rejected during enrollment ----
await page.fill("#code", totp(secret) === "000000" ? "111111" : "000000");
await page.getByRole("button", { name: "Verify & continue" }).click();
await page.waitForTimeout(2500);
check("wrong code rejected", (await page.locator("main").innerText()).includes("doesn't match"));

// ---- 3. Unverified session is fenced ----
await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
check("unverified device fenced to /verify", page.url().includes("/verify"));

// ---- 4. Correct authenticator code completes enrollment → dashboard ----
// (fresh page load may have re-enrolled a new secret — re-read it)
const secret2 = await page.getByTestId("totp-secret").innerText().catch(() => secret);
await page.fill("#code", totp(secret2));
await page.getByRole("button", { name: "Verify & continue" }).click();
await page.waitForURL((u) => new URL(u).pathname === "/", { timeout: 20000 }).catch(() => {});
check("correct code lands on dashboard", (await page.locator("main").innerText().catch(() => "")).includes("Jobs"), page.url());

// ---- 5. Sign out / sign in on same device → no challenge ----
await page.getByRole("button", { name: "Sign out" }).click();
await page.waitForURL(/\/login/, { timeout: 15000 });
await page.fill("#email", email);
await page.fill("#password", password);
await page.getByRole("button", { name: "Sign in" }).click();
await page.waitForURL((u) => new URL(u).pathname === "/", { timeout: 20000 }).catch(() => {});
check("trusted device skips 2FA", (await page.locator("main").innerText().catch(() => "")).includes("Jobs"), page.url());

// ---- 6. Brand-new device (fresh browser context) → challenge, not QR ----
const ctx2 = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const page2 = await ctx2.newPage();
await page2.goto(`${BASE}/login`, { waitUntil: "networkidle" });
await page2.fill("#email", email);
await page2.fill("#password", password);
await page2.getByRole("button", { name: "Sign in" }).click();
await page2.waitForURL(/\/verify/, { timeout: 20000 }).catch(() => {});
const t2 = await page2.locator("main").innerText();
check("new device gets challenge (no new QR)", t2.includes("authenticator app") && !t2.includes("Set up two-factor"), page2.url());
await page2.fill("#code", totp(secret2));
await page2.getByRole("button", { name: "Verify & continue" }).click();
await page2.waitForURL((u) => new URL(u).pathname === "/", { timeout: 20000 }).catch(() => {});
check("new device verified with authenticator code", (await page2.locator("main").innerText().catch(() => "")).includes("Jobs"), page2.url());

await browser.close();
const fails = results.filter((r) => !r).length;
console.log(`\n${fails === 0 ? "PASS" : "FAIL"}: ${results.length - fails}/${results.length} checks passed`);
process.exit(fails === 0 ? 0 : 1);
