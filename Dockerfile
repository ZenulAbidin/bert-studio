# --- Stage 1: Build frontend ---
FROM node:22 AS frontend-build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY ./src ./src
COPY ./public ./public
COPY vite.config.ts ./
COPY index.html ./
RUN npm run build

# --- Stage 2: Backend and final image ---
FROM python:3.10-slim AS backend
WORKDIR /app

# Install backend dependencies. The default PyTorch wheel from PyPI includes
# CUDA. For a much smaller CPU-only image, build with
#   --build-arg TORCH_INDEX_URL=https://download.pytorch.org/whl/cpu
ARG TORCH_INDEX_URL=
COPY backend/requirements.txt ./backend/requirements.txt
# torch alone comes from that index; its dependencies come from PyPI below.
RUN if [ -n "$TORCH_INDEX_URL" ]; then \
        pip install --no-cache-dir --no-deps torch --index-url "$TORCH_INDEX_URL"; \
    fi \
    && pip install --no-cache-dir -r ./backend/requirements.txt

# Copy backend code
COPY backend ./backend

# Copy built frontend
COPY --from=frontend-build /app/dist ./backend/static

# Expose port
EXPOSE 4794

# Set environment variables (optional, can be overridden)
ENV PYTHONUNBUFFERED=1
ENV PORT=4794

# Start FastAPI with Uvicorn
CMD ["python", "-m", "uvicorn", "main:app", "--app-dir", "/app/backend", "--host", "0.0.0.0", "--port", "4794"]
