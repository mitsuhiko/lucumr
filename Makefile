all: build upload

clean:
	rm -rf blog/_build

build:
	cd blog && uv run run-rstblog build

serve:
	cd blog && uv run run-rstblog serve
