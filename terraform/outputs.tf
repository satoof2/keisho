output "backend_url" {
  value       = google_cloud_run_v2_service.backend.uri
  description = "The URL of the backend service"
}

output "frontend_url" {
  value       = google_cloud_run_v2_service.frontend.uri
  description = "The URL of the frontend service"
}


