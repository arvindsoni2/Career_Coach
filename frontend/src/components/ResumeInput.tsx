import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Box,
  Typography,
  TextField,
  CircularProgress,
  Alert,
  Paper,
  Chip,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { uploadResumePdf } from '../services/api';

interface ResumeInputProps {
  value: string;
  onChange: (text: string) => void;
}

export default function ResumeInput({ value, onChange }: ResumeInputProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      setUploading(true);
      setUploadError(null);
      setUploadedFileName(null);

      try {
        const text = await uploadResumePdf(file);
        onChange(text);
        setUploadedFileName(file.name);
      } catch (err) {
        setUploadError(err instanceof Error ? err.message : 'Upload failed');
      } finally {
        setUploading(false);
      }
    },
    [onChange],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1,
    disabled: uploading,
  });

  return (
    <Box>
      <Typography variant="subtitle2" fontWeight={600} gutterBottom>
        Your Resume
      </Typography>

      {/* Drop Zone */}
      <Paper
        variant="outlined"
        {...getRootProps()}
        sx={{
          p: 2,
          mb: 1,
          textAlign: 'center',
          cursor: uploading ? 'not-allowed' : 'pointer',
          borderStyle: 'dashed',
          borderColor: isDragActive ? 'primary.main' : 'divider',
          bgcolor: isDragActive ? 'action.hover' : 'background.default',
          transition: 'all 0.2s',
          '&:hover': { borderColor: 'primary.light', bgcolor: 'action.hover' },
        }}
      >
        <input {...getInputProps()} />
        {uploading ? (
          <Box display="flex" alignItems="center" justifyContent="center" gap={1}>
            <CircularProgress size={18} />
            <Typography variant="body2" color="text.secondary">
              Parsing PDF…
            </Typography>
          </Box>
        ) : (
          <Box display="flex" alignItems="center" justifyContent="center" gap={1}>
            <UploadFileIcon fontSize="small" color="action" />
            <Typography variant="body2" color="text.secondary">
              {isDragActive ? 'Drop PDF here' : 'Drop PDF or click to upload'}
            </Typography>
          </Box>
        )}
      </Paper>

      {uploadedFileName && (
        <Chip
          icon={<CheckCircleOutlineIcon />}
          label={uploadedFileName}
          color="success"
          size="small"
          sx={{ mb: 1 }}
        />
      )}

      {uploadError && (
        <Alert severity="error" sx={{ mb: 1, py: 0 }}>
          {uploadError}
        </Alert>
      )}

      <TextField
        multiline
        minRows={5}
        maxRows={12}
        fullWidth
        placeholder="…or paste your resume text here"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          if (uploadedFileName) setUploadedFileName(null);
        }}
        size="small"
      />
    </Box>
  );
}
