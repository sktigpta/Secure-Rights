# Use official Python image
FROM python:3.10-slim

# Set working directory
WORKDIR /app

# Install system dependencies (required for OpenCV and other libraries)
RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx \
    libglib2.0-0 \
    ffmpeg \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Create a virtual environment
RUN python -m venv /app/.venv

# Activate the virtual environment and upgrade pip
RUN /app/.venv/bin/pip install --no-cache-dir --upgrade pip

# Copy requirements first to leverage Docker cache
COPY requirements.txt .

# Install Python dependencies
RUN /app/.venv/bin/pip install --no-cache-dir -r requirements.txt

# Copy all project files
COPY . .

# Set the virtual environment as the default Python
ENV PATH="/app/.venv/bin:$PATH"

# Set environment variables for Cloud Run
ENV PORT=8080
ENV PYTHONUNBUFFERED=1

# Expose port 8080 for Cloud Run
EXPOSE 8080

# Command to start the AI service
CMD ["python", "main.py"]