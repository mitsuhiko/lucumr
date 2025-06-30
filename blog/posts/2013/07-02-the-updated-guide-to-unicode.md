---
tags:
  - python
  - unicode
summary: An updated guide on how to deal with unicode on Python 2 and 3.
---

# The Updated Guide to Unicode on Python

I figured that it might be the right time to do an updated introduction to
unicode in Python.  Primarily because the unicode chapter got a whole lot
of new confusing chapters on Python 3 that a developer needs to know.

Let's start first with how unicode worked on Python 2.

## Unicode on Python 2

Unicode on Python 2 is a fairly simple thing.  There are two types of
string literals: bytestrings (look like this on 2.x: `'foo'`) and
unicode strings (which have a leading `u` prefix like this: `u'foo'`).
Since 2.6 you can also be explicit about bytestrings and write them with a
leading `b` prefix like this: `b'foo'`.

Python 2's biggest problem with unicode was that some APIs did not support
it.  The most common ones were many filesystem operations, the datetime
module, the csv reader and quite a few interpreter internals.  In addition
to that a few APIs only ever worked with non unicode strings or caused a
lot of confusion if you introducted unicode.  For instance docstrings
break some tools if they are unicode instead of bytestrings, the return
value of `__repr__` must only ever be bytes and not unicode strings etc.

Aside from that Python had one feature that usually confused developers: a
byte string for as long as it only contained ASCII characters could be
upgraded to a unicode string implicitly.  If however it was not ASCII safe
it would have caused some form of `UnicodeError`.  Either a
`UnicodeEncodeErrror` or a `UnicodeDecodeError` depending on when it
failed.

Because of all that the rule of thumb on 2.x was this:

- the first time you know your encoding properly decode from bytes into
unicode.

- when it's most convenient for you and you know the target encoding,
encode back to bytes.

- internally feel free to use bytes literals for as long as they are
restricted to the ascii subset.

This worked really well for many 2.x libraries.  On Flask for instance you
will only encounter unicode issues if you try to pass byte string literals
with non ascii characters to the templates or if you try to use Flask with
APIs that do not support unicode.  Aside from that it takes a lot of work
to create a unicode error.

This is accomplished because the whole WSGI layer is byte based and the
whole Flask layer is unicode based (for text).  As such Flask just does
the encoding when it transfers from WSGI over to Flask.  Likewise the
return value is inspected and if the return type is unicode it will
automatically encode it before handling data back to the WSGI layer.

## Basic Unicode on Python 3

On Python 3 two things happened that make unicode a whole lot more
complicated.  The biggest one is that the bytestring was removed.  It was
replaced with an object called `bytes` which is created by the Python 3
bytes syntax: `b'foo'`.  It might look like a string at first, but it's
not.  Unfortunately it does not share much of the API with strings.

The following code example shows that the bytes object is very different
of the string object indeed:

```pycon
>>> 'key=%s' % 'value'
'key=value'
>>> 'key=%s' % b'value'
"key=b'value'"
>>> b'key=%s' % b'value'
Traceback (most recent call last):
  File "<stdin>", line 1, in <module>
TypeError: unsupported operand type(s) for %: 'bytes' and 'bytes'
>>> str(10)
'10'
>>> bytes(10)
b'\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00'
>>> list('foo')
['f', 'o', 'o']
>>> list(b'foo')
[102, 111, 111]
>>> 'foo' == b'foo'
False
```

One could argue that that's fine, because you will no longer mix bytes and
unicode, but unfortunately that's not the case.  The reason for this is
that a whole bunch of APIs work on bytes and unicode strings
interchangeably.  For instance all the file system APIs operate on both
unicode and bytes:

```pycon
>>> os.listdir('/tmp/test')
['Scheiß_Encoding']
>>> os.listdir(b'/tmp/test')
[b'Schei\xc3\x9f_Encoding']
```

That might not seem like a big deal at first, but APIs have the attitude
of spreading further.  For instance opening a file will set the name
attribute to a “string” of that type:

