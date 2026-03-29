# Sampler Benchmarking Suite

Systematic comparison of four Bayesian MCMC samplers in PyBNF:

- **AM** (Adaptive Metropolis) — single-chain with learned covariance
- **DREAM(ZS)** — differential evolution with archive
- **P-DREAM** — preconditioned DREAM
- **S-CREAM** — scatter-search curated reference set

## Benchmark Problems

| Problem | Folder | d | Type | Obj. Function | Iters | Burn-in | Pop |
|---------|--------|---|------|---------------|-------|---------|-----|
| Banana (Rosenbrock) | `Banana/` | 2 | Analytical | direct_pass | 50,000 | 25,000 | 20 |
| Gaussian d=10 | `Gaussian_d10/` | 10 | Analytical | direct_pass | 50,000 | 25,000 | 20 |
| Multimodal mixture | `Multimodal/` | 2 | Analytical | direct_pass | 50,000 | 25,000 | 20 |
| Linear regression | `LinearRegression/` | 11 | BNG (fast) | sos | 100,000 | 50,000 | 20 |
| HIV dynamics | `HIVdynamics/` | 5 | BNG (fast) | chi_sq_dynamic | 100,000 | 50,000 | 20 |
| COVID-19 BigApple | `COVID19_BigApple/` | 10 | BNG (moderate) | neg_bin_dynamic | 100,000 | 50,000 | 20 |
| Degranulation | `Degranulation/` | 16 | BNG (moderate) | chi_sq | 50,000 | 25,000 | 20 |
| EGFR reduced | `EGFR_d10/` | 10 | BNG (slow) | ave_norm_sos | 10,000 | 5,000 | 20 |
| EGFR full | `EGFR_d37/` | 37 | BNG (slow) | ave_norm_sos | 10,000 | 5,000 | 20 |

**Fairness:** All samplers within a problem use identical `population_size`, `max_iterations`,
`burn_in`, `sample_every`, and `parallel_count`. No warm starts. Cold start for all methods.

## Prerequisites

1. **PyBNF** installed and on PATH (`pip install pybnf` or from source)
2. **BioNetGen** installed with `BNGPATH` environment variable set (required for all
   problems except Banana, Gaussian_d10, and Multimodal):
   ```bash
   export BNGPATH=/path/to/BioNetGen-2.9.3
   ```
3. **SLURM** cluster access (for cluster runs) or a local machine with sufficient cores

## Quick Start

### On a SLURM cluster

1. Edit the SLURM scripts to load the correct Python module for your cluster
   (look for the commented `module load` lines in `run_*.sh`).

2. Set BNGPATH in your environment or uncomment it in the SLURM scripts.

3. Submit all jobs:
   ```bash
   ./run_all.sh
   ```

   Or submit a subset:
   ```bash
   ./run_all.sh --problems Banana HIVdynamics --samplers am p_dream
   ```

4. Monitor jobs:
   ```bash
   squeue -u $USER
   ```

5. Collect results:
   ```bash
   ./collect_results.sh
   # Or for richer output:
   python3 collect_results.py --compare
   ```

### On a local machine (no SLURM)

```bash
python3 run_all.py --local --problems Banana Gaussian_d10
```

This runs pybnf directly (sequentially) without SLURM. Best for the analytical
problems; the BNG-based problems may take days.

### Dry run (see what would be submitted)

```bash
python3 run_all.py --dry-run
```

## Directory Structure

Each problem folder contains:

```
ProblemName/
├── model files         # .bngl, .target, .exp, ground_truth.json
├── am.conf             # Adaptive MCMC config
├── dream.conf          # DREAM(ZS) config
├── p_dream.conf        # P-DREAM config
├── s_cream.conf        # S-CREAM config
├── run_am.sh           # SLURM job script for AM
├── run_dream.sh        # SLURM job script for DREAM
├── run_p_dream.sh      # SLURM job script for P-DREAM
├── run_s_cream.sh      # SLURM job script for S-CREAM
├── submit_all.sh       # Submit all 4 SLURM jobs for this problem
└── output_*/           # Output directories (created by PyBNF)
```

