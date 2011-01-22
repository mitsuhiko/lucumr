public: yes
tags: [python, wsgi, thoughts]
summary: |
  A bunch of things currently on my mind regarding web development with
  Python and future directions.

Python, the Web and Little Things on my Mind
============================================

A few days ago `PEP 3333 <http://www.python.org/dev/peps/pep-3333/>`_ was
accepted.  In case you don't know what this is: it's a specification of
WSGI (`PEP 333 <http://www.python.org/dev/peps/pep-333/>`_) updated for
Python 3.  In case you are wondering what it does: it basically just
specifies something very close to what everybody was expecting for Python
3 anyways.  Together with that also some work went into improving the
standard library for Python 3.2 so that it would become easier to port
applications to Python 3.

Besides that there were also some recent developments in the Python web
world I would really love to share my thoughts about.

Python 3 and the Web
--------------------

When I was complaining about Python 3 for web development (or more exactly
WSGI) at DjangoCon Europe a year ago, I wanted to raise concern about the
state of WSGI and that part of the problem was that very few people cared
about it.  Also I was very unhappy with the idea of introducing Unicode
for parts that are clearly not intended to be Unicode.  A lot of things
have changed.  First of all I was wrong about Unicode on the WSGI layer.
While I still think that it would have been a wiser choice to stick to
bytes there the environment just does not support this very well.  Python
3 does not provide any useful string operations for byte objects and there
is also not really a plan to support it.  Furthermore a lot of places in
the standard library now accept Unicode where Unicode was not necessarily
the best idea.  However at the same time there is also a lot of
opportunity now to drive things forward.  The fact that urllib on Python 3
is unexpected means that we will probably see some actual working IRI
libraries.

The problem there however is that a direct port of `Werkzeug
<http://werkzeug.pocoo.org/>`_ to Python 3 is very unlikely.  To make a
transition possible I would probably have to change some interfaces also
for Python 2.  Otherwise a painless upgrade seems to be pretty unlikely.
This is a lot easier for higher level interfaces such as `Flask
<http://flask.pocoo.org/>`_ which is based on Werkzeug.  That will
probably work the moment Werkzeug itself works as there is barely anything
in there that would not survive a run through 2to3.

The other aspect however right now is that a port to Python 3 will take a
lot of time which I am not yet willing to spend due to the low demand of
users being interested in Python 3.  This I think has two reasons:

1.  A switch to Python 3 is a lot of work and you don't win anything.
    Python 3 performs considerably worse than Python 2 (`Source
    <http://shootout.alioth.debian.org/u32/which-programming-languages-are-fastest.php>`_)
    for certain tasks and Python 2 already wasn't the fastest interpreter.
    Part of that can probably be explained with Unicode requiring more
    memory internally than bytestrings did (2 to 4 times as much for
    strings).  Secondly a lot of stuff broke from Python 2 to Python 3 and
    due to the low number of users a lot of these issues are yet to be
    noticed.  As with all problems in the language and standard library
    itself just fixing them is not a solution.  To also support “older”
    versions of Python 3 developers will always add workarounds to their
    code for problems also in the standard library.  That's unfortunately
    pretty much a chicken-egg problem.
2.  PyPy, stackless and alternative Python implementations don't have
    plans for Python 3 or no plans yet.  For a long time CPython was the
    only implementation everybody cared about.  However this seems to be
    changing.  To quote `Brett Cannon <http://sayspy.blogspot.com/>`_:
    
        Is this finally going to push CPython into the realm of being the
        reference implementation of Python with PyPy being the one
        everyone runs in production? And is this going to impact any
        potential future momentum for unladen swallow if PyPy continues to
        gain on speed?

    Alternative Python implementations are important because they enable
    web developers to use Python in environments where they couldn't
    otherwise use it (Jython in enterprise environments with Java
    requirements for instance) or because they have features that are
    unavailable in CPython or don't perform as well.

