# AI Plagiarism Intelligence

Academic assignment integrity platform combining OCR, student history, and IBM watsonx.ai analysis.

## Project structure

- `backend/` - FastAPI server for image upload, OCR, and AI-driven analysis.
- `frontend/` - React + TypeScript UI for instructors and academic staff.

## Setup

### Backend

```powershell
cd "d:\Prachi\Projects and code\ai-plagiarism-intelligence\backend"
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install --upgrade pip
pip install -r requirements.txt
copy .env.example .env
# Update the .env file with your IBM Cloud watsonx credentials
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

### Frontend

```powershell
cd "d:\Prachi\Projects and code\ai-plagiarism-intelligence\frontend"
npm install
npm run dev
```

## Notes

- The backend uses a file-backed store at `backend/data/submissions.json` for student submission history.
- IBM watsonx.ai credentials must be configured in `backend/.env`.
- The frontend expects the backend at `http://127.0.0.1:8000` by default.