Top-level scripts:

```
sampler_benchmarking/
├── README.md
├── run_all.sh          # Submit all SLURM jobs (bash)
├── run_all.py          # Submit all SLURM jobs (python, with --local and --dry-run)
├── collect_results.sh  # Display results table (bash)
└── collect_results.py  # Display results table (python, with --compare, --output-csv)
```

## Collecting Results

After runs complete, use the collection scripts:

```bash
# Quick overview (bash)
./collect_results.sh

# Detailed comparison with ranking (python)
python3 collect_results.py --compare

# Export to CSV for further analysis
python3 collect_results.py --output-csv results.csv

# Export to JSON
python3 collect_results.py --output-json results.json
```

## Key Metrics

- **R-hat**: Convergence diagnostic. Values < 1.05 indicate convergence (Vehtari et al. 2021).
- **Bulk ESS**: Effective sample size for the bulk of the distribution. Higher is better.
- **Tail ESS**: Effective sample size for the tails. Higher is better.
- **ESS/eval**: Sampling efficiency normalized by total likelihood evaluations. The primary
  fairness metric — accounts for different computational costs per iteration.
- **D-metric**: Distance from ground truth posterior (only for analytical problems with
  known posteriors). Lower is better.

## Resuming and Continuing Runs

PyBNF saves checkpoints (`alg_finished.bp` or `alg_backup.bp`). All scripts support
a `--resume N` option to continue runs with N additional iterations.

### Via helper scripts

```bash
# Resume all runs, adding 10000 more iterations
./run_all.sh --resume 10000

# Resume only specific problems/samplers
./run_all.sh --resume 5000 --problems EGFR_d10 EGFR_d37 --samplers am p_dream

# Python version (also supports --local and --dry-run)
python3 run_all.py --resume 10000
python3 run_all.py --resume 5000 --local --problems Banana

# Per-problem
cd EGFR_d10/
./submit_all.sh --resume 5000
```

### Via SLURM directly

```bash
# Set RESUME_ITERS env var when submitting
cd EGFR_d10/
RESUME_ITERS=5000 sbatch run_am.sh
```

### Via pybnf directly

```bash
cd EGFR_d10/
pybnf -r 5000 -c am.conf              # Add 5000 iterations (local)
pybnf -r 5000 -c am.conf -t SLURM     # Add 5000 iterations (SLURM scheduler)
pybnf -r 0 -c am.conf                 # Resume interrupted run to original max_iterations
```

## SLURM Resource Estimates

| Problem | Est. Wall Time (per sampler) | Memory |
|---------|------------------------------|--------|
| Banana, Gaussian_d10, Multimodal | < 1 hour | 16 GB |
| LinearRegression, HIVdynamics | ~1 day | 32 GB |
| COVID19_BigApple | ~2-3 days | 60 GB |
| Degranulation | ~3-4 days | 100 GB |
| EGFR_d10 | ~1-2 days | 60 GB |
| EGFR_d37 | ~3-5 days | 60 GB |

These are rough estimates. Actual times depend on cluster hardware and load.

## Problem Provenance

| Problem | Source | Reference |
|---------|--------|-----------|
| Banana | Synthetic Rosenbrock distribution | - |
| Gaussian d=10 | Synthetic diagonal Gaussian | - |
| Multimodal | Synthetic 3-component mixture | - |
| Linear regression | `examples/LinearRegression_aMCMC/` | - |
| HIV dynamics (pt303) | `examples/HIVdynamics_aMCMC/` | Perelson et al. 1996; Ho et al. 1995 |
| COVID-19 BigApple | `examples/COVID19forecasting_aMCMC/` | Lin et al. 2021, Emerg. Inf. Dis. |
| Degranulation | `examples/Degranulation_aMCMC/` | Harmon et al. 2017, Sci. Rep. |
| EGFR (d=10, d=37) | `benchmarks/egfr/`, `benchmarks/egfr_d10/` | Blinov et al. 2006, Biosystems |