Python 3 is clearly the better language, hands down.  The downside however
is that porting existing applications is a giant step and nobody can see
into the future.  The big advantage of Python 3 was supposed to be
Unleaden Swallow but unfortunately the numbers are far from what everybody
was expecting.

So let me reiterate my suggestion for Python 3 in web applications: don't
use it just yet, but write your code in a way that it could pass through
2to3.  It's surprisingly easy for high level applications in the web field
because all frameworks already are Unicode based in Python 2.  That way
you have the options to go with either development (PyPy or Python 3) when
one is clearly going ahead.

Personally I am looking forward to this year's PyCon where there will be
most likely a bunch of discussions about the future of Python.  Either way
it will be bright.

Variety
-------

The other thing that is constantly on my mind is the variety in
frameworks, WSGI implementations and a bunch of other “competing”
libraries.  As far as I am concerned we are doing great, much better than
before.  Of course I am sitting in my happy little spot of not having a
whole lot of users compared to the other big frameworks out there, but
Werkzeug and Flask have been successful enough that I can somewhat take
part in discussions about web development in the Python world without
feeling misplaced.

Pylons and BFG have recently merged into a new framework called Pyramid
and this was one of the greatest moves in Python's web framework history.
TurboGear's fate is not yet known, but it's not too unlikely that it will
be based on Pyramid.  Not because it's good to have less frameworks by
definition, but because they were similar in scope and aiming for the same
just in slightly different ways.  It's probably comparable to the Ruby on
Rails and Merb merge just on a slightly smaller scale.

I personally would love to see a merge of Bottle and Flask for instance
because both are aiming for the same thing as well, but unfortunately that
seems to be pretty unlikely due to the fact that Bottle does not want to
have any dependencies.  However switching from Bottle to Flask would be a
piece of cake for any Bottle user as that process could be fully
automated.  Lately Flask also comes in a “Kitchensink” release that is a
zip file with Flask and all dependencies to drop into a folder.  That way
you don't have to deal with virtualenv or anything else if you don't want
to or if you can't.

Another possible merge would of course be Werkzeug and `WebOb
<http://pythonpaste.org/webob/>`_.  With better communication early on
this problem would have never been and we would only have one library now.
Independent of if such a merge will be possible or not, Werkzeug is
currently in the process of being cleaned up and improved so that a switch
to WebOb or from WebOb could be possible.  I don't have any direct plans
yet but I don't see a reason why that shouldn't eventually happen.  There
is one big philosophical difference between WebOb and Werkzeug which is
how much of data manipulation should go back into the WSGI environment,
but nothing that couldn't be solved so that everybody would be happy.
Both WebOb and Werkzeug are in the progress of becoming more like each
other already and there is clearly place for going further.  Python
packaging is improving alongside which makes depending on one library more
not a big problem these days, so that shouldn't be the problem either in
case a merged library might not have all the features Werkzeug or WebOb
previously had.

What makes me incredible happy currently is that the developers of most
Python frameworks or WSGI implementations have contact with each other in
some form or another and there is potential for working together.  This is
especially interesting because upcoming and smaller projects like Flask
can learn a lot from existing solutions and try to learn from their
mistakes because they still have the possibility.  Django has to care a lot
about their existing users and can't make more courageous steps whereas
this is possible for Flask and Pyramid for instance.

Working Together
----------------

This goes hand in hand with what I wrote above.  Even if there is more
than one library for the same use case, there is no reason why people
should not work together.  For instance it is in the interest of every
user that when one framework had a security problem other developers get
some insight in what the problem and solution was as the chances are high
that a similar problem might exist in another framework as well.  Also
it's in the interest of everybody involved that Python stays an
interesting platform for web developers so a consensus on various things
(WSGI, packaging standards, database APIs etc.) is important.

With that I want to primarily encourage developer to take place in such
discussions who are currently not doing that.  Most frameworks have IRC
channels on Freenode and there are also various backrooms where such
discussions can take place.
