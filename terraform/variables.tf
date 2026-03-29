variable "project_id" {
  description = "The GCP project ID"
  type        = string
  default     = "livent-0001"
}

variable "region" {
  description = "The GCP region to deploy to"
  type        = string
  default     = "asia-northeast1"
}

variable "backend_service_name" {
  description = "Name of the backend Cloud Run service"
  type        = string
  default     = "keisho-backend"
}

variable "frontend_service_name" {
  description = "Name of the frontend Cloud Run service"
  type        = string
  default     = "keisho-frontend"
}

variable "image_tag" {
  description = "Tag for the Docker images"
  type        = string
  default     = "latest"
}


