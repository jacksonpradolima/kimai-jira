SHELL := /bin/sh
NPM := npm

.DEFAULT_GOAL := help
.PHONY: help install lint lint-fix typecheck test coverage docs-ui docs docs-serve check ci forge-lint pre-commit-install pre-commit-run

## —— Kimai for Jira Makefile —————————————————————————————

help: ## Show this help message
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-22s\033[0m %s\n", $$1, $$2}'

# ——— Development ———————————————————————————————————————————

install: ## Install locked Node dependencies
	$(NPM) ci

lint: ## Run ESLint
	$(NPM) run lint

lint-fix: ## Apply ESLint fixes
	$(NPM) run lint:fix

typecheck: ## Run TypeScript checks
	$(NPM) run typecheck

test: ## Run unit tests
	$(NPM) test

coverage: ## Run tests with coverage
	$(NPM) run test:coverage

docs-ui: ## Verify generated UI documentation
	$(NPM) run docs:ui:check

docs: ## Build Zensical documentation strictly
	python3 -m zensical build -f zensical.toml --clean --strict

docs-serve: ## Serve Zensical documentation locally
	python3 -m zensical serve -f zensical.toml

check: lint typecheck test docs-ui ## Run lint, types, tests, and UI-doc checks

ci: check docs ## Run all checks, including strict docs

# ——— Forge and Git hooks ———————————————————————————————————

forge-lint: ## Run Forge manifest validation
	$(NPM) run forge:lint

pre-commit-install: ## Install Git hooks
	python3 -m pre_commit install --install-hooks

pre-commit-run: ## Run hooks against all files
	python3 -m pre_commit run --all-files
