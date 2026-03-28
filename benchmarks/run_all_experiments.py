#!/usr/bin/env python3
"""
Phase 4: Run all sampler comparison experiments.

Orchestrates the six experiments from the SAMPLER_COMPARISON_ROADMAP:
  1. Correctness:     Gaussian d=5, verify sampled moments match truth
  2. Efficiency (lo): Gaussian d=5, compare ESS/evaluation
  3. Efficiency (hi): Gaussian d=5,10,20,50, scaling study
  4. Correlated:      Banana distribution
  5. Multimodal:      Mixture of Gaussians
  6. Real-world:      EGFR benchmark (d=37), requires BioNetGen

Experiments 1-2 share the same runs (gaussian_d5). The script avoids re-running
a benchmark that already has results unless --force is given.

Usage:
    python run_all_experiments.py [--replicates N] [--parallel P] [--force]
    python run_all_experiments.py --experiments 1 2 3    # run subset
    python run_all_experiments.py --skip-egfr             # skip slow real-world test
"""

import argparse
import json
import os
import subprocess
import sys
import time

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
RUN_BENCHMARK = os.path.join(SCRIPT_DIR, 'run_benchmark.py')

# Experiment definitions: (name, benchmark_dir, description, extra_args)
ANALYTICAL_EXPERIMENTS = [
    ('gaussian_d5',  'gaussian_d5',  'Correctness + Efficiency (low-d)', {}),
    ('gaussian_d10', 'gaussian_d10', 'Scaling study d=10', {}),
    ('gaussian_d20', 'gaussian_d20', 'Scaling study d=20', {}),
    ('gaussian_d50', 'gaussian_d50', 'Scaling study d=50', {}),
    ('banana',       'banana',       'Correlated (banana) target', {}),
    ('multimodal',   'multimodal',   'Multimodal (mixture) target', {}),
]

EGFR_EXPERIMENT = ('egfr', 'egfr', 'Real-world EGFR (d=37)', {})

# Map experiment numbers from the roadmap to benchmark runs
EXPERIMENT_MAP = {
    1: ['gaussian_d5'],                                          # Correctness
    2: ['gaussian_d5'],                                          # Efficiency (low-d)
    3: ['gaussian_d5', 'gaussian_d10', 'gaussian_d20', 'gaussian_d50'],  # Scaling
    4: ['banana'],                                               # Correlated
    5: ['multimodal'],                                           # Multimodal
    6: ['egfr'],                                                 # Real-world
}


def has_results(bench_dir):
    """Check if a benchmark already has results."""
    results_path = os.path.join(bench_dir, 'runs', 'results.json')
    return os.path.isfile(results_path)


def run_benchmark(bench_dir, replicates, parallel=None, force=False):
    """Run a single benchmark via run_benchmark.py."""
    bench_path = os.path.join(SCRIPT_DIR, bench_dir)
    if not os.path.isdir(bench_path):
        print('  ERROR: directory %s not found, skipping' % bench_path)
        return False

    if has_results(bench_path) and not force:
        print('  Already has results (use --force to re-run)')
        return True

    cmd = [sys.executable, RUN_BENCHMARK, bench_path,
           '--replicates', str(replicates)]
    if parallel is not None:
        cmd += ['--parallel', str(parallel)]

    result = subprocess.run(cmd, cwd=SCRIPT_DIR)
    return result.returncode == 0


def load_results(bench_dir):
    """Load results.json for a benchmark."""
    path = os.path.join(SCRIPT_DIR, bench_dir, 'runs', 'results.json')
    if not os.path.isfile(path):
        return None
    with open(path) as f:
        return json.load(f)


