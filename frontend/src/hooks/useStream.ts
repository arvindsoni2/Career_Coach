import { useState, useCallback } from 'react';
import { streamEndpoint } from '../services/api';

export interface ATSBreakdownItem {
  score: number;
  max: number;
  note: string;
}

export interface ATSScore {
  total_score: number;
  breakdown: {
    keyword_match: ATSBreakdownItem;
    experience_alignment: ATSBreakdownItem;
    skills_coverage: ATSBreakdownItem;
    completeness: ATSBreakdownItem;
    format_quality: ATSBreakdownItem;
  };
}

export type StreamAction = 'review' | 'rewrite' | 'cover-letter';

interface StreamState {
  loading: boolean;
  text: string;
  atsScore: ATSScore | null;
  error: string | null;
  activeAction: StreamAction | null;
}

export function useStream() {
  const [state, setState] = useState<StreamState>({
    loading: false,
    text: '',
    atsScore: null,
    error: null,
    activeAction: null,
  });

  const startStream = useCallback(
    async (action: StreamAction, resumeText: string, jdText: string) => {
      setState({ loading: true, text: '', atsScore: null, error: null, activeAction: action });

      try {
        const reader = await streamEndpoint(action, resumeText, jdText);
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const raw = decoder.decode(value, { stream: true });
          const lines = raw.split('\n');

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const payload = line.slice(6).trim();
            if (payload === '[DONE]') break;

            try {
              const parsed = JSON.parse(payload) as { type: 'score' | 'text'; data: unknown };

              if (parsed.type === 'score') {
                setState((prev) => ({ ...prev, atsScore: parsed.data as ATSScore }));
              } else if (parsed.type === 'text') {
                setState((prev) => ({ ...prev, text: prev.text + (parsed.data as string) }));
              }
            } catch {
              // Ignore malformed chunks
            }
          }
        }
      } catch (err) {
        setState((prev) => ({
          ...prev,
          error: err instanceof Error ? err.message : 'An unexpected error occurred.',
        }));
      } finally {
        setState((prev) => ({ ...prev, loading: false }));
      }
    },
    [],
  );

  return { ...state, startStream };
}
