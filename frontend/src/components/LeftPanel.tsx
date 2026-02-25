import { Paper, Divider } from '@mui/material';
import ResumeInput from './ResumeInput';
import JobDescInput from './JobDescInput';

interface LeftPanelProps {
  resumeText: string;
  jdText: string;
  onResumeChange: (text: string) => void;
  onJdChange: (text: string) => void;
}

export default function LeftPanel({
  resumeText,
  jdText,
  onResumeChange,
  onJdChange,
}: LeftPanelProps) {
  return (
    <Paper
      elevation={0}
      variant="outlined"
      sx={{
        p: 2.5,
        height: { md: '100%' },
        overflow: { md: 'auto' },
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
      }}
    >
      <ResumeInput value={resumeText} onChange={onResumeChange} />
      <Divider />
      <JobDescInput value={jdText} onChange={onJdChange} />
    </Paper>
  );
}
