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
    if (activeAction === 'review' && atsScore) {
      const lines: string[] = [`ATS Score: ${atsScore.total_score}/100`];
      if (atsScore.overall_summary) lines.push(atsScore.overall_summary);
      lines.push('');
      for (const [key, item] of Object.entries(atsScore.breakdown)) {
        const label = key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
        lines.push(`${label}: ${item.score}/${item.max} (${item.status})`);
        if (item.suggestion) lines.push(`  Suggestion: ${item.suggestion}`);
      }
      await navigator.clipboard.writeText(lines.join('\n'));
    } else {
      await navigator.clipboard.writeText(text);
    }
  };

  const handleDownloadPdf = async () => {
    const { default: jsPDF } = await import('jspdf');
    const filename = activeAction === 'cover-letter' ? 'cover-letter.pdf' : 'resume-output.pdf';

    if (activeAction === 'rewrite' || activeAction === 'cover-letter') {
      // ── Text-based PDF: proper typography, multi-page, no truncation ──────
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const mL = 50, mR = 50, mT = 55, mB = 55;
      const usableW = pageW - mL - mR;
      let y = mT;
      let lineIndex = 0;

      const checkBreak = (needed: number) => {
        if (y + needed > pageH - mB) { pdf.addPage(); y = mT; }
      };

      for (const rawLine of text.split('\n')) {
        // Strip any residual markdown the model may emit
        const line = rawLine.replace(/\*\*/g, '').replace(/^#+\s*/, '').trim();

        if (line === '') { y += 8; continue; }

        const isAllCaps = /^[A-Z][A-Z0-9\s\-&/()+]+$/.test(line) && line.length > 3;
        const isBullet = /^[•\-\*]\s/.test(line);
        const isContactLine = lineIndex === 1 && (line.includes('@') || line.includes('|'));

        if (lineIndex === 0) {
          // Name — centred, large
          checkBreak(26);
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(17);
          pdf.setTextColor(20, 20, 20);
          pdf.text(line, pageW / 2, y, { align: 'center' });
          y += 22;
        } else if (isContactLine) {
          // Contact row — centred, muted
          checkBreak(16);
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(9);
          pdf.setTextColor(90, 90, 90);
          pdf.text(line, pageW / 2, y, { align: 'center' });
          pdf.setTextColor(0, 0, 0);
          y += 16;
        } else if (isAllCaps && !isBullet) {
          // Section header — bold with underline rule
          checkBreak(28);
          y += 8;
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(11);
          pdf.setTextColor(30, 30, 30);
          pdf.text(line, mL, y);
          y += 4;
          pdf.setDrawColor(160, 160, 160);
          pdf.setLineWidth(0.5);
          pdf.line(mL, y, pageW - mR, y);
          pdf.setTextColor(0, 0, 0);
          y += 10;
        } else if (isBullet) {
          // Bullet point — indented
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(10);
          const bulletText = line.replace(/^[•\-\*]\s*/, '');
          const wrapped = pdf.splitTextToSize(bulletText, usableW - 14);
          checkBreak(13 * wrapped.length);
          pdf.text('•', mL, y);
          pdf.text(wrapped, mL + 12, y);
          y += 13 * wrapped.length;
        } else {
          // Regular line (job title row, paragraph text, etc.)
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(10);
          pdf.setTextColor(20, 20, 20);
          const wrapped = pdf.splitTextToSize(line, usableW);
          checkBreak(13 * wrapped.length);
          pdf.text(wrapped, mL, y);
          y += 13 * wrapped.length;
        }

        lineIndex++;
      }

      pdf.save(filename);
      return;
    }

    // ── Review: html2canvas with full-height expansion + multi-page slicing ──
    const { default: html2canvas } = await import('html2canvas');
    if (!resultRef.current) return;
    const el = resultRef.current;

    // Temporarily expand the scrollable container so html2canvas captures everything
    const prev = { overflow: el.style.overflow, height: el.style.height, maxHeight: el.style.maxHeight };
    el.style.overflow = 'visible';
    el.style.height = `${el.scrollHeight}px`;
    el.style.maxHeight = 'none';

    try {
      const canvas = await html2canvas(el, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfPageH = pdf.internal.pageSize.getHeight();
      const imgH = (canvas.height * pdfW) / canvas.width;
      let heightLeft = imgH;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, pdfW, imgH);
      heightLeft -= pdfPageH;

      while (heightLeft > 0) {
        position -= pdfPageH;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfW, imgH);
        heightLeft -= pdfPageH;
      }

      pdf.save(filename);
    } finally {
      el.style.overflow = prev.overflow;
      el.style.height = prev.height;
      el.style.maxHeight = prev.maxHeight;
    }
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

        {/* Streaming text — hidden for review; all detail is in ATSScoreCard */}
        {(text || loading) && activeAction !== 'review' && (
          <Box>
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
