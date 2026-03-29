data "google_project" "project" {}

# Secret Manager secrets for backend configuration
resource "google_secret_manager_secret" "mongodb_uri" {
  secret_id = "mongodb-uri"
  replication {
    auto {}
  }
}



resource "google_secret_manager_secret_iam_member" "mongodb_uri_accessor" {
  secret_id = google_secret_manager_secret.mongodb_uri.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${data.google_project.project.number}-compute@developer.gserviceaccount.com"
}

resource "google_secret_manager_secret" "jwt_secret" {
  secret_id = "jwt-secret"
  replication {
    auto {}
  }
}



resource "google_secret_manager_secret_iam_member" "jwt_secret_accessor" {
  secret_id = google_secret_manager_secret.jwt_secret.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${data.google_project.project.number}-compute@developer.gserviceaccount.com"
}

# Artifact Registry for Docker images
resource "google_artifact_registry_repository" "repo" {
  location      = var.region
  repository_id = "keisho-repo"
  description   = "Docker repository for Keisho"
  format        = "DOCKER"
}


data "google_compute_network" "existing_vpc" {
  name = "default"
}

# Cloud Run Backend
resource "google_cloud_run_v2_service" "backend" {
  name     = var.backend_service_name
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    vpc_access {
      egress = "PRIVATE_RANGES_ONLY"

      network_interfaces {
        network    = data.google_compute_network.existing_vpc.name
        subnetwork = "default"
      }
    }
    containers {
      image = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.repo.repository_id}/backend:${var.image_tag}"

      ports {
        container_port = 7330
      }

      env {
        name = "MONGODB_URI"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.mongodb_uri.secret_id
            version = "latest"
          }
        }
      }

      env {
        name = "JWT_SECRET"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.jwt_secret.secret_id
            version = "latest"
          }
        }
      }
    }

    scaling {
      min_instance_count = 0
    }
  }

  depends_on = [
    google_secret_manager_secret_iam_member.mongodb_uri_accessor,
    google_secret_manager_secret_iam_member.jwt_secret_accessor
  ]
}

# Cloud Run Frontend
resource "google_cloud_run_v2_service" "frontend" {
  name     = var.frontend_service_name
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    containers {
      image = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.repo.repository_id}/frontend:${var.image_tag}"

      ports {
        container_port = 8080
      }

      env {
        name  = "VITE_API_URL"
        value = "https://keisho-backend-250252396269.asia-northeast1.run.app"
      }

      env {
        name  = "VITE_PRIVY_APP_ID"
        value = "cmn2mr7ec01sq0cjjdmdj8x6t"
      }


    }

    scaling {
      min_instance_count = 0
    }
  }
}

# IAM: Allow unauthenticated access (Public app)
resource "google_cloud_run_v2_service_iam_member" "backend_public_access" {
  name     = google_cloud_run_v2_service.backend.name
  location = google_cloud_run_v2_service.backend.location
  role     = "roles/run.invoker"
  member   = "allUsers"
}

resource "google_cloud_run_v2_service_iam_member" "frontend_public_access" {
  name     = google_cloud_run_v2_service.frontend.name
  location = google_cloud_run_v2_service.frontend.location
  role     = "roles/run.invoker"
  member   = "allUsers"
}

