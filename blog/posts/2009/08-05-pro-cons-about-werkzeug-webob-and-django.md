---
tags: ['werkzeug', 'django', 'python']
summary: "Why Werkzeug and WebOb exist when Django is already around."
---

# Pro/Cons about Werkzeug, WebOb and Django

Yesterday I had a discussion with [Ben Bangert](http://twitter.com/benbangert) from the Pylons team, [Philip Jenvey](http://twitter.com/pjenvey) and zepolen from the pylons IRC channel.
The topic of the discussion was why we have Request and Response objects
in [Werkzeug](http://werkzeug.pocoo.org/), [WebOb](http://pythonpaste.org/webob/) and [Django](http://djangoproject.com/) and what we could to to improve the
situation a bit.

We decided on writing down what we like or dislike on these three
systems in order to find out in which direction to go, so this is my
attempt. Please keep in mind that this are my opinions only!

## WebOb

Duplicate implicit target name: "webob".

Let's start with WebOb which is the smallest of the three libraries in
question. WebOb really just sticks to the basics and provides request
and response objects and some data structures required.

The philosophy of WebOb is to stay as compatible to paste as possible
and that modifications on the request object appear in the WSGI
environment. That basically means that when you do anything on the
request object and you create another one later from the same
environment you will see your modifications again.

This is without doubt something that neither Werkzeug or Django do. Both
Werkzeug and Django consider the incoming request something you should
not modify, after all it came from the client. If you need to create a
request or WSGI environment in Werkzeug you get a separate utility for,
that is designed for exactly that purpose.

While I have to admit that the idea of a reflecting request object is
tempting, I don't think it's a good idea. Using the WSGI environment as
a communication channel seems wrong to me. The main problem with it is
that WebOb cannot achieve what it's doing with standard environment
keys. There are currently five WebOb keys in the environment for
“caching” purposes and for compatibility with paste it also understands
a couple of paste environment keys.

The idea is that other applications can get a request again at a
completely different point, but I'm not sure if WSGI is the correct
solution for that particular problem. Reusable applications based on the
complex WSGI middleware system seems to be the wrong layer to me.

Some other parts where I don't agree with the WebOb concepts:

- The parsing of the data is implemented either in private functions
or directly in the request object. I strongly prefer giving the user
the choice to access the parser separately. Sometimes you really just
need a cookie parsed, why create a full request object then?

- WebOb uses `request.GET` and `request.POST` for URL parameters and
form data. Because you can have URL parameters in non-GET requests as
well this is misleading, for POST data it's wrong as well because form
data is available in more than just POST requests. Accessing
`request.POST` to get form data in a PUT request seems wrong.

- WebOb still uses `cgi.FieldStorage` and not only internally but also
it puts those objects into the `POST` dict. This is not the best idea
for multiple reasons. First of all users are encouraged to trust their
submitted data and blindly expect a field storage object if they have
a upload field in their form. One could easily cause trouble by
sending forged requests to the application. If logging is set up the
administrator is sent tons of error mails instantly. I strongly prefer
storing uploaded files in a separate dictionary like Django and
Werkzeug do. The other problem with using `FieldStorage` as parser is
that it's not WSGI compliant by requiring a size argument on the
readline function and that it has a weird API. You can't easily tell
it to not accept more than n bytes in memory and to switch between in
memory uploading and a temporary file based on the length of the
transmitted data. Also `cgi.FieldStorage` supports nested files which
no browser supports and which could cause internal server errors as
well because very few developers know that a) nested uploads exist and
b) that the field storage object behaves differently if a nested
uploaded file is transmitted.

- Also WebOb barks on invalid cookies and throws away all of them if
one is broken. This is especially annoying if you're dealing with
cookies outside of your control that use invalid characters (stuff
such as advertisement cookies)

Now to the parts where WebOb wins over Django and Werkzeug:

- Unlike Django and Werkzeug WebOb provides not only a unicode API but
also a bytestring based API. This could help existing applications
that are not unicode ready yet. Downside is that with the current
plans of Graham for WSGI on Python 3 there do not seem to be ways to
support it on Python 3.

- WebOb supports the HTTP range feature.

