import {
  Box,
  Typography,
  LinearProgress,
  Chip,
  Card,
  CardContent,
  Grid,
  Alert,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import LightbulbOutlinedIcon from '@mui/icons-material/LightbulbOutlined';
import type { ATSScore, ATSBreakdownItem } from '../hooks/useStream';

interface ATSScoreCardProps {
  score: ATSScore;
}

// ─── Constants ─────────────────────────────────────────────────────────────

const BREAKDOWN_LABELS: Record<string, string> = {
  keyword_match: 'Keyword Match',
  experience_alignment: 'Experience Alignment',
  skills_coverage: 'Skills Coverage',
  completeness: 'Resume Completeness',
  format_quality: 'Format Quality',
};

const VALID_STATUSES = ['good', 'attention', 'critical'] as const;

const STATUS_COLOR: Record<ATSBreakdownItem['status'], 'success' | 'warning' | 'error'> = {
  good: 'success',
  attention: 'warning',
  critical: 'error',
};

const STATUS_LABEL: Record<ATSBreakdownItem['status'], string> = {
  good: 'Good',
  attention: 'Needs Attention',
  critical: 'Critical',
};

// ─── Sub-component: status chip ────────────────────────────────────────────

function StatusChip({ status }: { status: ATSBreakdownItem['status'] }) {
  return (
    <Chip
      label={STATUS_LABEL[status]}
      color={STATUS_COLOR[status]}
      size="small"
      sx={{ fontWeight: 600, fontSize: '0.68rem', height: 20 }}
    />
  );
}

// ─── Sub-component: per-category card ──────────────────────────────────────

function CategoryCard({ categoryKey, item }: { categoryKey: string; item: ATSBreakdownItem }) {
  // Guard against unexpected status values from the model
  const safeStatus: ATSBreakdownItem['status'] = VALID_STATUSES.includes(
    item.status as ATSBreakdownItem['status'],
  )
    ? (item.status as ATSBreakdownItem['status'])
    : 'attention';

  const strengths = item.strengths ?? [];
  const gaps = item.gaps ?? [];
  const pct = Math.round((item.score / item.max) * 100);
  const muiColor = STATUS_COLOR[safeStatus];
  const label = BREAKDOWN_LABELS[categoryKey] ?? categoryKey;
  const noIssues = gaps.length === 0 && safeStatus === 'good';

  return (
    <Card
      variant="outlined"
      sx={{
        height: '100%',
        borderWidth: 1.5,
        borderColor: (theme) =>
          safeStatus === 'critical'
            ? theme.palette.error.light
            : safeStatus === 'attention'
              ? theme.palette.warning.light
              : theme.palette.success.light,
      }}
    >
      <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>

        {/* Header: label + score/max + status chip */}
        <Box display="flex" alignItems="flex-start" justifyContent="space-between" mb={0.75}>
          <Box>
            <Typography variant="body2" fontWeight={700} lineHeight={1.2}>
              {label}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {item.score}/{item.max}
            </Typography>
          </Box>
          <StatusChip status={safeStatus} />
        </Box>

        {/* Per-category progress bar */}
        <LinearProgress
          variant="determinate"
          value={pct}
          color={muiColor}
          sx={{ height: 5, borderRadius: 3, mb: 1 }}
        />

        {/* Strengths */}
        {strengths.map((s, i) => (
          <Box key={i} display="flex" alignItems="flex-start" gap={0.5} mb={0.3}>
            <CheckCircleIcon
              fontSize="inherit"
              color="success"
              sx={{ fontSize: '0.85rem', mt: '2px', flexShrink: 0 }}
            />
            <Typography variant="caption" color="text.secondary" lineHeight={1.4}>
              {s}
            </Typography>
          </Box>
        ))}

        {/* Gaps */}
        {gaps.map((g, i) => (
          <Box key={i} display="flex" alignItems="flex-start" gap={0.5} mb={0.3}>
            {safeStatus === 'critical' ? (
              <ErrorOutlineIcon
                fontSize="inherit"
                color="error"
                sx={{ fontSize: '0.85rem', mt: '2px', flexShrink: 0 }}
              />
            ) : (
              <WarningAmberIcon
                fontSize="inherit"
                color="warning"
                sx={{ fontSize: '0.85rem', mt: '2px', flexShrink: 0 }}
              />
            )}
            <Typography variant="caption" color="text.secondary" lineHeight={1.4}>
              {g}
            </Typography>
          </Box>
        ))}

        {/* No issues message */}
        {noIssues && (
          <Typography
            variant="caption"
            color="success.main"
            sx={{ display: 'block', mt: 0.5, fontStyle: 'italic' }}
          >
            No issues found.
          </Typography>
        )}

        {/* Actionable suggestion */}
        {item.suggestion && (
          <Alert
            severity="info"
            icon={<LightbulbOutlinedIcon fontSize="inherit" />}
            sx={{
              mt: 1,
              py: 0.25,
              px: 1,
              '& .MuiAlert-message': { fontSize: '0.72rem', lineHeight: 1.4 },
              '& .MuiAlert-icon': { fontSize: '0.9rem', pt: '3px' },
            }}
          >
            {item.suggestion}
          </Alert>
        )}

      </CardContent>
    </Card>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────

export default function ATSScoreCard({ score }: ATSScoreCardProps) {
  const totalPct = score.total_score;
  const totalColor: 'success' | 'warning' | 'error' =
    totalPct >= 75 ? 'success' : totalPct >= 50 ? 'warning' : 'error';

  return (
    <Box>

      {/* ── Zone 1: Total score header ── */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
        <Typography variant="subtitle2" fontWeight={700}>
          ATS Score
        </Typography>
        <Chip
          label={`${totalPct}/100`}
          color={totalColor}
          size="small"
          sx={{ fontWeight: 700, fontSize: '0.85rem' }}
        />
      </Box>

      <LinearProgress
        variant="determinate"
        value={totalPct}
        color={totalColor}
        sx={{ height: 10, borderRadius: 5, mb: 0.75 }}
      />

      {/* Overall summary */}
      {score.overall_summary && (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: 'block', mb: 2, fontStyle: 'italic', lineHeight: 1.4 }}
        >
          {score.overall_summary}
        </Typography>
      )}

      {/* ── Zone 2: Category cards ── */}
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
        Score Breakdown
      </Typography>

      <Grid container spacing={1.5}>
        {Object.entries(score.breakdown).map(([key, item]) => (
          <Grid key={key} size={{ xs: 12, sm: 6 }}>
            <CategoryCard categoryKey={key} item={item} />
          </Grid>
        ))}
      </Grid>

    </Box>
  );
}
