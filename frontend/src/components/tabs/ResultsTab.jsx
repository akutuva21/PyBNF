import React, { useState, useMemo, useEffect } from 'react';
import axios from 'axios';
import { 
  Box, 
  Typography, 
  Paper, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Button,
  Chip,
  IconButton,
  Tooltip,
  Grid,
  TextField,
  InputAdornment,
  Drawer,
  Divider,
  CircularProgress,
  ToggleButton,
  ToggleButtonGroup,
  Card,
  CardMedia,
  CardActionArea,
  Stack
} from '@mui/material';
import { 
  Download, 
  FileText, 
  FileJson, 
  FileType, 
  Search, 
  ExternalLink,
  Filter,
  Eye,
  X,
  Copy,
  LayoutGrid,
  List as ListIcon,
  Image as ImageIcon,
  Database,
  Layers
} from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { apiUrl } from '../../api';

export default function ResultsTab({ runId = null }) {
  const [results, setResults] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'grid'
  const [previewFile, setPreviewFile] = useState(null);
  const [previewContent, setPreviewContent] = useState('');
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadingResults, setLoadingResults] = useState(false);

  useEffect(() => {
    const fetchResultsList = async () => {
      if (!runId) return;
      setLoadingResults(true);
      try {
        const resp = await axios.get(apiUrl(`/runs/${runId}/results`));
        setResults(resp.data.files || []);
      } catch (err) {
        // Suppress console spam for 404 during run initialization
        if (err.response?.status !== 404) {
          console.error("Results fetching failed", err);
        }
        setResults([]);
      } finally {
        setLoadingResults(false);
      }
    };
    fetchResultsList();
  }, [runId]);

  const filteredResults = useMemo(() => {
    if (!searchTerm) return results;
    const q = searchTerm.toLowerCase();
    return results.filter(f => f.relative.toLowerCase().includes(q));
  }, [results, searchTerm]);

  const stats = useMemo(() => {
    const total = results.length;
    const images = results.filter(f => f.relative.match(/\.(png|jpg|jpeg|svg|gif)$/i)).length;
    const data = results.filter(f => f.relative.match(/\.(csv|tsv|json)$/i)).length;
    const models = results.filter(f => f.relative.match(/\.(bngl|sbml|xml)$/i)).length;
    return { total, images, data, models };
  }, [results]);

  const handlePreview = async (file) => {
    setPreviewFile(file);
    const isImage = file.relative.match(/\.(png|jpg|jpeg|svg|gif)$/i);
    
    if (isImage) {
      setLoadingPreview(false);
      return;
    }

    setLoadingPreview(true);
    setPreviewContent('');
    try {
      const resp = await axios.get(apiUrl('/config-file'), { params: { path: file.absolute } });
      setPreviewContent(resp.data.content);
    } catch (err) {
      setPreviewContent('Preview not available for this scientific artifact.');
    } finally {
      setLoadingPreview(false);
    }
  };

  const getFileIcon = (filename) => {
    const ext = filename.split('.').pop().toLowerCase();
    if (ext === 'json') return <FileJson size={18} color="var(--accent-color)" />;
    if (ext === 'conf' || ext === 'txt' || ext === 'log') return <FileText size={18} color="var(--text-secondary)" />;
    if (ext === 'png' || ext === 'jpg' || ext === 'jpeg') return <ImageIcon size={18} color="var(--success-color)" />;
    if (ext === 'csv' || ext === 'tsv') return <FileType size={18} color="#e65100" />;
    return <FileText size={18} color="var(--text-secondary)" />;
  }

  return (
    <Box sx={{ animation: 'fadeIn 0.5s ease-out' }}>
      {/* High-Level Asset Intelligence */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
         {[
           { label: 'TOTAL ARTIFACTS', value: stats.total, icon: <Layers size={20} />, color: 'var(--accent-color)' },
           { label: 'IMAGE DATA', value: stats.images, icon: <ImageIcon size={20} />, color: 'var(--success-color)' },
           { label: 'SCIENTIFIC DATA', value: stats.data, icon: <Database size={20} />, color: '#e65100' },
           { label: 'MODELS PARSED', value: stats.models, icon: <LayoutGrid size={20} />, color: '#6a1b9a' }
         ].map((s, i) => (
           <Grid item xs={12} sm={6} md={3} key={i}>
              <Paper elevation={0} sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 2.5, backgroundColor: 'var(--panel-bg)', borderRadius: 3, border: '1px solid var(--border-color)' }}>
                 <Box sx={{ p: 1.5, borderRadius: 2, backgroundColor: `${s.color}08`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {React.cloneElement(s.icon, { color: s.color })}
                 </Box>
                 <Box>
                    <Typography variant="h5" sx={{ fontWeight: 900, color: 'var(--text-primary)', letterSpacing: -0.5 }}>{s.value}</Typography>
                    <Typography variant="caption" sx={{ color: 'var(--text-secondary)', fontWeight: 800, letterSpacing: 0.5 }}>{s.label}</Typography>
                 </Box>
              </Paper>
           </Grid>
         ))}
      </Grid>

      {/* Explorer Controls */}
      <Paper elevation={0} sx={{ p: 2, mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--panel-bg)', borderRadius: 3, border: '1px solid var(--border-color)' }}>
         <TextField 
            size="small"
            placeholder="Search experiment artifacts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{ width: 400 }}
            InputProps={{
              startAdornment: <InputAdornment position="start"><Search size={18} color="var(--text-secondary)" /></InputAdornment>,
              sx: { 
                borderRadius: 2, 
                backgroundColor: 'rgba(0,0,0,0.02)',
                fontSize: '0.85rem',
                fontWeight: 500,
                '& fieldset': { border: 'none' }
              }
            }}
         />
         <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={(e, v) => v && setViewMode(v)}
              size="small"
              sx={{ 
                border: '1px solid var(--border-color)', 
                borderRadius: 2,
                '& .MuiToggleButton-root': { border: 'none', px: 2 }
              }}
            >
              <ToggleButton value="list"> <ListIcon size={18} /> </ToggleButton>
              <ToggleButton value="grid"> <LayoutGrid size={18} /> </ToggleButton>
            </ToggleButtonGroup>
            <Button 
              variant="contained" 
              disableElevation
              startIcon={<Download size={18} />} 
              sx={{ borderRadius: 2, fontWeight: 800, px: 3, textTransform: 'none', backgroundColor: 'var(--accent-color)' }}
            >
               Sync Registry
            </Button>
         </Box>
      </Paper>

      {/* Main Content Area */}
      {viewMode === 'list' ? (
        <Paper elevation={0} sx={{ p: 0, overflow: 'hidden', backgroundColor: 'var(--panel-bg)', borderRadius: 3, border: '1px solid var(--border-color)' }}>
          <TableContainer sx={{ maxHeight: 600 }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ backgroundColor: 'rgba(0,0,0,0.01)', color: 'var(--text-secondary)', fontWeight: 800, fontSize: '0.7rem', py: 2 }}>ARTIFACT IDENTITY</TableCell>
                  <TableCell sx={{ backgroundColor: 'rgba(0,0,0,0.01)', color: 'var(--text-secondary)', fontWeight: 800, fontSize: '0.7rem' }}>SPECIFICATION</TableCell>
                  <TableCell sx={{ backgroundColor: 'rgba(0,0,0,0.01)', color: 'var(--text-secondary)', fontWeight: 800, fontSize: '0.7rem' }} align="right">INTERACTIONS</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredResults.map((file) => (
                  <TableRow key={file.absolute} sx={{ '&:hover': { backgroundColor: 'rgba(26, 35, 126, 0.02)' } }}>
                    <TableCell sx={{ py: 1.5 }}>
                       <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          {getFileIcon(file.relative)}
                          <Typography variant="body2" sx={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.85rem' }}>{file.relative}</Typography>
                       </Box>
                    </TableCell>
                    <TableCell>
                       <Chip 
                        label={file.relative.split('.').pop().toUpperCase()} 
                        size="small" 
                        variant="outlined" 
                        sx={{ fontWeight: 900, fontSize: '0.65rem', borderRadius: 1, backgroundColor: 'rgba(0,0,0,0.02)', borderColor: 'var(--border-color)' }} 
                       />
                    </TableCell>
                    <TableCell align="right">
                       <IconButton size="small" onClick={() => handlePreview(file)} sx={{ color: 'var(--accent-color)' }}><Eye size={18} /></IconButton>
                       <IconButton size="small" sx={{ color: 'var(--text-secondary)' }}><Download size={18} /></IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      ) : (
        <Grid container spacing={3}>
           {filteredResults.map((file) => (
             <Grid item xs={12} sm={6} md={4} lg={3} key={file.absolute}>
               <Card elevation={0} sx={{ 
                 backgroundColor: 'var(--panel-bg)', 
                 border: '1px solid var(--border-color)',
                 borderRadius: 3,
                 transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                 '&:hover': { transform: 'translateY(-4px)', borderColor: 'var(--accent-color)', boxShadow: '0 8px 24px rgba(26, 35, 126, 0.08)' }
               }}>
                 <CardActionArea onClick={() => handlePreview(file)}>
                    {file.relative.match(/\.(png|jpg|jpeg)$/i) ? (
                      <CardMedia component="img" height="160" image={apiUrl(`/files?path=${encodeURIComponent(file.absolute)}`)} sx={{ backgroundColor: '#f5f5f5' }} />
                    ) : (
                      <Box sx={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.02)' }}>
                         {getFileIcon(file.relative)}
                      </Box>
                    )}
                    <Box sx={{ p: 2.5 }}>
                       <Typography variant="body2" noWrap sx={{ fontWeight: 800, color: 'var(--text-primary)', mb: 0.5 }}>{file.relative}</Typography>
                       <Typography variant="caption" sx={{ color: 'var(--text-secondary)', fontWeight: 700, letterSpacing: 0.5 }}>{file.relative.split('.').pop().toUpperCase()} ARTIFACT</Typography>
                    </Box>
                 </CardActionArea>
               </Card>
             </Grid>
           ))}
        </Grid>
      )}

      {/* Asset Intelligence Preview Drawer */}
      <Drawer
        anchor="right"
        open={!!previewFile}
        onClose={() => setPreviewFile(null)}
        PaperProps={{ 
          sx: { 
            width: { xs: '100%', md: 850 }, 
            backgroundColor: 'var(--bg-color)', 
            borderLeft: '1px solid var(--border-color)',
            boxShadow: '-10px 0 40px rgba(0,0,0,0.05)'
          } 
        }}
      >
        <Box sx={{ p: 4, display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ p: 1.5, borderRadius: 2, backgroundColor: 'rgba(26, 35, 126, 0.05)' }}>
                 {previewFile && getFileIcon(previewFile.relative)}
              </Box>
              <Box>
                <Typography variant="overline" sx={{ color: 'var(--text-secondary)', fontWeight: 900, letterSpacing: 1 }}>EXPERIMENT ARTIFACT PREVIEW</Typography>
                <Typography variant="h6" sx={{ fontWeight: 900, color: 'var(--text-primary)', letterSpacing: -0.5 }}>{previewFile?.relative}</Typography>
              </Box>
            </Box>
            <IconButton onClick={() => setPreviewFile(null)} size="small" sx={{ p: 1 }}> <X size={24} /> </IconButton>
          </Box>

          <Paper elevation={0} sx={{ flexGrow: 1, overflow: 'auto', backgroundColor: '#fff', borderRadius: 3, border: '1px solid var(--border-color)', p: 0, position: 'relative' }}>
             {loadingPreview ? (
               <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}> <CircularProgress size={32} thickness={5} sx={{ color: 'var(--accent-color)' }} /> </Box>
             ) : previewFile?.relative.match(/\.(png|jpg|jpeg)$/i) ? (
               <Box sx={{ p: 4, display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                  <img src={apiUrl(`/files?path=${encodeURIComponent(previewFile.absolute)}`)} alt="preview" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
               </Box>
             ) : (
               <SyntaxHighlighter 
                language={previewFile?.relative.endsWith('.json') ? 'json' : 'text'} 
                style={oneLight} 
                customStyle={{ 
                  margin: 0, 
                  padding: '32px', 
                  fontSize: '13px', 
                  fontFamily: "'JetBrains Mono', monospace",
                  backgroundColor: '#fbfbfb',
                  height: '100%'
                }}
               >
                  {previewContent}
               </SyntaxHighlighter>
             )}
          </Paper>

          <Box sx={{ pt: 4, display: 'flex', gap: 2 }}>
             <Button 
              variant="contained" 
              fullWidth 
              size="large" 
              disableElevation
              startIcon={<Download size={20} />}
              sx={{ py: 1.8, borderRadius: 3, backgroundColor: 'var(--accent-color)', color: '#fff', fontWeight: 800, textTransform: 'none', fontSize: '1rem' }}
             >
                Export Scientific Data
             </Button>
             <Button 
               variant="outlined" 
               disableElevation
               startIcon={<Copy size={20} />}
               sx={{ borderRadius: 3, px: 4, textTransform: 'none', fontWeight: 800, borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
             >
                Copy Path
             </Button>
          </Box>
        </Box>
      </Drawer>
    </Box>
  );
}
