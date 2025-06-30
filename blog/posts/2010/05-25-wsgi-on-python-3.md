---
tags: ['wsgi', 'python']
summary: "A short summary about the current state of WSGI on Python 3."
---

# WSGI on Python 3

Yesterday after my talk about WSGI on Python 3 I announced an OpenSpace
about WSGI. However only two people showed up there which was quite
disappointing. On the bright side however: it was in parallel to some
interesting lighting talks and I did not explain to well what the
purpose of this OpenSpace was.

In order to do better this time around, I want to summarize the current
situation of WSGI on Python 3, what the options are and why I'm at the
moment thinking of going back to an earlier proposal that was dismissed
already.

So here we go again:

## Language Changes

There are a couple of changes in the Python language that are relevant
to WSGI because they make certain things harder to implement and others
easier. In Python 2.x bytestrings and unicode strings shared many
methods and Python would do a lot to make it easy for you to implicitly
switch between the two types. The root cause of the unicode decode and
unicode encode errors everybody knows in Python are often caused by the
implicit conversion going on.

Now in Python 3 the whole thing looks a lot different.  There are only
unicode strings now and the bytestrings got replaced by things that are
more like arrays than strings.  Take this Python 2 example:

```pycon
>>> 'foo' + u'bar'
u'foobar'
>>> 'foo %s' % 42
'foo 42'
>>> print 'foo'
foo
>>> list('foo')
['f', 'o', 'o']
```

Now compare that to the very same example on Python 3, just with syntaxadjusted to the new rules:

```pycon
>>> b'foo' + 'bar'
Traceback (most recent call last):
  File "", line 1, in
TypeError: can't concat bytes to str
>>> b'foo %s' % 42
Traceback (most recent call last):
  File "", line 1, in
TypeError: unsupported operand type(s) for %: 'bytes' and 'int'
>>> print(b'foo')
b'foo'
>>> list(b'foo')
[102, 111, 111]
```

There are ways to convert these bytes to unicode strings and the other way
round, there are also string methods like `title()` and `upper()` and
everything you know from a string, but it still does not behave like a
string.  Keep this in mind when reading the rest of this article, because
that explains why the straightforward approach does not work out too well
at the moment.

## Something about Protocols

WSGI like HTTP or URIs are all based on ASCII or an encoding like latin1
or even different encodings.  But all those are not based on a single
encoding that represents unicode.  In Python 2 the unicode situation for
web applications was fixed pretty quickly by all frameworks in the same
way: you as the framework/application know the encoding, so decode
incoming request data from the given charset and operate on unicode
internally.  If you go to the database, back to HTTP or something else
that does not operate on unicode, encode to the target encoding which you
know.

This is painless some libraries like Django make it even less painful by
having special helpers that can convert between utf-8 encoded strings and
actual unicode objects at any point.  Here a list of web related libraries
operating on unicode (just a small pick): Django, Pylons, TurboGears 2,
WebOb, Werkzeug, Jinja, SQLAlchemy, Genshi, simplejson, feedparser and the
list goes on.

What these libraries can have, what a protocol like WSGI does not, is
having the knowledge of the encoding used. Why? Because in practice (not
on the paper) encodings on the web are very simple and driven by the
application: the encoding the application sends out is the encoding that
comes back. It's as simple as that.  However WSGI does not have that
knowledge because how would you tell WSGI what encoding to assume?  There
is no configuration for WSGI so the only thing we could do is forcing a
specific charset for WSGI applications on Python 3 if we want to get
unicode onto that layer.  Like utf-8 for everything except headers which
should be latin1 for RFC compliance.

## Byte Based WSGI

On Python 2 WSGI is based on bytes.  If we would go with bytes on Python 3
as well, the specification for Python 3 would look like this:

1. WSGI `environ` keys are unicode

1. WSGI `environ` values that contain incoming request data are
bytes

1. headers, chunks in the response iterable as well as status
code are bytes as well

