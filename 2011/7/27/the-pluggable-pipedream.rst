public: yes
tags: [python, wsgi, braindump]
summary: |
  Why WSGI is not as big of a problem as you would believe and why
  framework independent pluggable applications don't work in practice.

WSGI and the Pluggable Pipe Dream
=================================

As a Python web developer you are at one point confronted with the term
“`WSGI`_” (which after 6 years of existence still does not have an
official truncation.  Some rhyme it with “Whisky”, others just pronounce
the abbreviation, other's just call it by the pep number 333).  WSGI when
it was created was a pretty awesome thing.  It made it possible to use any
Python web application with any webserver by specifying a gateway layer.

In fact, it became so popular and well supported in the Python world that
similar protocols were created for other languages as well.  One of the
first was `Rack`_ for Ruby, then came `Jack`_/JSGI for JavaScript,
`PSGI`_/Plack for Perl and many others.  And yet ever since WSGI became
from a niche protocol nobody knew to *the* protocol for web applications
people tried to change and replace it.  Why is that and why does nobody
succeed in replacing it?

WSGI stands for “Webserver Gateway Interface” and it really envisioned as
this bridge between server and application.  Additionally the PEP
explained how you can use middlewares and this was the beginning of the
end.  The PEP also suggested that people would write their frameworks
around WSGI which certainly many did.  People tried to cram over the years
more and more services into the WSGI layer with varying success.  Session
middlewares, authentication systems, caching layers etc.  The vision of
many people is or was to use the WSGI layer as a way to combine multiple
applications together.

WebOb for instance went very far with that.  For as long as all your
applications are only using WebOb and nothing else you can “attach” a
request object to a WSGI environment at any point in the WSGI chain and
you are operating on basically the same request object with the same data
behind.  This however goes well beyond what WSGI specifies or encourages.

If you mix a WebOb application with Django, Werkzeug or anything your
options of what is possible are greatly reduced.

.. raw:: html

   <small>

Consider this post a personal brain dump.  It might be unstructured and
appear raw and there is a reason for this: it's one of the topic where the
more you think about it, the more details jump into your mind.  WSGI is
such a simple specification but there is so much around it that it can
really make your head hurt.

I rewrote parts of this now a couple of times and I am still unhappy with
it, so please just take it for what it is.

.. raw:: html

   </small>

What WSGI Broke
---------------

If you look at APIs before WSGI or even at new frameworks that don't
support WSGI, a common pattern is having a request object that not only
gives access to the incoming data but also allows you to send data back
to the client.  For instance by having a ``write()`` method.  WSGI broke
with this convention early and this was a major step because it meant that
you had to use buffering internally or change their API to use generators.

The thing with Python is that you cannot stop execution in a frame by hand
unless you are using greenlets which back in 2004 were not available.  As
such you could not transparently convert an API like this into WSGI:

.. sourcecode:: python

    def my_view(request):
        request.start_response('200 OK')
        request.send_header('Content-Type', 'text/plain')
        request.end_headers()
        request.write('Hello World!')
        request.write('Goodbye World!')
        request.end()

The direct the entirely equivalent example would be this:

.. sourcecode:: python

    def my_view(environ, start_response):
        def generate():
            yield 'Hello World!'
            yield 'Goodbye World!'
        start_response('200 OK', [('Content-Type', 'text/plain')])
        return generate()

While it is indeed now possible to utilize greenlets to convert multiple
function calls into yields in a generator, it's still something you would
not do.  So you can imagine that when WSGI came out it was quite a
challenge to convert to it.

If you look at other protocols that are WSGI inspired you can see that the
iterator concept was adapted and modified.  In Python iteration works by
calling a method on the iterator until it signals that it finished.  In
Ruby it's the other way round.  You provide a function and pass it to the
iterator which will then call the function until it exhausts.  The Ruby
way has the nice advantage that you don't need generators and can easily
convert from this Rack interface to an old-school write + flush method
pair.

This is one of the things that some people are not happy with when they
think about WSGI.

The WSGI Quirks
---------------

When you ask people what their opinion on WSGI is, they will always tell
you that the ``start_response()`` callable is just bad.  And they are
quite correct in saying that we can get rid of it.  But before you blindly
throw it away you have to understand why it was created in the first
place.  The common way to call ``start_response()`` with the status code
as string + explanation and a list of key-value tuples which represent
the headers.  But what many people miss is that ``start_response()`` can
do more than just that!

First of all, remember when I said that you cannot generate
``response.write()`` calls transparently into `yield` statements.  When
the PEP was written it was quite obvious that this would be a problem for
existing applications that need to stream out data via
``request.write()``.  And as such ``start_response()`` was given a return
value which many developers don't know about.  What ``start_response()``
returns is a function that directly writes into the client's stream.
Surely that problem could have been solved in a different way, for
instance by putting that function into the WSGI environment but the
intention here was very simply that just the caller that starts the
response gets this function.

Have you ever used that direct write function?  Me neither and for good
reasons: It bypasses processing by middlewares since it directly goes to
the output stream.  But it set the path to WSGI acceptance as it was a
simple way to WSGI-ify CGI scripts.  For instance the mercurial hgweb
interface was a prominent user of that write function.

But that's not where ``start_response()`` ends.  It has a third parameter
that people commonly miss: ``exc_info``.  It's rarely used because error
handling is typically handled at a higher level in the stack but the
intention of course was to make the server aware of errors.  Here is how
it's supposed to work: You start the response and are about to send data
but an error happens, you can change your mind and start the response a
second time with the error information.  You could also not have started
the response before and directly inform it about the errors.  Why is this?
This comes in combination with another fact: headers are not sent, they
are set.

The Async Nod
-------------

WSGI as a protocol was designed to also support async applications in
theory.  When you start the response, you're not actually starting the
response.  You are informing the server about the headers you want to send
but they are not actually sent until you yield a non empty string.  This
allows you to change from an already notified ``200 OK`` to a ``500
INTERNAL SERVER ERROR`` until a later point.  For instance this is
perfectly valid WSGI code:

.. sourcecode:: python

    def fail_late():
        yield ''
        yield ''
        raise Exception('Something went wrong late')

    def weird_app(environ, start_response):
        try:
            start_response('200 OK', [('Content-Type', 'text/plain')])
            fail_late()
        except Exception, e:
            start_response('500 INTERNAL SERVER ERROR',
                           [('Content-Type', 'text/plain')],
                           sys.exc_info())
            return ['Application Failed']

This is the extreme example which you will not see in practice.  The
server should attempt to change the headers if still not sent or recover
in whatever way possible from that error condition.  The “headers are sent
when the first non empty string is yielded” rule is nothing more than a
neat nod to async systems that can use this neat trick to yield empty
strings to signal that they are not ready yet.  I don't know if this was
intentional behavior but the PEP is quite elaborate on mentioning that
it's for async systems, so I suppose someone thought about it.

Generally though you will never find this particular usage used in
practice.  It's just generally something that makes processing WSGI code
harder than it needs to be.

Relaying and Proxying
---------------------

Where WSGI is annoying is relaying messages from one WSGI app to another.
Let's assume for a moment WSGI would lack the ``start_response()``
callable and that empty string thing and a write callable.  The canonical
“Hello World” would probably look like this:

.. sourcecode:: python

    def hello_world(environ):
        return '200 OK', [('Content-Type', 'text/plain')], \
               ['Hello World!']

Simple and straightforward indeed, and it would be incredible easy to
proxy these things.  All you have to do would be to call that function,
pass it an environment dictionary and then take the return value, work
with it, and forward it.

WSGI itself makes this really hard for a bunch of reasons:

1.  The return value of an application.  When you have it, was
    ``start_response()`` already called or not?  If you directly return a
    list it was called, if the whole function however has a ``yield`` in
    there anywhere the ``start_response()`` function will not be called
    until the first iteration on the return value.
2.  Does anyone at any point mix ``write()`` and an iterable return value?
    If yes how do they mix?
3.  You have to be careful that headers can change until a non empty
    string came back from the iterable.
4.  The iterator can have a close method which you are required to call.

All in all this makes WSGI a terrible protocol for the simple case where
you want to invoke another application, munch with the return value and
then forward it.

Why if that's so bad, why was it decided to work that way in the first
place?  Because obviously you will sacrifice something if you change that
into a flat tuple as return value.  For starters you lose:

1.  The ability to change a success response into an internal server
    error response.
2.  Async systems would need to come up with the result right away when
    you call the function or block (bad) until they know what to return.
3.  Everything has to be generator powered, no more ``response.write()``
    unless you introduce greenlets.

Everybody wants a Revolution
----------------------------

WSGI is far from being flawless.  But the problem is that most of the time
when people try to replace it they will also attempt to fix the other
issues it has.  So instead of a nice little step forward it's a completely
new proposal.  For instance my attempt to do that for Python 3 was so
naively wrong that I like to think that I did not have my hands in such a
WSGI replacement PEP in the first place.  And I can tell you right away
why a small evolving of WSGI is pointless and why a big step is even
worse:

Let's ask the question first: why would we want to improve WSGI?  On the
surface because there are a few things that don't work or are
unnecessarily complex.  And here comes the problem: *for different reasons*.

Half the people just want the gory details improved to simplify
implementations of servers and client libraries, others want it simplified
and extended to support pluggable applications.  And this is where it all
falls apart.

Let's look at what could be improved in WSGI itself:

1.  ``'wsgi.input'`` is ill-specified but in practice it rarely causes
    troubles because a) half the servers are already extending WSGI and b)
    even though half the libraries are in violation it's only the edge
    cases that cause problems and those are rare.
