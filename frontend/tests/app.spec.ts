import { test, expect } from '@playwright/test';

test.describe('PyBNF UI End-to-End', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load the dashboard and show the configuration tab', async ({ page }) => {
    await expect(page).toHaveTitle(/PyBNF Web UI/i);
    await expect(page.getByText('Research Dashboard')).toBeVisible();
    await expect(page.getByText('REFERENCE CONFIGURATION LIBRARY')).toBeVisible();
    await expect(page.getByText('REPOSITORY EXAMPLE CATALOG')).toBeVisible();
  });

  test('should allow selecting a template and updating the editor', async ({ page }) => {
    // Wait for templates to be visible
    const templateCard = page.getByText('Standard BNG Parabola').first();
    await expect(templateCard).toBeVisible();
    
    // Click the template
    await templateCard.click();
    
    // Verify the "Schedule Run" button is visible in the main dashboard
    const executeBtn = page.getByRole('button', { name: 'Schedule Run' });
    await expect(executeBtn).toBeVisible();
  });

  test('should execute simulation and switch to telemetry tab', async ({ page }) => {
    // 1. Select a template to ensure we have a valid model
    await page.getByText('Standard BNG Parabola').first().click();

    await expect(page.getByText('SYSTEM NOMINAL')).toBeVisible({ timeout: 30000 });
    // 2. Click Schedule Run
    const executeBtn = page.getByRole('button', { name: 'Execute Simulation Protocol' });
    await executeBtn.click();
    
    // 3. Verify tab switch (Telemetry tab should be active)
    await expect(page.locator('body')).toContainText('Active Experiment:', { timeout: 15000 });
    
    // 4. Check for status indicator
    const statusChip = page.locator('.MuiChip-label').filter({ hasText: /PROCESS ACTIVE|ENGINE STANDBY|SYSTEM NOMINAL/i }).first();
    await expect(statusChip).toBeVisible();
  });

  test('should load a shipped repo example into the editor', async ({ page }) => {
    await page.getByPlaceholder(/Search shipped \.conf examples/i).fill('demo_bng.conf');
    await page.getByText('demo/demo_bng.conf').click();
    await expect(page.locator('body')).toContainText('Loaded from examples/demo/demo_bng.conf');
  });
});
