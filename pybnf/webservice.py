import os
import json
import uuid
import shutil
import asyncio
import logging
import subprocess
import threading
import time
from pathlib import Path
from typing import Optional, List

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel

app = FastAPI(title='PyBNF Web Service', version='0.1.0')

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = Path(os.getcwd())
UPLOAD_DIR = BASE_DIR / 'pybnf_ui_uploads'
RUNS_DIR = BASE_DIR / 'pybnf_ui_runs'
EXAMPLE_ROOTS = {
    'examples': BASE_DIR / 'examples',
    'benchmarks': BASE_DIR / 'benchmarks',
}
for d in (UPLOAD_DIR, RUNS_DIR):
    d.mkdir(parents=True, exist_ok=True)

RUNS = {}
LOGGER = logging.getLogger('pybnf.webservice')
logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')


class RunInfo(BaseModel):
    run_id: str
    status: str
    created_at: float
    pid: Optional[int] = None
    return_code: Optional[int] = None
    output_dir: Optional[str] = None
    config_path: Optional[str] = None
    last_message: Optional[str] = None


class RunStatus(BaseModel):
    run_id: str
    status: str
    pid: Optional[int]
    return_code: Optional[int]
    output_dir: Optional[str]
    log_lines: List[str]
    elapsed_seconds: float


def _resolve_run_base_dir(base_dir: Optional[str], config_path: str) -> Path:
    if not base_dir:
        return BASE_DIR.resolve()

    config_file = Path(config_path).resolve()
    example_base_dir = Path(base_dir).resolve()
    candidates = []
    try:
        for raw_line in config_file.read_text(encoding='utf-8').splitlines():
            line = raw_line.strip()
            if not line.startswith('model') or '=' not in line:
                continue
            _, rhs = line.split('=', 1)
            model_bits = [chunk.strip() for chunk in rhs.split(':', 1)]
            candidates.extend([part.strip() for part in model_bits[0].split(',') if part.strip()])
            if len(model_bits) > 1:
                candidates.extend([part.strip() for part in model_bits[1].split(',') if part.strip()])
    except Exception:
        return example_base_dir

    for candidate in candidates:
        if Path(candidate).is_absolute():
            return example_base_dir
        if (example_base_dir / candidate).exists():
            return example_base_dir
        if (BASE_DIR / candidate).exists():
            return BASE_DIR.resolve()

    return example_base_dir


def _resolve_output_dir(output_dir: Optional[str], config_path: str, base_dir: Optional[str]) -> Path:
    final_output_dir = output_dir
    if not final_output_dir and Path(config_path).exists():
        try:
            with open(config_path, 'r', encoding='utf-8') as f:
                for line in f:
                    if '=' in line and line.strip().startswith('output_dir'):
                        final_output_dir = line.split('=', 1)[1].strip()
                        break
        except Exception:
            pass

    run_base_dir = _resolve_run_base_dir(base_dir, config_path)
    if final_output_dir:
        resolved = Path(final_output_dir)
        if not resolved.is_absolute():
            resolved = run_base_dir / resolved
        return resolved.resolve()
    return (run_base_dir / 'pybnf_output').resolve()


def _list_example_configs():
    examples = []
    for source, root in EXAMPLE_ROOTS.items():
        if not root.exists():
            continue
        for full in root.rglob('*.conf'):
            relative = full.relative_to(root)
            examples.append({
                'source': source,
                'name': str(relative).replace('\\', '/'),
                'path': str(full.resolve()),
                'base_dir': str(full.resolve().parent),
            })
    return sorted(examples, key=lambda x: (x['source'], x['name']))


def _normalize_bngpath(raw_bng_path: Optional[str]) -> Optional[str]:
    """Allow users to provide either BNG directory or direct path to BNG2.pl."""
    if not raw_bng_path:
        return raw_bng_path

    cleaned = raw_bng_path.strip().strip('"')
    if not cleaned:
        return cleaned

    candidate = Path(cleaned)
    if candidate.name.lower() == 'bng2.pl':
        return str(candidate.parent)
    return cleaned


