build:
	python ../rstblog/run-rstblog build

serve:
	python ../rstblog/run-rstblog serve

upload:
	scp -r _build/* pocoo.org:/var/www/lucumr.pocoo.org/new
