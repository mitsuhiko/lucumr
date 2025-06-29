tags: [python]
day-order: 2
summary: |
  Some useful suggestions about how to write code that works well with
  2to3 and will eventually work on both Python 2 and 3.

Writing Forwards Compatible Python Code
=======================================

For web applications the safest bet currently is to stick with Python 2.x
even for new projects.  For the simple reason that right now we don't have
enough supporting libraries for Python 3 yet and porting some of them over
is a huge step.  But with all the people telling one that it's hard and
painful to upgrade to Python 3, how does one make this upgrade easier?

For high level applications an upgrade is actually quite simple if it can
trust the supporting libraries to have consistent behaviour after it's
ported to Python 3.  In fact there is no reason why an upgrade to Python 3
shouldn't be possible in a painless way.  So here is a list of dos and
don'ts for writing new Code.


2.6 is your Baseline
--------------------

For new projects, start with Python 2.6 or 2.7.  They provide a lot of
things that make an upgrade to Python 3 easier for you.  If you don't have
to support older versions of Python you can already use a lot of the stuff
that is in Python 3 by explicitly opting them in.

You should use the following things from `__future__`:

-   `division`.  I must admit that I hate the future division import in
    Python 2.  It constantly makes me jump to the beginning of the
    file to check what division mode is active for a module when I do core
    review.  However because it will be the default in Python 3 (and the
    only mode) you really should be using it nowadays.

-   `absolute_import`.  The most important one.  No longer will `from xml
    import bar` import a module `foo.xml` from the `foo` package when you
    are inside it.  Instead you explicitly have to do `from .xml import
    bar` to get to what you want.  Less confusion and incredible helpful.

Regarding the print-as-a-function future import, I recommend against using
it to avoid confusion.  Especially because all editors are currently
highlighting it as a keyword it can become confusing quickly.  Generally
if things behave differently in different files it's a good idea to avoid
these things if possible.  The great aspect of the print change is that it
can be reliably converted with 2to3, so there is really no reason to use
the `print_function` future import.

While it might be appealing, better do not use the `unicode_literals`
future import.  For the very simple reason that may APIs are changing the
supported string types in different places and `unicode_literals` is
counterproductive.  There are of course places where this feature import
is useful, but that's more limited to lower level interfaces (libraries)
and those can't use that import anytime soon anyways because it came with
Python 2.6.  To get access to the ``b'foo'`` iteral you *do not need* this
specific import.  That is available either way and is a great help for
2to3.


File IO and Unicode
-------------------

File IO changed greatly in Python 3.  Thankfully if you are designing new
APIs for new projects you can save yourself a lot of hassle by deciding
explicitly for unicode.

If you are dealing with text data, use the `codecs.open
<http://docs.python.org/library/codecs.html>`_ function for opening the
files.  Assume utf-8 encoding unless explicitly differently defined and
operate on unicode strings only.  For binary IO make sure to open the file
with ``'rb'`` instead of ``'r'`` and you are set.  That was required for
proper Windows support already anyways.

If you are doing byte based data processing mark strings that are bytes
only with ``b'foo'`` instead of ``'foo'`` which tells 2to3 to not convert
these string literals to unicode.  Please be aware of the following
differences between Python 2.6:

.. sourcecode:: pycon

    >>> b'foo'
    'foo'
    >>> b'foo'[0]
    'f'
    >>> b'foo' + u'bar'
    u'foobar'
    >>> list(b'foo')
    ['f', 'o', 'o']

and Python 3 regarding byte strings:

.. sourcecode:: pycon

    >>> b'foo'[0]
    102
    >>> b'foo' + 'bar'
    Traceback (most recent call last):
      File "<stdin>", line 1, in <module>
    TypeError: can't concat bytes to str
    >>> list(b'foo')
    [102, 111, 111]

As a replacement for the above Python 2 idioms, you can use this instead:

.. sourcecode:: pycon

    >>> b'foo'[0:0 + 1]
    b'f'
    >>> b'foo' + 'bar'.encode('latin1')
    b'foobar'
    >>> to_charlist = lambda x: [x[c:c + 1] for c in range(len(x))]
    >>> to_charlist(b'foo')
    [b'f', b'o', b'o']

These will work on both 2.6 and 3.x.


Better Safe than Sorry
----------------------

There are a couple of things where 2to3 will be pretty counterproductive.
Some of these are cases where 2to3 seems to have a bug, others are the
cases where it just does not know enough of your code to make proper
predictions.

Recursion Error with str
^^^^^^^^^^^^^^^^^^^^^^^^

A lot of people are using code like this on Python 2:

.. sourcecode:: python

    class Foo(object):
        def __str__(self):
            return unicode(self).encode('utf-8')
        def __unicode__(self):
            return u'Hello World'
    
2to3 assumes that your API is not unicode compatible and will convert it
to this:

