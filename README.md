# AI Plagiarism Intelligence

Academic assignment integrity platform combining OCR, student history, and IBM watsonx.ai analysis for intelligent plagiarism detection and personalized feedback.

## Tech Stack

### AI & Machine Learning
- **IBM Granite Model** (e.g., ibm-granite-3-2-8b) - Natural language understanding, reasoning, and personalized analysis for plagiarism detection
- **IBM Watsonx.ai** - Model deployment, embeddings generation, and AI governance for enterprise-grade AI services
- **RAG (Retrieval-Augmented Generation)** - Fetch real plagiarism data first, then generate intelligent analysis, ensuring more trustworthy and effective detection
- **Vector Database (FAISS/Chroma)** - Store and retrieve academic integrity reference data for RAG-based analysis

### Workflow & Orchestration
- **Langflow Platform** - Design and orchestrate multi-agent workflows visually for complex plagiarism detection pipelines

### Infrastructure & Deployment
- **IBM Cloud** - Reliable, secure, and scalable infrastructure for deploying the plagiarism intelligence system

### Application Stack
- **Backend**: FastAPI (Python) - RESTful API server for OCR processing and AI analysis
- **Frontend**: React + TypeScript - Modern UI for instructors and academic staff
- **OCR**: Tesseract - Optical character recognition for extracting text from assignment images

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