```pycon
>>> open(b'/tmp/test/Schei\xc3\x9f_Encoding').name
b'/tmp/test/Schei\xc3\x9f_Encoding'
```

As a result every user of the `.name` attribute will have to force it to
the right type before interacting with it.  The same thing also has been
true on 2.x, however on 3.x this behavior is mostly undocumented.

It's not just file operations, it also happens on other APIs like the
urllib parsing module which can produce both bytes and unicode strings:

```pycon
>>> x.parse_qs(b'foo=bar')
{b'foo': [b'bar']}
>>> x.parse_qs('foo=bar')
{'foo': ['bar']}
```

## Magic Defaults in 3.x

Python 3 unfortunately made a choice of guessing a little bit too much
with unicode in some places.  When I asked the question at one conference
before about what people believe the default encoding for text files on
Python 3 was, most were replying UTF-8.  This is correct on some operating
systems.  It's definitely true for OS X and it's true for most linux
distributions I tried.  However how does Python determine that encoding?
The answer is by looking into the locale settings in the environment
variables.

Unfortunately those break very quickly.  A good example for instance is
SSH'ing from a german locale into a US linux box that does not support the
german locale.  Linux will then attempt to set the locale and fails, and
default to `C` which is ASCII.  Python then very happily opens a file in
ASCII mode.  Here is the logic that Python applies to guessing the default
encoding on files:

