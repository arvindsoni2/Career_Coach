import { Box, Typography, TextField } from '@mui/material';

interface JobDescInputProps {
  value: string;
  onChange: (text: string) => void;
}

export default function JobDescInput({ value, onChange }: JobDescInputProps) {
  return (
    <Box>
      <Typography variant="subtitle2" fontWeight={600} gutterBottom>
        Job Description
      </Typography>
      <TextField
        multiline
        minRows={5}
        maxRows={12}
        fullWidth
        placeholder="Paste the job description here…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        size="small"
      />
    </Box>
  );
}