.. sourcecode:: python

    class Foo(object):
        def __str__(self):
            return str(self).encode('utf-8')
        def __unicode__(self):
            return 'Hello World'
       
Now this is just wrong.  First of all `__unicode__` is unused in Python 3,
secondly `__str__` now calls into itself and will trigger a runtime error
because of recursion when `str()` is called on an instance of `Foo`.  This
can be solved with either a custom 2to3 fixer or a little helper class
that makes a check for Python 3:

.. sourcecode:: python

    import sys

    class UnicodeMixin(object):
        if sys.version_info > (3, 0):
            __str__ = lambda x: x.__unicode__()
        else:
            __str__ = lambda x: unicode(x).encode('utf-8')

    class Foo(UnicodeMixin):
        def __unicode__(self):
            return u'Hello World'

That way your object will still have an `__unicode__` attribute on Python
3, but that will not do any harm.  When you then want to drop Python 2
support you just have to go over all subclasses of `UnicodeMixin` and
rename `__unicode__` to `__str__` and remove the helper class.

String Comparisons
^^^^^^^^^^^^^^^^^^

This problem is a little more tricky.  In Python 2 the following is true:

.. sourcecode:: pycon

    >>> 'foo' == u'foo'
    True
    
Not so in Python 3:

.. sourcecode:: pycon

    >>> b'foo' == 'foo'
    False

What's worse here is that Python 2 does not emit a warning on comparisons
(neither with or without Python-3-warnings flag) and neither will Python
3.  So how can you spot these cases?  I wrote a small helper module called
`unicode-nazi <http://pypi.python.org/pypi/unicode-nazi>`_ which once
imported will warn automatically if you do something that is not purely
a unicode or bytestring operation:

.. sourcecode:: pycon

    >>> import unicodenazi
    >>> u'foo' == 'foo'
    __main__:1: UnicodeWarning: Implicit conversion of str to unicode
    True

But be aware that this module is very noisy and has a noticeable runtime
overhead.

What is a String?
-----------------

Here a table of things that are bytestrings and what they usually become
in Python 3:

+-------------------------+----------------------------------------------+
| Type                    | Type in Python 3 *(unicode == str)*          |
+=========================+==============================================+
| identifiers             | `unicode`                                    |
+-------------------------+----------------------------------------------+
| Docstrings              | `unicode`                                    |
+-------------------------+----------------------------------------------+
| `__repr__`              | `unicode`                                    |
+-------------------------+----------------------------------------------+
| string keys of          | `unicode`                                    |
| dictionaries            |                                              |
+-------------------------+----------------------------------------------+
| WSGI environment keys   | `unicode`                                    |
+-------------------------+----------------------------------------------+
| HTTP header values,     | `unicode`, limited to ASCII in 3.1 and       |
| WSGI environment values | limited to latin1 in 3.2                     |
+-------------------------+----------------------------------------------+
| URLs                    | `unicode`, but some APIs also accept byte    |
|                         | strings.  Special attention: your URLs have  |
|                         | to be encoded in UTF-8 in order to use all   |
|                         | of the standard library functions.           |
+-------------------------+----------------------------------------------+
| Filenames               | `unicode` or `bytes`.  Most APIs accept both |
|                         | but implicit conversions are not supported.  |
+-------------------------+----------------------------------------------+
| Binary contents         | `bytes` or `bytearray`.  Beware: the second  |
|                         | type is mutable, so be aware of the fact     |
|                         | that you can have a string-ish object that   |
|                         | is mutable.                                  |
+-------------------------+----------------------------------------------+
| Python code             | `unicode`.  You have to decode the source    |
|                         | yourself when you pass it over to `exec`.    |
+-------------------------+----------------------------------------------+

Latin1 is Special
-----------------

In some places (WSGI for instance) there is now the notion of unicode
strings that must only be a subset of latin1.  That's the case because the
HTTP spec is not very clear on encodings and it was decided to assume
latin1 to be safe.  If you control both ends of the communication (like
you do with cookies) you can of course use utf-8 if you like.  So how does
this work if the header is limited to latin1?  For Python 3 (and only for
Python 3) you will need to apply a little trick:

.. sourcecode:: python

    return cookie_value.encode('utf-8').decode('latin1')

That way you just fake encoded utf-8 into a unicode string.  The WSGI
layer will then again encode this string as latin1 and you are
transmitting wrong utf-8 as latin1 over the wire.  If you do the inverse
of that trick on the receiving end it will work.

That's of course ugly, but that's pretty much how utf-8 in headers already
worked.  And it's really just the cookie header that is affected by that,
and that header was unreliable anyways.

The only other place in WSGI where this will become an issue is the
`PATH_INFO` / `SCRIPT_NAME` tuple, but your framework should figure that
out for you when it's working on Python 3.