def print_scaling_table(dimensions):
    """Print a combined scaling table across Gaussian dimensions."""
    import numpy as np

    print('\n' + '=' * 100)
    print('SCALING STUDY: ESS/evaluation vs. dimension')
    print('=' * 100)
    print('%-6s %-8s %8s %12s %12s %12s %12s' % (
        'Dim', 'Sampler', 'N', 'Wall(s)', 'ESS/eval', 'D_metric', 'MaxR-hat'))
    print('-' * 100)

    for d in dimensions:
        results = load_results('gaussian_d%d' % d)
        if results is None:
            print('d=%-4d  (no results)' % d)
            continue

        by_sampler = {}
        for r in results:
            by_sampler.setdefault(r['sampler'], []).append(r)

        for sampler in ['am', 'dream', 'dream_zsp', 'scream']:
            runs = [r for r in by_sampler.get(sampler, []) if r.get('success')]
            if not runs:
                print('d=%-4d %-8s  no successful runs' % (d, sampler))
                continue
            n = len(runs)
            wall = np.mean([r['wall_clock'] for r in runs])
            ess_eval = [r['min_ess_per_eval'] for r in runs
                        if 'min_ess_per_eval' in r and np.isfinite(r['min_ess_per_eval'])]
            d_vals = [r['distance_D'] for r in runs
                      if 'distance_D' in r and np.isfinite(r['distance_D'])]
            rhat_vals = [r['max_rhat'] for r in runs
                         if 'max_rhat' in r and np.isfinite(r['max_rhat'])]

            ess_str = '%.4f+-%.4f' % (np.mean(ess_eval), np.std(ess_eval)) if ess_eval else 'N/A'
            d_str = '%.3f+-%.3f' % (np.mean(d_vals), np.std(d_vals)) if d_vals else 'N/A'
            rhat_str = '%.3f+-%.3f' % (np.mean(rhat_vals), np.std(rhat_vals)) if rhat_vals else 'N/A'

            print('d=%-4d %-8s %8d %10.1f %12s %12s %12s' % (
                d, sampler, n, wall, ess_str, d_str, rhat_str))
        print()

    print('=' * 100)


def print_summary():
    """Print a combined summary of all experiments."""
    import numpy as np

    print('\n')
    print('#' * 100)
    print('#  PHASE 4 EXPERIMENT SUMMARY')
    print('#' * 100)

    # --- Experiment 1: Correctness ---
    print('\n--- Experiment 1: Correctness (Gaussian d=5) ---')
    results = load_results('gaussian_d5')
    if results:
        gt_path = os.path.join(SCRIPT_DIR, 'gaussian_d5', 'ground_truth.json')
        with open(gt_path) as f:
            gt = json.load(f)
        true_mean = np.array(gt['posterior_mean'])
        true_std = np.array(gt['posterior_std'])

        for sampler in ['am', 'dream', 'dream_zsp', 'scream']:
            runs = [r for r in results if r['sampler'] == sampler and r.get('success')]
            if not runs:
                continue
            d_vals = [r['distance_D'] for r in runs if 'distance_D' in r]
            print('  %s: D = %.4f +- %.4f (N=%d)  [D < 0.2 = good]' % (
                sampler, np.mean(d_vals), np.std(d_vals), len(runs)))
            # Show mean/std recovery for first successful run
            r = runs[0]
            if 'sampled_mean' in r:
                sm = np.array(r['sampled_mean'])
                ss = np.array(r['sampled_std'])
                print('    mean error: %s' % np.round(sm - true_mean, 3))
                print('    std  error: %s' % np.round(ss - true_std, 3))
    else:
        print('  (not yet run)')

    # --- Experiment 2: Efficiency (low-d) ---
    print('\n--- Experiment 2: Efficiency (Gaussian d=5, ESS/eval) ---')
    if results:
        for sampler in ['am', 'dream', 'dream_zsp', 'scream']:
            runs = [r for r in results if r['sampler'] == sampler and r.get('success')]
            ess_eval = [r['min_ess_per_eval'] for r in runs
                        if 'min_ess_per_eval' in r and np.isfinite(r['min_ess_per_eval'])]
            if ess_eval:
                print('  %s: ESS/eval = %.4f +- %.4f' % (
                    sampler, np.mean(ess_eval), np.std(ess_eval)))
    else:
        print('  (not yet run)')

    # --- Experiment 3: Scaling ---
    print('\n--- Experiment 3: Scaling (Gaussian d=5,10,20,50) ---')
    dims_with_results = []
    for d in [5, 10, 20, 50]:
        if load_results('gaussian_d%d' % d) is not None:
            dims_with_results.append(d)
    if dims_with_results:
        print_scaling_table(dims_with_results)
    else:
        print('  (not yet run)')

    # --- Experiment 4: Banana ---
    print('\n--- Experiment 4: Correlated target (Banana) ---')
    results = load_results('banana')
    if results:
        for sampler in ['am', 'dream', 'dream_zsp', 'scream']:
            runs = [r for r in results if r['sampler'] == sampler and r.get('success')]
            if not runs:
                continue
            ess_eval = [r['min_ess_per_eval'] for r in runs
                        if 'min_ess_per_eval' in r and np.isfinite(r['min_ess_per_eval'])]
            rhat = [r['max_rhat'] for r in runs if 'max_rhat' in r]
            print('  %s: ESS/eval = %.4f +- %.4f, R-hat = %.3f +- %.3f (N=%d)' % (
                sampler,
                np.mean(ess_eval) if ess_eval else float('nan'),
                np.std(ess_eval) if ess_eval else float('nan'),
                np.mean(rhat), np.std(rhat), len(runs)))
    else:
        print('  (not yet run)')

    # --- Experiment 5: Multimodal ---
    print('\n--- Experiment 5: Multimodal target (Mixture of Gaussians) ---')
    results = load_results('multimodal')
    if results:
        for sampler in ['am', 'dream', 'dream_zsp', 'scream']:
            runs = [r for r in results if r['sampler'] == sampler and r.get('success')]
            if not runs:
                continue
            ess_eval = [r['min_ess_per_eval'] for r in runs
                        if 'min_ess_per_eval' in r and np.isfinite(r['min_ess_per_eval'])]
            rhat = [r['max_rhat'] for r in runs if 'max_rhat' in r]
            d_vals = [r['distance_D'] for r in runs if 'distance_D' in r]
            print('  %s: ESS/eval = %.4f, D = %.3f, R-hat = %.3f (N=%d)' % (
                sampler,
                np.mean(ess_eval) if ess_eval else float('nan'),
                np.mean(d_vals) if d_vals else float('nan'),
                np.mean(rhat), len(runs)))
    else:
        print('  (not yet run)')

    # --- Experiment 6: EGFR ---
    print('\n--- Experiment 6: Real-world EGFR (d=37) ---')
    results = load_results('egfr')
    if results:
        for sampler in ['am', 'dream', 'dream_zsp', 'scream']:
            runs = [r for r in results if r['sampler'] == sampler and r.get('success')]
            if not runs:
                continue
            wall = [r['wall_clock'] for r in runs]
            rhat = [r['max_rhat'] for r in runs if 'max_rhat' in r]
            ess_eval = [r['min_ess_per_eval'] for r in runs
                        if 'min_ess_per_eval' in r and np.isfinite(r['min_ess_per_eval'])]
            print('  %s: wall=%.0fs, R-hat=%.3f, ESS/eval=%.4f (N=%d)' % (
                sampler,
                np.mean(wall),
                np.mean(rhat) if rhat else float('nan'),
                np.mean(ess_eval) if ess_eval else float('nan'),
                len(runs)))
    else:
        print('  (not yet run - requires BioNetGen)')

    print('\n' + '#' * 100)


