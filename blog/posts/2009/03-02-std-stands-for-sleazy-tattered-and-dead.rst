tags: [python]
summary: |
  My experiences with the Python standard library and why I'm not the
  biggest fan of it or at least the way it works currenctly.

“STD” stands for Sleazy, Tattered and Dead
==========================================

`My latest discovery
<http://lucumr.pocoo.org/2009/3/1/the-1000-speedup-or-the-stdlib-sucks>`_
of a `behavior bug in Python <http://bugs.python.org/issue5401>`_ earned
me some negative comments. I have to admit that the way I blogged about
it and how I reported the bug was not that fair. It was just one bug in
a million and I was surprised how late it was discovered. I was *really*
puzzled because of that. 

Anyhow. That's not what I want to blog about here; more about my bad
experiences with the standard library in general. Everybody who knows me
know that I hate things quickly and that I'm crazy about beautiful code.
Especially in the Python land there are some guys like `Christopher Lenz
<http://www.cmlenz.net/>`_ and the `trac <http://trac.edgewall.org/>`_
team or `Georg Brandl <http://pyside.blogspot.com/>`_ who write
beautiful code just as I like it :) 

The Python Standard Library
~~~~~~~~~~~~~~~~~~~~~~~~~~~

But why am I especially mad about the standard library? The reason for
this is that the standard library has some problems (caused by the fact
that it's the standard library). 

A lot of stuff ended up in Python a long, long time ago. And that was
fine for the time. I can't blame anyone for the state of the standard
library. A lot of stuff was added to it long before I even knew what a
computer was. Let's take `cgi` as an excellent example. `cgi` was, when
it was created, CGI a nice little protocol that just worked. And I
really have to give kudos to the developers of this library for doing
tons of stuff right. It may sound awkward if you know the library in
detail, but believe me, the fact alone that it nearly worked flawlessly
with WSGI is noteworthy. It's incredible if you think that WSGI was
added years after the library was written. So some forward thinking in
terms of “decoupling” it from CGI did the library very well. 

However the age of `cgi` shines through. I just recently discovered that
the infamous `cgi.FieldStorage` provides `multipart/mixed` support. This
is incredible. While it's specified as part of HTML4 it was never
implemented in a browser people actually used on the world-wide web. 

The downside is that, like many other libraries in the stdlib, it mixes
a high-level API with low-level parsing features. For example if you
access a key in a field storage you can't trust that key. It could
either be a string, a `FieldStorage` or a list or strings or
`FieldStorage`s or both at the time thanks to the `multipart/mixed`
support.. Hardly anyone knows that because he trusts the data in that it
returns the correct value. I guess there are enough Python scripts out
there that would die with an internal server error if you pass input
data via form that changes from a string into a `FieldStorage`. The days
when you could trust your user to submit the data you expect are long
gone. And security and browser bugs are things that change on a nearly
on a monthly basis. 

To savely use `FieldStorage` you have to un-magicify it by walking it
and unpacking the data into something you can trust. Moving all files
into one dict, all strings into another one etc. So in older `Werkzeug
<http://werkzeug.pocoo.org/>`_ versions and in current `Paste
<http://pythonpaste.org/>`_/Webob versions the field storage is
traversed and preprocessed before the data is handled to the developer. 

And the `cgi` module is one of those I had the least problems with.
Besides having an archaic API it also features some serious fuckups like
accessing `sys.argv` when you least expect it, undocumented logging code
and years of backwards compatibility. Thanks to the magic API it was
also impossible to select the upload storage based on the content length
or stop parsing if resources are exhausted (someone trying to submit a
gigabyte of form data to the server, which is always stored in memory). 

The `Cookie` module is one of my “favourites”. It comes with backwards
compatible code that can be used to let an attacker execute arbitrary
code on the server and has an API that is so weird and magical that few
in the history of Python frameworks exposed that API to the user. On
parsing errors it drops all the cookie values and it does not very well
with real-world cookies which means that you can have a lost cookie very
fast. The morsel stuff it uses internally is written in a way that you
can only add support for stuff like `HttpOnly` by subclassing it and
overriding builtin and undocumented attributes. 

Until recently `urllib` didn't had proper `timeout` support making it
practically impossible to safely use it in a web application. The
`socket.setdefaulttimeout()` hacks have so many problems, don't even get
me started. And I'm not mad that there was no `timeout` support. My
problem solely is that the library was written in a way that it's
impossible to add such missing features by hand without rewriting the
library. 

`BaseHTTPServer` is another library that has magic built-in. Without
copy/paste of undocumented code you can't write a web server that
listens for *all* HTTP methods. (Not true, there is a way. You could
override `__getattr__`, look for `do_*` attributes and forwarding that
to a proxy method but …) 

Do you know the `codeop` module? It's used to implement the
Python-version of the Python interactive shell. It works like this:
compile the code, compile the code with a newline at the end, compile
the code with two newlines at the end and compare the string value of
exceptions raised to figure out if we are at the end of the input -.- 

Until Python 2.6 there was no documented way to load a file from the Zip
file as a file descriptor, rather than a complete string. 

Do you know `imaplib`? In the real world it's nearly unusable because it
stops half way and returns values in a half-parsed and undocumented
format making it impossible to actually do anything useful it with
except for the very basics. 

And I'm not talking about stuff that was now finally deprecated like
`dircache`, `sv` or god knows what is in the stdlib nobody knows about
or `locale` which is not process-safe and so useless that the Babel guys
see no way except reimplementing everything from it as separate new
library. 

Why is it in that Sad State?
~~~~~~~~~~~~~~~~~~~~~~~~~~~~

How does stuff go into the standard library? Maybe we should go there.
I'm not sure how that happens. Some stuff went into the standard library
I'm very happy about. Modules like `threading`, `multiprocessing`,
`urllib`, `json` etc. These modules have one thing in common: They
either implement something that is heavily platform dependent, essential
or standardized and stable. Other stuff went into the standard library
just to decay there. For example we have the `cgi` module, the
`webbrowser` module (which should be part of the GUI libraries, not a
Programming language's standard library) etc. 

What is a standard libary for anyways? A standard library is shipped as
part of the language and should make it possible to make applications
platform independent. To provide often used features and implement them
in a way that everybody can use it, from any context. Not just
single-threaded command line applications. 

A cool standard library would provide IO access, filesystem and platform
introspection helpers, access to the programming language internals (a
interface for debuggers, access to the AST / compiler / bytecode /
garbage collector etc.), support for package distribution, ways to
extend the import system etc. There would be kick-ass unicode support,
regular expressions, datetime objects, collections and other data
structures etc. 

Not standard library worthy is stuff like any kind of web development
support. These things change quicker than you can sing the Spam song.
Also a UI toolkit like Tk is something that's not standard library
worthy (especially because it's rendering widgets like it's 1985). Why
is there support for wave files? Especially in such a useful way. Why
are there 5 or more file-system databases like bsddb? Why is there an
SQLite adapter shipped? Why do we have parsers for robot.txt files?
plist? asyncore? commands / popen2 and tons of other redundant ways to
invoke external applications and get the output? The builtin XML support
is in such a bad state due to the fact that XML and the technologies
that make it worthwhile are so complex that they require more bugfixes /
releases of the libraries that implement it or change so quickly that
the standard library can't keep up. Minidom is annoying, the standard
etree doesn't even support printing of XML documents with custom
namespaces without falling back to unreadable names. (remember that XML
was sold to use as human readable?). 

Your area of expertise != Our area of expertise
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

I'm one of those developers that really likes to write library with a
nice API and that reads through tons of RFCs, blog posts to similar
topics etc. to deliver a nearly-perfect library in the end. Of course I
fail in delivering perfect libraries. Far from it. However I try to
improve the stuff I write over time, learning of my mistakes and
improving them. From nearly two years of `Jinja
<http://jinja.pocoo.org/>`_ developing, the feedback I've got, studying
of similar code and more I was able to collect some knowledge to know
how template engines in Python may work and what can be changed in the
language to improve the experience. I just recently started diving into
the gory details of HTTP, browser bugs and everything else. I had a look
at earlier code I've written and had to notice that I was stupid and
solved problems in a way that they seem to work, without seeing the
bigger picture. This experience comes over time and it takes a couple of
releases to really come up with an implementation that works like it
should. 

I've seen from other project that I'm not alone with that. Compare older
Django versions with more recent ones. Earlier Django versions monkey
patched modules to move models into other modules, CherryPy started as a
standalone server in the pre-WSGI days that even went as far as
implementing a Python-inspired language for the application code that
compiles down to Python (I'm not exactly sure how that worked. I just
remember something like that. Correct me if I'm wrong). Zope is in it's
third iteration as well, Ian seems to have learned from mistakes as well
and fixes them in WebOb now, Genshi took over Kid and is its unofficial
successor fixing problems learned from there etc. 

This is something you can't do in the standard library. Once code is
there, it sticks. So nobody can be blamed for problems in the standard
library. This is what happens if code ends up there. This is the effect
a standard library has on code. 

So far I have just contributed two modules to the standard library. One
is the ast module which provides `compiler.ast` like access to the new
Python AST, incorporating experiences I've got when working on Jinja and
Genshi. The other one is the `ordered dict
<http://www.python.org/dev/peps/pep-0372/>`_ which isn't yet there, but
where I suppose it will be accepted in one way or another. The
experience for those two libraries was interesting. 

The intentions I had with the AST module seem to clash with Guido's
believes in Python a bit. When Google launched the AppEngine I and
Christopher Lenz had a discussion with Guido via mail why the `_ast`
(the internal module used by `ast`) module was unavailable there.
Between the lines you could hear that he was not very happy with giving
Python modules the access to the compiler: 

    IMO it's more that because it was available people flocked to it as
    a timesaver. As the compiler package has turned out to be a
    ridiculous maintenance nightmare, nobody really wants to support
    that any more. 

    Hopefully the pgen2 package (which is more flexible *and* more
    limited) is easier to use. I can highly recommend it.

`pgen2`, if you don't know it, is the library working in the 2to3 tool
and Sphinx which is a (slowish) Python parser written in Python. I
noticed Guido's dislike in Python code generating and compiling Python
code last djangocon as well. He started his keynote by joking about how
the Django template engine is superior to anything else out there. (Of
course I don't know if he means the implementation or philosophy, but
something inside me told me he was happy that it was evaluating a custom
AST and not compiling down to Python) 

I suppose that's fine. Python is his brain child, but I was hoping he
could see that for quite a few situations it would be helpful to have an
AST to play around *and* compile it down to Python bytecode. 

So what does this have to do with the standard library? A lot if you
think about it. It basically means that a library in the standard
library is no longer the library of the person who wrote it. It's part
of a bigger plan. Suddenly different rules apply. Updated are
distributed with Python as I've said earlier already. But that's not the
only thing that changes. The philosophy changes as well. Normally if I
notice that something does not work as expected, I consider changing it
with a deprecating warning or starting a separate library that is
backwards incompatible but fixes those problems (like I did with Jinja
2). In the standard library you are forced to live with some bugs if
they are not fixable in a backwards compatible way. Someone else will
suddenly decide that changes won't go into a library because it would
break code, something the Python team can't allow. 

And this is a great thing. It means that updating from one Python
version to another is in general very painless. It just has negative
implications on libraries that ended up there too early or have to be
changed to stay up with latest developments. 

On the other hand stuff that does belong into the standard library
should get some more love. Why is there no function yielding file names
in a directory instead of returning a list? Why don't we have a module
that gives us colors for the terminal in a platform-independent way?
What about adding unicode support to Python's regular expressions? Or
implement some more UTRs for the `unicodedata` module? Platform
independent file locking and file change notifications? That would be
honking great! 

Where to Go?
~~~~~~~~~~~~

If there is one thing I want to say with this blog post, it's that I
strongly support the idea of making the standard library as light as
possible and to improve the package distribution problem which still
exists. Ever since virtualenv came around I'm no longer installing
packages system wide so that I can have different versions in place.
Maybe someone could even come up with a PEP to support loading different
versions of the same library into the Python interpreter. Imagine you
could install different versions of SQLAlchemy via debian's `apt-get`
and the application could require a specific version. If the package
installation is easy and simple there would be no problem with moving
“essentials” like the `urllib`, `cgi`, `sqlite` or all the XML modules
outside of the standard library and on the Python package index. 

The great libraries are great because they are actively developed. And
we should take advantage of that! 

As always read this post with a grain of salt. The fact that I'm still a
Python Lover, with all the mistakes and limitations it has strongly
speaks for it.

