all: build upload

clean:
	rm -rf blog/_build

build:
	cd blog && ../.venv/bin/run-rstblog build

serve:
	cd blog && ../.venv/bin/run-rstblog serve

upload:
	rsync -a blog/_build/ flow.srv.pocoo.org:/srv/websites/lucumr.pocoo.org/static/
	@echo "Done..."
