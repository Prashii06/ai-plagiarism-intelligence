import hashlib
import json
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)
STORE_PATH = DATA_DIR / "submissions.json"


def _now_iso() -> str:
    return datetime.utcnow().isoformat() + "Z"


def _load_store() -> dict:
    if not STORE_PATH.exists():
        return {"users": {}, "sessions": {}, "submissions": []}

    try:
        with open(STORE_PATH, "r", encoding="utf-8") as f:
            raw_store = json.load(f)
    except Exception:
        return {"users": {}, "sessions": {}, "submissions": []}

    if "submissions" not in raw_store:
        submissions: List[dict] = []
        for student_id, entries in raw_store.items():
            if isinstance(entries, list):
                for entry in entries:
                    submissions.append(
                        {
                            "id": str(uuid.uuid4()),
                            "student_id": student_id,
                            "assignment_title": entry.get("metadata", {}).get("assignment_title", "Unknown Assignment"),
                            "text": entry.get("text", ""),
                            "teacher": "system",
                            "status": "pending",
                            "review_note": "",
                            "uploaded_at": entry.get("metadata", {}).get("uploaded_at", _now_iso()),
                            "created_at": _now_iso(),
                        }
                    )
        return {"users": {}, "sessions": {}, "submissions": submissions}

    return {
        "users": raw_store.get("users", {}),
        "sessions": raw_store.get("sessions", {}),
        "submissions": raw_store.get("submissions", []),
    }


def _save_store(store: dict) -> None:
    with open(STORE_PATH, "w", encoding="utf-8") as f:
        json.dump(store, f, ensure_ascii=False, indent=2)


def _hash_password(password: str, salt: Optional[str] = None) -> str:
    if salt is None:
        salt = uuid.uuid4().hex
    digest = hashlib.sha256(f"{salt}{password}".encode("utf-8")).hexdigest()
    return f"{salt}${digest}"


def _verify_password(stored: str, provided: str) -> bool:
    try:
        salt, _ = stored.split("$", 1)
        return _hash_password(provided, salt) == stored
    except Exception:
        return False


def create_user(username: str, password: str) -> bool:
    if not username or not password:
        return False

    store = _load_store()
    if username in store["users"]:
        return False

    store["users"][username] = {
        "password_hash": _hash_password(password),
        "created_at": _now_iso(),
    }
    _save_store(store)
    return True


def verify_user(username: str, password: str) -> bool:
    store = _load_store()
    user = store["users"].get(username)
    if not user:
        return False
    return _verify_password(user["password_hash"], password)


def create_session(username: str) -> str:
    token = uuid.uuid4().hex
    store = _load_store()
    store["sessions"][token] = {"username": username, "created_at": _now_iso()}
    _save_store(store)
    return token


def get_username_from_token(token: str) -> Optional[str]:
    if not token:
        return None
    store = _load_store()
    session = store["sessions"].get(token)
    return session.get("username") if isinstance(session, dict) else None


def invalidate_session(token: str) -> None:
    store = _load_store()
    if token in store["sessions"]:
        del store["sessions"][token]
        _save_store(store)


def save_submission(
    student_id: str,
    assignment_title: str,
    text: str,
    teacher: str,
    status: str = "pending",
    review_note: str = "",
    metadata: Optional[Dict[str, Any]] = None,
) -> dict:
    if not student_id or not text:
        raise ValueError("student_id and text are required")

    store = _load_store()
    submission = {
        "id": str(uuid.uuid4()),
        "student_id": student_id,
        "assignment_title": assignment_title or "Untitled Assignment",
        "text": text,
        "teacher": teacher,
        "status": status,
        "review_note": review_note,
        "metadata": metadata or {},
        "uploaded_at": _now_iso(),
    }
    store["submissions"].append(submission)
    _save_store(store)
    return submission


def get_submissions_by_student(student_id: str, limit: int = 5) -> List[str]:
    if not student_id:
        return []

    store = _load_store()
    submissions = [entry for entry in store["submissions"] if entry.get("student_id") == student_id]
    return [entry.get("text", "") for entry in submissions[-limit:]]


def get_all_submissions() -> List[dict]:
    store = _load_store()
    return list(store.get("submissions", []))


def update_submission_status(submission_id: str, status: str, review_note: str) -> Optional[dict]:
    store = _load_store()
    entries = store.get("submissions", [])
    for entry in entries:
        if entry.get("id") == submission_id:
            entry["status"] = status
            entry["review_note"] = review_note
            _save_store(store)
            return entry
    return None
