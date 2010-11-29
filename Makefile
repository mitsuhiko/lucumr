build:
	run-rstblog build

serve:
	run-rstblog serve

upload:
	scp -r _build/* pocoo.org:/var/www/lucumr.pocoo.org/new
