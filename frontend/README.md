# AI Plagiarism Intelligence Frontend

This React + TypeScript frontend provides a polished interface for instructors and academic staff to upload assignment images, validate OCR output, and inspect the AI integrity report returned by the backend.

## Setup

```powershell
cd "d:\Prachi\Projects and code\ai-plagiarism-intelligence\frontend"
npm install
npm run dev
```

## Usage

1. Enter a student ID and optional assignment title.
2. Upload a classroom assignment image.
3. Click `Run Plagiarism Check` to send the image to the backend.
4. Review the extracted text and the AI integrity findings.

## Notes

- The frontend expects the backend to be available at `http://127.0.0.1:8000` by default.
- You can override the backend URL with `VITE_API_URL` in a `.env` file if needed.