If we ignore everything else that makes this approach hard on Python
3 and only look at the bytes object which just does not behave like a
standard string any more, a WSGI library based on the standard libraries
functions and the bytes type is quite complex compared to the Python 2
counterpart.  Take the very simple code commonly used to reproduce a URL
from the WSGI environment on Python 2:

```python
def get_host(environ):
    if 'HTTP_HOST' in environ:
        return environ['HTTP_HOST']
    result = environ['SERVER_NAME']
    if (environ['wsgi.url_scheme'], environ['SERVER_PORT']) not \
       in (('https', '443'), ('http', '80')):
        result += ':' + environ['SERVER_PORT']
    return result

def get_current_url(environ):
    rv = '%s://%s/%s%s' % (
        environ['wsgi.url_scheme'],
        get_host(environ),
        urllib.quote(environ.get('SCRIPT_NAME', '').strip('/')),
        urllib.quote('/' + environ.get('PATH_INFO', '').lstrip('/'))
    )
    qs = environ.get('QUERY_STRING')
    if qs:
        rv += '?' + qs
    return rv
```

This depends on many string operations and is entirely based on bytes
(like URLs are). So what has to be changed to make this code work on
Python 3? Here an untested version of the same code adapted to
theoretically run on a byte based WSGI implementation for Python 3.

The `get_host()` function is easy to port because it only concatenates
bytes.  This works exactly the same on Python 3, but we could even improve
that theoretically by switching to bytearrays which are mutable bytes
objects which in theory give us better memory management.  But here the
straightforward port:

```python
def get_host(environ):
    if 'HTTP_HOST' in environ:
        return environ['HTTP_HOST']
    result = environ['SERVER_NAME']
    if (environ['wsgi.url_scheme'], environ['SERVER_PORT']) not \
       in ((b'https', b'443'), (b'http', b'80')):
        result += b':' + environ['SERVER_PORT']
    return result
```

The port of the actual `get_current_url()` function is a little different
because the string formatting feature used for the Python
2 implementation are no longer available:

```python
def get_current_url(environ):
    rv = (
        environ['wsgi.url_scheme'] + b'://'
        get_host(environ) + b'/'
        urllib.quote(environ.get('SCRIPT_NAME', b'').strip(b'/')) +
        urllib.quote(b'/' + environ.get('PATH_INFO', b'').lstrip(b'/'))
    )
    qs = environ.get('QUERY_STRING')
    if qs:
        rv += b'?' + qs
    return rv
```

The example did not become necessarily harder, but it became a little bit
more low level. When the developers of the standard library ported over
some of the functions and classes related to web development they decided
to introduce unicode in places where it's does not really belong. It's an
understandable decision based on how byte strings work on Python 3, but it
does cause some problems. Here a list of places where we have unicode,
where we previously did not have it. Not judging here on if the decision
was right or wrong to introduce unicode there, just that it happened:

- All the HTTP functions and servers in the standard library are
now operating on latin1 encoded headers. The header parsing
functions will assume latin1 there and pass unicode to you.
Unfortunately right now, Python 3 does not support non *ASCII*
headers at all which I think is a bug in the implementation.

- The `FieldStorage` object is assuming an utf-8 encoded input
stream as far as I understand which currently breaks binary file
uploads. This apparently is also an issue with the email package
which internally is based on a common mime parsing library.

- `urllib` also got unicode forcely integrated. It is assuming
utf-8 encoded string in many places and does not support other
encodings for some functions which is something that can be fixed.
Ideally it would also support operations on bytes which is
currently only the case for unquoting but none of the more complex
operations.

## The about-to-be Spec

There are some other places as well where unicode appeared, but
these are the ones causing the most troubles besides the bytes not
being a string thing. Now what later most of WEB-SIG agreed with and
what Graham implemented for `mod_wsgi` ultimately is a fake unicode
approach. What does this mean? Make sure that all the information is
stored as unicode but not with the proper encoding (which WSGI would
not know) but just assume latin1. If latin1 is not what the
application expected, the application can encode back to latin1 and
decode from utf-8. (As far as I know, this is loss-less).

