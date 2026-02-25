import os
import json
from typing import AsyncGenerator
from google import genai
from google.genai import types

_client: genai.Client | None = None

MODEL = "gemini-2.5-flash"

REVIEW_SYSTEM = """You are an expert ATS (Applicant Tracking System) analyst and career coach with 15 years of experience.
Analyze the provided resume against the job description and return ONLY a single JSON code block — no text before or after it.

Output this exact JSON structure:
```json
{
  "total_score": <integer 0-100>,
  "overall_summary": "<one concise sentence, max 20 words, summarising the candidate's biggest strength and biggest gap>",
  "breakdown": {
    "keyword_match": {
      "score": <integer 0-30>, "max": 30,
      "note": "<brief one-line note>",
      "status": "<'good' if score/max >= 0.75, 'attention' if >= 0.50, else 'critical'>",
      "strengths": ["<specific keyword or phrase present in resume that matches JD>"],
      "gaps": ["<specific keyword or requirement from JD that is missing from resume>"],
      "suggestion": "<one concrete actionable fix — empty string if gaps is empty>"
    },
    "experience_alignment": {
      "score": <integer 0-25>, "max": 25,
      "note": "<brief one-line note>",
      "status": "<'good' | 'attention' | 'critical'>",
      "strengths": ["<specific strength present>"],
      "gaps": ["<specific gap or missing requirement>"],
      "suggestion": "<actionable fix or empty string>"
    },
    "skills_coverage": {
      "score": <integer 0-20>, "max": 20,
      "note": "<brief one-line note>",
      "status": "<'good' | 'attention' | 'critical'>",
      "strengths": ["<specific skill present that matches JD>"],
      "gaps": ["<specific skill from JD missing in resume>"],
      "suggestion": "<actionable fix or empty string>"
    },
    "completeness": {
      "score": <integer 0-15>, "max": 15,
      "note": "<brief one-line note>",
      "status": "<'good' | 'attention' | 'critical'>",
      "strengths": ["<section or element that is well represented>"],
      "gaps": ["<missing section or element>"],
      "suggestion": "<actionable fix or empty string>"
    },
    "format_quality": {
      "score": <integer 0-10>, "max": 10,
      "note": "<brief one-line note>",
      "status": "<'good' | 'attention' | 'critical'>",
      "strengths": ["<formatting element done well>"],
      "gaps": ["<formatting issue>"],
      "suggestion": "<actionable fix or empty string>"
    }
  }
}
```
Rules:
- status MUST be computed from score/max: >= 0.75 → "good", >= 0.50 → "attention", < 0.50 → "critical"
- strengths: list 1-4 specific items present in the resume that satisfy JD requirements
- gaps: list specific items from the JD that are absent; empty array [] if none
- suggestion: one concrete sentence telling the candidate exactly what to add or change; use empty string "" if gaps is empty
- overall_summary: exactly one sentence, max 20 words
- Output ONLY the JSON code block. No preamble, no follow-up text."""

REWRITE_SYSTEM = """You are an expert resume writer with deep knowledge of ATS systems and hiring practices.
Rewrite the provided resume to maximize ATS compatibility and appeal for the specific job description.

Rules:
- Preserve all factual information — do not invent experiences or skills
- Incorporate relevant keywords from the job description naturally
- Use strong action verbs and quantify achievements where possible
- Output ONLY the rewritten resume text, no commentary or explanations

Formatting rules (strictly follow — the output will be rendered directly into a PDF):
- Line 1: candidate's full name only
- Line 2: contact details separated by  |  (email | phone | location | LinkedIn)
- Section headers in ALL CAPS (e.g. PROFESSIONAL SUMMARY, EXPERIENCE, EDUCATION, SKILLS)
- Each section header is on its own line with a blank line before it
- Bullet points use the • character (not - or *)
- No markdown formatting — no **, no __, no ## headings
- Job/role lines follow the format: Job Title | Company Name | Date Range"""

COVER_LETTER_SYSTEM = """You are an expert career coach and professional business writer.
Write a compelling, personalized cover letter for the candidate applying to the specified role.
Rules:
- Total word count MUST be under 250 words (excluding greeting and sign-off) — be concise
- Start with the greeting: Dear Hiring Manager,
- Body: 2-3 short paragraphs; make it specific to the role and company using details from the JD
- Highlight 2-3 strongest matches between the candidate's background and the role
- Do NOT use generic filler phrases like "I am writing to express my interest"
- End with a professional sign-off: Sincerely, followed by the candidate's name on the next line
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
