import React, { useEffect, useMemo, useState } from 'react';
import { 
  Box, 
  Typography, 
  Grid, 
  Paper, 
  Button, 
  TextField, 
  MenuItem,
  Chip,
  IconButton,
  Tooltip,
  Divider,
  Stack,
  Slider,
  Card,
  CardActionArea,
  CircularProgress
} from '@mui/material';
import { 
  Search,
  ExternalLink,
  Layers,
  Cpu,
  FlaskConical,
  Settings,
  ShieldCheck,
  Terminal,
  Zap,
  LayoutGrid,
  FileCode,
  Save,
  History,
  Play
} from 'lucide-react';
import Editor from '@monaco-editor/react';
import axios from 'axios';
import { apiUrl } from '../../api';

const ALGORITHMS = [
  { value: 'de', label: 'Differential Evolution (Global Optimization)' },
  { value: 'pso', label: 'Particle Swarm Optimization' },
  { value: 'mh', label: 'Metropolis-Hastings (MCMC)' },
  { value: 'sa', label: 'Simulated Annealing' },
  { value: 'pt', label: 'Parallel Tempering' },
  { value: 'ss', label: 'Scatter Search' }
];

const OBJECTIVE_FUNCTIONS = [
  { value: 'chi_sq', label: 'Chi-Square (Standard)' },
  { value: 'norm_chi_sq', label: 'Normalized Chi-Square' },
  { value: 'sos', label: 'Sum of Squares' },
  { value: 'ave', label: 'Average Variance Estimate' },
  { value: 'ave_norm_sos', label: 'Average Normalized Sum of Squares' }
];

const TEMPLATES = [
  { 
    id: 'parabola', 
    name: 'Standard BNG Parabola', 
    icon: <Layers size={14} />,
    description: 'Simple parabola fitting to verify engine installation.',
    content: `output_dir = output/parabola\nmodel = examples/demo/parabola.bngl : examples/demo/par1.exp\nfit_type = de\nobjfunc = chi_sq\nuniform_var = v1__FREE 0 2\nuniform_var = v2__FREE 0 2\nuniform_var = v3__FREE 0 5\npopulation_size = 12\nmax_iterations = 20\nverbosity = 2`.trim()
  },
  {
    id: 'egfr',
    name: 'EGFR Signaling',
    icon: <Cpu size={14} />,
    description: 'A lighter EGFR benchmark problem that is more suitable for quick UI validation runs.',
    content: `output_dir = output/egfr_benchmark\nmodel = examples/egfr_benchmark/egfr.bngl : examples/egfr_benchmark/egfr.exp\nfit_type = de\nobjfunc = ave_norm_sos\npopulation_size = 8\nmax_iterations = 10\nverbosity = 2\n\nloguniform_var = kp1__FREE 1e-8 1e-4\nloguniform_var = km1__FREE 1e-3 10\nloguniform_var = kp2__FREE 1e-8 1e-4\nloguniform_var = km2__FREE 1e-3 10\nloguniform_var = kp3__FREE 1e-3 10\nloguniform_var = km3__FREE 1e-3 10\nloguniform_var = kp14__FREE 1e-3 10\nloguniform_var = km14__FREE 1e-3 10\nloguniform_var = km16__FREE 1e-3 10\nloguniform_var = kp9__FREE 1e-8 1e-4\nloguniform_var = km9__FREE 1e-3 10\nloguniform_var = kp10__FREE 1e-8 1e-4\nloguniform_var = km10__FREE 1e-3 10\nloguniform_var = kp11__FREE 1e-8 1e-4\nloguniform_var = km11__FREE 1e-3 10\nloguniform_var = kp13__FREE 1e-8 1e-4\nloguniform_var = km13__FREE 1e-3 10\nloguniform_var = kp15__FREE 1e-8 1e-4\nloguniform_var = km15__FREE 1e-3 10\nloguniform_var = kp17__FREE 1e-8 1e-4\nloguniform_var = km17__FREE 1e-3 10\nloguniform_var = kp18__FREE 1e-8 1e-4\nloguniform_var = km18__FREE 1e-3 10\nloguniform_var = kp19__FREE 1e-8 1e-4\nloguniform_var = km19__FREE 1e-3 10\nloguniform_var = kp20__FREE 1e-8 1e-4\nloguniform_var = km20__FREE 1e-3 10\nloguniform_var = kp24__FREE 1e-8 1e-4\nloguniform_var = km24__FREE 1e-3 10\nloguniform_var = kp21__FREE 1e-8 1e-4\nloguniform_var = km21__FREE 1e-3 10\nloguniform_var = kp23__FREE 1e-8 1e-4\nloguniform_var = km23__FREE 1e-3 10\nloguniform_var = kp12__FREE 1e-8 1e-4\nloguniform_var = km12__FREE 1e-3 10\nloguniform_var = kp22__FREE 1e-8 1e-4\nloguniform_var = km22__FREE 1e-3 10`.trim()
  },
  {
    id: 'cell_cycle',
    name: 'Yeast Cell Cycle',
    icon: <FlaskConical size={14} />,
    description: 'Hybrid ODE/Stochastic model of yeast cell cycle regulation.',
    content: `output_dir = output/yeast_alpha\nmodel = examples/yeast_cell_cycle/yeast_alpha.xml : examples/yeast_cell_cycle/alpha.exp, examples/yeast_cell_cycle/alpha.prop\nfit_type = ss\nobjfunc = sos\ninitialization = lh\npopulation_size = 12\nmax_iterations = 20\nverbosity = 2\nind_var_rounding = 1\nsbml_integrator = euler\ntime_course = model:yeast_alpha, time:1000, step:1, subdivisions:20, suffix:alpha\n\nloguniform_var = Dn3 0.01 100\nloguniform_var = CLN3 0.0018 18\nloguniform_var = ks_k2 0.00135 13.5\nloguniform_var = BCK2 0.00066 6.6\nloguniform_var = ks_n2_bf 0.005 50\nloguniform_var = ks_ki 0.00012 1.2\nloguniform_var = ks_ki_swi5 0.0012 12\nloguniform_var = WHI5T 0.03 300\nloguniform_var = WHI5deP 0.0202 202\nloguniform_var = ks_n2 1e-10 1e-6\nloguniform_var = CLN2 0.001 10\nloguniform_var = CDH1T 0.01 100\nloguniform_var = CDH1A 0.01 100\nloguniform_var = ks_20 6e-05 0.6\nloguniform_var = ks_20_m1 0.006 60\nuniform_var = phi_alpha 500 650`.trim()
  }
];