def _pipeline_logger(run_id: str, proc: subprocess.Popen):
    """Collect process output in the RUNS metadata."""
    run_meta = RUNS.get(run_id)
    if run_meta is None:
        LOGGER.error('Pipeline logger: Run ID %s not found in metadata', run_id)
        return
    
    LOGGER.info('Pipeline logger started for Run %s (PID: %s)', run_id, proc.pid)
    
    try:
        # iterate over stdout lines (which includes stderr because of STDOUT redirect)
        for line in iter(proc.stdout.readline, ''):
            clean_line = line.rstrip('\n')
            if clean_line:
                run_meta['log_lines'].append(clean_line)
                run_meta['last_message'] = clean_line
                
                # Keep only last 1000 lines for the UI to prevent memory bloat
                if len(run_meta['log_lines']) > 1000:
                    run_meta['log_lines'].pop(0)
                
                # Also log to our backend terminal for debug
                if 'ERROR' in clean_line.upper() or 'CRITICAL' in clean_line.upper():
                    LOGGER.error('[Run %s] %s', run_id, clean_line)
                elif 'WARNING' in clean_line.upper():
                    LOGGER.warning('[Run %s] %s', run_id, clean_line)
                else:
                    LOGGER.info('[Run %s] %s', run_id, clean_line)
                    
    except Exception as e:
        LOGGER.exception('Error reading stdout for Run %s: %s', run_id, e)
    finally:
        LOGGER.info('Pipeline logger finished for Run %s', run_id)
        run_meta['log_lines'].append(f"Backend: Log collector finished.")


def _run_subprocess(run_id, config_path, output_dir=None, extra_args=None, base_dir=None):
    if run_id not in RUNS:
        raise RuntimeError('Unknown run id %s' % run_id)
    run_meta = RUNS[run_id]
    run_meta['status'] = 'running'
    run_meta['config_path'] = str(config_path)
    run_meta['base_dir'] = str(_resolve_run_base_dir(base_dir, config_path))

    if not Path(config_path).exists():
        run_meta['status'] = 'failed'
        run_meta['last_message'] = 'Config file not found: %s' % config_path
        return

    # Check environment and normalize BNGPATH if a full BNG2.pl file path was provided.
    raw_bng_path = os.environ.get('BNGPATH')
    normalized_bng_path = _normalize_bngpath(raw_bng_path)
    bng_path = normalized_bng_path if normalized_bng_path else 'NOT SET'
    if raw_bng_path and normalized_bng_path and raw_bng_path != normalized_bng_path:
        LOGGER.info('Normalized BNGPATH from file path to directory: %s', normalized_bng_path)
    LOGGER.info('Launching PyBNF with BNGPATH=%s', bng_path)

    # Pre-emptive cleanup of output directory to avoid interactive prompts on Windows
    odir = _resolve_output_dir(output_dir, config_path, base_dir)
    run_meta['output_dir'] = str(odir)

    odir.parent.mkdir(parents=True, exist_ok=True)
    if odir.exists():
        LOGGER.info('Cleaning up existing output directory contents: %s', odir)
        run_meta['log_lines'].append(f"Backend: Cleaning contents of {odir}")
        for item in odir.iterdir():
            if item.is_dir():
                shutil.rmtree(item, ignore_errors=True)
            else:
                try:
                    item.unlink()
                except Exception:
                    pass
    else:
        odir.mkdir(parents=True, exist_ok=True)
    time.sleep(0.5)
    
    # Initialize log_lines with startup messages to verify connectivity
    run_meta['log_lines'].append(f"Backend: Received simulation request for run {run_id}")
    run_meta['log_lines'].append(f"Backend: BNGPATH is set to: {bng_path}")

    # Use 'debug' for more verbose logging and always --overwrite for non-interactive runs
    cmd = [shutil.which('python') or 'python', '-m', 'pybnf', '-c', str(config_path), '--log_level', 'debug', '--overwrite']
    if extra_args:
        cmd.extend(extra_args)
    
    env = os.environ.copy()
    env['PYTHONUNBUFFERED'] = '1'
    if normalized_bng_path:
        env['BNGPATH'] = normalized_bng_path
    existing_pythonpath = env.get('PYTHONPATH')
    env['PYTHONPATH'] = str(BASE_DIR) if not existing_pythonpath else os.pathsep.join([str(BASE_DIR), existing_pythonpath])
    run_base_dir = _resolve_run_base_dir(base_dir, config_path)
    
    LOGGER.info('Run %s launching: %s', run_id, ' '.join(cmd))

    # Use the config's base directory so relative model/data paths from shipped examples keep working.
    proc = subprocess.Popen(
        cmd, 
        stdout=subprocess.PIPE, 
        stderr=subprocess.STDOUT, 
        bufsize=1, 
        text=True,
        env=env,
        cwd=str(run_base_dir)
    )
    run_meta['pid'] = proc.pid
    run_meta['process'] = proc

    run_meta['log_lines'].append(f"Backend: Subprocess launched with PID {proc.pid}")

    try:
        _pipeline_logger(run_id, proc)
    except Exception as e:
        LOGGER.exception('Error while capturing logs for run %s: %s', run_id, e)

    proc.wait()
    run_meta['return_code'] = proc.returncode
    if proc.returncode == 0:
        run_meta['status'] = 'completed'
    elif run_meta.get('status') != 'cancelled':
        run_meta['status'] = 'failed'
    run_meta['completed_at'] = time.time()


