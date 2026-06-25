# ── Suluhu — Docker Compose helper ────────────────────────────────────────────
# Usage: make <target>
# Requires: Docker with the Compose plugin (docker compose v2)

COMPOSE      := docker compose
COMPOSE_DEV  := docker compose -f docker-compose.dev.yml
.DEFAULT_GOAL := help

.PHONY: help \
        up down build rebuild restart \
        dev dev-down dev-build \
        logs logs-ai logs-backend logs-frontend \
        restart-ai restart-backend restart-frontend \
        shell-ai shell-backend shell-frontend \
        ps clean prune

# ── Production lifecycle ───────────────────────────────────────────────────────

up: ## Start all services in detached mode (production images)
	$(COMPOSE) up -d

down: ## Stop and remove containers (keeps volumes)
	$(COMPOSE) down

build: ## Build production images without starting containers
	$(COMPOSE) build

rebuild: ## Force-rebuild all production images (no cache) and start
	$(COMPOSE) build --no-cache
	$(COMPOSE) up -d

restart: ## Restart all services
	$(COMPOSE) restart

# ── Development lifecycle ──────────────────────────────────────────────────────

dev: ## Start all services in detached mode (development images, with HMR)
	$(COMPOSE_DEV) up -d

dev-down: ## Stop development containers
	$(COMPOSE_DEV) down

dev-build: ## Build development images without starting
	$(COMPOSE_DEV) build

# ── Per-service restarts ───────────────────────────────────────────────────────

restart-ai: ## Restart only the AI service
	$(COMPOSE) restart ai

restart-backend: ## Restart only the backend service
	$(COMPOSE) restart backend

restart-frontend: ## Restart only the frontend service
	$(COMPOSE) restart frontend

# ── Observability ──────────────────────────────────────────────────────────────

ps: ## List running containers and their status
	$(COMPOSE) ps

logs: ## Tail logs for all services (Ctrl-C to stop)
	$(COMPOSE) logs -f

logs-ai: ## Tail logs for the AI service only
	$(COMPOSE) logs -f ai

logs-backend: ## Tail logs for the backend service only
	$(COMPOSE) logs -f backend

logs-frontend: ## Tail logs for the frontend service only
	$(COMPOSE) logs -f frontend

# ── Shells ─────────────────────────────────────────────────────────────────────

shell-ai: ## Open a shell inside the running AI container
	$(COMPOSE) exec ai sh

shell-backend: ## Open a shell inside the running backend container
	$(COMPOSE) exec backend sh

shell-frontend: ## Open a shell inside the running frontend container
	$(COMPOSE) exec frontend sh

# ── Cleanup ────────────────────────────────────────────────────────────────────

clean: ## Stop containers and remove volumes
	$(COMPOSE) down -v

prune: ## Remove all stopped containers, dangling images, and build cache
	docker system prune -f

# ── Help ───────────────────────────────────────────────────────────────────────

help: ## Show this help message
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-22s\033[0m %s\n", $$1, $$2}'
