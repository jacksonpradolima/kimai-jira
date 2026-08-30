SHELL := /bin/sh
NPM := npm

.DEFAULT_GOAL := help
.PHONY: help install lint lint-fix typecheck test coverage docs-ui docs docs-serve check ci forge-lint pre-commit-install pre-commit-run

help:
	@echo "Available targets:"
	@echo "  install              Install locked Node dependencies"
	@echo "  lint                 Run ESLint"
	@echo "  lint-fix             Apply ESLint fixes"
	@echo "  typecheck            Run TypeScript checks"
	@echo "  test                 Run unit tests"
	@echo "  coverage             Run tests with coverage"
	@echo "  docs-ui              Verify generated UI documentation"
	@echo "  docs                 Build Zensical documentation strictly"
	@echo "  docs-serve           Serve Zensical documentation locally"
	@echo "  check                Run lint, types, tests, and UI-doc checks"
	@echo "  ci                   Run all checks, including strict docs"
	@echo "  forge-lint           Run Forge manifest validation"
	@echo "  pre-commit-install   Install Git hooks"
	@echo "  pre-commit-run       Run hooks against all files"

install:
	$(NPM) ci

lint:
	$(NPM) run lint

lint-fix:
	$(NPM) run lint:fix

typecheck:
	$(NPM) run typecheck

test:
	$(NPM) test

coverage:
	$(NPM) run test:coverage

docs-ui:
	$(NPM) run docs:ui:check

docs:
	python3 -m zensical build -f zensical.toml --clean --strict

docs-serve:
	python3 -m zensical serve -f zensical.toml

check: lint typecheck test docs-ui

ci: check docs

forge-lint:
	$(NPM) run forge:lint

pre-commit-install:
	python3 -m pre_commit install --install-hooks

pre-commit-run:
	python3 -m pre_commit run --all-files

