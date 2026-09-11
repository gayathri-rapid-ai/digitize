variable "REGISTRY" { default = "localhost" }
variable "IMAGE_TAG" { default = "dev" }
variable "NEXT_PUBLIC_API_URL" { default = "" }
variable "NEXT_PUBLIC_CUSTOMER_API_URL" { default = "" }

group "default" {
  targets = ["admin-api", "customer-api", "admin-ui", "ui", "preview"]
}

target "base" {
  context = "."
  dockerfile = "Dockerfile"
  platforms = ["linux/amd64"]
}

target "admin-api" {
  inherits = ["base"]
  target = "admin-api"
  tags = ["${REGISTRY}/digitize-admin-api:${IMAGE_TAG}"]
}

target "customer-api" {
  inherits = ["base"]
  target = "customer-api"
  tags = ["${REGISTRY}/digitize-customer-api:${IMAGE_TAG}"]
}

target "admin-ui" {
  inherits = ["base"]
  target = "admin-ui"
  args = { NEXT_PUBLIC_API_URL = "${NEXT_PUBLIC_API_URL}" }
  tags = ["${REGISTRY}/digitize-admin-ui:${IMAGE_TAG}"]
}

target "ui" {
  inherits = ["base"]
  target = "ui"
  args = { NEXT_PUBLIC_CUSTOMER_API_URL = "${NEXT_PUBLIC_CUSTOMER_API_URL}" }
  tags = ["${REGISTRY}/digitize-ui:${IMAGE_TAG}"]
}

target "preview" {
  inherits = ["base"]
  target = "preview"
  tags = ["${REGISTRY}/digitize-preview:${IMAGE_TAG}"]
}

