.PHONY: all clean build serve format lint

all: build

clean:
	rm -rf blog/_build
	rm -rf .generator_cache

build: node_modules
	cd blog && uv run build-blog

serve: node_modules
	cd blog && uv run serve-blog

# the social preview cards draw the header artwork in Node (generator/social_art.js)
node_modules: package.json package-lock.json
	npm ci
	@touch node_modules

format:
	uv run ruff format

lint:
	uv run ruff check
