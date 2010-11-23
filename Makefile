build:
	python ../rstblog/run-rstblog.py build

serve:
	python ../rstblog/run-rstblog.py serve

upload:
	scp _build/* pocoo.org:/var/www/lucumr.pocoo.org/new
