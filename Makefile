all: build upload

clean:
	rm -rf _build

build:
	run-rstblog build

serve:
	run-rstblog serve

upload:
	rsync -a _build/ flow.srv.pocoo.org:/srv/websites/lucumr.pocoo.org/static/
	@echo "Done..."
