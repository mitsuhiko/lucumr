tags: [python]
summary: |
  Various notes on how to port libraries and applications over to Python 3
  based on my experiences with the Jinja2 port.

Porting to Python 3 — A Guide
=============================

The latest `Jinja 2 <http://jinja.pocoo.org/2/>`_ release came with
basic support for Python 3. It was surprisingly painless to port the
application over but it did require a substantial amount of tweaks and
code changes in order to get it running. For everyone else out there who
is interested in getting started, I decided to share my experiences: 

Changing APIs
~~~~~~~~~~~~~

Before you start porting the library you have to decide how interfaces
will behave in Python 3. The biggest issue here is obviously unicode,
but there are others as well. I would say there are four kinds of
libraries you might encounter regarding string behavior in Python 2:
There are the libraries that only accept unicode and only output
unicode, there are those that only accept byte-strings and output
byte-strings but operate on textual data, there are the libraries that
operate on either or and what has been fed into it, comes out of it and
there are libraries that operate either on unicode or byte-strings and
also accept the other type as long as it's a subset of the default
encoding (ASCII). 

First you have to find out what your library does, what it is supposed
to do, and how you want to deal with that in Python 3. Because
byte-strings no longer exist in Python 3 and were replaced by a `bytes`
object that works similar, but has an incompatible API it is very
unlikely that your code will be able to support both in the future (or
that it is something you would desire). 

Byte-Based Libraries
~~~~~~~~~~~~~~~~~~~~

This is might the most tricky one if you are aiming for Python 2.5
support or lower and you are operating on bytes directly. The issue is
that the way you operate on bytes changed fundamentally from Python 2.x
to 3.x and 2to3 is not really able to pick it up.  Worse, it will try
convert all your bytestring literals to unicode! The official support is
as far as I know, to explicitly prefix the byte strings in the 2.x code
with a leading `b` to indicate bytes.  Unfortunately that means no
support for 2.x. I am not completely sure what to do in that situation,
but at least I found a way to trick python to operate on bytes: if you
have code like this:

.. sourcecode:: python

    magic = 'M23\x01'

And you want to ensure it does not end up being a `str` in 3.x, add a
dummy encode:

.. sourcecode:: python

    magic = u'M23\x01'.encode('iso-8859-1')

The only downside is that the encode happens at runtime, so it will slow
down execution a bit. 

Text Based Libraries
~~~~~~~~~~~~~~~~~~~~

The second kind of library is a library that operates on text. In 2.x
there were multiple ways to implement such libraries and it basically
came down to what data type was used internally and what was accepted
for input and output. There are the libraries that operate exclusively
either on bytestrings or unicode. These are the ones that are the
easiest to port, because 2to3 was written with nearly that in mind. If
your library was only accepting bytestrings in 2.x it will (after a 2to3
run) only be accepting a Python 3 `str` type which is unicode based.
This works well as long as you do not intend to use some kind of IO in
your library. Once you start doing that, you will need to make sure you
can somehow specify the encoding to be used when opening files. In that
case, make sure you open the file in byte mode (*not* in text mode!) and
do the decoding/encoding yourself. This is the only way your IO code
will work the same in both 2.x and 3.x. But more on IO later. 

What 2to3 does out of the box is converting calls from `unicode` to
`str` automatically. Unfortunately it does not change the special
`__unicode__` method to `__str__`. You can easily do that in a custom
fixer though, so it should be easy to accomplish. If your library
however supports both `__str__` *and* `__unicode__` you are in a more
tricky situation here.  Let me show you an example of the kind of
classes I deal with in Jinja 2 for example:

.. sourcecode:: python

    class MyObject(object):

        def __init__(self):
            self.value = u'some value'

        def __str__(self):
            return unicode(self).encode('utf-8')

        def __unicode__(self):
            return self.value

The big problem here is that 2to3 will convert it to this:

.. sourcecode:: python

    class MyObject(object):

        def __init__(self):
            self.value = 'some value'

        def __str__(self):
            return str(self).encode('utf-8')

        def __unicode__(self):
            return self.value

If you call `str()` on your instance now, it will die with a runtime
error because it recurses infinitely. Even if it would not recurse, it
would try to return a bytes object from the `__str__` method because of
the encode call. My plan was to write a custom fixer that, if it detects
a `__str__` that just calls into `__unicode__` and encodes, will drop
the `__str__` method and rename `__unicode__` to `__str__`. 
Unfortunately the tree you are dealing with in 2to3 does not appear to
be designed to removing code so what I do instead of removing the
`__str__` is just renaming the `__unicode__` to `__str__` and let Python
override the dummy `__str__` with the correct one.  The fixer I use for
that, looks like this:

.. sourcecode:: python

    from lib2to3 import fixer_base
    from lib2to3.fixer_util import Name

    class FixRenameUnicode(fixer_base.BaseFix):
        PATTERN = r"funcdef< 'def' name='__unicode__' parameters< '(' NAME ')' > any+ >"

        def transform(self, node, results):
            name = results['name']
            name.replace(Name('__str__', prefix=name.prefix))

After conversion with this fixer in place, the class from above will
then look like this:

.. sourcecode:: python

    class MyObject(object):

        def __init__(self):
            self.value = 'some value'

        def __str__(self):
            return str(self).encode('utf-8')

        def __str__(self):
            return self.value

But where to put those fixers? Edit 2to3 directly? And do I have to
provide two source packages for 2.x and 3.x? This is where `distribute
<http://pypi.python.org/pypi/distribute>`_ comes in. 

2to3 through distribute
~~~~~~~~~~~~~~~~~~~~~~~

Distutils itself already has the possibility to run 2to3 for you, but
what it cannot do is adding custom fixers without a lot of custom code.
distribute on the other hand not gives you built in 2to3 support as a
single keyword argument to `setup()` but can also pass custom fixers to
2to3 which is very helpful. Because these new keyword arguments however
would warn if the setup script was executed with setuptools instead of
distribute, you should only pass them to the setup function if invoked
from Python 3.  The setup script then looks like this:

.. sourcecode:: python

    import sys

    from setuptools import setup

    # if we are running on python 3, enable 2to3 and
    # let it use the custom fixers from the custom_fixers
    # package.
    extra = {}
    if sys.version_info >= (3, 0):
        extra.update(
            use_2to3=True,
            use_2to3_fixers=['custom_fixers']
        )


    setup(
        name='Your Library',
        version='1.0',
        classifiers=[
            # make sure to use :: Python *and* :: Python :: 3 so
            # that pypi can list the package on the python 3 page
            'Programming Language :: Python',
            'Programming Language :: Python :: 3'
        ],
        packages=['yourlibrary'],
        # make sure to add custom_fixers to the MANIFEST.in
        include_package_data=True,
        **extra
    )

Now all you have to do is to put the custom 2to3 fixers (written in
Python 3!) into the `custom_fixers` package next to your real library
and they will be added automatically. For examples of fixers, look into
the `lib2to3/fixes` package or your Python 3 installation. If you run
`python3 setup.py build` it will run 2to3 on your files and put the
output into the build folder for you to test. 

Input/Output
~~~~~~~~~~~~

So in Python 3 there is a completely new input/output system. It is very
Java-ish and is able to deal with unicode. The downside is that you
either don't have it in 2.x or the implementation is too slow, so what
you want to do is to create yourself an abstraction layer. 

If your library was unicode based in older Python versions you probably
just did `file.read().decode(encoding)` or something similar. This still
works on 3.x and I strongly recommend doing that, but be sure to open
the file in binary mode, otherwise on Python 3 the decode will attempt
to decode an already decoded unicode string, which does not make any
sense. If you *need* normalized newlines (windows newlines converted to
`'\n'`) you would have to post-process the string by hand, but must
applications and libraries are able to deal with any kind of newline
anyways. 

You could also just create a IO helper module that calls the builtin
open on 3.x and `codecs.open` on 2.x. Unfortunately codecs.open has a
worse performance than the built in open on 2.x, so you might want to
check how you are dealing with files, if a high performance is necessary
and so forth. Most of the time, opening the file in binary mode is what
you want to do. 

If you library was byte based in 2.x and you opened files in the
library, instead of just working on open file objects, you will have to
change your API slightly in order to take the charset and error mode
into account.  If you previously had a function like this:

.. sourcecode:: python

    def read_file_contents(filename):
        with open(filename) as f:
            return f.read()

You will have to change it to something like this now:

.. sourcecode:: python

    def read_file_contents(filename, charset='utf-8', errors='strict'):
        with open(filename, 'rb') as f:
            return f.read().decode(charset, errors)

And then ensure that you give the user to provide these arguments to the
function. This means that whatever calls this, would also have to accept
this arguments and so forth. Not everyone is using utf-8, there might be
legacy files in iso-8859-1 a user might still want to be able to open.
With a proper error handling system, it might even be possible to fall
back to another encoding if it does not decode as utf-8 properly. 

Last but not least, 3.x `StringIO` is a "string IO", not something that
accepts binary data. If you have a lot of unittests that are dealing
with binary data in such objects, you will have to use the `io.BytesIO`
instead. If it does not exist, you are running 2.x, and you can safely
fall back to `cStringIO.StringIO`. 

Unit-Testing
~~~~~~~~~~~~

Now the biggest problem I had with switching to 3.x: The unittests.
First of all: **do not use doctest**. There is a doctest converter in
2to3, but it does not give you much. Error messages changed, reprs
changed which it cannot properly pick up, nested tracebacks cause a lot
of grief and they are hard to debug. I was playing with the idea to
write a tool that automatically converts doctests to unittests, but I
was too lazy and converted the few I had in my code, to unittests by
hand. Furthermore, the few doctests left (used as code examples in the
documentation) are only tested if the testsuite is invoked from Python
2.x 

Nosetest has 3.x support in a separate branch, py.test comes with 3.x
for a while now and the builtin unittest does the trick as well. I
personally converted all my Jinja 2 tests to unittest lately. If you are
using unittest you can point distribute to your test suite function and
it will run the test for you if you write python setup.py test. This
even runs 2to3 for you if you execute it with Python 3. So very helpful.

Hope that helps you porting your libraries to Python 3. Would love to
hear about your experiences, because even if Python 3 did not work out
as some of us hoped, it is very important that we continue to port
libraries over to 3.x.