- The charset can be switched on the fly in WebOb, in Werkzeug you set
the charset for your request/response object and from that point
nowards it's used no matter what. In Django the charset is application
wide.

An interesting thing is that WebOb uses `datetime` objects with timezone
informations. The tzinfo attribute is set to a tzinfo object with an UTC
offset of zero. That's different to Werkzeug and Django which use
offset-naive `datetime` objects. Because Python treats them differently
and does not support operations that mix those. Unfortunately the
`datetime` module makes it hard to decide what to do. Personally I
decided to use `datetime` objects that have no tzinfo set and only dates
in UTC.

## Werkzeug

Duplicate implicit target name: "werkzeug".

In terms of code base size Werkzeug's next. The problem with Werkzeug
certainly is that it does not really know what belongs into it and what
not. That situation will slightly improve with the next version of it
when some deprecated interfaces go away and when the debugger is moved
into a new library together with all sorts of debugging tools such as
profilers, leak finders and more (enter [flickzeug](http://dev.pocoo.org/projects/flickzeug/)).

Werkzeug is based on the principle that things should have a nice API
but at the same time allow you to use the underlying functions. For
example you can easily access `request.form` to get a dict of uploaded
form data, but at the same time you can call `werkzeug.parse_form_data`
to parse the stuff into a multidict. You can even go a layer down and
tell Werkzeug to not use the multidict and provide a custom container or
a standard dict, list, whatever.

Also Werkzeug has a slightly different goal than WebOb. WebOb focuses on
the request and response object only, Werkzeug provides all kind of
useful helpers for web applications. The idea is that if there is a
function you can use, you are more likely to use it than that you
reimplement it. For example many applications take the uploaded file
name and just create a file with the same name. This however turns out
to be a security problem so Werkzeug gives you a function
(`werkzeug.secure_filename`) you can use to get a secure version of the
filename that also is limited to ASCII characters.

So obviously there is a lot of stuff in Werkzeug you probably would not
expect there.

So here some of the things I like especially about Werkzeug:

- The request/response objects. They are designed to be lightweight
and can be extended using mixins. Werkzeug also provides full-featured
request objects that implement all shipped mixins. Also the
request/response objects are not doing any parsing or dumping, that is
all available through separate functions as well which makes the code
readable and easy to extend.

- It fixes many problems with the standard library or reimplements
broken features. It does not depend on the `cgi.FieldStorage` since
0.5, allows you to limit the uploaded data before it's consumed. That
way an attacker cannot exhaust server resources.

- The data structures provide handy helpers such as raising key errors
that are also bad request exceptions so that if you're not catching
them, you are at least not generating internal server errors as long
as the base `HTTPException` is catched.

- Werkzeug uses a non-data descriptor for the properties on the
request and response objects. The first time you access the property
code is executed and that is stuffed into the dict. After that there
is no runtime penalty when accessing the attributes.

And of course here the list of things that are not that nice:

- It's too large for a library that only wants to implement request
and response objects.

- There is no support for if-range and friends.

- The response stream is useless because each `write()` ends up as a
separate “item” in the application iterator. Because each item is
followed by a flush it makes the response stream essentially useless.

- The `MultiDict` is unordered which means that some information is
lost.

- The response object modifies itself on `__call__`. This allows some
neat things like automatically fixing the location header, but in
general that should happen temporarily when called as WSGI application
instead of modifying the object.

## Django

Duplicate implicit target name: "django".

Now Django isn't exactly a reusable library for WSGI applications but it
does have a request and response object with an API, so here my thoughts
on it:

- URL arguments are called `request.GET` like in WebOb, but files and
form data was split up into `request.POST` and `request.FILES`.

- The request object is unicode only and the encoding can be set
dynamically.

- Problem is, they don't work with non-Django WSGI applications.

## Chances on a common Request Object?

WebOb and Werkzeug will stick around, and the chances that Django starts
depending on external libraries for the Request object are very, very
low. However it could be possible to share the implementation of the
HTTP parsers etc.

To be humble, I would not want to break Werkzeug into two libraries for
utlities and request/response objects and parsers because of the current
packaging situation. A lot of small stuff I work on works perfectly fine
with nothing but what Werkzeug provides which is pretty handy. So yes,
it's selfish to not break it up, but that's how I feel about the
situation currently.