1. it first starts out finding the device the file is located on and will
try to get the encoding from that device.  This function currently
only ever does something for terminals.  As far as I know this only
ever does something really interesting on windows where it might
return a codepage (which totally is not unicode, but that's expected).

1. The same function that finds out the device encoding might also call
`nl_langinfo(CODESET)` which returns the current encoding that the
locale system is aware of.  Traditionally the locale support was not
initialized on the Python interpreter but it definitely gets
initialized somewhere.  This call is also the one that can fail when a
locale is not available but set (SSH example from above).

1. If for whatever reason `device_encoding` does not return anything
(for instance because the device was not a terminal) it will try to
import the locale module (which BTW is written in Python, always
interesting to see when the stuff written in C imports a Python
module) and call into the `locale.getpreferredencoding` function and
use the return value of that.

Because it does not set the locale there it basically only calls into
`nl_langinfo(CODESET)` again.  Because that call sometimes fails on OS X
it converts the return value for OS X into utf-8 if it does not get a
useful result otherwise.

I am not a fan of that behavior and I strongly recommend explicitly
passing the encoding of text files as third parameter.  That's how we did
it on 2.x and that's also how I recommend doing it on Python 3.  I really
wish the default encoding was changed to utf-8 in all cases except for
terminal devices and maybe have some encoding='auto' flag that guesses.

I failed installing a package on python 3 a while ago because a
contributor name was containing a non ASCII name and the setup.py file was
opening the README file for the docstring.  Worked fine on OS X and normal
Linux, but broke hard when I SSH'ed into my Linux box from an Austrian OS
X.  I am not sure how many people run into that (I assume not a lot) but
it's annoying when it happens and there is literally nothing that
guarantees that a file opened in text mode and without a defined encoding
is UTF-8.  So do the world a favor and open text files like this:

```python
with open(filename, 'r', encoding='utf-8') as f:
    ...
```

## Different Types of Unicode Strings

In addition to regular unicode strings, on Python 3 you have to deal with
two additional types of unicode strings.  The reason for this is that
a library (or the Python interpreter) does not have enough knowledge about
the encoding so it has to apply some tricks.  Where in Python 2.x we made
a string stick to being bytes in that case, on Python 3 there are two more
choices you have.  These strings don't have proper names and look like
regular unicode strings, so I am going to give them names for the sake of
the argument.  Let's call the regular unicode string a “text” string.
Each character in that string is correctly internally represented and no
surprises are to be expected.

In addition to that there are strings I would call “transport decoded”
strings.  Those strings are used in a few places.  The most common case
where you are dealing with those strings is the WSGI protocol and most
things that interface with HTTP.  WSGI declares that strings in the WSGI
environment are represented as incorrectly decoded latin1 strings.  In
other words what happens is that all unicode strings in the Python 3 WSGI
environment are actually incorrectly encoded for any codepoint above
ASCII.  In order to properly decode that strings you will need to encode
the string back to latin 1 and decode from the intended encoding.
Werkzeug internally refers to such strings as “dance encoded” strings.
The following logic has to be applied to properly re-decode them to the
actual character set:

```python
def wsgi_decoding_dance(s, charset='utf-8', errors='replace'):
    return s.encode('latin1').decode(charset, errors)

def wsgi_encoding_dance(s, charset='utf-8', errors='replace'):
    if isinstance(s, bytes):
        return s.decode('latin1', errors)
    return s.encode(charset).decode('latin1', errors)
```

This logic is not just required for WSGI however, the same requirement
comes up for any MIME and HTTP header.  Theoretically it's not a problem
for these headers because they are limited to latin1 out of the box and
use explicit encoding information if a string does not fit into latin1.
Unfortunately in practical terms it's not uncommon for certain headers to
be utf-8 encoded.  This is incredibly common with custom headers emitted
by applications as well as the cookie headers if the cookie header is set
via JavaScript as the browser API does not provide automatic encoding.

The second string type that is common on Python 3 is the “surrogate
escaped string”.  These are unicode strings that cannot be encoded to an
unicode encoding because they are actually invalid.  These strings are
created by APIs that think an encoding is a specific one but cannot
guarantee it because the underlying system does not fully enforce that.
This functionality is provided by the `'surrogateescape'` error handler:

```pycon
>>> letter = '\N{LATIN CAPITAL LETTER U WITH DIAERESIS}'.encode('latin1')
>>> decoded_letter = letter.decode('utf-8', 'surrogateescape')
>>> decoded_letter
'\udcdc'
```

This is for instance happening for `os.environ` as well as all the
unicode based filesystem functions.  If you try to encode such a string to
`utf-8` for instance you will receive an `UnicodeEncodeError`:

```pycon
>>> decoded_letter.encode('utf-8')
Traceback (most recent call last):
  File "<stdin>", line 1, in <module>
UnicodeEncodeError: 'utf-8' codec can't encode character
  '\udcdc' in position 0: surrogates not allowed
```

To solve this problem you need to encode such strings with the encoding
error handling set to `'surrogateescape'`.  As an extension this means
that strings received from functions that might carry surrogates need to
be resolved before passed to APIs not dealing with such strings.

This primarily means that you have two options: change all your
`encode()` errorhandling anywhere in your codebase from `'strict'`
(which is the default) to `'surrogateescape'` or remove surrogates from
your strings.  The easiest form I believe is going through a encode/decode
dance.  I believe that currently that's also the only simple way to check
if something was indeed surrogate escaped.

My suggestion is that every time you deal with an API that might produce
surrogate escaped strings (`os.environ` etc.) you should just do a basic
check if the value is surrogate escaped and raise an error (or remove the
surrogate escaping and call it a day).  But don't forward those strings
onwards as it will make it very painful to figure out what's wrong later.

If you for instance pass such a string to a template engine you will get
an error somewhere else entirely and because the encoding happens at a
much later stage you no longer know why the string was incorrect.  If you
detect that error when it happens the issue becomes much easier to debug
(basically restores 2.x behavior).

These functions might be useful:

```python
def remove_surrogate_escaping(s, method='ignore'):
    assert method in ('ignore', 'replace'), 'invalid removal method'
    return s.encode('utf-8', method).decode('utf-8')

def is_surrogate_escaped(s):
    try:
        s.encode('utf-8')
    except UnicodeEncodeError as e:
        if e.reason == 'surrogates not allowed':
            return True
        raise
    return False
```

Both “transport decoded” and “surrogate escaped” strings are the same type
as regular strings so the best way to keep them apart is memorize where
they come from.  In Werkzeug I wrote helper functions that fetch the
strings from their container (WSGI environ) and immediately decode them so
that a user never has to deal with the low level details.

The following interfaces produce some of those strings:

API

String Type

`os.environ`

surrogate escaped

`os.listdir`

surrogate escaped

WSGI environ

transport decoded (*latin1*)

HTTP/MIME headers

transport decoded (*latin1*)

`email` text payload

surrogate escaped

`nntplib` all data

surrogate escaped

`os.exec*` functions

surrogate escaped (except on windows)

`subprocess` environ

surrogate escaped (except on windows)

`subprocess` arguments

surrogate escaped (except on windows)

There are also some special cases in the stdlib where strings are very
confusing.  The `cgi.FieldStorage` module which WSGI applications are
sometimes still using for form data parsing is now treating
`QUERY_STRING` as surrogate escaping, but instead of using utf-8 as
charset for the URLs (as browsers) it treats it as the encoding returned
by `locale.getpreferredencoding()`.  I have no idea why it would do
that, but it's incorrect.  As workaround I recommend not using
`cgi.FieldStorage` for query string parsing.

Unfortunately the docs generally are very quiet about where they are using
surrogate escaping or not.  Generally the best way is to look at the
source currently.

## Detecting Errors

On Python 2.x detecting misuse of Unicode was quite simple.  Generally if
you did dodgy things you got some form of `UnicodeError` or
`UnicodeWarning`.  Usually you either got a fatal `UnicodeEncodeError`
or `UnicodeDecodeError` or you got logged a `UnicodeWarning`.  The
latter for instance happened when comparing bytes and unicode where the
bytes could not be decoded from ASCII.  On Python 3 the situation looks
very different unfortunately.

- `AttributeError`: this usually happens if you try to use a string
only API on a bytes object.  Usually this happens for calls to
`casefold()`, `encode()`, or `format()`.

- `TypeError`: this can happen for a variety of different reasons.
The most common one is string formatting which does not work on bytes.
If you try to do `foo % bar` and `foo` turns out to be a bytes
object you will get a `TypeError`.  Another form of this is that
something iterates over a string and expects a one-character string to
be returned but actually an integer is produced.

- `UnicodeEncodeError`: usually happens now due to surrogate escaping
problems when you're not using the `'surrogateescape'` error handler
on encoding strings or forget to remove surrogates from strings.

- garbled unicode: happens if you're not dealing with transport decoded
strings properly.  This usually happens with WSGI.  The best to catch
this is to never expose WSGI strings directly and always go through an
extra level of indirection.  That way you don't accidentally mix
unicode strings of different types.

- no error: that happens for instance when you compare bytes and strings
and the comparison will just return `False` without giving a
warning.  This can be remedied by running the Python interpreter with
the `-b` flag which will emit warnings for bytes and text
comparisons.

- running out of memory / huge strings: this happens when you try to
pass a large integer to the `bytes()` constructor.  I have seen this
happen a few times when porting to Python 3 where the pattern was a
form of “if object not an instance of bytes, call `bytes()` on it”.
This is dangerous because integers are valid input values to the
`bytes()` constructor that will allocate as many null bytes as
the integer passed.  The recommendation there is to stop using that
pattern and write a `soft_bytes` function that catches integer
parameters before passing it to `bytes`.

## Writing Unicode/Bytes Combination APIs

Because there are so many cases where an API can return both bytes or
unicode strings depending on where they come from, new patterns need to be
created.  In Python 2 that problem solved itself because bytestrings were
promoted to unicode strings automatically.  On Python 3 that is no longer
the case which makes it much harder to implement with APIs that do both.

Werkzeug and Flask use the following helpers to provide (or work with)
APIs that deal with both strings and bytes:

```python
def normalize_string_tuple(tup):
    """Ensures that all types in the tuple are either strings
    or bytes.
    """
    tupiter = iter(tup)
    is_text = isinstance(next(tupiter, None), str)
    for arg in tupiter:
        if isinstance(arg, str) != is_text:
            raise TypeError('Cannot mix str and bytes arguments (got %s)'
                % repr(tup))
    return tup

def make_literal_wrapper(reference):
    """Given a reference string it returns a function that can be
    used to wrap ASCII native-string literals to coerce it to the
    given string type.
    """
    if isinstance(reference, str):
        return lambda x: x
    return lambda x: x.encode('ascii')
```

These functions together go quite far to make APIs work for both strings
and bytes.  For instance this is how URL joining works in Werkzeug which
is enabled by the `normalize_string_tuple` and `make_literal_wrapper`
helpers:

```python
def url_unparse(components):
    scheme, netloc, path, query, fragment = \
        normalize_string_tuple(components)
    s = make_literal_wrapper(scheme)
    url = s('')
    if netloc or (scheme and path.startswith(s('/'))):
        if path and path[:1] != s('/'):
            path = s('/') + path
        url = s('//') + (netloc or s('')) + path
    elif path:
        url += path
    if scheme:
        url = scheme + s(':') + url
    if query:
        url = url + s('?') + query
    if fragment:
        url = url + s('#') + fragment
    return url
```

This way the function only needs to be written once for handling both
bytes and strings which is in my mind a nicer solution than what the
standard library does which is implementing every function twice which
means a lot of copy/pasting.

Another problem is wrapping file objects in Python 3 because they now only
support either texts or bytes but there is no documented interface to
figure out what they accept.  Flask uses the following workaround:

```python
def is_text_reader(s):
    """Given a file object open for reading this function checks if
    the reader is text based.
    """
    return type(s.read(0)) is str

def is_bytes_reader(s):
    """Given a file object open for reading this function checks if
    the reader is bytes based.
    """
    return type(s.read(0)) is bytes

def is_text_writer(s):
    """Given a file object open for writing this function checks if
    the reader is text based.
    """
    try:
        s.write('')
        return True
    except TypeError:
        return False

def is_bytes_writer(s):
    """Given a file object open for writing this function checks if
    the reader is bytes based.
    """
    try:
        s.write(b'')
        return True
    except TypeError:
        return False
```

For instance Flask uses this to make JSON work with both text and bytes
again similar to how it worked in 2.x:

```python
import io
import json as _json

def load(fp, **kwargs):
    encoding = kwargs.pop('encoding', None) or 'utf-8'
    if is_bytes_reader(fp):
        fp = io.TextIOWrapper(io.BufferedReader(fp), encoding)
    return _json.load(fp, **kwargs)

def dump(obj, fp, **kwargs):
    encoding = kwargs.pop('encoding', None)
    if encoding is not None is_bytes_reader(fp):
        fp = io.TextIOWrapper(fp, encoding)
    _json.dump(obj, fp, **kwargs)
```

## Unicode is Hard

Unicode is still hard, and in my experience it's not much easier on 3.x
than it was on 2.x.  While the transition forced me to make some APIs work
better with unicode (and now more correct) I still had to add a lot of
extra code that was not necessary on Python 2.  If someone does another
dynamic language in the future I believe the correct solution would have
been this:

1. take the approach of Python 2.x and allow mixing of bytes and unicode
strings.

1. Make `'foo'` mean unicode strings and `b'foo'` mean byte strings.

1. Make byte strings have an encoding attribute that defaults to
`ASCII`

1. Add a method to replace the encoding information (eg:
`b'foo'.replace_encoding_hint('latin1')`

1. When comparing strings and bytes use the encoding hint instead of the
ASCII default (or more correct system default encoding which for
better or worse was always ASCII).

1. Have a separate `bytes` type that works exactly like strings
that is not hashable and cannot carry encoding information and
generally just barks when trying to convert it to strings.  That way
you can tag true binary data which can be useful sometimes (for
instance for serialization interfaces).

If someone wants to see how much complexity the new unicode support in
Python 3 caused have a look at the code of the `os` module on 3.x, the
internal `io` module file operation utilities and things like
`urllib.parse`.

On the bright side: nothing changes much for high level users of Python.
I think Flask provides for instance a painless experience for unicode on
both 2.x and 3.x.  Users are almost entirely shielded from the
complexities of unicode handling.  The higher level the API, the fewer
does encoding play a role in it.
