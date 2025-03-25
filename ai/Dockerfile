# Use official Python image
FROM python:3.10

# Set working directory
WORKDIR /app

# Install system dependencies (required for OpenCV)
RUN apt-get update && apt-get install -y libgl1-mesa-glx libglib2.0-0

# Create a virtual environment
RUN python -m venv /app/.venv

# Activate the virtual environment and install dependencies
COPY requirements.txt .
RUN /app/.venv/bin/pip install --no-cache-dir -r requirements.txt

# Copy all files
COPY . .

# Set the virtual environment as the default Python
ENV PATH="/app/.venv/bin:$PATH"

# Expose port 8080 for Cloud Run
EXPOSE 8080

# Command to start the AI service
CMD ["python", "main.py"]
