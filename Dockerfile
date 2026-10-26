FROM python:3.11-slim

# Install system dependencies for OpenCV
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code and built frontend
COPY backend/ /app/backend/
COPY frontend/dist/ /app/frontend/dist/

# Pre-download face models during build
RUN python /app/backend/models_loader.py

# Create storage directory and ensure permissions
RUN mkdir -p /app/backend/storage && chmod -R 777 /app/backend/storage

ENV PORT=7860
EXPOSE 7860

# Run FastAPI serving frontend and API
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "7860"]
