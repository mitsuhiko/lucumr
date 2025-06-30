---
tags:
  - flask
  - pycon
  - python
summary: "A summary of the Flask talk at PyCon 2011 and what happened during the
sprints."
---

# Flask at PyCon 2011

What a week this was.  Though overshadowed by the [recent events in Japan](http://en.wikipedia.org/wiki/2011_T%C5%8Dhoku_earthquake_and_tsunami)
PyCon was an interesting and fun experience for everybody involved.  I had
[a talk about Flask](/talks/) there and overall I was quite happy with
it.  It was announced as a 45 minute talks by the session runner however
it was registered as a 30 minute talk so I had to keep it short in order
to get a few questions through.

I also manage to discuss the future of Werkzeug and WebOb with Chris and
Ian briefly and we might just do a request/response object library based
on both Werkzeug and WebOb over the next couple of months.  Though none of
this is set in stone yet.

The sprints on Flask themselves were quite successful too.  We have an
improved extension development documentation now and Flask-SQLAlchemy can
connect to multiple databases now.  The latter also will have new
documentation with the next release.

Flask-Principal did not get enough love yet and other extensions were also
not reviewed yet, but there is a good reason for this: our extension
testing script does not scale well to many extensions.  In order to fix
this we now have a Jenkins installation running on a dedicated machine
sponsored by Ron DuPlain who will also help out with extension reviewing
from now on.

What else?  Modules!  Flask modules are the one part of Flask I am very
unhappy with and it took us a while to find something that solves most of
the problems (including the name).  So with the next Flask release we will
ship a new concept for modules called “Blueprints”.  Essentially what
these blueprints will do is capturing construction information.  You can
then attach these blueprints to applications (even multiple times if you
like).  They can either extend the application itself or are registered
with their own name.  I will soon have a working implementation of them in
a branch on github, so stay tuned.
