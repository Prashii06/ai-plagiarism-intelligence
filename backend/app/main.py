from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.database import (
    create_session,
    create_user,
    get_all_submissions,
    get_submissions_by_student,
    get_username_from_token,
    invalidate_session,
    save_submission,
    update_submission_status,
    verify_user,
)
from app.ocr_engine import extract_text_from_image
from app.watson_client import analyze_style_and_plagiarism

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _parse_bearer_token(authorization: Optional[str]) -> Optional[str]:
    if not authorization:
        return None
    parts = authorization.split()
    if len(parts) == 2 and parts[0].lower() == "bearer":
        return parts[1]
    return None


def require_auth(authorization: Optional[str] = Header(None)) -> str:
    token = _parse_bearer_token(authorization)
    if not token:
        raise HTTPException(status_code=401, detail="Authorization header is required.")

    username = get_username_from_token(token)
    if not username:
        raise HTTPException(status_code=401, detail="Invalid or expired session token.")
    return username


class AuthRequest(BaseModel):
    username: str
    password: str


class ReviewRequest(BaseModel):
    status: str
    review_note: str


@app.post("/api/auth/signup")
def signup(payload: AuthRequest) -> Dict[str, Any]:
    if not create_user(payload.username.strip(), payload.password):
        raise HTTPException(status_code=400, detail="Username already exists or invalid credentials.")

    token = create_session(payload.username.strip())
    return {"success": True, "token": token}


@app.post("/api/auth/login")
def login(payload: AuthRequest) -> Dict[str, Any]:
    if not verify_user(payload.username.strip(), payload.password):
        raise HTTPException(status_code=401, detail="Username or password is incorrect.")

    token = create_session(payload.username.strip())
    return {"success": True, "token": token}


@app.post("/api/auth/logout")
def logout(username: str = Depends(require_auth), authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    token = _parse_bearer_token(authorization)
    if token:
        invalidate_session(token)
    return {"success": True, "message": f"Signed out {username}."}


@app.post("/api/upload-assignment")
async def upload_assignment(
    file: UploadFile = File(...),
    student_id: Optional[str] = Form(None),
    assignment_title: Optional[str] = Form(None),
    username: str = Depends(require_auth),
):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File type must be an image.")

    image_bytes = await file.read()
    extracted_text = extract_text_from_image(image_bytes)
    if not extracted_text or "OCR Error" in extracted_text:
        raise HTTPException(status_code=422, detail="Failed to read text from image cleanly.")

    historical = []
    if student_id:
        try:
            historical = get_submissions_by_student(student_id)
        except Exception:
            historical = []

    instructor_feedback = [
        "Student writes in clear, simple sentences with few advanced vocabulary choices.",
        "Previous papers show a consistent level of reasoning but some repetition in phrasing.",
    ]

    analysis_report = analyze_style_and_plagiarism(
        new_text=extracted_text,
        historical_submissions=historical,
        instructor_notes=instructor_feedback,
    )

    if student_id:
        try:
            save_submission(
                student_id=student_id,
                assignment_title=assignment_title or "Untitled Assignment",
                text=extracted_text,
                teacher=username,
                metadata={
                    "assignment_title": assignment_title or "Untitled Assignment",
                    "uploaded_at": datetime.utcnow().isoformat() + "Z",
                },
            )
        except Exception:
            pass

    return {
        "success": True,
        "filename": file.filename,
        "student_id": student_id,
        "assignment_title": assignment_title,
        "extracted_text": extracted_text,
        "analysis_report": analysis_report,
        "historical_submissions": historical,
    }


@app.get("/api/students/{student_id}/history")
def student_history(student_id: str, username: str = Depends(require_auth)) -> Dict[str, Any]:
    submissions = get_submissions_by_student(student_id)
    return {
        "student_id": student_id,
        "submission_count": len(submissions),
        "historical_submissions": submissions,
    }


@app.get("/api/submissions")
def submissions_list(username: str = Depends(require_auth)) -> Dict[str, Any]:
    submissions = get_all_submissions()
    return {"count": len(submissions), "submissions": submissions}


@app.post("/api/submissions/{submission_id}/review")
def review_submission(submission_id: str, payload: ReviewRequest, username: str = Depends(require_auth)) -> Dict[str, Any]:
    updated = update_submission_status(submission_id, payload.status, payload.review_note)
    if not updated:
        raise HTTPException(status_code=404, detail="Submission not found.")
    return {"success": True, "submission": updated}
