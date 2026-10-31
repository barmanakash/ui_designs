import { expect, test } from '@playwright/test'

// These run in DEMO MODE (see playwright.config.ts): no Supabase, no payments, deterministic seed data.
// "Pro" is simulated with the demo toggle on /account, which is the app's built-in stand-in for a paid plan.

const PRO_DESIGN = '/design/agent-run-timeline?tab=code' // is_pro_content = true
const FREE_DESIGN = '/design/upi-scan-pay?tab=code' //      is_pro_content = false

test('browse the gallery and filter by tag', async ({ page }) => {
  await page.goto('/explore')
  await expect(page.getByRole('link', { name: /UPI Scan & Pay/ }).first()).toBeVisible()
  await expect(page.getByRole('link', { name: /Agent Run Timeline/ }).first()).toBeVisible()

  // Filters live in the URL, so a tag link narrows the grid.
  await page.goto('/explore?tag=transparency')
  await expect(page.getByRole('link', { name: /Agent Run Timeline/ }).first()).toBeVisible()
  await expect(page.getByRole('link', { name: /UPI Scan & Pay/ })).toHaveCount(0)

  // Open a design from the grid.
  await page.getByRole('link', { name: /Agent Run Timeline/ }).first().click()
  await expect(page.getByRole('heading', { level: 1, name: 'Agent Run Timeline' })).toBeVisible()
})

test('a free user sees the paywall instead of Pro code, but free designs stay open', async ({ page }) => {
  await page.goto(PRO_DESIGN)
  await expect(page.getByText('Unlock the code')).toBeVisible()
  await expect(page.getByRole('link', { name: /Unlock with Pro/ })).toBeVisible()
  // The real code block must not be on the page at all.
  await expect(page.getByText('React + Tailwind')).toHaveCount(0)

  await page.goto(FREE_DESIGN)
  await expect(page.getByText('React + Tailwind')).toBeVisible()
  await expect(page.getByText('Unlock the code')).toHaveCount(0)
})

test('enabling Pro unlocks code and prompts', async ({ page }) => {
  await page.goto('/account')
  await page.getByRole('button', { name: 'Enable Pro demo' }).click()
  await expect(page.getByRole('button', { name: 'Switch to Free demo' })).toBeVisible()

  await page.goto(PRO_DESIGN)
  await expect(page.getByText('React + Tailwind')).toBeVisible()
  await expect(page.getByText('Unlock the code')).toHaveCount(0)

  await page.goto('/design/agent-run-timeline?tab=prompt')
  await expect(page.getByText('Prompt for Claude, Cursor or v0')).toBeVisible()
})
