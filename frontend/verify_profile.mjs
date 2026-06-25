import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
page.setDefaultTimeout(15000);

// ── 1. LOGIN ──────────────────────────────────────────────────────────────
await page.goto('http://localhost:5173/login');
await page.waitForLoadState('networkidle');
await page.fill('#email', 'patient1@gmail.com');
await page.fill('#password', 'Password@123');
await page.screenshot({ path: 'verify_ss1_before_login.png', fullPage: false });
await page.click('button[type="submit"]');
await page.waitForTimeout(3000);
const urlAfterLogin = page.url();
await page.screenshot({ path: 'verify_ss2_after_login.png', fullPage: false });
console.log('URL after login:', urlAfterLogin);

// ── 2. NAVIGATE TO PROFILE ────────────────────────────────────────────────
await page.goto('http://localhost:5173/patient/profile');
await page.waitForLoadState('networkidle');
await page.waitForTimeout(2000);
await page.screenshot({ path: 'verify_ss3_profile_view.png', fullPage: true });

// ── 3. READ DISPLAYED CONTENT ─────────────────────────────────────────────
const h2Texts = await page.locator('h2').allTextContents();
console.log('h2 (avatar name area):', h2Texts);

const emailP = await page.locator('p').allTextContents();
console.log('p texts:', emailP.slice(0, 6));

// Get all label→value pairs in the form
const fields = await page.evaluate(() => {
  const results = [];
  document.querySelectorAll('label').forEach(label => {
    const container = label.parentElement;
    const displayDiv = container?.querySelector('div[style]');
    const inputEl = container?.querySelector('input, select');
    results.push({
      label: label.textContent.trim(),
      displayValue: displayDiv?.textContent.trim() || '',
      inputValue: inputEl?.value || ''
    });
  });
  return results;
});
console.log('Form fields (view mode):', JSON.stringify(fields, null, 2));

// ── 4. PROBE: click Chỉnh sửa and check inputs pre-filled ─────────────────
const editBtn = page.getByText('Chỉnh sửa');
if (await editBtn.count() > 0) {
  await editBtn.click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'verify_ss4_edit_mode.png', fullPage: true });
  const editInputs = await page.evaluate(() =>
    Array.from(document.querySelectorAll('input')).map(i => ({
      name: i.name, value: i.value, placeholder: i.placeholder
    }))
  );
  console.log('Edit mode inputs:', JSON.stringify(editInputs));
} else {
  console.log('Chỉnh sửa button not found');
}

await browser.close();
console.log('Done. Screenshots: verify_ss*.png');
