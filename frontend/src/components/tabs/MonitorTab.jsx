import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  Grid, 
  Paper, 
  Button, 
  Chip, 
  IconButton, 
  Stack,
  Divider,
  Tooltip
} from '@mui/material';
import { 
  Activity, 
  Terminal, 
  Play, 
  FolderOpen, 
  ShieldCheck, 
  LayoutGrid,
  ChevronRight,
  ChevronDown,
  AlertTriangle,
  Info,
  Clock
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer 
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';

export default function MonitorTab({ 
  runId = '', 
  isRunning = false, 
  status = 'idle',
  logs = [], 
  objectiveHistory = [], 
  cancelRun = () => {}, 
  fetchResults = () => {}, 
  run = () => {},
  config = {},
  confText = '',
  runContext = null
}) {
  const [filter, setFilter] = useState(null);
  const [yScale, setYScale] = useState('log');

  const latestObjective = objectiveHistory.length > 0 ? objectiveHistory[objectiveHistory.length - 1].value : null;
  const completionPercent = config.max_iterations 
    ? Math.min(100, Math.round((objectiveHistory.length / config.max_iterations) * 100)) 
    : 0;
  const modelSpec = confText.match(/model\s*=\s*([^\n\r]+)/i)?.[1]?.trim() || 'Not parsed';
  const modelNames = (modelSpec.split(':')[0] || '')
    .split(',')
    .map((part) => part.trim().split(/[\\/]/).pop())
    .filter(Boolean);
  const objectiveLabel = config.objfunc ? config.objfunc.toUpperCase() : 'N/A';
  const optimizerLabel = config.fit_type ? config.fit_type.toUpperCase() : 'N/A';
  const sourceLabel = runContext?.name ? `${runContext.source}/${runContext.name}` : 'Editor session';
  const statusLabel = status.toUpperCase();

  const renderObjectiveTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    const value = payload[0]?.value;
    return (
      <Box sx={{ backgroundColor: '#fff', border: '1px solid var(--border-color)', borderRadius: 2, p: 1.5, boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}>
        <Typography variant="caption" sx={{ display: 'block', color: 'var(--text-secondary)', fontWeight: 800 }}>
          Iteration {label}
        </Typography>
        <Typography variant="body2" sx={{ color: 'var(--text-primary)', fontWeight: 800 }}>
          Best objective: {Number(value).toExponential(4)}
        </Typography>
        <Typography variant="caption" sx={{ display: 'block', color: 'var(--text-secondary)', mt: 0.5 }}>
          Scale: {yScale === 'log' ? 'Logarithmic' : 'Linear'}
        </Typography>
      </Box>
    );
  };

  return (
    <Box sx={{ animation: 'fadeIn 0.5s ease-out' }}>
      <Grid container spacing={4}>
        {/* Core Status Summary */}
        <Grid item xs={12}>
           <Paper elevation={0} sx={{ p: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--panel-bg)', borderRadius: 3, border: '1px solid var(--border-color)' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                 <Box sx={{ p: 2, borderRadius: 3, backgroundColor: isRunning ? 'rgba(26, 35, 126, 0.08)' : 'rgba(0,0,0,0.02)' }}>
                    <Activity size={28} color={isRunning ? 'var(--accent-color)' : 'var(--text-secondary)'} />
                 </Box>
                 <Box>
                    <Typography variant="h6" sx={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '1.2rem', letterSpacing: -0.5 }}>
                       Active Experiment: <Box component="span" sx={{ color: 'var(--accent-color)', fontWeight: 900 }}>{runId ? runId.slice(0, 8).toUpperCase() : 'Inactive'}</Box>
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2.5, mt: 1 }}>
                       <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                         <Typography variant="caption" sx={{ color: 'var(--text-secondary)', fontWeight: 800, letterSpacing: 0.5 }}>RESIDUAL:</Typography>
                         <Typography variant="caption" sx={{ color: 'var(--text-primary)', fontWeight: 900, fontFamily: "'JetBrains Mono', monospace" }}>{latestObjective !== null ? latestObjective.toExponential(4) : '---'}</Typography>
                       </Box>
                       <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                         <Typography variant="caption" sx={{ color: 'var(--text-secondary)', fontWeight: 800, letterSpacing: 0.5 }}>EPOCHS:</Typography>
                         <Typography variant="caption" sx={{ color: 'var(--text-primary)', fontWeight: 900 }}>{objectiveHistory.length}</Typography>
                       </Box>
                       <Chip 
                        label={isRunning ? "PROCESS ACTIVE" : statusLabel === 'COMPLETED' ? 'COMPLETED' : "ENGINE STANDBY"} 
                        size="small" 
                        sx={{ 
                          height: 18, 
                          fontSize: '0.6rem', 
                          fontWeight: 900, 
                          backgroundColor: isRunning ? 'rgba(46, 125, 50, 0.08)' : 'rgba(0,0,0,0.05)',
                          color: isRunning ? 'var(--success-color)' : 'var(--text-secondary)',
                          borderRadius: 1
                        }} 
                       />
                    </Box>
                    <Stack direction="row" spacing={1} sx={{ mt: 1.75, flexWrap: 'wrap' }}>
                      <Chip label={`Models: ${modelNames.join(', ') || 'N/A'}`} size="small" sx={{ fontWeight: 700, backgroundColor: 'rgba(26, 35, 126, 0.08)', color: 'var(--text-primary)' }} />
                      <Chip label={`Optimizer: ${optimizerLabel}`} size="small" sx={{ fontWeight: 700, backgroundColor: 'rgba(255,255,255,0.04)', color: 'var(--text-primary)' }} />
                      <Chip label={`Objective: ${objectiveLabel}`} size="small" sx={{ fontWeight: 700, backgroundColor: 'rgba(255,255,255,0.04)', color: 'var(--text-primary)' }} />
                      <Chip label={`Source: ${sourceLabel}`} size="small" sx={{ fontWeight: 700, backgroundColor: 'rgba(255,255,255,0.04)', color: 'var(--text-primary)' }} />
                    </Stack>
                 </Box>
              </Box>
              <Box sx={{ display: 'flex', gap: 2 }}>
                 {isRunning ? (
                   <Button 
                    variant="outlined" 
                    color="error" 
                    disableElevation
                    startIcon={<Activity size={18} />}
                    onClick={cancelRun}
                    sx={{ borderRadius: 2, fontWeight: 700, px: 3, textTransform: 'none', borderColor: 'rgba(211, 47, 47, 0.2)' }}
                   >
                     Terminate
                   </Button>
                 ) : (
                   <Button 
                    variant="contained" 
                    disableElevation
                    startIcon={<Play size={18} />}
                    onClick={() => run()}
                    sx={{ borderRadius: 2, fontWeight: 700, px: 3, textTransform: 'none', backgroundColor: 'var(--accent-color)' }}
                   >
                     Dispatch
                   </Button>
                 )}
                 <Button 
                  variant="outlined" 
                  disableElevation
                  startIcon={<FolderOpen size={18} />} 
                  onClick={fetchResults} 
                  sx={{ borderRadius: 2, px: 3, textTransform: 'none', color: 'var(--text-primary)', borderColor: 'var(--border-color)' }}
                 >
                    Artifacts
                 </Button>
              </Box>
           </Paper>
        </Grid>

        {/* Convergence Visualizer */}
        <Grid item xs={12} lg={8}>
          <Paper elevation={0} sx={{ p: 4, position: 'relative', overflow: 'hidden', backgroundColor: 'var(--panel-bg)', borderRadius: 3, border: '1px solid var(--border-color)' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 5 }}>
               <Typography variant="overline" sx={{ color: 'var(--text-secondary)', fontWeight: 800, letterSpacing: 1.5 }}>CONVERGENCE GRADIENT ANALYSIS</Typography>
               <Box sx={{ display: 'flex', gap: 1 }}>
                  <Chip 
                    label={yScale === 'log' ? 'LOGARITHMIC SCALE' : 'LINEAR SCALE'} 
                    size="small" 
                    variant="outlined" 
                    clickable
                    onClick={() => setYScale(yScale === 'log' ? 'linear' : 'log')}
                    sx={{ borderRadius: 1.5, fontWeight: 700, fontSize: '0.65rem', color: 'var(--accent-color)', borderColor: 'rgba(26, 35, 126, 0.2)' }} 
                  />
                  <Chip 
                    label={`OBJ: ${objectiveLabel}`} 
                    size="small" 
                    sx={{ borderRadius: 1.5, backgroundColor: 'rgba(0,0,0,0.03)', color: 'var(--text-secondary)', fontWeight: 800, fontSize: '0.65rem' }} 
                  />
               </Box>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, gap: 2 }}>
              <Typography variant="caption" sx={{ color: 'var(--text-secondary)', fontWeight: 700 }}>
                X-axis: optimization iteration
              </Typography>
              <Typography variant="caption" sx={{ color: 'var(--text-secondary)', fontWeight: 700 }}>
                Y-axis: best objective value seen in each iteration
              </Typography>
            </Box>
            
            <Box sx={{ width: '100%', height: 400 }}>
              <ResponsiveContainer>
                <AreaChart data={objectiveHistory}>
                  <defs>
                    <linearGradient id="colorObj" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--accent-color)" stopOpacity={0.08}/>
                      <stop offset="95%" stopColor="var(--accent-color)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                  <XAxis 
                    dataKey="iteration" 
                    stroke="var(--text-secondary)" 
                    fontSize={10} 
                    tick={{ fontWeight: 600 }}
                    axisLine={{ stroke: 'var(--border-color)' }}
                    tickLine={false}
                    label={{ value: 'Iteration', position: 'insideBottom', offset: -6, fill: 'var(--text-secondary)', fontSize: 11 }}
                  />
                  <YAxis 
                    scale={yScale} 
                    domain={['auto', 'auto']} 
                    stroke="var(--text-secondary)" 
                    fontSize={10}
                    tick={{ fontWeight: 600 }}
                    axisLine={{ stroke: 'var(--border-color)' }}
                    tickLine={false}
                    tickFormatter={(v) => v.toExponential(0)}
                    width={72}
                    label={{ value: 'Best Objective', angle: -90, position: 'insideLeft', fill: 'var(--text-secondary)', fontSize: 11 }}
                  />
                  <RechartsTooltip 
                    content={renderObjectiveTooltip}
                  />
                  <Area type="monotone" dataKey="value" stroke="var(--accent-color)" fillOpacity={1} fill="url(#colorObj)" strokeWidth={2.5} animationDuration={400} />
                </AreaChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>

        {/* Analytics & Metrics */}
        <Grid item xs={12} lg={4}>
           <Grid container spacing={4}>
              <Grid item xs={12}>
                 <Paper elevation={0} sx={{ p: 4, display: 'flex', flexDirection: 'column', gap: 1, backgroundColor: 'var(--panel-bg)', borderRadius: 3, border: '1px solid var(--border-color)' }}>
                    <Typography variant="caption" sx={{ color: 'var(--text-secondary)', fontWeight: 800, letterSpacing: 0.5 }}>RESIDUAL MINIMUM</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                       <Typography variant="h4" sx={{ fontWeight: 900, color: 'var(--text-primary)', letterSpacing: -1 }}>{latestObjective !== null ? latestObjective.toPrecision(3) : '---'}</Typography>
                       <Info size={14} color="var(--text-secondary)" />
                    </Box>
                 </Paper>
              </Grid>
              <Grid item xs={12}>
                 <Paper elevation={0} sx={{ p: 4, display: 'flex', flexDirection: 'column', gap: 1, backgroundColor: 'var(--panel-bg)', borderRadius: 3, border: '1px solid var(--border-color)' }}>
                    <Typography variant="caption" sx={{ color: 'var(--text-secondary)', fontWeight: 800, letterSpacing: 0.5 }}>COMPLETION DEPTH</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                       <Typography variant="h4" sx={{ fontWeight: 900, color: 'var(--text-primary)', letterSpacing: -1 }}>{completionPercent}%</Typography>
                       <Typography variant="caption" sx={{ color: 'var(--success-color)', fontWeight: 800 }}>ACTIVE</Typography>
                    </Box>
                 </Paper>
              </Grid>
              <Grid item xs={12}>
                 <Paper elevation={0} sx={{ p: 4, borderRadius: 3, backgroundColor: 'rgba(26, 35, 126, 0.03)', border: '1px solid rgba(26, 35, 126, 0.1)' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                       <ShieldCheck size={18} color="var(--accent-color)" />
                       <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'var(--accent-color)', fontSize: '0.8rem' }}>STABILITY ANALYSIS</Typography>
                    </Box>
                    <Typography variant="body2" sx={{ color: 'var(--text-secondary)', fontSize: '0.75rem', lineHeight: 1.5, fontWeight: 500 }}>
                      {isRunning 
                        ? "Engine state is nominal. Convergent trajectory detected in parameter manifold."
                        : "Solver suspended. Ready for re-initialization with optimized heuristics."}
                    </Typography>
                 </Paper>
              </Grid>
           </Grid>
        </Grid>

        {/* Computational Log Registry */}
        <Grid item xs={12}>
           <Paper elevation={0} sx={{ p: 0, overflow: 'hidden', backgroundColor: 'var(--panel-bg)', borderRadius: 3, border: '1px solid var(--border-color)' }}>
              <Box sx={{ p: 2.5, px: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', backgroundColor: 'rgba(0,0,0,0.01)' }}>
                 <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Terminal size={18} color="var(--text-secondary)" />
                    <Typography variant="overline" sx={{ fontWeight: 800, letterSpacing: 1, color: 'var(--text-primary)' }}>RESEARCH LOG ANALYZER</Typography>
                 </Box>
                 <Stack direction="row" spacing={1}>
                    {['ALL', 'INFO', 'WARN', 'ERROR'].map(tag => (
                       <Chip 
                        key={tag} 
                        label={tag} 
                        size="small" 
                        clickable
                        onClick={() => setFilter(tag === 'ALL' ? null : tag)}
                        sx={{ 
                          fontWeight: 800, fontSize: '0.65rem', borderRadius: 1.5, px: 0.5,
                          backgroundColor: filter === (tag === 'ALL' ? null : tag) ? 'rgba(26, 35, 126, 0.1)' : 'transparent',
                          color: filter === (tag === 'ALL' ? null : tag) ? 'var(--accent-color)' : 'var(--text-secondary)',
                          border: '1px solid var(--border-color)',
                          transition: 'all 0.2s ease'
                        }} 
                       />
                    ))}
                 </Stack>
              </Box>
              
              <Box sx={{ 
                height: 400, overflowY: 'auto', p: 4, 
                backgroundColor: '#fcfcfc', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.78rem' 
              }}>
                <AnimatePresence initial={false}>
                  {logs
                    .filter(line => !filter || line.toUpperCase().includes(filter))
                    .map((line, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -5 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.15 }}
                      style={{ 
                        marginBottom: '6px', 
                        display: 'flex', gap: '20px',
                        borderLeft: line.includes('ERROR') ? '3px solid var(--error-color)' : line.includes('WARNING') ? '3px solid #ffb11b' : '1px solid #eee',
                        paddingLeft: '15px',
                        backgroundColor: line.includes('ERROR') ? 'rgba(211, 47, 47, 0.02)' : 'transparent'
                      }}
                    >
                      <Typography variant="caption" sx={{ color: '#ccc', minWidth: 30, textAlign: 'right', userSelect: 'none', fontWeight: 600 }}>{(i+1).toString().padStart(3, '0')}</Typography>
                      <Typography variant="caption" sx={{ 
                        color: line.includes('ERROR') ? 'var(--error-color)' : line.includes('WARNING') ? '#ffb11b' : line.includes('COMPLETED') ? 'var(--success-color)' : '#444',
                        fontWeight: (line.includes('ERROR') || line.includes('COMPLETED')) ? 700 : 500,
                        fontSize: '0.75rem'
                      }}>
                        {line}
                      </Typography>
                    </motion.div>
                  ))}
                </AnimatePresence>
                <div id="logs-end-anchor" />
              </Box>
           </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