2.  Headers cannot be streamed which might be a problem with responses
    that have a huge amount of headers.
3.  Trailers are not specified at all except for that “servers might do
    chunked responses”
4.  Chunked request data is totally unimplementable on top of the current
    specification due to the ill-specified WSGI input thing.
5.  WSGI can be hard to implement in an environment where you are running
    inside a server like Apache that is already doing request filtering
    that is outside of your control.  WSGI assumes HTTP level access which
    inside a webserver you usually no longer have.
6.  WSGI extends CGI's environment and inherits the problem that paths are
    decoded which comes with loss of information.
7.  The ``start_response()`` machinery seems unnecessarily complex for the
    fact that barely anybody these days needs the ``exc_info`` or
    ``write()`` callable any more.
8.  The ``'wsgi.file_wrapper'`` is complete garbage because it does not
    work in practice as soon as middlewares are involved that process
    responses.

But you know what?  WebOb, Werkzeug, Django and all the other frameworks
out there learned to live with WSGI as it is and it works for us.  There
are some corner cases where we would love it to be improved like the input
thing, but it's hardly something that's worth breaking API over.  We
already wrote the code and coming up with a new spec at that point mostly
just supports the “the great thing about standards is that there are so
many to chose from” sentiment.  Especially now that WSGI was just extended
to deal with Python 3's unicode behavior we have to be very careful not to
force more complexity into everybody's code.

