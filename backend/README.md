# AI Plagiarism Intelligence Backend

This backend serves the assignment upload endpoint, runs OCR on assignment images, and sends extracted text to IBM watsonx.ai for stylistic plagiarism analysis.

## Setup

1. Create a Python virtual environment and install dependencies:

```powershell
cd "d:\Prachi\Projects and code\ai-plagiarism-intelligence\backend"
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install --upgrade pip
pip install -r requirements.txt
```

2. Copy the example environment file and add your IBM credentials:

```powershell
copy .env.example .env
```

3. Update `.env` with your IBM Cloud Lite `WATSONX_URL`, `WATSONX_API_KEY`, and `WATSONX_PROJECT_ID`.

4. Optionally set a supported Watson model ID if your account or project has a quota issue:

```powershell
WATSONX_MODEL_ID=ibm/granite-4.1
```

5. Start the backend server:

```powershell
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

## API Endpoints

- `POST /api/upload-assignment`
  - accepts `file` (image upload)
  - optional form fields: `student_id`, `assignment_title`
  - returns OCR text and AI-style analysis

- `GET /api/students/{student_id}/history`
  - returns stored historical submissions for a student

## Notes

- The backend uses a simple JSON-backed store at `backend/data/submissions.json` for student history.
- If `WATSONX_API_KEY` or `WATSONX_PROJECT_ID` are missing, the service returns a fallback analysis sample.
- Ensure Tesseract OCR is installed on your machine and discoverable by `pytesseract`.