def main():
    parser = argparse.ArgumentParser(
        description='Run all Phase 4 sampler comparison experiments')
    parser.add_argument('--replicates', '-n', type=int, default=5,
                        help='Replicates per sampler (default: 5)')
    parser.add_argument('--parallel', '-p', type=int, default=None,
                        help='Parallel workers for PyBNF')
    parser.add_argument('--force', action='store_true',
                        help='Re-run benchmarks even if results exist')
    parser.add_argument('--experiments', '-e', type=int, nargs='+',
                        default=None,
                        help='Run only specific experiments (1-6)')
    parser.add_argument('--skip-egfr', action='store_true',
                        help='Skip the EGFR real-world experiment')
    parser.add_argument('--summary-only', action='store_true',
                        help='Only print summary from existing results')
    args = parser.parse_args()

    if args.summary_only:
        print_summary()
        return

    # Determine which benchmarks to run
    if args.experiments:
        bench_dirs = set()
        for exp_num in args.experiments:
            if exp_num not in EXPERIMENT_MAP:
                print('Unknown experiment %d (valid: 1-6)' % exp_num)
                sys.exit(1)
            bench_dirs.update(EXPERIMENT_MAP[exp_num])
    else:
        bench_dirs = {name for name, _, _, _ in ANALYTICAL_EXPERIMENTS}
        if not args.skip_egfr:
            bench_dirs.add('egfr')

    # Run experiments
    all_experiments = ANALYTICAL_EXPERIMENTS + [EGFR_EXPERIMENT]
    t_total = time.time()

    for name, bench_dir, desc, extra_args in all_experiments:
        if name not in bench_dirs:
            continue

        print('\n' + '=' * 70)
        print('EXPERIMENT: %s (%s)' % (name, desc))
        print('=' * 70)

        t0 = time.time()
        success = run_benchmark(bench_dir, args.replicates, args.parallel,
                                force=args.force)
        elapsed = time.time() - t0

        status = 'OK' if success else 'FAILED'
        print('[%s] %s completed in %.1fs' % (status, name, elapsed))

    total_time = time.time() - t_total
    print('\n\nAll experiments completed in %.1fs' % total_time)

    # Print combined summary
    print_summary()


if __name__ == '__main__':
    main()
