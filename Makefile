all: build upload

clean:
	rm -rf blog/_build

build:
	cd blog && ../.venv/bin/run-rstblog build

serve:
	cd blog && ../.venv/bin/run-rstblog serve
