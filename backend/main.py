from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from routers import resume, cover_letter

load_dotenv()

app = FastAPI(title="AI Career Coach API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(resume.router, prefix="/api")
app.include_router(cover_letter.router, prefix="/api")


@app.get("/health")
def health_check():
    return {"status": "ok"}
