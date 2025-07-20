.PHONY: all clean build serve format lint

all: build

clean:
	rm -rf blog/_build
	rm -rf .generator_cache

build:
	cd blog && uv run build-blog

serve:
	cd blog && uv run serve-blog

format:
	uv run ruff format

lint:
	uv run ruff check
