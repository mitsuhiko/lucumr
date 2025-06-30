---
tags: ['thoughts', 'python']
summary: "Some updated tips for porting software to Python 3."
---

# Porting to Python 3 Redux

After a very painful porting experience with Jinja2 to Python 3 I
basically left the project idling around for a while because I was too
afraid of breaking Python 3 support.  The approach I used was one codebase
that was written in Python 2 and translated with 2to3 to Python 3 on
installation.  The unfortunate side-effect of that is that any change you
do requires about a minute of translation which destroys all your
iteration speeds.  Thankfully it turns out that if you target the right
versions of Python you can do much better.

Thomas Waldmann from the MoinMoin project started running Jinja2 through
my [python-modernize](https://github.com/mitsuhiko/python-modernize)
with the right parameters and ended up with a unified codebase that runs
on 2.6, 2.7 and 3.3.  With a bit of cleanup afterwards we were able to
come up with a nice codebase that runs in all versions of Python and also
looks like regular Python code for the most time.

Motivated by the results from this I went through the code a few more
times and also started migrating some other code over to experiment more
with unified codebases.

This is a selection of some tips and tricks I can now share in regards to
accomplishing something similar.

## Drop 2.5, 3.1 and 3.2

This is the most important tip.  Dropping 2.5 by now is more than possible
since very few people are still on it and dropping 3.1 and 3.2 are no
brainers anyways considering the low adoption of Python 3 so far.  But why
would you drop those versions?  The basic answer is that 2.6 and 3.3 have
a lot of overlapping syntax and features that allow for code that works
well with both:

- Compatible string literals.  2.6 and 3.3 support the same syntax for
strings.  You can use `'foo'` to refer to a native string (byte
string on 2.x and a Unicode string on 3.x), `u'foo'` to refer to a
Unicode string and `b'foo'` to refer to a bytestring or bytes
object.

- Compatible print syntax.  In case you have a few print statements
sitting around you can `from __future__ import print_function` and
start using the print function without having to bind it to a
different name or suffering from other inconsistencies.

- Compatible exception catching syntax.  Python 2.6 introduced `except
Exception as e` which is also the syntax used on 3.x to catch down
exceptions.

- Class decorators are available.  They are incredible useful to
automatically correct moved interfaces without leaving a footprint in
the class structure.  For instance they can be used to automatically
rename the iteration method from `next` to `__next__` or
`__str__` to `__unicode__` for Python 2.x.

- Builtin `next()` function to invoke `__next__` or `next`.  This
is helpful because they are performing about the same speed as calling
the method directly so you don't pay much of a performance penalty
compared to putting runtime checks into places or making a wrapper
function yourself.

- Python 2.6 added the `bytearray` type which has the same interface
in that version of Python as the one in 3.3.  This is useful because
while Python 2.6 lacks the Python 3.3 `bytes` object it does have
a builtin with that name but that's just another name for `str`
which has vastly different behavior.

- Python 3.3 reintroduces bytes-to-bytes and string-to-string codecs
that were broken in 3.1 and 3.2.  Unfortunately the interface for them
is clunkier now and the aliases are missing, but it's much closer to
what we had in 2.x than before.

This is particularly useful if you did stream based encoding and
decoding.  That functionality was plain missing between 3.0 up until
3.3.

Yes, the `six` module can get you quite far, but don't underestimate the
impact of looking at nice code.  With the Python 3 port I basically lost
interest in maintaining Jinja2 because the codebase started to frustrate
me.  Back then a unified codebase was looking ugly and had a performance
impact (`six.b('foo')` and `six.u('foo')` everywhere) or was plagued
under the bad iteration speeds of 2to3.  Not having to deal with any of
that brings the joy back.  Jinja2's codebase now looks like very clean and
you have to find the Python 2/3 compatibility support.  Very few paths in
the code actually do something like `if PY2:`.

The rest of this article assumes that these are the Python versions you
want to support.  Also attempting to support Python 2.5 is a very painful
thing to do and I strongly recommend against it.  Supporting 3.2 is
possible if you are willing to wrap all your strings in function calls
which I don't recommend doing for aesthetic and performance reasons.

## Skip Six

Six is a pretty neat library and this is where the Jinja2 port started out
with.  There however at the end of the day there is not much in six that
actually is required for getting a Python 3 port running and a few things
are missing.  Six is definitely required if you want to support Python 2.5
but from 2.6 or later there really is not much of a reason to use six.
Jinja2 ships a `_compat` module that contains the few helpers required.
Including a few lines of non Python 3 code the whole compatibility module
is less than 80 lines of code.

This saves you from the troubles where users might expect a different
version of six because of another library or pulling in another dependency
into your project.

## Start with Modernize

To start with the port the [python-modernize](https://github.com/mitsuhiko/python-modernize) library is a good start.
It is a version of 2to3 that produces code that runs in either.  While
it's pretty buggy still and the default options are not particularly
great, it can get you quite far with regards to doing the boring parts for
you.  You will still need to go over the result and clean up some imports
and ugly results.

## Fix your Tests

Before you do anything else walk through your tests and make sure that
they still make sense.  A lot of the problems in the Python standard
library in 3.0 and 3.1 came from the fact that the behavior of the
testsuite changed through the conversion to Python 3 in unintended ways.

## Write a Compatibility Module

So you're going to skip six, can you live without helpers?  The answer is
“no”.  You will still need a small compatibility module but that is small
enough that you can just keep it in your package.  Here are some basic
examples of what such a compatibility module could look like:

```python
import sys
PY2 = sys.version_info[0] == 2
if not PY2:
    text_type = str
    string_types = (str,)
    unichr = chr
else:
    text_type = unicode
    string_types = (str, unicode)
    unichr = unichr
```

The exact contents of that module will depend on how much actually changed
for you.  In case of Jinja2 I put a whole bunch of functions in there.
For instance it contains `ifilter`, `imap` and similar itertools functions
that became builtins in 3.x.  (I stuck with the Python 2.x functions to
make it clear for the reader of the code that the iterator behavior is
intended and not a bug).

## Test for 2.x not 3.x

At one point there will be the requirement to check if you are executing
on 2.x or 3.x.  In that cases I would recommend checking for Python 2
first and putting Python 3 into your else branch instead of the other way
round.  That way you will have less ugly surprises when a Python 4 comes
around at one point.

Good:

```python
if PY2:
    def __str__(self):
        return self.__unicode__().encode('utf-8')
```

Less ideal:

```python
if not PY3:
    def __str__(self):
        return self.__unicode__().encode('utf-8')
```

## String Handling

The biggest change in Python 3 is without doubt the changes on the Unicode
interface.  Unfortunately these changes are very painful in some places
and also inconsistently handled throughout the standard library.  The
majority of the time porting will clearly be wasted on this topic.  This
topic is a whole article by itself but here is a quick cheat sheet for
porting that Jinja2 and Werkzeug follow:

- `'foo'` always refers to what we call the native string of the
implementation.  This is the string used for identifiers, sourcecode,
filenames and other low-level functions.  Additionally in 2.x it's
permissible as a literal in Unicode strings for as long as it's
limited to ASCII only characters.

This property is very useful for unified codebases because the general
trend with Python 3 is to introduce Unicode in some interfaces that
previously did not support it, but never the inverse.  Since native
string literals “upgrade” to Unicode but still somewhat support
Unicode in 2.x this string literal is very flexible.

For instance the `datetime.strftime` function strictly does not
support Unicode in Python 2 but is Unicode only in 3.x.  Because in
most cases the return value on 2.x however was ASCII only things like
this work really well in 2.x and 3.x:

```pycon
>>> u'<p>Current time: %s' % datetime.datetime.utcnow().strftime('%H:%M')
u'<p>Current time: 23:52'
```

The string passed to `strftime` is native (so bytes in 2.x and Unicode
in 3.x).  The return value is a native string again and ASCII only.
As such both on 2.x and 3.x it will be a Unicode string once string
formatted.

- `u'foo'` always refers to a Unicode string.  Many libraries already
had pretty excellent Unicode support in 2.x so that literal should not
be surprising to many.

- `b'foo'` always refers to something that can hold arbitrary bytes.
Since 2.6 does not actually have a `bytes` object like Python 3.3
has and Python 3.3 lacks an actual bytestring the usefulness of this
literal is indeed a bit limited.  It becomes immediately more useful
when paired with the `bytearray` object which has the same interface
on 2.x and 3.x:

```pycon
>>> bytearray(b' foo ').strip()
bytearray(b'foo')
```

Since it's also mutable it's quite efficient at modifying raw bytes
and you can trivially convert it to something more conventional by
wrapping the final result in `bytes()` again.

In addition to these basic rules I also add `text_type`, `unichr`
and `string_types` variables to my compatibility module as shown above.
With those available the big changes are:

- `isinstance(x, basestring)` becomes `isinstance(x, string_types)`.

- `isinstance(x, unicode)` becomes `isinstance(x, text_type)`.

- `isinstance(x, str)` with the intention of catching bytes becomes
`isinstance(x, bytes)` or `isinstance(x, (bytes, bytearray))`.

I also created a `implements_to_string` class decorator that helps
implementing classes with `__unicode__` or `__str__` methods:

```python
if PY2:
    def implements_to_string(cls):
        cls.__unicode__ = cls.__str__
        cls.__str__ = lambda x: x.__unicode__().encode('utf-8')
        return cls
else:
    implements_to_string = lambda x: x
```

The idea is that you just implement `__str__` on both 2.x and 3.x and
let it return Unicode strings (yes, looks a bit odd in 2.x) and the
decorator automatically renames it to `__unicode__` for 2.x and adds a
`__str__` that invokes `__unicode__` and encodes the return value to
utf-8.  This pattern has been pretty common in the past with 2.x modules.
For instance Jinja2 and Django use it.

Here is an example for the usage:

```python
@implements_to_string
class User(object):
    def __init__(self, username):
        self.username = username
    def __str__(self):
        return self.username
```

## Metaclass Syntax Changes

Since Python 3 changed the syntax for defining the metaclass to use in an
incompatible way this makes porting a bit harder than it should be.  Six
has a `with_metaclass` function that can work around this issue but it
generates a dummy class that shows up in the inheritance tree.  For Jinja2
I was not happy enough with that solution and modified it a bit.  The
external API is the same but the implementation uses a temporary class
to hook in the metaclass.  The benefit is that you don't have to pay a
performance penalty for using it and your inheritance tree stays nice.

The code is a bit hard to understand.  The basic idea is exploiting the
idea that metaclasses can customize class creation and are picked by by
the parent class.  This particular implementation uses a metaclass to
remove its own parent from the inheritance tree on subclassing.  The end
result is that the function creates a dummy class with a dummy metaclass.
Once subclassed the dummy classes metaclass is used which has a
constructor that basically instances a new class from the original parent
and the actually intended metaclass.  That way the dummy class and dummy
metaclass never show up.

This is what it looks like:

```python
def with_metaclass(meta, *bases):
    class metaclass(meta):
        __call__ = type.__call__
        __init__ = type.__init__
        def __new__(cls, name, this_bases, d):
            if this_bases is None:
                return type.__new__(cls, name, (), d)
            return meta(name, bases, d)
    return metaclass('temporary_class', None, {})
```

And here is how you use it:

```python
class BaseForm(object):
    pass

class FormType(type):
    pass

class Form(with_metaclass(FormType, BaseForm)):
    pass
```

## Dictionaries

One of the more annoying changes in Python 3 are the changes on the
dictionary iterator protocols.  In Python 2 all dictionaries had
`keys()`, `values()` and `items()` that returned lists and
`iterkeys()`, `itervalues()` and `iteritems()` that returned
iterators.  In Python 3 none of that exists any more.  Instead they were
replaced with new methods that return view objects.

`keys()` returns a key view which behaves like some sort of read-only
set, `values()` which returns a read-only container and iterable (not an
iterator!) and `items()` which returns some sort of read-only set-like
object.  Unlike regular sets it however can also point to mutable objects
in which case some methods will fail at runtime.

On the positive side a lot of people missed that views are not iterators
so in many cases you can just ignore that.  Werkzeug and Django implement
a bunch of custom dictionary objects and in both cases the decision was
made to just ignore the existence of view objects and let `keys()` and
friends return iterators.

This is currently the only sensible thing to do due to limitations of the
Python interpreter.  There are a few problems with it:

- The fact that the views are not iterators by themselves mean that in
the average case you create a temporary object for no good reason.

- The set-like behavior of the builtin dictionary views cannot be
replicated in pure Python due to [limitations in the interpreter](http://bugs.python.org/issue2226).

- Implementing views for 3.x and iterators for 2.x would mean a lot of
code duplication.

This is what the Jinja2 codebase went with for iterating over
dictionaries:

```python
if PY2:
    iterkeys = lambda d: d.iterkeys()
    itervalues = lambda d: d.itervalues()
    iteritems = lambda d: d.iteritems()
else:
    iterkeys = lambda d: iter(d.keys())
    itervalues = lambda d: iter(d.values())
    iteritems = lambda d: iter(d.items())
```

For implementing dictionary like objects a class decorator can become
useful again:

```python
if PY2:
    def implements_dict_iteration(cls):
        cls.iterkeys = cls.keys
        cls.itervalues = cls.values
        cls.iteritems = cls.items
        cls.keys = lambda x: list(x.iterkeys())
        cls.values = lambda x: list(x.itervalues())
        cls.items = lambda x: list(x.iteritems())
        return cls
else:
    implements_dict_iteration = lambda x: x
```

In that case all you need to do is to implement the `keys()` and friends
method as iterators and the rest happens automatically:

```python
@implements_dict_iteration
class MyDict(object):
    ...

    def keys(self):
        for key, value in iteritems(self):
            yield key

    def values(self):
        for key, value in iteritems(self):
            yield value

    def items(self):
        ...
```

## General Iterator Changes

Since iterators changed in general a bit of help is needed to make this
painless.  The only change really is the transition from `next()` to
`__next__`.  Thankfully this is already transparently handled.  The only
thing you really need to change is to go from `x.next()` to `next(x)`
and the language does the rest.

If you plan on defining iterators a class decorator again becomes helpful:

```python
if PY2:
    def implements_iterator(cls):
        cls.next = cls.__next__
        del cls.__next__
        return cls
else:
    implements_iterator = lambda x: x
```

For implementing this class just name the iteration step method
`__next__` in all versions:

```python
@implements_iterator
class UppercasingIterator(object):
    def __init__(self, iterable):
        self._iter = iter(iterable)
    def __iter__(self):
        return self
    def __next__(self):
        return next(self._iter).upper()
```

## Transformation Codecs

One of the nice features of the Python 2 encoding protocol was that it was
independent of types.  You could register an encoding that would transform
a csv file into a numpy array if you would have preferred that.  This
feature however was not well known since the primary exposed interface of
encodings was attached to string objects.  Since they got stricter in 3.x
a lot of that functionality was removed in 3.0 but later reintroduced in
3.3 again since it proved useful.  Basically all codecs that did not
convert between Unicode and bytes or the other way round were unavailable
until 3.3.  Among those codecs are the hex and base64 codec.

There are two use cases for those codecs: operations on strings and
operations on streams.  The former is well known as `str.encode()` in
2.x but now looks different if you want to support 2.x and 3.x due to the
changed string API:

```pycon
>>> import codecs
>>> codecs.encode(b'Hey!', 'base64_codec')
'SGV5IQ==\n'
```

You will also notice that the codecs are missing the aliases in 3.3 which
requires you to write `'base64_codec'` instead of `'base64'`.

(These codecs are preferable over the functions in the `binascii` module
because they support operations on streams through the [incremental
encoding and decoding support](http://docs.python.org/3/library/codecs.html#incrementalencoder-objects).)

## Other Notes

There are still a few places where I don't have nice solutions for yet or
are generally annoying to deal with but they are getting fewer.  Some of
them are unfortunately now part of the Python 3 API are hard to discover
until you trigger an edge case.

- Filesystem and file IO access continues to be annoying to deal with on
Linux due to it not being based on Unicode.  The `open()` function
and the filesystem layer have dangerous platform specific defaults.
If I SSH into a `en_US` machine from an `de_AT` one for instance
Python loves falling back to ASCII encoding for both file system and
file operations.

Generally I noticed the most reliable way to do text on Python 3 that
also works okay on 2.x is just to open files in binary mode and
explicitly decode.  Alternatively you can use the `codecs.open` or
`io.open` function on 2.x and the builtin `open` on Python 3 with
an explicit encoding.

- URLs in the standard library are represented incorrectly as Unicode
which causes some URLs to not be dealt with correctly on 3.x.

- Raising exceptions with a traceback object requires a helper function
since the syntax changed.  This is very uncommon in general and easy
enough to wrap.  Since the syntax changed this is one of the
situations where you will have to move code into an exec block:

```python
if PY2:
    exec('def reraise(tp, value, tb):\n raise tp, value, tb')
else:
    def reraise(tp, value, tb):
        raise value.with_traceback(tb)
```

- The previous `exec` trick is useful in general if you have some code
that depends on different syntax.  Since exec itself has a different
syntax now you won't be able to use it to execute something against an
arbitrary namespace.  This is not a huge deal because `eval` with
`compile` can be used as a drop-in that works on both versions.
Alternatively you can bootstrap an `exec_` function through `exec`
itself.

```python
exec_ = lambda s, *a: eval(compile(s, '<string>', 'exec'), *a)
```

- If you have a C module written on top of the Python C API: shoot
yourself.  There is no tooling available for that yet from what I know
and so much stuff changed.  Take this as an opportunity to ditch the
way you build modules and redo it on top of [cffi](https://cffi.readthedocs.org/en/release-0.6/) or `ctypes`.  If
that's not an option because you're something like numpy then you will
just have to accept the pain.  Maybe try writing some abomination on
top of the C-preprocessor that makes porting easier.

- Use [tox](https://bitbucket.org/hpk42/tox) for local testing.  Being
able to run your tests against all python versions at once is very
helpful and will find you a lot of issues.

## Outlook

Unified codebases for 2.x and 3.x are definitely within reach now.  The
majority of the porting time will still be spend trying to figure out how
APIs are going to behave with regards to Unicode and interoperability with
other modules that might have changed their API.  In any case if you want
to consider porting libraries don't bother with versions outside below
2.5, 3.0-3.2 and it will not hurt as much.
