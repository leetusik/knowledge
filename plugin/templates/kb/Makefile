# Dev convenience wrapper around the compose stack (kb site + document API).
# Ports are published on 0.0.0.0 (see compose.yml), so the services are
# reachable on localhost. Adjust the ports here and in compose.yml together.

.DEFAULT_GOAL := help
.PHONY: help dev down logs test build-site smoke

help: ## Show available targets
	@grep -E '^[a-zA-Z_-]+:.*## ' $(MAKEFILE_LIST) | awk -F':.*## ' '{printf "  make %-11s %s\n", $$1, $$2}'

dev: ## Start the site ({{KB_VIEWER_PORT}}) + document API ({{KB_API_PORT}})
	docker compose up -d
	@echo ""
	@echo "  Site:  http://localhost:{{KB_VIEWER_PORT}}/"
	@echo "  API:   http://localhost:{{KB_API_PORT}}/healthz"

down: ## Stop the stack
	docker compose down

logs: ## Tail stack logs (Ctrl-C to detach)
	docker compose logs -f

test: ## Run the API test suite
	uv run pytest

build-site: ## Build the static site into site/
	docker compose run --rm kb build

smoke: ## Run the site deploy-gate checks against the built site/
	python3 scripts/site_smoke.py
