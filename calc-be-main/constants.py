import os

# Use default values only for local development
SERVER_URL = os.getenv("SERVER_URL", "0.0.0.0")
PORT = os.getenv("PORT", "10000")  # Any default is fine locally
ENV = os.getenv("ENV", "dev")
