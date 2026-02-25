import {
  Box,
  Typography,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import type { ATSScore } from '../hooks/useStream';

interface ATSScoreCardProps {
  score: ATSScore;
}

const BREAKDOWN_LABELS: Record<string, string> = {
  keyword_match: 'Keyword Match',
  experience_alignment: 'Experience Alignment',
  skills_coverage: 'Skills Coverage',
  completeness: 'Resume Completeness',
  format_quality: 'Format Quality',
};

function scoreColor(pct: number): 'success' | 'warning' | 'error' {
  if (pct >= 75) return 'success';
  if (pct >= 50) return 'warning';
  return 'error';
}

function ScoreIcon({ pct }: { pct: number }) {
  if (pct >= 75) return <CheckCircleIcon fontSize="small" color="success" />;
  if (pct >= 50) return <WarningAmberIcon fontSize="small" color="warning" />;
  return <ErrorOutlineIcon fontSize="small" color="error" />;
}

export default function ATSScoreCard({ score }: ATSScoreCardProps) {
  const totalPct = score.total_score;
  const color = scoreColor(totalPct);

  return (
    <Box>
      {/* Total score */}
      <Box display="flex" alignItems="center" gap={2} mb={1}>
        <Box flex={1}>
          <Box display="flex" justifyContent="space-between" mb={0.5}>
            <Typography variant="subtitle2" fontWeight={700}>
              ATS Score
            </Typography>
            <Chip
              label={`${totalPct}/100`}
              color={color}
              size="small"
              sx={{ fontWeight: 700, fontSize: '0.85rem' }}
            />
          </Box>
          <LinearProgress
            variant="determinate"
            value={totalPct}
            color={color}
            sx={{ height: 10, borderRadius: 5 }}
          />
        </Box>
      </Box>

      {/* Breakdown */}
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
        Score Breakdown
      </Typography>
      {Object.entries(score.breakdown).map(([key, item]) => {
        const pct = Math.round((item.score / item.max) * 100);
        return (
          <Accordion key={key} disableGutters elevation={0} sx={{ border: 'none' }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 0, minHeight: 36 }}>
              <Box display="flex" alignItems="center" gap={1} flex={1}>
                <ScoreIcon pct={pct} />
                <Typography variant="body2" flex={1}>
                  {BREAKDOWN_LABELS[key] ?? key}
                </Typography>
                <Typography variant="body2" color="text.secondary" mr={1}>
                  {item.score}/{item.max}
                </Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails sx={{ pt: 0, pb: 1, px: 0 }}>
              <LinearProgress
                variant="determinate"
                value={pct}
                color={scoreColor(pct)}
                sx={{ height: 6, borderRadius: 3, mb: 0.5 }}
              />
              <Typography variant="caption" color="text.secondary">
                {item.note}
              </Typography>
            </AccordionDetails>
          </Accordion>
        );
      })}
    </Box>
  );
}
