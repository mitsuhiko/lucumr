---
tags:
  - python
summary: "Short overview of things that are nice about Python 3 and parts where
I can't agree with the changes or it did not go far enough."
---

# Pros and Cons about Python 3

I was briefly expressing my disagreement with the Python 3 development
decisions, so I want to elaborate on that a bit. While I was previously
addressing some of the problems I have with Python 3, I took the time to
create a list of things that were solved in a way other than I expected
or hoped.

Let's start with the biggest grief of mine...

## Unicode Support

If you look at any of the pocoo libraries, they all use unicode. In
fact, Jinja2 and Werkzeug even enforce unicode so you can't even use
them with byte strings internally unless you do the encode dance. Why
that? Because I believe in unicode and that is not too surprising
because German, the official language of Austria uses some non ASCII
letters and yet tons of systems deployed force me to substitute Umlauts
with latin letters just because someone had a limited horizon.

But the unicode world is complex and Python does not care about unicode
too much. And that neither in Python 2 nor Python 3. So what does not
work about unicode in Python? So in German for example, there are words
like "Fuß" (which means foot). The last letter there is a so-called
"Scharfes Es" or "Eszett". The former means "sharp-s" and is usually
represented as a "ſs" ligature, the other one is a "ſz" ligature and
used in blackletter fonts (The letter "ſ" is no longer in use but worked
similar to a latin "s"). Another common way was using an "ſs" litature.
Because this letter will never occur at the beginning of words there was
never an uppercase character for it (there was one introduced lately,
but nobody uses it). However, it is pretty common to use title case or
uppercase for emphasis, so there is a need for that letter to exist in
uppercase. The common replacement you see is a doubled "s" or "sz". So
"Fuß" becomes "FUSS", "Maße" became "MASZE" etc. There are some
variations, but basically it means that one letter becomes two.

However, that does not work in Python. The Python unicode implementation
cannot do two things: neither can it replace one letter with two when
changing the case, nor does it allow a locale information for character
mappings. The latter is necessary for languages like Turkish where an
uppercase "I" is lowercased to "ı" and not "i". (And I will not complain
about the shared state of the locale library which of course stayed in
Python 3).

Another problem is that Python uses UCS2 or UCS4 internally and that
shines through. So if you have an UCS2 build, `len()` called on strings
does not give you the number of characters in the string, but the number
of UCS2 interpreted characters which might not be the same. In fact,
every letter outside the basic plane will be wrongly counted. Because
UTF-16 (UCS2 with support for surrogate pairs that allow you to use
characters outside the basic plane) is a variable length encoding it has
the same problems as utf-8 as an internal encoding: namely, making
slicing a non trivial operation. Another problem arises: binary
extensions have to be compiled for UCS2 and UCS4 pythons separately. And
last time I checked, setuptools did not allow you to publish both builds
on pypi and pull the correct one. In fact, by default there is no such
information in the filename which would make it possible to provide both
extensions.

So what they did "improve" with Python 3 was making unicode strings the
default. And they did that in a very backwards incompatible and IMO
problematic way: they degraded bytestrings from strings to glorified
integer arrays and enforced unicode on non-unicode protocols.

Just to give you an example: When you iterate over bytestrings in Python
2, the iterator will yield you a bytestring of length 1 for each
character with that character in. While I was always a harsh opponent of
strings being iteration, it was something everybody relied on. In Python
3, bytestrings are bytes objects, which are basically arrays of integers
which look like strings in the repr, but yield the bytes as integers. So
if you had code that relied on the iteration returning chars, your code
will break. And yes, Python 3 breaks backwards compatibility, but this
is something that 2to3 does not pick up and most likely you will not
either. At least in my situation it took me a long time to track down
the problem because some other implicit conversion was happening at
another place.

Now at the same time unicode strings continue to yield unicode strings
on iteration with the char in. That means suddenly bytes and unicode
objects have different semantics, making it impossible to provide an
interface for both bytestrings and unicode. There were tons of places
libraries accepted both unicode and bytes in Python 2 because it "made
sense". A good example is URL handling. URLs are encodingless. Some
schemes hint a default charset, but in reality no such thing exists.
However, applications themselves knew what encoding the URL would use,
so they happily pass unicode strings to the URL encoder and that would
use the application URL encoding to ensure the URL is properly quoted.
In Django/Werkzeug/and probably many more libraries, if you passed
unicode to the URL encoder, it would by default encode to UTF-8. However
if the URL was came from another source with unknown encoding, it was
possible to transparently pass the URL on. Also the decoding of URLs
from somewhere else usually happened encoding-less. Many applications
for example check the referrer of the page to check if the user came
from a search engine and if yes, grab the search keywords from the
referrer and highlight them on the current page. In that situation you
can keep a list of known encodings of referrers in the URL and decode
the referrer URL accordingly. In Python 3 the URL module in many
situations uses an UTF-8 default encoding, or requires the URL to be
UTF-8 encoded or provides a completely different and limited interface
for byte URLs.

