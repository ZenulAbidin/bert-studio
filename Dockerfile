# --- Stage 1: Build frontend ---
FROM node:22 AS frontend-build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install
COPY ./src ./src
COPY ./public ./public
COPY vite.config.ts ./
RUN npm run build

# --- Stage 2: Backend and final image ---
FROM python:3.10-slim AS backend
WORKDIR /app

# Install backend dependencies
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r ./backend/requirements.txt

# Copy backend code
COPY backend ./backend

# Copy built frontend
COPY --from=frontend-build /app/dist ./backend/static

# Expose port
EXPOSE 8000

# Set environment variables (optional, can be overridden)
ENV PYTHONUNBUFFERED=1
ENV PORT=8000

# Make sure you also set the Mongodb environment variables.


# Start FastAPI with Uvicorn
CMD ["python", "-m", "uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"] 