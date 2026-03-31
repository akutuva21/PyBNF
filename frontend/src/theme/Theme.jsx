import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#00f2ff', // Cyan Neon
      light: '#66f7ff',
      dark: '#00a9b3',
    },
    secondary: {
      main: '#bc13fe', // Purple Neon
    },
    background: {
      default: '#0c1117',
      paper: 'rgba(22, 27, 34, 0.7)',
    },
    text: {
      primary: '#f0f6fc',
      secondary: '#8b949e',
    },
  },
  typography: {
    fontFamily: '"Inter", "Lexend", -apple-system, sans-serif',
    h1: { fontFamily: 'Lexend, sans-serif', fontWeight: 700 },
    h2: { fontFamily: 'Lexend, sans-serif', fontWeight: 700 },
    h3: { fontFamily: 'Lexend, sans-serif', fontWeight: 600 },
    h4: { fontFamily: 'Lexend, sans-serif', fontWeight: 600 },
    h5: { fontFamily: 'Lexend, sans-serif', fontWeight: 600 },
    h6: { fontFamily: 'Lexend, sans-serif', fontWeight: 500 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          backdropFilter: 'blur(4px)',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            boxShadow: '0 0 15px rgba(0, 242, 255, 0.3)',
          },
        },
        containedPrimary: {
          background: 'linear-gradient(135deg, #00f2ff 0%, #00d2ff 100%)',
          color: '#0c1117',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: 'rgba(22, 27, 34, 0.7)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            '& fieldset': {
              borderColor: 'rgba(255, 255, 255, 0.12)',
            },
            '&:hover fieldset': {
              borderColor: 'rgba(0, 242, 255, 0.4)',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#00f2ff',
            },
          },
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        root: {
          minHeight: 48,
        },
        indicator: {
          height: 3,
          borderRadius: '3px 3px 0 0',
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          fontSize: '0.95rem',
          fontWeight: 500,
          color: '#8b949e',
          '&.Mui-selected': {
            color: '#00f2ff',
          },
        },
      },
    },
  },
});

export default theme;