On top of that however there is so stuff that is missing in WSGI that many
want to see solved:

1.  Allowing an application to notify the server that it wants to be
    reloaded next request.
2.  Have a documented point in the application that is executed before the
    first request in the most efficient way possible but already with
    information at hand that would otherwise only be available during
    request (like: where the hell am I located?  What's my base URL etc.)

But here is the problem:  Changing WSGI now would only mean that we would
have to replace all our WSGI servers, WSGI client implementations,
Framework bridges and whatnot.  We would have to replace our middlewares
that adopt to different server environments, work around browser bugs,
that implement profiling and debugging functionality, that handle error
logging and whatnot.  We have a lot already that interfaces with WSGI and
knows how to deal with the protocol.

Of course if we could just come up with a new WSGI from ground up we would
make it different.  But would we make it more pluggable?  Probably not,
and here is why.

The Magic Plug
--------------

I love small applications that work together.  And the layer I let those
applications work together is called HTTP.  In fact, I will even have a
talk about this at PyCodeConf.  But what I do not believe in is that
magical plug that is called “framework independent pluggable application”.
I don't know where this idea came from that it might work, but it does
not.  The idea that you can reused code on top of WSGI to work with
Framework 1 and Framework 2 is not working out.  If they are truly divided
of course, you can nicely use WSGI as a layer to speak to both apps
depending on an HTTP request that came to a central dispatch point.  If
the user wanted to ``/app1`` I can dispatch to application 1, if the user
went to ``/app2`` I just point them to application 2.  But that's
something I can already do.

But that's now what this is about, is it?  Commonly the idea is that you
can take any return value from any WSGI application and then mangle it a
bit so that it fits into your environment.  The idea is that a middleware
could look at submitted form data and do some processing on it or anything
else that is currently not really possible with WSGI.

What you need at that point is not a new WSGI: you need a whole new
machinery that deals with so much more than just HTTP.  Because we're
doing so much more than we did a few years ago.

If you want to replace WSGI, you would not replace it, you would put a new
layer on top of it.  One that has extensive knowledge about everything
that happens.  You would have a standardized request/response library that
covers every single case that is currently needed and make it extensible
enough to handle future cases as well.

If we would have designed a request/response object in 2004 when WSGI was
created, it would look vastly different from what we know about web
applications today.  Back then we would probably have supported URL
encoded form data and XForms (since that was the latest hip thing), now we
know nobody uses XForms but JSON encoded data is pretty damn common, both
in incoming and outgoing direction.

Then there is the general trend currently towards async servers and
frameworks.  That's pretty awesome, but all of them are considering WSGI
to be a hurdle and are bypassing it.  Which then again means that a layer
on top of WSGI would not be that magic plug either since it would not work
for non WSGI environments.  If we want to step into that direction WSGI
itself would need an update to make it work better with async
environments.

Where to Go?
------------

Every once in a while someone shows up with an idea how to replace WSGI.
In the end however every new conflicting specification does not really
solve what people hope it would solve: making frameworks work better with
each other.  And there I think the glue that brings everything together
will not be on the server side.  It won't be a new version of WSGI, it
will be client side JavaScript that synchronizes authentication from one
part of the application to another without he user realizing that.  It
will be JavaScript that speaks to different backend servers written in
different frameworks of languages even and then render that on the client
side into whatever is necessary.

Personally I am pretty damn sure that WSGI no longer carries the
importance it had a few years ago.  I think it no longer makes sense to
merge different applications on the WSGI level together, it should be done
on a higher level and JavaScript is a nice way to do that.

Just think about Google's gray bar.  You can totally throw such a bar on
top of different independent parts of the application by emitting a tiny
piece of JavaScript that generates that bar and handles your user session.

In general JSON via HTTP or zeromq is so much cooler and more flexible
than WSGI could ever be.  I think if we accept that as a possible way to
build applications out of components and start experimenting with it we
could build some really cool stuff.

But that's just my 50 cents on this topic.


.. _WSGI: http://www.python.org/dev/peps/pep-0333/
.. _Rack: http://rack.rubyforge.org/
.. _Jack: http://jackjs.org/jsgi-spec.html
.. _PSGI: http://plackperl.org/