Here what the current specification looks like that is about to be
crafted into a PEP:

1. The application is passed an instance of a Python dictionary
containing what is referred to as the WSGI environment. All keys
in this dictionary are native strings. For CGI variables, all
names are going to be ISO-8859-1 and so where native strings are
unicode strings, that encoding is used for the names of CGI
variables.

1. For the WSGI variable 'wsgi.url_scheme' contained in the WSGI
environment, the value of the variable should be a native
string.

1. For the CGI variables contained in the WSGI environment, the
values of the variables are native strings. Where native strings
are unicode strings, ISO-8859-1 encoding would be used such that
the original character data is preserved and as necessary the
unicode string can be converted back to bytes and thence decoded
to unicode again using a different encoding.

1. The WSGI input stream 'wsgi.input' contained in the WSGI
environment and from which request content is read, should yield
byte strings.

1. The status line specified by the WSGI application should be a
byte string. Where native strings are unicode strings, the
native string type can also be returned in which case it would
be encoded as ISO-8859-1.

1. The list of response headers specified by the WSGI
application should contain tuples consisting of two values,
where each value is a byte string. Where native strings are
unicode strings, the native string type can also be returned in
which case it would be encoded as ISO-8859-1.

1. The iterable returned by the application and from which
response content is derived, should yield byte strings. Where
native strings are unicode strings, the native string type can
also be returned in which case it would be encoded as
ISO-8859-1.

1. The value passed to the 'write()' callback returned by
'start_response()' should be a byte string. Where native strings
are unicode strings, a native string type can also be supplied,
in which case it would be encoded as ISO-8859-1.

## Why I'm Unhappy again

I did some tests lately with toying around and starting to work on a
port of Werkzeug but the more I worked with it, the more I disliked
it. WSGI in Python 2 was already a protocol that was far more
complex than it should have been and some parts of it just don't
make any sense (like the input stream having readline without size)
but it was something you could get started quickly and the basics
were simple. Middlewares, the area where WSGI was already a far too
complex now just become more complex because they have to encode
unicode strings before they can operate on them, even if it's just
comparing.

It just feels like the more I play with it, the more unhappy I
become with how the bytes object works and how the standard library
behaves. And I doubt I will be the only one here. It's just that
playing with the actual code shows problems you wouldn't spot on the
paper so I would love to see a wider crowd of people toying with
both the language and specification to make sure WSGI stays a
specification everybody is happy with.

Right now I'm a little bit afraid we end up with a specification
that requires use to do the encode/decode/encode/decode dance just
because the standard library and a limitation on the bytes object
makes us do. Because one thing is for certain: ASCII and bytes are
here to stay. Nobody can change the protocols that are in use, and
even those would on the very bottom have to be based on bytes. And
if the tools to work with them are not good enough in Python 3 we
will see the problems with that on multiple levels, not just WSGI
(Databases, email, and more).

What I currently have in mind is a bit more than what was ever on
discussion for WSGI which is why I don't expect anything like that
to be implemented, but it can't harm sharing:

- Support basic string formatting for bytes

- Support bytes in more places of the standard library (urllib,
cgi module etc.)

- use bytes for values (not keys) in the WSGI spec for Python 3,
just like in Python 2

- use bytes for headers, status codes and everything for Python 3

I am happy to accept a quasi-unicode support as well and will port
Werkzeug over to it. But it's probably still the time to improve the
specification *and* language that everybody is happy. Right now it
looks like not a lot of people are playing with the specification,
the language and the implications of all that. The reason why Python
3 is not as good as it could be, is that far too few people look at
it. It is clear that the future of Python will be Python 3 and that
there are no intentions of make other releases than Python 2.7, so
to make the process less painful it's necessary to start playing
with it now.

So I encourage everyone to play with Python 3, the spec, the
standard library so that there is more input. Maybe the bytes issue
does look like I think it is, maybe it's not. But if only a four
people are discussing the issue, there is too few input to make
rational decisions.
