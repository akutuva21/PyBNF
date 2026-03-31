import { test, expect, Page } from '@playwright/test';
import path from 'path';
import { readFile } from 'fs/promises';

type RepoScenario = {
  name: string;
  relativePath: string;
  configState: {
    fit_type: string;
    objfunc: string;
    population_size: number;
    max_iterations: number;
  };
  overrides: string;
  runningPattern: RegExp;
  timeoutMs: number;
};

const REPO_ROOT = path.resolve(process.cwd(), '..');

const SCENARIOS: RepoScenario[] = [
  {
    name: 'demo_bng.conf',
    relativePath: 'examples/demo/demo_bng.conf',
    configState: {
      fit_type: 'de',
      objfunc: 'chi_sq',
      population_size: 4,
      max_iterations: 2,
    },
    overrides: `
output_dir = output/ui_repo_demo_bng
population_size = 4
max_iterations = 2
verbosity = 2
    `.trim(),
    runningPattern: /Running Differential Evolution/i,
    timeoutMs: 120000,
  },
  {
    name: 'demo_xml.conf',
    relativePath: 'examples/demo/demo_xml.conf',
    configState: {
      fit_type: 'de',
      objfunc: 'chi_sq',
      population_size: 4,
      max_iterations: 2,
    },
    overrides: `
output_dir = output/ui_repo_demo_xml
population_size = 4
max_iterations = 2
verbosity = 2
    `.trim(),
    runningPattern: /Running Differential Evolution/i,
    timeoutMs: 120000,
  },
  {
    name: 'parabola.conf',
    relativePath: 'examples/constraint_demo/parabola.conf',
    configState: {
      fit_type: 'ss',
      objfunc: 'sos',
      population_size: 8,
      max_iterations: 1,
    },
    overrides: `
output_dir = output/ui_repo_constraint_parabola
population_size = 8
max_iterations = 1
verbosity = 2
    `.trim(),
    runningPattern: /Running Scatter Search/i,
    timeoutMs: 180000,
  },
];

async function seedRepoScenario(page: Page, scenario: RepoScenario) {
  const absolutePath = path.join(REPO_ROOT, scenario.relativePath);
  const baseDir = path.dirname(absolutePath);
  const source = scenario.relativePath.startsWith('benchmarks/') ? 'benchmarks' : 'examples';
  const sourceRelative = scenario.relativePath.replace(/^[^/]+\//, '');
  const baseConfig = await readFile(absolutePath, 'utf-8');
  const confText = `${baseConfig.trim()}\n\n${scenario.overrides}\n`;

  await page.addInitScript((payload: {
    confText: string;
    configState: RepoScenario['configState'];
    runContext: { source: string; name: string; path: string; baseDir: string };
  }) => {
    window.localStorage.clear();
    window.localStorage.setItem('pybnf_conf_text', payload.confText);
    window.localStorage.setItem('pybnf_history', JSON.stringify([]));
    window.localStorage.setItem('pybnf_active_tab', '0');
    window.localStorage.setItem('pybnf_run_context', JSON.stringify(payload.runContext));
    window.localStorage.setItem('pybnf_config', JSON.stringify({
      ...payload.configState,
      parallel_count: null,
      delete_old_files: 1,
      output_every: 20
    }));
  }, {
    confText,
    configState: scenario.configState,
    runContext: {
      source,
      name: sourceRelative,
      path: absolutePath,
      baseDir,
    }
  });
}

test.describe('PyBNF Repo Example End-to-End', () => {
  for (const scenario of SCENARIOS) {
    test(`runs shipped config ${scenario.name} end-to-end`, async ({ page }) => {
      test.setTimeout(scenario.timeoutMs);

      await seedRepoScenario(page, scenario);
      await page.goto('/');

      await expect(page.getByText('Research Dashboard')).toBeVisible();
      await expect(page.locator('body')).toContainText(`Loaded from examples/${scenario.relativePath.replace(/^examples\//, '')}`);
      await expect(page.getByText('SYSTEM NOMINAL')).toBeVisible({ timeout: 30000 });

      await page.getByRole('button', { name: 'Execute Simulation Protocol' }).click();

      await expect(page.locator('body')).toContainText('Active Experiment:', { timeout: 15000 });
      await expect(page.locator('body')).toContainText(scenario.runningPattern, { timeout: 30000 });
      await expect(page.locator('body')).toContainText('Fitting complete', { timeout: scenario.timeoutMs - 30000 });
      await expect(page.locator('body')).not.toContainText('Sorry, an unknown error occurred');
      await expect(page.locator('body')).not.toContainText(/Error:/);

      await page.getByRole('button', { name: 'Artifacts' }).click();
      await expect(page.getByText('TOTAL ARTIFACTS')).toBeVisible();
      await expect(page.locator('tbody tr').first()).toBeVisible({ timeout: 30000 });
    });
  }
});