function syncConfigFromText(config, setConfig, text) {
  const fTypeMatch = text.match(/fit_type\s*=\s*(\w+)/);
  const objFuncMatch = text.match(/objfunc\s*=\s*(\w+)/);
  const popSizeMatch = text.match(/population_size\s*=\s*(\d+)/);
  const maxIterMatch = text.match(/max_iterations\s*=\s*(\d+)/);

  const newConfig = { ...config };
  if (fTypeMatch) newConfig.fit_type = fTypeMatch[1];
  if (objFuncMatch) newConfig.objfunc = objFuncMatch[1];
  if (popSizeMatch) newConfig.population_size = parseInt(popSizeMatch[1], 10);
  if (maxIterMatch) newConfig.max_iterations = parseInt(maxIterMatch[1], 10);
  setConfig(newConfig);
}

export default function ConfigTab({ config, setConfig, handleRun, confText, setConfText, runContext, setRunContext }) {
  const [activeTemplate, setActiveTemplate] = useState('');
  const [exampleSearch, setExampleSearch] = useState('');
  const [examples, setExamples] = useState([]);
  const [examplesLoading, setExamplesLoading] = useState(true);
  const [selectedExamplePath, setSelectedExamplePath] = useState(() => runContext?.path || '');

  useEffect(() => {
    let mounted = true;
    const loadExamples = async () => {
      try {
        const response = await axios.get(apiUrl('/examples'));
        if (mounted) {
          setExamples(response.data.examples || []);
        }
      } catch (error) {
        if (mounted) {
          setExamples([]);
        }
      } finally {
        if (mounted) {
          setExamplesLoading(false);
        }
      }
    };
    loadExamples();
    return () => {
      mounted = false;
    };
  }, []);

  const filteredExamples = useMemo(() => {
    const query = exampleSearch.trim().toLowerCase();
    const sorted = [...examples].sort((left, right) => left.name.localeCompare(right.name));
    if (!query) {
      return sorted.slice(0, 24);
    }
    return sorted.filter((example) => {
      const haystack = `${example.source}/${example.name}`.toLowerCase();
      return haystack.includes(query);
    }).slice(0, 80);
  }, [exampleSearch, examples]);

  const applyTemplate = (templateId) => {
    const t = TEMPLATES.find(x => x.id === templateId);
    if (t) {
      setConfText(t.content);
      setActiveTemplate(templateId);
      setSelectedExamplePath('');
      setRunContext(null);
      syncConfigFromText(config, setConfig, t.content);
    }
  };

  const loadRepoExample = async (example) => {
    try {
      const response = await axios.get(apiUrl('/config-file'), {
        params: { path: example.path }
      });
      setConfText(response.data.content);
      setActiveTemplate('');
      setSelectedExamplePath(example.path);
      setRunContext({
        source: example.source,
        name: example.name,
        path: example.path,
        baseDir: example.base_dir,
      });
      syncConfigFromText(config, setConfig, response.data.content);
    } catch (error) {
      // Preserve current editor content if the example cannot be loaded.
    }
  };

  return (
    <Box sx={{ animation: 'fadeIn 0.5s ease-out' }}>
      <Grid container spacing={4}>
        {/* Left Column: Form Controls */}
        <Grid item xs={12} lg={7}>
            {/* Scientific Template Library */}
            <Typography variant="overline" sx={{ px: 1, mb: 1.5, color: 'var(--text-secondary)', fontWeight: 800, display: 'block', letterSpacing: 1.5 }}>
               REFERENCE CONFIGURATION LIBRARY
            </Typography>
            <Paper elevation={0} sx={{ p: 4, mb: 4, backgroundColor: 'var(--panel-bg)', borderRadius: 3, border: '1px solid var(--border-color)' }}>
              <Grid container spacing={2}>
                 {TEMPLATES.map((t) => (
                    <Grid item xs={12} md={4} key={t.id}>
                       <Card 
                        elevation={0}
                        onClick={() => applyTemplate(t.id)}
                        sx={{ 
                          height: '100%',
                          display: 'flex',
                          backgroundColor: activeTemplate === t.id ? 'rgba(26, 35, 126, 0.08)' : 'rgba(0,0,0,0.02)',
                          border: activeTemplate === t.id ? '2px solid var(--accent-color)' : '1px solid var(--border-color)',
                          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                          borderRadius: 2,
                          '&:hover': { transform: 'translateY(-2px)', backgroundColor: 'rgba(0,0,0,0.04)' }
                        }}
                       >
                          <CardActionArea 
                            sx={{ p: 2 }} 
                            onClick={() => applyTemplate(t.id)}
                          >
                              <Box sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                                {React.cloneElement(t.icon, { 
                                  color: activeTemplate === t.id ? 'var(--accent-color)' : 'var(--text-secondary)' 
                                })}
                                <Typography variant="body2" sx={{ fontWeight: 800, fontSize: '0.75rem', color: activeTemplate === t.id ? 'var(--accent-color)' : 'var(--text-primary)' }}>{t.name}</Typography>
                              </Box>
                             <Typography variant="caption" sx={{ color: 'var(--text-secondary)', display: 'block', mt: 0.5, fontSize: '0.65rem', lineHeight: 1.3, fontWeight: 500 }}>{t.description}</Typography>
                          </CardActionArea>
                       </Card>
                    </Grid>
                 ))}
              </Grid>
            </Paper>

            <Typography variant="overline" sx={{ px: 1, mb: 1.5, color: 'var(--text-secondary)', fontWeight: 800, display: 'block', letterSpacing: 1.5 }}>
               REPOSITORY EXAMPLE CATALOG
            </Typography>
            <Paper elevation={0} sx={{ p: 4, mb: 4, backgroundColor: 'var(--panel-bg)', borderRadius: 3, border: '1px solid var(--border-color)' }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search shipped .conf examples from examples/ and benchmarks/"
                value={exampleSearch}
                onChange={(event) => setExampleSearch(event.target.value)}
                sx={{ mb: 3, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
              {examplesLoading ? (
                <Box sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
                  <CircularProgress size={24} />
                </Box>
              ) : (
                <Grid container spacing={2}>
                  {filteredExamples.map((example) => (
                    <Grid item xs={12} md={6} key={example.path}>
                      <Card
                        elevation={0}
                        sx={{
                          height: '100%',
                          borderRadius: 2,
                          border: selectedExamplePath === example.path ? '2px solid var(--accent-color)' : '1px solid var(--border-color)',
                          backgroundColor: selectedExamplePath === example.path ? 'rgba(26, 35, 126, 0.08)' : 'rgba(0,0,0,0.02)',
                          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                          '&:hover': { transform: 'translateY(-2px)', backgroundColor: 'rgba(0,0,0,0.04)' }
                        }}
                      >
                        <CardActionArea sx={{ p: 2.25 }} onClick={() => loadRepoExample(example)}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2 }}>
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '0.78rem' }}>
                                {example.name}
                              </Typography>
                              <Typography variant="caption" sx={{ color: 'var(--text-secondary)', display: 'block', mt: 0.75, fontSize: '0.68rem' }}>
                                {example.base_dir}
                              </Typography>
                            </Box>
                            <Chip
                              label={example.source}
                              size="small"
                              sx={{
                                height: 18,
                                fontSize: '0.62rem',
                                fontWeight: 800,
                                backgroundColor: 'rgba(26, 35, 126, 0.1)',
                                color: 'var(--accent-color)'
                              }}
                            />
                          </Box>
                        </CardActionArea>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              )}
              {!examplesLoading && filteredExamples.length === 0 && (
                <Typography variant="body2" sx={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                  No shipped examples matched that search.
                </Typography>
              )}
              <Typography variant="caption" sx={{ display: 'block', mt: 2.5, color: 'var(--text-secondary)' }}>
                Search to narrow the full catalog. Selected repo configs run with their own base directory, so relative model and data paths keep working.
              </Typography>
            </Paper>

            {/* Core Settings */}
            <Paper elevation={0} sx={{ p: 4, mb: 4, backgroundColor: 'var(--panel-bg)', borderRadius: 3, border: '1px solid var(--border-color)' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
                 <Box sx={{ p: 1, borderRadius: 1.5, background: 'rgba(26, 35, 126, 0.08)' }}>
                    <Zap size={20} color="var(--accent-color)" />
                 </Box>
                 <Typography variant="h6" sx={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '1rem' }}>ALGORITHMIC CORE SETTINGS</Typography>
              </Box>
              
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <TextField
                    select
                    fullWidth
                    label="Primary Fitting Algorithm"
                    variant="outlined"
                    value={config.fit_type}
                    onChange={(e) => setConfig({...config, fit_type: e.target.value})}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                  >
                    {ALGORITHMS.map((option) => (
                      <MenuItem key={option.value} value={option.value} sx={{ fontWeight: 600, fontSize: '0.85rem' }}>{option.label}</MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    select
                    fullWidth
                    label="Objective Function"
                    variant="outlined"
                    value={config.objfunc}
                    onChange={(e) => setConfig({...config, objfunc: e.target.value})}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                  >
                    {OBJECTIVE_FUNCTIONS.map((option) => (
                      <MenuItem key={option.value} value={option.value} sx={{ fontWeight: 600, fontSize: '0.85rem' }}>{option.label}</MenuItem>
                    ))}
                  </TextField>
                </Grid>
              </Grid>
            </Paper>

            {/* Hyperparameter Dynamics */}
            <Paper elevation={0} sx={{ p: 4, mb: 4, backgroundColor: 'var(--panel-bg)', borderRadius: 3, border: '1px solid var(--border-color)' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                 <Typography variant="overline" sx={{ color: 'var(--text-secondary)', fontWeight: 800, letterSpacing: 1 }}>CONVERGENCE CONTROL</Typography>
                 <Chip 
                    label={config.fit_type.toUpperCase()} 
                    size="small"
                    sx={{ 
                      fontWeight: 800, 
                      borderRadius: 1, 
                      backgroundColor: 'rgba(26, 35, 126, 0.1)', 
                      color: 'var(--accent-color)',
                      fontSize: '0.65rem'
                    }} 
                 />
              </Box>
              
              <Grid container spacing={5}>
                <Grid item xs={12} md={5}>
                   <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 3, fontSize: '0.85rem', color: 'var(--text-primary)' }}>Primary Constraints</Typography>
                   <Stack spacing={4}>
                      <Box>
                         <Typography variant="caption" sx={{ fontWeight: 800, color: 'var(--text-secondary)', display: 'block', mb: 1 }}>POPULATION INTENSITY</Typography>
                         <Slider 
                            value={config.population_size || 20} 
                            min={1} max={500} 
                            onChange={(e, v) => setConfig({...config, population_size: v})}
                            valueLabelDisplay="auto"
                            sx={{ color: 'var(--accent-color)' }}
                         />
                      </Box>
                      <Box>
                         <Typography variant="caption" sx={{ fontWeight: 800, color: 'var(--text-secondary)', display: 'block', mb: 1 }}>SENSITIVITY THRESHOLD</Typography>
                         <Slider 
                            value={4} 
                            min={1} max={8} step={0.1}
                            valueLabelDisplay="auto"
                            sx={{ color: 'var(--success-color)' }}
                         />
                      </Box>
                      <TextField 
                        label="Max Iterations" 
                        fullWidth size="small" type="number"
                        value={config.max_iterations}
                        onChange={(e) => setConfig({...config, max_iterations: e.target.value})}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                      />
                   </Stack>
                </Grid>

                <Grid item xs={12} md={7}>
                   <Paper elevation={0} sx={{ p: 3, backgroundColor: 'rgba(0,0,0,0.02)', borderRadius: 2, border: '1px solid var(--border-color)' }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 2, display: 'flex', alignItems: 'center', gap: 1, fontSize: '0.85rem' }}>
                        <ShieldCheck size={16} color="var(--success-color)" />
                        Solver-Specific Parameters
                      </Typography>
                      
                      {config.fit_type === 'de' && (
                        <Grid container spacing={3}>
                           <Grid item xs={6}>
                              <TextField label="F Factor" fullWidth size="small" defaultValue={0.5} />
                           </Grid>
                           <Grid item xs={6}>
                              <TextField label="Cr Rate" fullWidth size="small" defaultValue={0.5} />
                           </Grid>
                        </Grid>
                      )}

                      {config.fit_type === 'pso' && (
                        <Grid container spacing={2}>
                           <Grid item xs={4}>
                              <TextField label="W" fullWidth size="small" defaultValue={0.7} />
                           </Grid>
                           <Grid item xs={4}>
                              <TextField label="C1" fullWidth size="small" defaultValue={1.5} />
                           </Grid>
                           <Grid item xs={4}>
                              <TextField label="C2" fullWidth size="small" defaultValue={1.5} />
                           </Grid>
                        </Grid>
                      )}

                      {['mh', 'sa', 'pt'].includes(config.fit_type) && (
                        <Grid container spacing={2}>
                           <Grid item xs={6}>
                              <TextField label="Burn-in" fullWidth size="small" defaultValue={1000} />
                           </Grid>
                           <Grid item xs={6}>
                              <TextField label="Sampling" fullWidth size="small" defaultValue={10} />
                           </Grid>
                        </Grid>
                      )}

                      {!['de', 'pso', 'mh', 'sa', 'pt'].includes(config.fit_type) && (
                        <Typography variant="body2" sx={{ color: 'var(--text-secondary)', fontStyle: 'italic', fontSize: '0.8rem' }}>No additional heuristic parameters for this solver.</Typography>
                      )}
                   </Paper>
                </Grid>
              </Grid>
            </Paper>

            {/* Model Structural Summary */}
            <Paper elevation={0} sx={{ p: 0, mb: 4, backgroundColor: 'var(--panel-bg)', borderRadius: 3, border: '1px solid var(--border-color)', overflow: 'hidden' }}>
               <Box sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 2, borderBottom: '1px solid var(--border-color)', backgroundColor: 'rgba(0,0,0,0.01)' }}>
                  <LayoutGrid size={20} color="var(--text-secondary)" />
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '0.9rem' }}>Structural Summary</Typography>
               </Box>
               <Box sx={{ p: 4, display: 'flex', gap: 6 }}>
                  <Box sx={{ flexGrow: 1 }}>
                     <Typography variant="caption" sx={{ color: 'var(--text-secondary)', fontWeight: 800, display: 'block', mb: 1.5 }}>OBSERVED ENTITIES</Typography>
                     <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {(confText.match(/model\s*=\s*(.*)/)?.[1] || '').split(/[\s,]+/).map((m, i) => m.trim() && (
                          <Chip key={i} label={m} size="small" sx={{ 
                            backgroundColor: 'rgba(26, 35, 126, 0.05)', 
                            color: 'var(--accent-color)', 
                            fontWeight: 700,
                            borderRadius: 1,
                            fontSize: '0.7rem'
                          }} />
                        ))}
                     </Box>
                  </Box>
                  <Box sx={{ flexGrow: 1 }}>
                     <Typography variant="caption" sx={{ color: 'var(--text-secondary)', fontWeight: 800, display: 'block', mb: 1.5 }}>ESTIMATED PARAMETERS</Typography>
                     <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {(confText.match(/fit_parameters\s*=\s*([\s\S]*?)(?=\n\w+\s*=|$)/)?.[1] || '')
                           .split('\n')
                           .filter(l => l.trim() && !l.trim().startsWith('#'))
                           .map((l, i) => (
                             <Chip 
                              key={i} 
                              label={l.trim().split(/\s+/)[0]} 
                              variant="outlined" 
                              size="small" 
                              sx={{ borderRadius: 1, fontSize: '0.7rem', fontWeight: 600, borderColor: 'var(--border-color)' }} 
                             />
                           ))
                        }
                     </Box>
                  </Box>
               </Box>
            </Paper>
        </Grid>

        {/* Right Column: Code Editor */}
        <Grid item xs={12} lg={5}>
            <Paper elevation={0} sx={{ p: 0, height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--panel-bg)', borderRadius: 3, border: '1px solid var(--border-color)', overflow: 'hidden' }}>
               <Box sx={{ p: 2.5, px: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', backgroundColor: 'rgba(0,0,0,0.01)' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                     <FileCode size={20} color="var(--accent-color)" />
                     <Box>
                       <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '0.85rem' }}>PROTOCOL BUNDLE (.conf)</Typography>
                       {runContext?.name && (
                         <Typography variant="caption" sx={{ display: 'block', color: 'var(--text-secondary)', mt: 0.4 }}>
                           Loaded from {runContext.source}/{runContext.name}
                         </Typography>
                       )}
                     </Box>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                     <Tooltip title="Save Protocol"><IconButton size="small"><Save size={18} /></IconButton></Tooltip>
                     <Tooltip title="Version History"><IconButton size="small"><History size={18} /></IconButton></Tooltip>
                  </Box>
               </Box>
               
               <Box sx={{ flexGrow: 1, minHeight: 450 }}>
                  <Editor
                    height="500px"
                    defaultLanguage="ini"
                    theme="vs-dark"
                    value={confText}
                    onChange={setConfText}
                    key={activeTemplate}
                    options={{
                      minimap: { enabled: false },
                      fontSize: 13,
                      lineNumbers: 'on',
                      scrollBeyondLastLine: false,
                      fontFamily: "'JetBrains Mono', monospace",
                      padding: { top: 20 },
                      renderLineHighlight: 'all'
                    }}
                  />
               </Box>

               <Box sx={{ p: 4, backgroundColor: 'rgba(0,0,0,0.01)', borderTop: '1px solid var(--border-color)' }}>
                  <Button 
                    variant="contained" 
                    fullWidth 
                    size="large"
                    startIcon={<Play size={20} />}
                    onClick={() => handleRun(confText)}
                    sx={{ 
                      borderRadius: 2, 
                      py: 2, 
                      fontWeight: 800, 
                      fontSize: '0.95rem',
                      textTransform: 'none',
                      backgroundColor: 'var(--accent-color)',
                      color: '#fff',
                      '&:hover': { backgroundColor: 'var(--accent-color)', opacity: 0.9 },
                      boxShadow: '0 4px 12px rgba(26, 35, 126, 0.25)'
                    }}
                  >
                    Execute Simulation Protocol
                  </Button>
                  <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', mt: 2, color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                    Finalizing protocol will allocate cluster resources for execution.
                  </Typography>
               </Box>
            </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
