---
tags:
  - python
  - flask
  - werkzeug
  - announcement
summary: "Update on the Flask 0.10 and Werkzeug 0.9 releases."
---

# New Werkzeug and Flask Releases

I'm very happy to announce that after a long break there are finally new
releases for [Werkzeug](http://werkzeug.pocoo.org/) and [Flask](http://flask.pocoo.org/).  These releases took their fair amount of
time and I will ensure the process is quicker next time around.  There is
however a good reason it took this long: they come with support for Python
3 and we had to do some API changes in the process.

## What's going to break for you

Let's start with the unfortunate things first: we probably (slightly)
broke your code in Werkzeug.  This was necessary because some
functionality just does not map well to the updated [PEP 3333](http://www.python.org/dev/peps/pep-3333/) specification.  This
backwards incompatible breakage is mostly limited to the `werkzeug.urls`
module as well as the `Headers` and `EnvironHeaders` data structures.
You will notice that headers are now coming back in unicode at all times,
decoded from latin1 and the URLs module now transparently unifies URI and
IRI representation of URLs.

The `Headers` object also lost the ability to modify WSGI headers
in-place through the old `linked` classmethod.  This was necessary as we
could not replace the logic for PEP 3333 with acceptable performance and
not producing a too complex implementation.

Flask itself should not break that much, but what do you know.  We cleaned
up some internal implementations.  Primarily you will notice that the
`|tojson` filter in Flask now uses different JSON serialization and HTML
safety rules.  If you have some tests that rely on that old behavior you
will need to adjust.

## Goodbye Python 2.5

Bad news for you if you're on 2.5: support for your Python version is
gone.  That was necessary to make the Python 3 port go forward.  Python
2.5 by now is nearly 7 years old, it's time to move on.

## Hello Python 3

On the flip-side support for Python 3 is in.  To be more exact: Python 3.3
and higher.  For Werkzeug applications porting to Python 3 might be not as
trivial but Flask applications should actually work mostly out of the box
assuming their extensions are ported.  For instance all of the Flask
examples work out of the box on 2.x and 3.x and with the exception of
unit tests no modifications were necessary to their code.

## Notable Changes

Other than that, here are some changes that you will hopefully enjoy:

Werkzeug:

- Werkzeug now pastes traceback into private github gists.

- Some smaller improvements to make the HTTP exception classes in
Werkzeug more useful.  They can now carry some payload and aborting
with exceptions is streamlined.

- Werkzeug's URL module now gained vastly improved IRI support and
can properly parse and join URLs.  This support is currently
intentionally in violation with the RFC to cover real-world cases
better and to support parsing of unknown schemes.

This makes it possible for you to parse things like
`sqlite:///foo.db` without being surprised by the behavior.

- Werkzeug gained a lot of utility functions to support bridging the
differences between PEP 333/PEP 3333 and WSGI on 2.x and 3.x.  This
includes access to the streams and URLs.

- Werkzeug's internal form parsing got vastly improved which now makes
it possible to access the stream in all cases.  It also no longer
relies on content length which makes it possible to finally deal with
chunked request bodies assuming the WSGI server provides support for
it.

- Introduced `get_data` methods as future proof replacement for the
old `.data` descriptor on requests and responses.  This allows
greater flexibility on dealing with form data.  In the future we will
remove support for `.data` at which point attribute access on the
request and response objects is largely side-effect free.

Flask:

- Flask gained a `json` module which unifies JSON support for 2.x and
3.x and extends it with useful helpers.  It provides safe methods to
dump JSON for script blocks in HTML and also automatically serializes
some common types like UUIDs and `datetime` objects.

- Further work has been done to make the application context more
prominent.  Templates can now be rendered from the application context
only and `flask.g` is now bound to the application context as well.

This change might seem tiny but actually simplifies working with Flask
from outside web environments.  You can now easier maintain database
connections that are not bound to a HTTP request's lifetime.

The documentation also has started to shift to this new mode of
working.

- Flask's internal error handling has been improved to make responding
to error cases more consistent.  This also has the added benefit of
making the “commit on success, rollback on error” finally fully
reliable.  Previously the test client would suppress the error
information in some cases.

- Introduced a `get_json` method on the request to go in line with
Werkzeug's new `get_data` method.  The plan here is to remove
support for the `.json` descriptor at one point.

- Added a few configuration options to change defaults for JSON
serialization.  This includes pretty-printing and ordering of keys.
By default JSON objects are now ordered by keys to solve issues with
invalidating HTTP caches due to Python's new randomized hash seed.

## Changes to the Process

Going into the future there will be a new process for releases.  The
target is to have much more frequent releases instead of large ones.
Werkzeug is now getting to the point where it's possible to do releases
often without breaking people's code as the API gets more stable.  (This
release being the notable exception due to the Python 3 support)

## A Thank You Note

Lastly I want to thank the community for making this release possible.  A
huge amount of the work for these releases has been done on a sprint
online on a weekend in May.  Special thanks go to DasIch, Thomas Waldmann,
untitaker, Ronny Pfannschmidt, mgax, puzzlet, ThiefMaster and everybody
else who contributed.

In this release the number of commits skyrocketed.  While the total
changelog might not look all that impressive, the underlying improvements
and code cleanups are substantial.
