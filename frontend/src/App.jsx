import React, { useState, useEffect, useRef } from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  Tabs, 
  Tab, 
  Paper, 
  Grid, 
  Drawer, 
  List, 
  ListItem, 
  ListItemIcon, 
  ListItemText, 
  Divider,
  IconButton,
  Button,
  AppBar,
  Toolbar,
  Chip,
  Stack,
  Tooltip,
  Alert,
  Snackbar,
  Backdrop,
  CircularProgress,
  ThemeProvider,
  createTheme,
  useMediaQuery,
  CssBaseline
} from '@mui/material';
import { 
  Activity, 
  Settings, 
  Monitor, 
  FileText, 
  BookOpen, 
  Plus, 
  History, 
  Database, 
  ShieldCheck, 
  Zap,
  Globe,
  Ghost,
  Cpu
} from 'lucide-react';
import ConfigTab from './components/tabs/ConfigTab';
import MonitorTab from './components/tabs/MonitorTab';
import ResultsTab from './components/tabs/ResultsTab';
import DocsTab from './components/tabs/DocsTab';
import axios from 'axios';
import { apiUrl } from './api';

const DRAWER_WIDTH = 280;

function App() {
  const [activeTab, setActiveTab] = useState(() => {
    const saved = localStorage.getItem('pybnf_active_tab');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [connected, setConnected] = useState(false);
  const [history, setHistory] = useState(() => {
    const saved = localStorage.getItem('pybnf_history');
    return saved ? JSON.parse(saved) : [];
  });
  const [config, setConfig] = useState(() => {
    const saved = localStorage.getItem('pybnf_config');
    return saved ? JSON.parse(saved) : {
      fit_type: 'de',
      objfunc: 'chi_sq',
      population_size: 20,
      max_iterations: 100,
      parallel_count: null,
      delete_old_files: 1,
      output_every: 20
    };
  });
  const [confText, setConfText] = useState(() => {
    const saved = localStorage.getItem('pybnf_conf_text');
    return saved || `
# PyBNF Configuration Entry Point
# -------------------------------
model=examples/demo/parabola.bngl : examples/demo/par1.exp
fit_type=de
objfunc=chi_sq

loguniform_var=v1__FREE 0.1 5
uniform_var=v2__FREE 0.1 5
uniform_var=v3__FREE 0.1 5

# Convergence Strategy
population_size=20
max_iterations=100
parallel_count=4
    `.trim();
  });
  const [runContext, setRunContext] = useState(() => {
    const saved = localStorage.getItem('pybnf_run_context');
    return saved ? JSON.parse(saved) : null;
  });
  const [status, setStatus] = useState('idle');
  const [currentRunId, setCurrentRunId] = useState(null);
  const [logs, setLogs] = useState([]);
  const [objectiveHistory, setObjectiveHistory] = useState([]);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' });

  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
  const [themeMode, setThemeMode] = useState('system');

  const effectiveMode = themeMode === 'system' 
    ? (prefersDarkMode ? 'dark' : 'light') 
    : themeMode;

  const academicTheme = React.useMemo(() => createTheme({
    palette: {
      mode: effectiveMode,
      primary: { main: '#1a237e' }, // Royal Academic Blue
      secondary: { main: '#283593' },
      background: {
        default: effectiveMode === 'dark' ? '#0d1117' : '#f8f9fa',
        paper: effectiveMode === 'dark' ? '#161b22' : '#ffffff',
      },
      text: {
        primary: effectiveMode === 'dark' ? '#c9d1d9' : '#212121',
        secondary: effectiveMode === 'dark' ? '#8b949e' : '#757575',
      }
    },
    typography: {
      fontFamily: "'Inter', system-ui, sans-serif",
      h6: { fontWeight: 800, letterSpacing: '-0.5px' },
      button: { textTransform: 'none', fontWeight: 600 }
    },
    shape: { borderRadius: 12 },
    components: {
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            border: `1px solid ${effectiveMode === 'dark' ? '#30363d' : '#e0e0e0'}`,
          }
        }
      }
    }
  }), [effectiveMode]);

  // Sync HTML theme attribute for CSS variables
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', effectiveMode);
  }, [effectiveMode]);

  // Persistence Engine
  useEffect(() => {
    localStorage.setItem('pybnf_history', JSON.stringify(history));
    localStorage.setItem('pybnf_config', JSON.stringify(config));
    localStorage.setItem('pybnf_conf_text', confText);
    localStorage.setItem('pybnf_active_tab', activeTab.toString());
    if (runContext) {
      localStorage.setItem('pybnf_run_context', JSON.stringify(runContext));
    } else {
      localStorage.removeItem('pybnf_run_context');
    }
  }, [history, config, confText, activeTab, runContext]);

  useEffect(() => {
    localStorage.setItem('pybnf_conf_text', confText);
  }, [confText]);

  // Network Heartbeat & Polling
  useEffect(() => {
    const checkConnection = async () => {
      try {
        await axios.get(apiUrl('/health'));
        setConnected(true);
      } catch (e) {
        setConnected(false);
      }
    };
    checkConnection();
    const timer = setInterval(checkConnection, 10000); // Faster heartbeat for dev
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!currentRunId) {
      return;
    }

    const fetchRunSnapshot = async () => {
      try {
        const res = await axios.get(apiUrl(`/runs/${currentRunId}`));
        setLogs(res.data.log_lines || []);
        if (res.data.status && res.data.status !== status) {
          setStatus(res.data.status);
        }
      } catch (error) {
        console.error('Run snapshot fetch error', error);
      }
    };

    fetchRunSnapshot();
  }, [currentRunId]);

  useEffect(() => {
    let interval;

    if (status === 'running' && currentRunId) {
      interval = setInterval(async () => {
        try {
          const res = await axios.get(apiUrl(`/runs/${currentRunId}`));
          const newLogs = res.data.log_lines || [];
          setLogs(newLogs);

          if (res.data.status === 'completed' || res.data.status === 'failed' || res.data.status === 'cancelled') {
            setStatus(res.data.status);
            clearInterval(interval);
            if (res.data.status === 'completed') {
              setNotification({ open: true, message: 'Simulation Completed Successfully', severity: 'success' });
            }
          }
        } catch (e) {
          console.error("Polling error", e);
        }
      }, 1000); // 1s polling for better feel
    }
    return () => {
      clearInterval(interval);
    };
  }, [status, currentRunId]);

  useEffect(() => {
    let currentIteration = null;
    let expectingFitnessList = false;
    const parsedHistory = [];

    logs.forEach((line, index) => {
      const completedMatch =
        line.match(/Completed\s+(\d+)\s+of\s+\d+\s+iterations/i) ||
        line.match(/Completed iteration\s+(\d+)\s+of\s+\d+/i);
      if (completedMatch) {
        currentIteration = parseInt(completedMatch[1], 10);
      }

      if (/^Current population fitnesses:/i.test(line.trim()) || /^Current scores:/i.test(line.trim())) {
        expectingFitnessList = true;
        return;
      }

      if (expectingFitnessList && /^\s*\[.*\]\s*$/.test(line)) {
        expectingFitnessList = false;
        const values = line
          .trim()
          .replace(/^\[/, '')
          .replace(/\]$/, '')
          .split(',')
          .map((value) => Number.parseFloat(value.trim()))
          .filter((value) => Number.isFinite(value));

        if (values.length > 0) {
          const iteration = currentIteration ?? parsedHistory.length + 1;
          const value = Math.min(...values);
          if (parsedHistory.length === 0 || parsedHistory[parsedHistory.length - 1].iteration !== iteration) {
            parsedHistory.push({ iteration, value, time: index });
          } else {
            parsedHistory[parsedHistory.length - 1] = { iteration, value, time: index };
          }
        }
        return;
      }

      const iterMatch = line.match(/Iteration\s+(\d+)/i);
      const objMatch = line.match(/Obj:\s*([0-9.eE+-]+)/i) || line.match(/Fit:\s*([0-9.eE+-]+)/i);
      if (objMatch) {
        const iteration = iterMatch ? parseInt(iterMatch[1], 10) : parsedHistory.length + 1;
        const value = parseFloat(objMatch[1]);
        if (Number.isFinite(value)) {
          if (parsedHistory.length === 0 || parsedHistory[parsedHistory.length - 1].iteration !== iteration) {
            parsedHistory.push({ iteration, value, time: index });
          } else {
            parsedHistory[parsedHistory.length - 1] = { iteration, value, time: index };
          }
        }
      }
    });

    setObjectiveHistory(parsedHistory);
  }, [logs]);

  const handleRun = async (customConfigText = null) => {
    try {
      setStatus('starting');
      const formData = new FormData();
      
      // Safety check: Don't let the event object or other types become the config text
      let config_text = (typeof customConfigText === 'string') ? customConfigText : confText;
      if (typeof config_text !== 'string') {
        config_text = String(config_text || '');
      }
      
      formData.append('config_text', config_text);
      if (runContext?.baseDir) {
        formData.append('base_dir', runContext.baseDir);
      }
      
      const res = await axios.post(apiUrl('/run'), formData);
      const runId = res.data.run_id;
      
      setCurrentRunId(runId);
      setStatus('running');
      setLogs([]);
      setObjectiveHistory([]);

      const newRun = {
        id: runId,
        timestamp: new Date().toISOString(),
        algorithm: config.fit_type,
        status: 'active'
      };
      setHistory([newRun, ...history.slice(0, 9)]);
      setNotification({ open: true, message: 'Simulation Engine Initialized Successfully', severity: 'success' });
      setActiveTab(1); // Auto-switch to monitor
    } catch (err) {
      console.error(err);
      setStatus('idle');
      setNotification({ open: true, message: 'Engine Initialization Failed', severity: 'error' });
    }
  };

  const cancelRun = async () => {
    if (!currentRunId) return;
    try {
      await axios.post(apiUrl(`/runs/${currentRunId}/cancel`));
      setStatus('cancelled');
      setNotification({ open: true, message: 'Simulation Aborted', severity: 'warning' });
    } catch (err) {
      setNotification({ open: true, message: 'Failed to abort simulation', severity: 'error' });
    }
  };

  return (
    <ThemeProvider theme={academicTheme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-color)' }}>
      <Drawer
        variant="permanent"
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
            background: 'var(--sidebar-bg)',
            borderRight: '1px solid var(--border-color)',
            color: '#fff',
            boxShadow: '4px 0 10px rgba(0,0,0,0.1)'
          },
        }}
      >
        <Box sx={{ p: 4, display: 'flex', alignItems: 'center', gap: 2, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <Box sx={{ p: 0.8, borderRadius: 1.5, background: 'rgba(255,255,255,0.15)' }}>
            <Activity size={20} color="#fff" />
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: -0.5, fontSize: '1.1rem' }}>
            PyBNF <Box component="span" sx={{ fontWeight: 300, opacity: 0.7 }}>Suite</Box>
          </Typography>
        </Box>
        
        <Box sx={{ overflow: 'auto', py: 3 }}>
          <Typography variant="overline" sx={{ px: 3, mb: 1.5, color: 'rgba(255,255,255,0.4)', fontWeight: 800, display: 'block', letterSpacing: 1 }}>
            EXPERIMENTAL LOGS
          </Typography>
          <List sx={{ px: 1 }}>
            {history.map((run) => (
              <ListItem 
                key={run.id} 
                className={`nav-item ${currentRunId === run.id ? 'active' : ''}`}
                sx={{ 
                  cursor: 'pointer',
                  mb: 0.5,
                  '&.active': { backgroundColor: 'rgba(255,255,255,0.12)' }
                }}
                onClick={() => {
                  setCurrentRunId(run.id);
                  setActiveTab(1);
                }}
              >
                <Box sx={{ width: '100%' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="caption" sx={{ color: 'inherit', fontWeight: 700 }}>{run.id.slice(0, 8).toUpperCase()}</Typography>
                    <Chip 
                      label={run.algorithm?.toUpperCase() || 'RUN'} 
                      size="small" 
                      sx={{ 
                        height: 16, 
                        fontSize: '0.6rem', 
                        background: 'rgba(255,255,255,0.1)', 
                        color: '#fff',
                        fontWeight: 700
                      }} 
                    />
                  </Box>
                  <Typography variant="body2" sx={{ fontSize: '0.72rem', opacity: 0.6, mt: 0.5 }}>
                    {new Date(run.timestamp).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                  </Typography>
                </Box>
              </ListItem>
            ))}
            {history.length === 0 && (
              <Typography variant="body2" sx={{ px: 3, py: 2, opacity: 0.4, fontStyle: 'italic', fontSize: '0.8rem' }}>
                No active records found.
              </Typography>
            )}
          </List>

          <Divider sx={{ my: 3, mx: 2, borderColor: 'rgba(255,255,255,0.08)' }} />
          
          <Box sx={{ mx: 2, p: 2, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.05)' }}>
             <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5, fontSize: '0.75rem', color: '#fff' }}>Technical Reference</Typography>
             <Typography variant="caption" sx={{ opacity: 0.6, lineHeight: 1.3, display: 'block', fontSize: '0.7rem' }}>
               Standardized parameter estimation for biochemical models.
             </Typography>
          </Box>
        </Box>
      </Drawer>

      <Box sx={{ flexGrow: 1, p: 5, backgroundColor: 'var(--bg-color)', minHeight: '100vh' }}>
         <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 6 }}>
            <Box>
               <Typography variant="h4" className="academic-title" sx={{ color: 'var(--text-primary)', mb: 1 }}>
                  Research Dashboard
               </Typography>
               <Typography variant="body2" sx={{ color: 'var(--text-secondary)', maxWidth: 600 }}>
                  Real-time monitoring and computational analysis of biological systems. 
                  Leveraging high-performance optimization for parameter estimation.
               </Typography>
            </Box>
            <Stack direction="row" spacing={2} alignItems="center">
               <Box sx={{ textAlign: 'right', mr: 2 }}>
                 <Typography variant="caption" sx={{ display: 'block', color: 'var(--text-secondary)', fontWeight: 800, mb: 0.5 }}>STABILITY</Typography>
                 <Chip 
                    label={connected ? "SYSTEM NOMINAL" : "LINK INTERRUPTED"} 
                    size="small"
                    sx={{ 
                      fontWeight: 800, 
                      fontSize: '0.7rem',
                      px: 0.5,
                      backgroundColor: connected ? 'rgba(46, 125, 50, 0.08)' : 'rgba(198, 40, 40, 0.08)', 
                      color: connected ? 'var(--success-color)' : 'var(--error-color)',
                      borderColor: 'currentColor',
                      border: '1px solid'
                    }} 
                 />
               </Box>
               <Button 
                variant="contained" 
                disableElevation 
                startIcon={<Plus size={18} />} 
                onClick={() => handleRun(confText)}
                sx={{ 
                  borderRadius: 2, 
                  py: 1.2, 
                  px: 3, 
                  backgroundColor: 'var(--accent-color)',
                  textTransform: 'none',
                  fontWeight: 700,
                  '&:hover': { backgroundColor: 'var(--accent-color)', opacity: 0.9 }
                }}
               >
                  Schedule Run
               </Button>
            </Stack>
         </Box>

        <Paper 
          elevation={0}
          sx={{ 
            mb: 5, 
            p: 0.5, 
            backgroundColor: 'var(--panel-bg)', 
            borderRadius: 3, 
            border: '1px solid var(--border-color)',
            overflow: 'hidden'
          }}
        >
          <Tabs 
            value={activeTab} 
            onChange={(e, v) => setActiveTab(v)}
            sx={{
               '& .MuiTabs-indicator': {
                 height: 3,
                 backgroundColor: 'var(--accent-color)',
               },
               '& .MuiTab-root': {
                 minHeight: 56,
                 fontWeight: 700,
                 fontSize: '0.8rem',
                 color: 'var(--text-secondary)',
                 textTransform: 'none',
                 '&.Mui-selected': {
                   color: 'var(--accent-color)'
                 }
               }
            }}
          >
            <Tab icon={<Settings size={18} />} iconPosition="start" label="Configuration" />
            <Tab icon={<Activity size={18} />} iconPosition="start" label="Telemetry" />
            <Tab icon={<Database size={18} />} iconPosition="start" label="Data Explorer" />
            <Tab icon={<BookOpen size={18} />} iconPosition="start" label="Documentation" />
          </Tabs>
        </Paper>

        <Box sx={{ mb: 10 }}>
          {activeTab === 0 && (
            <ConfigTab 
              config={config} 
              setConfig={setConfig} 
              handleRun={handleRun} 
              confText={confText} 
              setConfText={setConfText} 
              runContext={runContext}
              setRunContext={setRunContext}
            />
          )}
          {activeTab === 1 && (
            <MonitorTab 
              runId={currentRunId} 
              isRunning={status === 'running'} 
              status={status}
              logs={logs} 
              objectiveHistory={objectiveHistory}
              cancelRun={cancelRun}
              fetchResults={() => setActiveTab(2)}
              run={handleRun}
              config={config}
              confText={confText}
              runContext={runContext}
            />
          )}
          {activeTab === 2 && <ResultsTab runId={currentRunId} />}
          {activeTab === 3 && <DocsTab />}
        </Box>

        <Snackbar 
          open={notification.open} 
          autoHideDuration={5000} 
          onClose={() => setNotification({ ...notification, open: false })}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert severity={notification.severity} variant="filled" sx={{ borderRadius: 2, fontWeight: 600 }}>
            {notification.message}
          </Alert>
        </Snackbar>

        <Backdrop open={status === 'starting'} sx={{ color: 'var(--accent-color)', zIndex: 9999, backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}>
           <CircularProgress color="inherit" thickness={4} />
        </Backdrop>
      </Box>
      </Box>
    </ThemeProvider>
  );
}

export default App;
