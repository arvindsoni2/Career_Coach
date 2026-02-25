import { Box, Button, CircularProgress, Paper, Tooltip } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import EditNoteIcon from '@mui/icons-material/EditNote';
import ArticleIcon from '@mui/icons-material/Article';
import type { StreamAction } from '../hooks/useStream';

interface ActionBarProps {
  loading: boolean;
  activeAction: StreamAction | null;
  disabled: boolean;
  onAction: (action: StreamAction) => void;
}

const actions: {
  action: StreamAction;
  label: string;
  shortLabel: string;
  icon: React.ReactNode;
}[] = [
  { action: 'review', label: 'Review Resume', shortLabel: 'Review', icon: <SearchIcon /> },
  { action: 'rewrite', label: 'Rewrite Resume', shortLabel: 'Rewrite', icon: <EditNoteIcon /> },
  { action: 'cover-letter', label: 'Cover Letter', shortLabel: 'Cover', icon: <ArticleIcon /> },
];

export default function ActionBar({ loading, activeAction, disabled, onAction }: ActionBarProps) {
  const tooltipMsg = disabled ? 'Add your resume and job description first' : '';

  return (
    <Paper
      elevation={0}
      square
      sx={{
        px: { xs: 1.5, sm: 3 },
        py: 1,
        display: 'flex',
        gap: { xs: 1, sm: 1.5 },
        position: 'sticky',
        top: 48,
        zIndex: 1099,
        borderBottom: '1px solid',
        borderColor: 'divider',
        borderRadius: 0,
        bgcolor: 'background.paper',
      }}
    >
      {actions.map(({ action, label, shortLabel, icon }) => {
        const isActive = activeAction === action;
        const isGenerating = loading && isActive;

        return (
          <Tooltip key={action} title={tooltipMsg} placement="bottom">
            <span style={{ flex: 1, display: 'block' }}>
              <Button
                fullWidth
                variant={isActive ? 'contained' : 'outlined'}
                color="primary"
                startIcon={isGenerating ? <CircularProgress size={16} color="inherit" /> : icon}
                onClick={() => onAction(action)}
                disabled={disabled || loading}
                sx={{ textTransform: 'none', fontWeight: isActive ? 700 : 400 }}
              >
                {/* Full label on sm+, short label on xs */}
                <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                  {isGenerating ? 'Generating…' : label}
                </Box>
                <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>
                  {isGenerating ? '…' : shortLabel}
                </Box>
              </Button>
            </span>
          </Tooltip>
        );
      })}
    </Paper>
  );
}
