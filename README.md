![alt text](docs/Logo1.png "PyBioNetFit")

PyBioNetFit (PyBNF) is a general-purpose program for parameterizing biological models specified using the BioNetGen
rule-based modeling language (BNGL) or the Systems Biology Markup Language (SBML). PyBioNetFit offers a suite of
parallelized metaheuristic algorithms (differential evolution, particle swarm optimization, scatter search) for
parameter optimization. In addition to model parameterization, PyBNF supports uncertainty quantification by
bootstrapping or Bayesian approaches, and model checking. PyBNF includes an adaptive Markov chain Monte Carlo (MCMC) sampling algorithm, which supports Bayesian inference. PyBNF includes the Biological Property Specification Language
(BPSL) for defining qualitative data for use in parameterization or checking. It runs on most Linux and macOS
workstations as well on computing clusters.

For documentation, refer to [Documentation_PyBioNetFit.pdf](Documentation_PyBioNetFit.pdf) or the online documentation at <https://pybnf.readthedocs.io/en/latest/>.

PyBioNetFit is released under the BSD-3 license. For more information, refer to the
[LICENSE](LICENSE). LANL code designation: C18062

## Web UI (FastAPI + React)

A local-only frontend server is now available via FastAPI and a React single-page app.

### Requirements

The web UI relies on the same PyBNF runtime requirements as the CLI:

- Python with `pip`
- Node.js/npm for the React frontend
- A working BioNetGen installation
- `BNG2.pl` discoverable through either:
  - the `BNGPATH` environment variable pointing to the directory containing `BNG2.pl`, or
  - a `bng_command = /full/path/to/BNG2.pl` entry in the `.conf` file

If `BNGPATH` is not set and the config does not specify `bng_command`, BNGL-backed runs will fail with:

```text
Error: The location of the BioNetGen simulator (BNG2.pl) is not specified.
```

### Backend

Install dependencies and run:

```bash
pip install -e .
pybnf-web
```

On Windows PowerShell, set `BNGPATH` in the same terminal before starting the backend:

```powershell
$env:BNGPATH='c:\path\to\bionetgen\bng2'
pybnf-web
```

On macOS/Linux:

```bash
export BNGPATH=/path/to/bionetgen/bng2
pybnf-web
```

The backend listens on `http://127.0.0.1:8000` by default.

API endpoints:
- `GET /health`
- `GET /runs`
- `GET /examples`
- `POST /upload` (multipart files)
- `POST /run` (`config_text` or `config_path`, plus optional `base_dir`)
- `GET /runs/{run_id}`
- `GET /runs/{run_id}/logs`
- `GET /runs/{run_id}/results`
- `POST /runs/{run_id}/cancel`

### Frontend

Install frontend dependencies:

```bash
cd frontend
npm install
```

For local development, start both the Vite frontend and FastAPI backend together:

```bash
npm run dev
```

The Vite dev server runs at `http://localhost:5173` and proxies API requests to the backend through `/api`.

If you prefer to run them separately:

```bash
cd frontend
npm run dev:frontend
```

and in another terminal:

```bash
cd /path/to/PyBNF
export BNGPATH=/path/to/bionetgen/bng2
python -m pybnf.webservice
```

On Windows PowerShell:

```powershell
cd frontend
$env:BNGPATH='c:\path\to\bionetgen\bng2'
npm run dev
```

### Using the UI

- Open `http://localhost:5173`.
- The Configuration tab supports:
  - the built-in quick-start templates
  - a repository example catalog that loads shipped `.conf` files from `examples/` and `benchmarks/`
  - direct editing of pasted `.conf` text
- The Telemetry tab shows:
  - status and parsed run metadata
  - a convergence plot reconstructed from PyBNF logs
  - the live or completed log stream
- The Data Explorer tab lists output artifacts produced by the selected run.

### Notes and Troubleshooting

- The UI stores editor text, run history, and selected state in `localStorage`. If you change templates or backend behavior and the editor appears stale, reselect the template or clear browser storage.
- If the frontend shows Vite proxy errors such as `ECONNREFUSED 127.0.0.1:8000`, the backend is not running or failed to start.
- Some shipped example configs use paths relative to their own example directory, while others use project-root-relative paths such as `examples/demo/...`. The web backend handles both.
- SBML-only runs may work without BioNetGen, but BNGL-based runs require a valid `BNGPATH` or `bng_command`.

