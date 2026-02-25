const API_BASE = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL : '';

export async function uploadResumePdf(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE}/api/upload-resume`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Upload failed' }));
    throw new Error(error.detail || 'Failed to upload resume');
  }

  const data = await response.json();
  return data.text as string;
}

export function streamEndpoint(
  endpoint: 'review' | 'rewrite' | 'cover-letter',
  resumeText: string,
  jdText: string,
): Promise<ReadableStreamDefaultReader<Uint8Array>> {
  return fetch(`${API_BASE}/api/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resume_text: resumeText, jd_text: jdText }),
  }).then((res) => {
    if (!res.ok || !res.body) {
      throw new Error(`API request failed: ${res.status}`);
    }
    return res.body.getReader();
  });
}