@app.get('/health')
async def health():
    return {'status': 'ok'}


@app.get('/runs', response_model=List[RunInfo])
async def list_runs():
    fields = RunInfo.__fields__.keys()
    return [RunInfo(**{k: v for k, v in r.items() if k in fields}) for r in RUNS.values()]


@app.get('/runs/{run_id}', response_model=RunStatus)
async def get_run_status(run_id: str):
    run = RUNS.get(run_id)
    if run is None:
        raise HTTPException(status_code=404, detail='Run not found')
    elapsed = time.time() - run['created_at']
    return RunStatus(
        run_id=run_id,
        status=run['status'],
        pid=run.get('pid'),
        return_code=run.get('return_code'),
        output_dir=run.get('output_dir'),
        log_lines=run.get('log_lines', []),
        elapsed_seconds=elapsed
    )


@app.post('/upload')
async def upload_files(files: List[UploadFile] = File(...)):
    saved = []
    for f in files:
        name = os.path.basename(f.filename)
        target = UPLOAD_DIR / f'{uuid.uuid4().hex}_{name}'
        with open(target, 'wb') as out:
            data = await f.read()
            out.write(data)
        saved.append({'original_name': f.filename, 'path': str(target)})
    return {'files': saved}


@app.post('/run')
async def start_run(
        config_text: Optional[str] = Form(None),
        config_path: Optional[str] = Form(None),
        base_dir: Optional[str] = Form(None),
        output_dir: Optional[str] = Form(None),
        extra_args: Optional[str] = Form(None)
):
    if not config_path and not config_text:
        raise HTTPException(status_code=400, detail='Either config_path or config_text is required')

    if config_text:
        # Ensure every run has a unique output directory to avoid Windows file locks and collisions
        import re
        if 'output_dir' in config_text:
            match = re.search(r'output_dir\s*=\s*([^\n\r]+)', config_text)
            if match:
                base_odir = match.group(1).strip()
                # Ensure we don't keep appending suffixes if the user sends a previously suffixed path
                base_odir = re.sub(r'_[a-f0-9]{8}$', '', base_odir)
                unique_odir = f"{base_odir}_{uuid.uuid4().hex[:8]}"
                config_text = re.sub(r'output_dir\s*=\s*[^\n\r]+', f"output_dir = {unique_odir}", config_text)
        else:
            unique_odir = f"pybnf_output_{uuid.uuid4().hex[:8]}"
            config_text += f"\noutput_dir = {unique_odir}\n"
            
        config_path = str(RUNS_DIR / f"run_{uuid.uuid4().hex}.conf")
        with open(config_path, 'w', encoding='utf-8') as f:
            f.write(config_text)
    elif config_path and not base_dir:
        base_dir = str(Path(config_path).resolve().parent)

    if not Path(config_path).exists():
        raise HTTPException(status_code=400, detail=f'Config path not found: {config_path}')

    run_id = uuid.uuid4().hex
    RUNS[run_id] = {
        'run_id': run_id,
        'status': 'pending',
        'created_at': time.time(),
        'pid': None,
        'return_code': None,
        'output_dir': output_dir or None,
        'base_dir': base_dir,
        'config_path': config_path,
        'last_message': None,
        'log_lines': []
    }

    args = []
    if extra_args:
        args += extra_args.split()
    if output_dir:
        args.extend(['--overwrite'])

    thread = threading.Thread(target=_run_subprocess, args=(run_id, config_path, output_dir, args, base_dir), daemon=True)
    thread.start()

    return {'run_id': run_id, 'status': 'started'}


