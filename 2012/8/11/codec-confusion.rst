public: yes
tags: [python, thoughts, codecs]
summary: |
  A recap of a sad example of where the wrong conclusion was drawn.

Codec Confusion in Python
=========================

Alright, I admit Alex Gaynor is a pretty clever guy but I was very close
to strangling him today for `this tweet
<https://twitter.com/alex_gaynor/status/234050951173005312>`_:

    @alex_gaynor: WTF does str.encode or unicode.decode even do on Python2?

And that's because on the way to Python 3 these functions were removed
because they cause confusion with people, but this broke a lot of really
good use cases for them in the process.  On top of that I truly believe
the mere presence of these function did not actually cause confusion, but
an unintended side effect did.  And all in all I believe that's a really
sad example of where wrong conclusions were drawn.

One thing I believe is pretty true is that you should never ask people
about their opinions directly.  You should observe them, figure out what's
wrong and then slowly figure out where the true problem lies.  In this
particular case it seems like many people missed the true problem and
stopped noticing that the true solution was much simpler.  I can't blame
anyone for that and I did not notice it either until the damage was
already done.

So what do `str.encode` and `str.decode` actually do in Python 2.x?  They
are roughly implemented like this:

.. sourcecode:: python

    import codecs

    class basestring(object):
        ...
        def encode(self, encoding, errors='strict'):
            return codecs.lookup(encoding).encode(self, errors)
        def decode(self, encoding, errors='strict'):
            return codecs.lookup(encoding).decode(self, errors)

    class str(basestring):
        ...

    class unicode(basestring):
        ...

Alright, so they are just shortcuts for functionality hidden in another
module.  One important thing of note here is that this is talking about
encodings, not about charsets.  Very important difference!

The most important part here is that codecs in Python are not restricted
to strings at all.  If you look into the original Python sources you will
see that the codecs module talks about objects and not strings.

So what is actually the confusing part?  The confusing part is not the
codecs API but the Python default encoding.  Let me show you the problem
on a simple example.  Alex was arguing against `str.encode` because of
this:

.. sourcecode:: pycon

    >>> '\xe2\x98\x83'.encode('utf-8')
    Traceback (most recent call last):
      File "<stdin>", line 1, in <module>
    UnicodeDecodeError: 'ascii' codec can't decode byte 0xe2 in position 0: ordinal not in range(128)
    
What's happening here?  The call did not make any sense.  The utf-8 codec
encodes from unicode to bytes, not from bytes to bytes like in the given
example.  Now that might let you believe the correct solution is just to
get rid of the `encode` function on strings.  However there are
legitimate cases for string to string encodings:

.. sourcecode:: pycon

    >>> 'foo'.encode('base64')
    'Zm9v\n'

Alright, so we want to preserve that.  So why exactly is the first example
confusing anyways?  I mean, it gives an exception.  The problem is the
wording of the exception.  Where is the ascii codec coming from all the
sudden?  That's actually coming from something completely unrelated and
that is Python's default encoding which caused us all the problems in the
first place.  What's happening in the above code is that the codec
function is written in a way that it looks at the incoming object and it
sees that it expects an unicode object but it got a bytestring object.  As
the next step that function takes that bytestring object and asks the
interpreter state what it should do with that.  The interpreter has a
special setting which defines the default encoding.  In Python 2.x this
historically has been set to ascii.  Now the function will ask the ascii
module to decode the string to unicode.  Because the string did not fit
into ASCII range it will error out with that horrible error message.

Not only is that error message misleading, it also does not show up at all
if the string does indeed fit into ascii:

.. sourcecode:: pycon

    >>> 'foo'.encode('utf-8')
    'foo'
    
There it does foo (bytes) -> ascii decode -> foo (unicode) -> utf-8 encode
-> foo (bytes).

Now let me blow your mind: this was actually envisioned when the module
was created initially.  You can in fact still take a stock Python 2.x
interpreter and disable that behavior:

.. sourcecode:: pycon

    >>> import sys
    >>> reload(sys)
    <module 'sys' (built-in)>
    >>> sys.setdefaultencoding('undefined')
    >>> '\xe2\x98\x83'.encode('utf-8')
    Traceback (most recent call last):
      File "<stdin>", line 1, in <module>
    UnicodeError: undefined encoding
    >>> 'foo'.encode('utf-8')
    Traceback (most recent call last):
      File "<stdin>", line 1, in <module>
    UnicodeError: undefined encoding

(The reload on sys is necessary because after site.py did it's job there
is no way to change the default encoding any more).

So there you have it.  If we would have just never started doing the
implicit ASCII codec we would have solved so much confusion early on and
everything would have been more explicit.  When going to Python 3 all we
would have had to do was to add a `b` prefix for bytestrings and made the
`u` implied.  And we would not now end up with inferior codec support in
Python 3 because the byte to byte and unicode to unicode codecs were
removed.
