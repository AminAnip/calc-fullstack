from dotenv import load_dotenv
import os
load_dotenv()

# Use 0.0.0.0 for production, localhost for development
SERVER_URL = os.getenv("HOST", "0.0.0.0")
PORT = os.getenv("PORT", "8900")
ENV = os.getenv("ENV", "dev")

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")