import pytesseract
from PIL import Image
import io

# WINDOWS ONLY: If python can't find tesseract, uncomment the line below and update the path
# pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

def extract_text_from_image(image_bytes: bytes) -> str:
    """
    Receives raw image bytes, converts it to a PIL Image, and extracts text.
    """
    try:
        image = Image.open(io.BytesIO(image_bytes))
        extracted_text = pytesseract.image_to_string(image)
        return extracted_text.strip()
    except Exception as e:
        return f"OCR Error: {str(e)}"