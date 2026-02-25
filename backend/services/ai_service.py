import os
import json
from typing import AsyncGenerator
from google import genai
from google.genai import types

_client: genai.Client | None = None

MODEL = "gemini-2.5-flash"

REVIEW_SYSTEM = """You are an expert ATS (Applicant Tracking System) analyst and career coach with 15 years of experience.
Analyze the provided resume against the job description.

Your response MUST follow this exact structure:
1. First, output a JSON block (and nothing else before it) in this exact format:
```json
{
  "total_score": <integer 0-100>,
  "breakdown": {
    "keyword_match":        {"score": <0-30>, "max": 30, "note": "<brief explanation>"},
    "experience_alignment": {"score": <0-25>, "max": 25, "note": "<brief explanation>"},
    "skills_coverage":      {"score": <0-20>, "max": 20, "note": "<brief explanation>"},
    "completeness":         {"score": <0-15>, "max": 15, "note": "<brief explanation>"},
    "format_quality":       {"score": <0-10>, "max": 10, "note": "<brief explanation>"}
  }
}
```
2. After the JSON block, add a blank line, then provide 5-8 specific, prioritized, actionable improvement suggestions. Number each suggestion. Be specific — reference actual content from the resume and JD."""

REWRITE_SYSTEM = """You are an expert resume writer with deep knowledge of ATS systems and hiring practices.
Rewrite the provided resume to maximize ATS compatibility and appeal for the specific job description.
Rules:
- Preserve all factual information — do not invent experiences or skills
- Incorporate relevant keywords from the job description naturally
- Use strong action verbs and quantify achievements where possible
- Maintain professional formatting with clear sections
- Output ONLY the rewritten resume text, no commentary or explanations"""

COVER_LETTER_SYSTEM = """You are an expert career coach and professional business writer.
Write a compelling, personalized cover letter for the candidate applying to the specified role.
Rules:
- Make it specific to the role and company (use details from the JD)
- Highlight 2-3 strongest matches between the candidate's background and the role
- Keep it to 3-4 paragraphs, professional but engaging
- Do NOT use generic filler phrases like "I am writing to express my interest"
- Output ONLY the cover letter text, no commentary"""


def get_client() -> genai.Client:
    global _client
    if _client is None:
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY environment variable is not set")
        _client = genai.Client(api_key=api_key)
    return _client


async def stream_review(resume_text: str, jd_text: str) -> AsyncGenerator[str, None]:
    """Stream resume review: first a JSON score block, then suggestions."""
    client = get_client()
    prompt = f"RESUME:\n{resume_text}\n\nJOB DESCRIPTION:\n{jd_text}"

    response = client.models.generate_content_stream(
        model=MODEL,
        contents=prompt,
        config=types.GenerateContentConfig(
            system_instruction=REVIEW_SYSTEM,
            temperature=0.3,
        ),
    )

    buffer = ""
    score_sent = False

    for chunk in response:
        if chunk.text:
            buffer += chunk.text

            if not score_sent:
                # Try to extract and emit the JSON score block once complete
                json_start = buffer.find("```json")
                json_end = buffer.find("```", json_start + 6) if json_start != -1 else -1

                if json_start != -1 and json_end != -1:
                    json_str = buffer[json_start + 7:json_end].strip()
                    try:
                        score_data = json.loads(json_str)
                        yield f"data: {json.dumps({'type': 'score', 'data': score_data})}\n\n"
                        score_sent = True
                        # Emit any text that came after the JSON block
                        remaining = buffer[json_end + 3:].lstrip("\n")
                        if remaining:
                            yield f"data: {json.dumps({'type': 'text', 'data': remaining})}\n\n"
                        buffer = ""
                    except json.JSONDecodeError:
                        pass  # Keep buffering until we have valid JSON
            else:
                yield f"data: {json.dumps({'type': 'text', 'data': chunk.text})}\n\n"
                buffer = ""

    # Flush any remaining buffer that wasn't emitted
    if buffer and score_sent:
        yield f"data: {json.dumps({'type': 'text', 'data': buffer})}\n\n"

    yield "data: [DONE]\n\n"


async def stream_rewrite(resume_text: str, jd_text: str) -> AsyncGenerator[str, None]:
    """Stream rewritten resume text."""
    client = get_client()
    prompt = (
        f"Rewrite this resume optimized for the job description below.\n\n"
        f"RESUME:\n{resume_text}\n\nJOB DESCRIPTION:\n{jd_text}"
    )

    response = client.models.generate_content_stream(
        model=MODEL,
        contents=prompt,
        config=types.GenerateContentConfig(
            system_instruction=REWRITE_SYSTEM,
            temperature=0.4,
        ),
    )

    for chunk in response:
        if chunk.text:
            yield f"data: {json.dumps({'type': 'text', 'data': chunk.text})}\n\n"

    yield "data: [DONE]\n\n"


async def stream_cover_letter(resume_text: str, jd_text: str) -> AsyncGenerator[str, None]:
    """Stream cover letter text."""
    client = get_client()
    prompt = (
        f"Write a professional cover letter for this candidate applying to the role described below.\n\n"
        f"RESUME:\n{resume_text}\n\nJOB DESCRIPTION:\n{jd_text}"
    )

    response = client.models.generate_content_stream(
        model=MODEL,
        contents=prompt,
        config=types.GenerateContentConfig(
            system_instruction=COVER_LETTER_SYSTEM,
            temperature=0.5,
        ),
    )

    for chunk in response:
        if chunk.text:
            yield f"data: {json.dumps({'type': 'text', 'data': chunk.text})}\n\n"

    yield "data: [DONE]\n\n"
