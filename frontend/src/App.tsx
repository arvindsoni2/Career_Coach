import { useState } from 'react';
import {
  AppBar,
  Box,
  Grid,
  Toolbar,
  Typography,
  CssBaseline,
  Container,
} from '@mui/material';
import WorkIcon from '@mui/icons-material/Work';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import LeftPanel from './components/LeftPanel';
import RightPanel from './components/RightPanel';
import ActionBar from './components/ActionBar';
import { useStream } from './hooks/useStream';
import type { StreamAction } from './hooks/useStream';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#1976d2' },
    background: { default: '#f5f7fa' },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
  },
  components: {
    MuiPaper: {
      styleOverrides: { root: { borderRadius: 12 } },
    },
    MuiButton: {
      styleOverrides: { root: { borderRadius: 8 } },
    },
  },
});

export default function App() {
  const [resumeText, setResumeText] = useState('');
  const [jdText, setJdText] = useState('');
  const { loading, activeAction, text, atsScore, error, startStream } = useStream();

  const canSubmit = resumeText.trim().length > 0 && jdText.trim().length > 0;

  const handleAction = (action: StreamAction) => {
    startStream(action, resumeText, jdText);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        {/* Top AppBar */}
        <AppBar position="sticky" elevation={1}>
          <Toolbar variant="dense">
            <WorkIcon sx={{ mr: 1 }} />
            <Typography variant="h6" fontWeight={700}>
              AI Career Coach
            </Typography>
            <Typography variant="caption" sx={{ ml: 1, opacity: 0.7, alignSelf: 'flex-end', pb: 0.5 }}>
              Powered by Gemini
            </Typography>
          </Toolbar>
        </AppBar>

        {/* Sticky action bar — always visible below AppBar */}
        <ActionBar
          loading={loading}
          activeAction={activeAction}
          disabled={!canSubmit}
          onAction={handleAction}
        />

        {/* Main content */}
        <Container maxWidth="xl" sx={{ flex: 1, py: 2 }}>
          <Grid
            container
            spacing={2}
            sx={{ height: { md: 'calc(100vh - 116px)' } }}
          >
            <Grid size={{ xs: 12, md: 5 }} sx={{ height: { md: '100%' } }}>
              <LeftPanel
                resumeText={resumeText}
                jdText={jdText}
                onResumeChange={setResumeText}
                onJdChange={setJdText}
              />
            </Grid>
            <Grid
              size={{ xs: 12, md: 7 }}
              sx={{ height: { md: '100%' }, minHeight: { xs: 420 } }}
            >
              <RightPanel
                loading={loading}
                activeAction={activeAction}
                text={text}
                atsScore={atsScore}
                error={error}
              />
            </Grid>
          </Grid>
        </Container>
      </Box>
    </ThemeProvider>
  );
}
