from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from services.pdf_parser import extract_text_from_pdf
from services.ai_service import stream_review, stream_rewrite

router = APIRouter()


class AnalysisRequest(BaseModel):
    resume_text: str
    jd_text: str


@router.post("/upload-resume")
async def upload_resume(file: UploadFile = File(...)):
    """Extract text from an uploaded PDF resume."""
    if file.content_type not in ("application/pdf", "application/octet-stream"):
        # Also allow if filename ends with .pdf
        if not (file.filename or "").lower().endswith(".pdf"):
            raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    file_bytes = await file.read()
    try:
        text = extract_text_from_pdf(file_bytes)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse PDF: {str(e)}")

    if not text.strip():
        raise HTTPException(status_code=400, detail="No text could be extracted from the PDF.")

    return {"text": text}


@router.post("/review")
async def review_resume(request: AnalysisRequest):
    """Stream resume review with ATS score and improvement suggestions."""
    if not request.resume_text.strip():
        raise HTTPException(status_code=400, detail="Resume text is required.")
    if not request.jd_text.strip():
        raise HTTPException(status_code=400, detail="Job description is required.")

    return StreamingResponse(
        stream_review(request.resume_text, request.jd_text),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/rewrite")
async def rewrite_resume(request: AnalysisRequest):
    """Stream a rewritten version of the resume optimized for the job description."""
    if not request.resume_text.strip():
        raise HTTPException(status_code=400, detail="Resume text is required.")
    if not request.jd_text.strip():
        raise HTTPException(status_code=400, detail="Job description is required.")

    return StreamingResponse(
        stream_rewrite(request.resume_text, request.jd_text),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