@app.post('/runs/{run_id}/cancel')
async def cancel_run(run_id: str):
    run = RUNS.get(run_id)
    if run is None:
        raise HTTPException(status_code=404, detail='Run not found')
    if run.get('status') not in ['running', 'pending']:
        return {'run_id': run_id, 'status': run['status']}

    proc = run.get('process')
    if proc and proc.poll() is None:
        proc.terminate()
        run['status'] = 'cancelled'
        run['last_message'] = 'Cancelled by user'
        return {'run_id': run_id, 'status': 'cancelled'}

    run['status'] = 'cancelled'
    return {'run_id': run_id, 'status': 'cancelled'}


@app.get('/runs/{run_id}/logs')
async def get_run_logs(run_id: str):
    run = RUNS.get(run_id)
    if run is None:
        raise HTTPException(status_code=404, detail='Run not found')
    return {'run_id': run_id, 'log_lines': run.get('log_lines', [])}


@app.get('/runs/{run_id}/results')
async def get_run_results(run_id: str):
    run = RUNS.get(run_id)
    if run is None:
        raise HTTPException(status_code=404, detail='Run not found')
    output_dir = run.get('output_dir') or None
    if not output_dir:
        output_dir = str(_resolve_output_dir(None, run['config_path'], run.get('base_dir')))

    if not output_dir or not os.path.exists(output_dir):
        raise HTTPException(status_code=404, detail='Output directory not found')

    content = []
    for root, _, files in os.walk(output_dir):
        for f in files:
            path = os.path.join(root, f)
            content.append({'relative': os.path.relpath(path, output_dir), 'absolute': path})

    return {'run_id': run_id, 'status': run['status'], 'output_dir': output_dir, 'files': content}


@app.get('/config-file')
async def read_config_file(path: str):
    if not path:
        raise HTTPException(status_code=400, detail='Path parameter is required')
    p = Path(path)
    if not p.exists() or not p.is_file():
        raise HTTPException(status_code=404, detail='File not found')
    # disallow traversal attempts explicitly
    if '..' in str(p):
        raise HTTPException(status_code=403, detail='Path traversal forbidden')
    content = p.read_text(encoding='utf-8')
    return {'path': str(p), 'content': content}


@app.get('/files')
async def serve_file(path: str):
    """Serve a raw file (images, CSVs, etc.) directly for previews."""
    if not path:
        raise HTTPException(status_code=400, detail='Path parameter is required')
    p = Path(path)
    if not p.exists() or not p.is_file():
        raise HTTPException(status_code=404, detail='File not found')
    if '..' in str(p):
        raise HTTPException(status_code=403, detail='Path traversal forbidden')
    return FileResponse(str(p))


@app.get('/runs/{run_id}/config')
async def get_run_config(run_id: str):
    run = RUNS.get(run_id)
    if run is None:
        raise HTTPException(status_code=404, detail='Run not found')
    config_path = run.get('config_path')
    if not config_path or not os.path.exists(config_path):
        raise HTTPException(status_code=404, detail='Config path not found')
    content = Path(config_path).read_text(encoding='utf-8')
    return {'run_id': run_id, 'config_path': config_path, 'config_text': content}


@app.get('/examples')
async def list_examples():
    examples = _list_example_configs()
    if not examples:
        raise HTTPException(status_code=404, detail='Examples directory not found')
    return {'examples': sorted(examples, key=lambda x: x['name'])}


@app.get('/examples/{source}/{example_name:path}')
async def get_example(source: str, example_name: str):
    root = EXAMPLE_ROOTS.get(source)
    if root is None:
        raise HTTPException(status_code=404, detail='Example source not found')
    example_path = (root / example_name).resolve()
    if not example_path.exists() or not example_path.is_file():
        raise HTTPException(status_code=404, detail='Example not found')
    if not str(example_path).startswith(str(root.resolve())):
        raise HTTPException(status_code=403, detail='Forbidden')
    with open(example_path, 'r', encoding='utf-8') as f:
        text = f.read()
    return {
        'source': source,
        'name': example_name,
        'path': str(example_path),
        'base_dir': str(example_path.parent),
        'config_text': text,
    }


def start_api(host: str = '127.0.0.1', port: int = 8000):
    import uvicorn
    uvicorn.run('pybnf.webservice:app', host=host, port=port, reload=False)


if __name__ == '__main__':
    start_api()
