import { useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Divider,
  Alert,
  CircularProgress,
  Skeleton,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DownloadIcon from '@mui/icons-material/Download';
import ATSScoreCard from './ATSScoreCard';
import type { ATSScore, StreamAction } from '../hooks/useStream';

interface RightPanelProps {
  loading: boolean;
  activeAction: StreamAction | null;
  text: string;
  atsScore: ATSScore | null;
  error: string | null;
}

const ACTION_LABELS: Record<StreamAction, string> = {
  review: 'Resume Review',
  rewrite: 'Rewritten Resume',
  'cover-letter': 'Cover Letter',
};

export default function RightPanel({
  loading,
  activeAction,
  text,
  atsScore,
  error,
}: RightPanelProps) {
  const resultRef = useRef<HTMLDivElement>(null);

  const handleCopy = async () => {
    const content = activeAction === 'review' && atsScore
      ? `ATS Score: ${atsScore.total_score}/100\n\n${text}`
      : text;
    await navigator.clipboard.writeText(content);
  };

  const handleDownloadPdf = async () => {
    const { default: jsPDF } = await import('jspdf');
    const { default: html2canvas } = await import('html2canvas');

    if (!resultRef.current) return;
    const canvas = await html2canvas(resultRef.current, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    const fileName =
      activeAction === 'cover-letter' ? 'cover-letter.pdf' : 'resume-output.pdf';
    pdf.save(fileName);
  };

  const isEmpty = !loading && !text && !atsScore && !error;
  const showActions = !loading && (text || atsScore);

  return (
    <Paper
      elevation={0}
      variant="outlined"
      sx={{ p: 2.5, height: { md: '100%' }, minHeight: { xs: 420 }, display: 'flex', flexDirection: 'column' }}
    >
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5}>
        <Typography variant="subtitle1" fontWeight={700}>
          {activeAction ? ACTION_LABELS[activeAction] : 'Results'}
        </Typography>
        {showActions && (
          <Box display="flex" gap={1}>
            <Button
              size="small"
              variant="outlined"
              startIcon={<ContentCopyIcon fontSize="small" />}
              onClick={handleCopy}
              sx={{ textTransform: 'none' }}
            >
              Copy
            </Button>
            <Button
              size="small"
              variant="outlined"
              startIcon={<DownloadIcon fontSize="small" />}
              onClick={handleDownloadPdf}
              sx={{ textTransform: 'none' }}
            >
              PDF
            </Button>
          </Box>
        )}
      </Box>

      <Divider sx={{ mb: 2 }} />

      {/* Empty state */}
      {isEmpty && (
        <Box
          flex={1}
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          color="text.disabled"
          gap={1}
        >
          <Typography variant="body2">
            Enter your resume and job description, then choose an action.
          </Typography>
        </Box>
      )}

      {/* Error */}
      {error && <Alert severity="error">{error}</Alert>}

      {/* Results */}
      <Box ref={resultRef} flex={1} overflow="auto">
        {/* ATS Score Card */}
        {atsScore && (
          <Box mb={3}>
            <ATSScoreCard score={atsScore} />
          </Box>
        )}

        {/* ATS score loading skeleton */}
        {loading && activeAction === 'review' && !atsScore && (
          <Box mb={3}>
            <Skeleton variant="text" width="40%" height={28} />
            <Skeleton variant="rectangular" height={10} sx={{ borderRadius: 5, mb: 2 }} />
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} variant="text" width={`${70 + i * 3}%`} />
            ))}
          </Box>
        )}

        {/* Streaming text */}
        {(text || loading) && (
          <Box>
            {activeAction === 'review' && (
              <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                Improvement Suggestions
              </Typography>
            )}
            <Typography
              variant="body2"
              component="pre"
              sx={{
                fontFamily: 'inherit',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                lineHeight: 1.7,
              }}
            >
              {text}
              {loading && (
                <CircularProgress
                  size={12}
                  sx={{ ml: 0.5, verticalAlign: 'middle' }}
                />
              )}
            </Typography>
          </Box>
        )}
      </Box>
    </Paper>
  );
}