Sure, it might be sufficient for 98% of all users, but there are non
obvious implications: a library that wraps urllib/urlparse and whatnot
cannot reuse the same code for Python 2 and 3. When I started supporting
IRIs in Werkzeug (basically the URL successors with proper encoding,
already somewhat used by browsers) I chose to abandon the urllib module
altogether and write my own simple decoder to make it easier to later
port that thing over to Python 3 without changed semantics.

There are other examples as well: filesystem access. Python 3 assumes
your filesystem has an encoding, but many linux systems do not. In fact,
not even OS X enforces an encoding. You can happily use fopen to create
a file that does not look like UTF-8 at all. And even there, the
situation is a lot more complex because on OS X, different unicode
normalization rules apply for the filesystem than for the applications
themselves. So even if you are using Python 3, you still will have to
manually normalize the filename to a different encoding when you want to
compare filenames on the filesystem.

When I looked at the unicode stuff in Python 3 I did not see much value
over nicely written libraries in Python 2 that enforced unicode usage.
In fact, the update makes it especially hard to convert such libraries
(that required unicode) to Python 3, because 2to3 assumes you are using
byte strings and not unicode.

## The case of "super" and other Quirks

I wonder how this slipped past everybody and why Guido is okay with
that, but the new super non-keyword-keyword in Python 3 is just wrong.
The fact that this code works is alarming already:

```python
class Foo(Bar):
  def foo(self):
    super().foo()
```

Assuming you know Python used to work function invocation wise the fact
that this works smells.  But it gets a lot worse because this code does
not work:

```python
_super = super
class Foo(Bar):
  def foo(self):
    _super().foo()
```

That's just wrong. The use of the name of a global function (which btw I
can reassign!) should never affect the bytecode generated, that's what
keywords are for! Python also did not optimize `while True` loops
because someone could reassign `True`, but suddenly it's sortof okay to
do that. Also, why have self explicit when some magic in the compiler is
now suddenly able to inject new symbols in the code? From that point
onwards it is a one-liner to make the self implicit and suddenly there
is no reason for that self being the explicit first parameter any more.

From what I remember, this was done to optimize the code. That's true,
they do optimize something, but at the same time a function call of a
global function in a method in a loop, will do a dict lookup every time
the thing is invoked. Another thread could reassign the global function
and suddenly the code would no longer call the new function because the
old one was pulled into a local "register" (fastlocal or similar). And
if you think "that's undefined behavior", I beg you to look into the
mimetypes library. That will explain that no where in the world a Python
implementation could be conforming if it avoids global lookups by
optimizing them.

What I wished for Python 3 was to remove really useless dynamic features
like pulling in functions on every call to allow more
compiler/interpreter optimizations, easier multithreading support and
everything.

Also what I was wishing for, for Python 3 was a better interpreter
interface, and a revoked GIL or no GIL at all. I would love to be able
to use multiple Python interpreters per application. Some sort of
reentrant interpreter. That would simplify embedding Python into other
applications and expand the possibilities. Just look at how V8 works
internally to get an idea of what I was hoping for. I also wished there
was a builtin support for freezing objects (no longer a frozenset, just
freeze the set, and then finally be able to do the same for lists etc.).
Also builtin support for proxing would be nice. The hack thread local
libraries and the weakref module to proxy objects is just wrong, wrong,
wrong (and unreliable as well). Imports are still horrible implemented,
the standard library is still inconsistent or limited (and now even
broken, `cgi.FieldStorage` in Python 3 anyone?)

## What's cool about Python 3?

What I really like is the new non local stuff. I was longing for that
for a long, long time. booleans being a keyword, that should have been
in there for longer, finally easier division semantics, improved
metaclasses, class decorators, no more classic classes, dict views, the
builtins returning iterables instead of lists etc (Though they should
have added improved repr support that would allow me to introspect those
iterators and freezing them at the same time [which I guess would once
again require a cleaner and improved interpreter design to get right]).

## Conclusion

But that does not justify a new version of Python. Instead they could
have added a strict mode and let the old code run emulated. They could
have expanded that strict mode to allow access to new features of the
language, add support for compiler optimizations and so much more.
(JavaScript is currently getting such a strict mode).

So yes, I am disappointed how Python 3 worked out. They could have done
so much more or skipped Python 3 altogether and get the cool stuff into
an optional strict mode in Python 2.
