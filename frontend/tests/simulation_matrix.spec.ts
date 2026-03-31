import { test, expect, Page } from '@playwright/test';

type Scenario = {
  name: string;
  confText: string;
  configState: {
    fit_type: string;
    objfunc: string;
    population_size: number;
    max_iterations: number;
  };
  runningPattern: RegExp;
  timeoutMs: number;
};

const EGFR_PARAMS = `
loguniform_var = kp1__FREE 1e-8 1e-4
loguniform_var = km1__FREE 1e-3 10
loguniform_var = kp2__FREE 1e-8 1e-4
loguniform_var = km2__FREE 1e-3 10
loguniform_var = kp3__FREE 1e-3 10
loguniform_var = km3__FREE 1e-3 10
loguniform_var = kp14__FREE 1e-3 10
loguniform_var = km14__FREE 1e-3 10
loguniform_var = km16__FREE 1e-3 10
loguniform_var = kp9__FREE 1e-8 1e-4
loguniform_var = km9__FREE 1e-3 10
loguniform_var = kp10__FREE 1e-8 1e-4
loguniform_var = km10__FREE 1e-3 10
loguniform_var = kp11__FREE 1e-8 1e-4
loguniform_var = km11__FREE 1e-3 10
loguniform_var = kp13__FREE 1e-8 1e-4
loguniform_var = km13__FREE 1e-3 10
loguniform_var = kp15__FREE 1e-8 1e-4
loguniform_var = km15__FREE 1e-3 10
loguniform_var = kp17__FREE 1e-8 1e-4
loguniform_var = km17__FREE 1e-3 10
loguniform_var = kp18__FREE 1e-8 1e-4
loguniform_var = km18__FREE 1e-3 10
loguniform_var = kp19__FREE 1e-8 1e-4
loguniform_var = km19__FREE 1e-3 10
loguniform_var = kp20__FREE 1e-8 1e-4
loguniform_var = km20__FREE 1e-3 10
loguniform_var = kp24__FREE 1e-8 1e-4
loguniform_var = km24__FREE 1e-3 10
loguniform_var = kp21__FREE 1e-8 1e-4
loguniform_var = km21__FREE 1e-3 10
loguniform_var = kp23__FREE 1e-8 1e-4
loguniform_var = km23__FREE 1e-3 10
loguniform_var = kp12__FREE 1e-8 1e-4
loguniform_var = km12__FREE 1e-3 10
loguniform_var = kp22__FREE 1e-8 1e-4
loguniform_var = km22__FREE 1e-3 10
`.trim();

const SCENARIOS: Scenario[] = [
  {
    name: 'Parabola',
    confText: `
output_dir = output/parabola_ui_smoke
model = examples/demo/parabola.bngl : examples/demo/par1.exp
fit_type = de
objfunc = chi_sq
uniform_var = v1__FREE 0 2
uniform_var = v2__FREE 0 2
uniform_var = v3__FREE 0 5
population_size = 4
max_iterations = 2
verbosity = 2
    `.trim(),
    configState: {
      fit_type: 'de',
      objfunc: 'chi_sq',
      population_size: 4,
      max_iterations: 2
    },
    runningPattern: /Running Differential Evolution/i,
    timeoutMs: 120000
  },
  {
    name: 'EGFR',
    confText: `
output_dir = output/egfr_ui_smoke
model = examples/egfr_benchmark/egfr.bngl : examples/egfr_benchmark/egfr.exp
fit_type = de
objfunc = ave_norm_sos
population_size = 4
max_iterations = 1
verbosity = 2

${EGFR_PARAMS}
    `.trim(),
    configState: {
      fit_type: 'de',
      objfunc: 'ave_norm_sos',
      population_size: 4,
      max_iterations: 1
    },
    runningPattern: /Generating network for model egfr_gen_net\.bngl|Running Differential Evolution/i,
    timeoutMs: 180000
  },
  {
    name: 'Yeast',
    confText: `
output_dir = output/yeast_ui_smoke
model = examples/yeast_cell_cycle/yeast_alpha.xml : examples/yeast_cell_cycle/alpha.exp, examples/yeast_cell_cycle/alpha.prop
fit_type = ss
objfunc = sos
initialization = lh
population_size = 12
max_iterations = 2
verbosity = 2
ind_var_rounding = 1
sbml_integrator = euler
time_course = model:yeast_alpha, time:1000, step:1, subdivisions:20, suffix:alpha

loguniform_var = Dn3 0.01 100
loguniform_var = CLN3 0.0018 18
loguniform_var = ks_k2 0.00135 13.5
loguniform_var = BCK2 0.00066 6.6
loguniform_var = ks_n2_bf 0.005 50
loguniform_var = ks_ki 0.00012 1.2
loguniform_var = ks_ki_swi5 0.0012 12
loguniform_var = WHI5T 0.03 300
loguniform_var = WHI5deP 0.0202 202
loguniform_var = ks_n2 1e-10 1e-6
loguniform_var = CLN2 0.001 10
loguniform_var = CDH1T 0.01 100
loguniform_var = CDH1A 0.01 100
loguniform_var = ks_20 6e-05 0.6
loguniform_var = ks_20_m1 0.006 60
uniform_var = phi_alpha 500 650
    `.trim(),
    configState: {
      fit_type: 'ss',
      objfunc: 'sos',
      population_size: 12,
      max_iterations: 2
    },
    runningPattern: /Running Scatter Search/i,
    timeoutMs: 240000
  }
];

async function seedAppState(page: Page, scenario: Scenario) {
  await page.addInitScript((payload: { confText: string; configState: Scenario['configState'] }) => {
    window.localStorage.clear();
    window.localStorage.setItem('pybnf_conf_text', payload.confText);
    window.localStorage.setItem('pybnf_history', JSON.stringify([]));
    window.localStorage.setItem('pybnf_active_tab', '0');
    window.localStorage.setItem('pybnf_config', JSON.stringify({
      ...payload.configState,
      parallel_count: null,
      delete_old_files: 1,
      output_every: 20
    }));
  }, { confText: scenario.confText, configState: scenario.configState });
}

test.describe('PyBNF Template Smoke Matrix', () => {
  for (const scenario of SCENARIOS) {
    test(`runs ${scenario.name} end-to-end through the UI`, async ({ page }) => {
      test.setTimeout(scenario.timeoutMs);

      await seedAppState(page, scenario);
      await page.goto('/');

      await expect(page.getByText('Research Dashboard')).toBeVisible();
      await expect(page.getByText('SYSTEM NOMINAL')).toBeVisible({ timeout: 30000 });
      await expect(page.getByRole('button', { name: 'Execute Simulation Protocol' })).toBeVisible();

      await page.getByRole('button', { name: 'Execute Simulation Protocol' }).click();

      await expect(page.locator('body')).toContainText('Active Experiment:', { timeout: 15000 });
      await expect(page.locator('body')).toContainText(scenario.runningPattern, { timeout: 30000 });
      await expect(page.locator('body')).toContainText('Fitting complete', { timeout: scenario.timeoutMs - 30000 });
      await expect(page.locator('body')).not.toContainText('Sorry, an unknown error occurred');
      await expect(page.locator('body')).not.toContainText(/Error:/);
      await expect(page.locator('body')).not.toContainText('RESIDUAL: ---', { timeout: 15000 });

      await page.getByRole('button', { name: 'Artifacts' }).click();
      await expect(page.getByText('TOTAL ARTIFACTS')).toBeVisible();
      await expect(page.locator('tbody tr').first()).toBeVisible({ timeout: 30000 });
    });
  }
});
