#!/bin/bash
set -e

PROJECT_ID="livent-0001"
REGION="asia-northeast1"
REPO_NAME="keisho-repo"
TAG="latest"

# Authenticate with Google Cloud Artifact Registry
echo "Authenticating with Artifact Registry..."
gcloud auth configure-docker ${REGION}-docker.pkg.dev

# Define image URLs
BACKEND_IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/backend:${TAG}"
FRONTEND_IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/frontend:${TAG}"

# Build and push Backend
echo "Building Backend image for linux/amd64..."
docker build --platform linux/amd64 -t ${BACKEND_IMAGE} ./backend

echo "Pushing Backend image to Artifact Registry..."
docker push ${BACKEND_IMAGE}

# Build and push Frontend
echo "Building Frontend image for linux/amd64..."
docker build --platform linux/amd64 \
  --build-arg VITE_API_URL="https://keisho-backend-250252396269.asia-northeast1.run.app" \
  --build-arg VITE_PRIVY_APP_ID="cmn2mr7ec01sq0cjjdmdj8x6t" \
  -t ${FRONTEND_IMAGE} ./frontend



echo "Pushing Frontend image to Artifact Registry..."
docker push ${FRONTEND_IMAGE}

echo "Done! Images have been built and pushed to Artifact Registry."
