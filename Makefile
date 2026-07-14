# Dev convenience wrapper around the compose stack (kb site + api).
# Ports are published on 0.0.0.0 (see compose.yml), so the same services are
# reachable on localhost AND over Tailscale at the machine's tailnet IP.

.DEFAULT_GOAL := help
.PHONY: help dev down logs

help: ## Show available targets
	@grep -E '^[a-zA-Z_-]+:.*## ' $(MAKEFILE_LIST) | awk -F':.*## ' '{printf "  make %-6s %s\n", $$1, $$2}'

dev: ## Start the site (8765) + document API (8766); prints local + Tailscale URLs
	docker compose up -d
	@echo ""
	@echo "  Site:  http://localhost:8765/knowledge/"
	@echo "  API:   http://localhost:8766/healthz"
	@ts="$$(command -v tailscale 2>/dev/null || echo /Applications/Tailscale.app/Contents/MacOS/Tailscale)"; \
	ip="$$([ -x "$$ts" ] && "$$ts" ip -4 2>/dev/null | head -n1)"; \
	if [ -n "$$ip" ]; then \
		echo ""; \
		echo "  Tailscale site: http://$$ip:8765/knowledge/"; \
		echo "  Tailscale API:  http://$$ip:8766/healthz"; \
	else \
		echo ""; \
		echo "  Tailscale: not detected (once it's up, the tailnet IP serves the same ports)"; \
	fi

down: ## Stop the stack
	docker compose down

logs: ## Tail stack logs (Ctrl-C to detach)
	docker compose logs -f
