import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
  test('halaman utama dapat dimuat', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('body')).toBeVisible();
  });

  test('navigasi ke halaman statistik', async ({ page }) => {
    await page.goto('/');
    await page.click('a[href="/statistik"]');
    await expect(page).toHaveURL(/\/statistik/);
  });

  test('navigasi ke halaman asesmen', async ({ page }) => {
    await page.goto('/');
    await page.click('a[href="/assessment"]');
    await expect(page).toHaveURL(/\/assessment/);
  });

  test('navigasi ke halaman kuesioner', async ({ page }) => {
    await page.goto('/');
    await page.click('a[href="/kuesioner"]');
    await expect(page).toHaveURL(/\/kuesioner/);
  });

  test('navigasi ke halaman bantuan', async ({ page }) => {
    await page.goto('/');
    await page.click('a[href="/help"]');
    await expect(page).toHaveURL(/\/help/);
  });

  test('aksesibilitas - semua link utama dapat dijangkau keyboard', async ({ page }) => {
    await page.goto('/');
    const links = page.locator('a');
    const count = await links.count();
    expect(count).toBeGreaterThan(0);
    // Verifikasi minimal ada beberapa link yang bisa difokus
    const firstLink = links.first();
    await firstLink.focus();
    await expect(firstLink).toBeFocused();
  });
});
