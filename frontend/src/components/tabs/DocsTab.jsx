import React from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Grid, 
  List, 
  ListItem, 
  ListItemText, 
  ListItemIcon,
  Divider,
  Chip,
  Button
} from '@mui/material';
import { 
  Book, 
  HelpCircle, 
  Code, 
  Settings, 
  Search, 
  Activity,
  FileText,
  Info
} from 'lucide-react';

const DOCS_DATA = [
  {
    category: 'Getting Started',
    icon: <Book size={20} />,
    items: [
      { title: 'Defining Models', content: 'PyBNF supports BioNetGen (.bngl) and SBML (.xml) models. Specify them using the "model" keyword in your configuration.' },
      { title: 'Objective Functions', content: 'Choose from chi_sq, sos, norm_sos, or neg_bin to evaluate how well your simulation matches experimental data.' },
      { title: 'Parallelization', content: 'Use the "parallel_count" setting to distribute simulations across multiple CPU cores for faster convergence.' }
    ]
  },
  {
    category: 'Fitting Algorithms',
    icon: <Settings size={20} />,
    items: [
      { title: 'Differential Evolution (DE)', content: 'A robust population-based optimizer. Good for global search in high-dimensional parameter spaces.' },
      { title: 'Particle Swarm (PSO)', content: 'Inspired by social behavior. Particles move through the search space guided by their own best and the swarm\'s best positions.' },
      { title: 'Metropolis-Hastings (MH)', content: 'A Markov Chain Monte Carlo (MCMC) method for sampling from the posterior distribution.' }
    ]
  },
  {
    category: 'Configuration Syntax',
    icon: <Code size={20} />,
    items: [
      { title: 'Variable Definitions', content: 'Use uniform_var or loguniform_var to define parameters. Format: uniform_var=p_name min max.' },
      { title: 'fit_type', content: 'Determines the optimization algorithm: de, pso, ss, sim, mh, pt, sa.' },
      { title: 'output_every', content: 'Frequency (in iterations) at which to save best parameter sets and logs.' }
    ]
  }
];

export default function DocsTab() {
  return (
    <Box sx={{ animation: 'fadeIn 0.5s ease-out' }}>
      <Paper elevation={0} sx={{ p: 5, mb: 4, backgroundColor: 'var(--panel-bg)', borderRadius: 3, border: '1px solid var(--border-color)', position: 'relative', overflow: 'hidden' }}>
         <Box sx={{ position: 'absolute', top: 0, left: 0, width: 4, height: '100%', backgroundColor: 'var(--accent-color)' }} />
         <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <Box sx={{ p: 2, borderRadius: 3, backgroundColor: 'rgba(26, 35, 126, 0.05)' }}>
               <HelpCircle size={32} color="var(--accent-color)" />
            </Box>
            <Box>
               <Typography variant="h5" sx={{ fontWeight: 900, color: 'var(--text-primary)', letterSpacing: -0.5 }}>Scientific Documentation</Typography>
               <Typography variant="body1" sx={{ color: 'var(--text-secondary)', maxWidth: 600, mt: 0.5, lineHeight: 1.4 }}>
                 A comprehensive reference for PyBNF simulation parameters, optimization heuristics, and multi-scale modeling protocols.
               </Typography>
            </Box>
         </Box>
      </Paper>

      <Grid container spacing={4}>
        {DOCS_DATA.map((section, idx) => (
          <Grid item xs={12} md={4} key={idx}>
            <Paper elevation={0} sx={{ p: 0, height: '100%', overflow: 'hidden', backgroundColor: 'var(--panel-bg)', borderRadius: 3, border: '1px solid var(--border-color)' }}>
              <Box sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 2, borderBottom: '1px solid var(--border-color)', backgroundColor: 'rgba(0,0,0,0.01)' }}>
                <Box sx={{ color: 'var(--accent-color)' }}>{section.icon}</Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 900, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-primary)', fontSize: '0.75rem' }}>{section.category}</Typography>
              </Box>
              <List sx={{ p: 0 }}>
                {section.items.map((item, i) => (
                  <React.Fragment key={i}>
                    <ListItem sx={{ flexDirection: 'column', alignItems: 'flex-start', p: 3, transition: 'background-color 0.2s', '&:hover': { backgroundColor: 'rgba(26, 35, 126, 0.02)' } }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1, color: 'var(--accent-color)', fontSize: '0.9rem' }}>{item.title}</Typography>
                      <Typography variant="body2" sx={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.6, fontWeight: 500 }}>{item.content}</Typography>
                    </ListItem>
                    {i < section.items.length - 1 && <Divider sx={{ opacity: 0.6, mx: 2 }} />}
                  </React.Fragment>
                ))}
              </List>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Box sx={{ mt: 6 }}>
         <Paper elevation={0} sx={{ p: 4, textAlign: 'center', backgroundColor: 'rgba(26, 35, 126, 0.03)', borderRadius: 3, border: '1px dashed var(--accent-color)' }}>
            <Typography variant="h6" sx={{ fontWeight: 900, mb: 1.5, color: 'var(--text-primary)' }}>Advanced Implementation Support</Typography>
            <Typography variant="body2" sx={{ color: 'var(--text-secondary)', mb: 4, maxWidth: 500, mx: 'auto', fontWeight: 500 }}>
              For complex use cases involving multi-objective optimization or high-performance computing clusters, please refer to the official repository resources.
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2.5 }}>
               <Button 
                variant="outlined" 
                component="a" 
                href="https://pybnf.readthedocs.io/" 
                target="_blank"
                sx={{ borderRadius: 2, px: 3, textTransform: 'none', fontWeight: 800, borderColor: 'var(--accent-color)', color: 'var(--accent-color)' }}
               >
                 API Reference
               </Button>
               <Button 
                variant="outlined" 
                component="a" 
                href="https://github.com/lanl/PyBNF" 
                target="_blank"
                sx={{ borderRadius: 2, px: 3, textTransform: 'none', fontWeight: 800, borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
               >
                 Source Repository
               </Button>
            </Box>
         </Paper>
      </Box>
    </Box>
  );
}
