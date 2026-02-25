from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from services.ai_service import stream_cover_letter

router = APIRouter()


class CoverLetterRequest(BaseModel):
    resume_text: str
    jd_text: str


@router.post("/cover-letter")
async def generate_cover_letter(request: CoverLetterRequest):
    """Stream a cover letter tailored to the resume and job description."""
    if not request.resume_text.strip():
        raise HTTPException(status_code=400, detail="Resume text is required.")
    if not request.jd_text.strip():
        raise HTTPException(status_code=400, detail="Job description is required.")

    return StreamingResponse(
        stream_cover_letter(request.resume_text, request.jd_text),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
