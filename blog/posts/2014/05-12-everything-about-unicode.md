---
tags:
  - python
  - linux
  - unicode
summary: "A list of things about unicode on Linux and Python 3 you really did not
want to know."
---

# Everything you did not want to know about Unicode in Python 3

Readers of this blog on my twitter feed know me as a person that likes to
rant about Unicode in Python 3 a lot.  This time will be no different.
I'm going to tell you more about how painful "doing Unicode right" is and
why.  "Can you not just shut up Armin?".  I spent two weeks fighting with
Python 3 again and I need to vent my frustration somewhere.  On top of
that there is still useful information in those rants because it teaches
you how to deal with Python 3.  Just don't read it if you get annoyed by
me easily.

There is one thing different about this rant this time.  It won't be
related to WSGI or HTTP or any of that other stuff at all.  Usually I'm
told that I should stop complaining about the Python 3 Unicode system
because I wrote code nobody else writes (HTTP libraries and things of that
sort) I decided to write something else this time: a command line
application.  And not just the app, I wrote a handy little library called
[click](http://click.pocoo.org/) to make this easier.

Note that I'm doing what about every newby Python programmer does: writing
a command line application.  The "Hello World" of Python programs.  But
unlike the newcomer to Python I wanted to make sure the application is as
stable and Unicode supporting as possible for both Python 2 and Python 3
and make it possible to unittest it.  So this is my report on how that
went.

## What we want to do

In Python 3 we're doing Unicode right as developers.  Apparently.  I
suppose what means is that all text data is Unicode and all non text data
is bytes.  In this wonderful world of everything being black and white,
the "Hello World" example is pretty straightforward.  So let's write some
helpful shell utilties.

Let's say we want to implement a simple `cat`  In other terms, these are
the applications we want to write in Python 2 terms:

```python
import sys
import shutil

for filename in sys.argv[1:]:
    f = sys.stdin
    if filename != '-':
        try:
            f = open(filename, 'rb')
        except IOError as err:
            print >> sys.stderr, 'cat.py: %s: %s' % (filename, err)
            continue
    with f:
        shutil.copyfileobj(f, sys.stdout)
```

Obviously neither commands are particularly great as they do not handle
any command line options or anything but at least they roughly work.  So
that's what we start out with.

## Unicode in Unix

In Python 2 the above code is dead simple because you implicitly work with
bytes everywhere.  The command line arguments are bytes, the filenames are
bytes (ignore Windows users for a moment) and the file contents are bytes
too.  Purists will point out that this is incorrect and really that's
where the problem is coming from, but if you start thinking about it more,
you will realize that this is an unfixable problem.

UNIX is bytes, has been defined that way and will always be that way.  To
understand why you need to see the different contexts in which data is
being passed through:

- the terminal

- command line arguments

- the operating system io layer

- the filesystem driver

That btw, is not the only thing this data might be going through but let's
go with this for the moment.  In how many of the situations do we know an
encoding?  The answer is: in none of them.  The closest we have to
understanding an encoding is that the terminal exports locale information.
This information can be used to show translations but also to understand
what encoding text information has.

For instance an `LC_CTYPE` of `en_US.utf-8` tells an application that
the system is running US English and that most text data is `utf-8`.  In
practice there are more variables but let's assume that this is the only
one we need to look at.  Note that `LC_CTYPE` does not say that all data
now is `utf-8`.  It instead informs the application how text characters
should be classified and what case conversion rules should be applied.

This is important because of the `C` locale.  The `C` locale is the
only locale that POSIX actually specifies and it says: encoding is ASCII
and all responses from command line tools in regards to languages are like
they are defined in the POSIX spec.

In the above case of our `cat` tool there is no other way
to treat this data as if it was bytes.  The reason for this is, that there
is no indication on the shell what the data is.  For instance if you
invoke `cat hello.txt` the terminal will pass `hello.txt` encoded in
the encoding of the terminal to your application.

But now imagine the other case: `echo *`.  The shell will now pass all
the filenames of the current directory to your application.  Which
encoding are they in?  In whatever encoding the filenames are in.  There
is no filename encoding!

## Unicode Madness?

Now a Windows person will probably look at this and say: what the hell are
the UNIX people doing.  But it's not that dire or not dire at all.  The
reason this all works is because some clever people designed the system to
be backwards compatible.  Unlike Windows where all APIs are defined twice,
on POSIX the best way to deal with all of this is to assume it's a byte
mess that for display purposes is decoded with an encoding hint.

For instance let's take the case of the `cat` command above.  As you might
have noticed there is an error message for files it cannot open because
they either don't exist or because they are protected or whatever else.
In the simple case above let's assume the file is encoded in latin1
garbage because it came from some external drive from 1995.  The terminal
will get our standard output and will try to decode it as utf-8 because
that's what it thinks it's working with.  Because that string is latin1
and not the right encoding it will now not decode properly.  But fear not,
nothing is crashing, because your terminal will just ignore the things it
cannot deal with.  It's clever like this.

How does it look like for GUIs?  They have two versions of each.  When a
GUI like Nautilus lists all files it makes a symbol for each file.  It
associates the internal bytes of that filename with the icon for double
clicking and secondly it attempts to make a filename it can show for
display purposes which might be decoded from something.  For instance it
will attempt decoding from utf-8 with replacing decoding errors with
question marks.  Your filename might not be entirely readable but you can
still open the file.  Success!

Unicode on UNIX is only madness if you force it on everything.  But that's
not how Unicode on UNIX works.  UNIX does not have a distinction between
unicode and byte APIs.  They are one and the same which makes them easy to
deal with.

## The C Locale

Nowhere does this show up as much as with the `C` locale.  The `C`
locale is the escape hatch of the POSIX specification to enforce everybody
to behave the same.  A POSIX compliant operating system needs to support
setting `LC_CTYPE` to `C` and to force everything to be ASCII.

This locale is traditionally picked in a bunch of different situations.
Primarily you will find this locale for any program launched from cron,
your init system, subprocesses with an empty environment etc.  The `C`
locale restores a sane `ASCII` land on environments where you otherwise
could not trust anything.

But the word ASCII implies that this is an 7bit encoding.  This is not a
problem because your operating system is dealin in bytes!  Any 8 bit byte
based content can pass through just fine, but you are following the
contract with the operating system that any character processing will be
limited to the first 7 bit.  Also any message your tool generates out of
it's own translations will be ASCII and the language will be English.

Note that the POSIX spec does not say your application should die in
flames.

## Python 3 Dies in Flames

Python 3 takes a very difference stance on Unicode than UNIX does.  Python
3 says: everything is Unicode (*by default, except in certain situations,
and except if we send you crazy reencoded data, and even then it's
sometimes still unicode, albeit wrong unicode*).  Filenames are Unicode,
Terminals are Unicode, stdin and out are Unicode, there is so much
Unicode!  And because UNIX is not Unicode, Python 3 now has the stance
that it's right and UNIX is wrong, and people should really change the
POSIX specification to add a `C.UTF-8` encoding which is Unicode.  And
then filenames are Unicode, and terminals are Unicode and never ever will
you see bytes again although obviously everything still is bytes and will
fail.

And it's not just me saying this.  These are bugs in Python related to
this braindead idea of doing Unicode:

- [ASCII is a bad filesystem default encoding](http://bugs.python.org/issue13643#msg149941)

- [Use surrogateescape as default error handler](http://bugs.python.org/issue19977)

- [Python 3 raises Unicode errors in the C locale](http://bugs.python.org/issue19846)

- [LC_CTYPE=C:  pydoc leaves terminal in an unusable state](http://bugs.python.org/issue21398) (this is relevant to Click
because the pager support is provided by the stdlib pydoc module)

But then if you Google around you will find so much more.  Just check how
many people failed to install their pip packages because the changelog had
umlauts in it.  Or because their home folder has an accent in it.  Or
because their SSH session negotates ASCII, or because they are connecting
from Putty.  The list goes on and one.

## Python 3 Cat

Now let's start fixing cat for Python 3.  How do we do this?  Well first
of all we now established that we need to deal with bytes because someone
might echo something which is not in the encoding the shell says.  So at
the very least the file contents need to be bytes.  But then we also need
to open the standard output to support bytes which it does not do by
default.  We also need to deal with the case separately where the Unicode
APIs crap out on us because the encoding is `C`.  So here it is, feature
compatible `cat` for Python 3:

```python3
import sys
import shutil

def _is_binary_reader(stream, default=False):
    try:
        return isinstance(stream.read(0), bytes)
    except Exception:
        return default

def _is_binary_writer(stream, default=False):
    try:
        stream.write(b'')
    except Exception:
        try:
            stream.write('')
            return False
        except Exception:
            pass
        return default
    return True

def get_binary_stdin():
    # sys.stdin might or might not be binary in some extra cases.  By
    # default it's obviously non binary which is the core of the
    # problem but the docs recomend changing it to binary for such
    # cases so we need to deal with it.  Also someone might put
    # StringIO there for testing.
    is_binary = _is_binary_reader(sys.stdin, False)
    if is_binary:
        return sys.stdin
    buf = getattr(sys.stdin, 'buffer', None)
    if buf is not None and _is_binary_reader(buf, True):
        return buf
    raise RuntimeError('Did not manage to get binary stdin')

def get_binary_stdout():
    if _is_binary_writer(sys.stdout, False):
        return sys.stdout
    buf = getattr(sys.stdout, 'buffer', None)
    if buf is not None and _is_binary_writer(buf, True):
        return buf
    raise RuntimeError('Did not manage to get binary stdout')

def filename_to_ui(value):
    # The bytes branch is unecessary for *this* script but otherwise
    # necessary as python 3 still supports addressing files by bytes
    # through separate APIs.
    if isinstance(value, bytes):
        value = value.decode(sys.getfilesystemencoding(), 'replace')
    else:
        value = value.encode('utf-8', 'surrogateescape') \
            .decode('utf-8', 'replace')
    return value

binary_stdout = get_binary_stdout()
for filename in sys.argv[1:]:
    if filename != '-':
        try:
            f = open(filename, 'rb')
        except IOError as err:
            print('cat.py: %s: %s' % (
                filename_to_ui(filename),
                err
            ), file=sys.stderr)
            continue
    else:
        f = get_binary_stdin()

    with f:
        shutil.copyfileobj(f, binary_stdout)
```

And this is not the worst version.  Not because I want to make things
extra complicated but because it is complicated now.  For instance what's
not done in this example is to forcefully flush the text stdout before
fetching the binary one.  In this example it's not necessary because print
calls here go to stderr instead of stdout, but if you would want to print
to stdout instead, you would have to flush.  Why?  Because stdout is a
buffer on top of another buffer and if you don't flush it forefully you
might get output in wrong order.

And it's not just me.  For instance see [twisted's compat module](https://github.com/twisted/twisted/blob/log-booyah-6750-4/twisted/python/compat.py)
for the same mess in slightly different color.

## Dancing The Encoding Dance

To understand the live of a filename parameter to the shell, this is btw
now what happens on Python 3 worst case:

1. the shell passes the filename as bytes to the script

1. the bytes are being decoded from the expected encoding by Python
before they ever hit your code.  Because this is a lossy process,
Python 3 applies an special error handler that encodes encoding errors
as surrogates into the string.

1. the python code then encounters a file not existing error and needs to
format an error message.  Because we write to a text stream we cannot
write surrogates out as they are not valid unicode.  Instead we now

1. encode the unicode string with the surrogates to utf-8 and tell it to
handle the surrogate escapes as it.

1. then we decode from utf-8 and tell it to ignore errors.

1. the resulting string now goes back out to our text only stream
(stderr)

1. after which the terminal will decode our string for displaying
purposes.

Here is what happens on Python 2:

1. the shell passes the filename as bytes to the script.

1. the shell decodes our string for displaying purposes.

And because no string handling happens anywhere there the Python 2 version
is just as correct if not more correct because the shell then can do a
better job at showing the filename (for instance it could highlight the
encoding errors if it woudl want.  In case of Python 3 we need to handle
the encoding internally so that's no longer possible to detect for the
shell).

Note that this is not making the script less correct.  In case you would
need to do actual string handling on the input data you would switch to
Unicode handling in 2.x or 3.x.  But in that case you also want to support
a `--charset` parameter on your script explicitly so the work is pretty
much the same on 2.x and 3.x anyways.  Just that it's worse because for
that to work on 3.x you need to construct the binary stdout first which is
unnecessary on 2.x.

## But You're Wrong Armin

Clearly I'm wrong.  I have been told so far that:

- I only feel it's painful because I don't think like a beginner and
the new Unicode system is so much easier for beginners.

- I don't consider Windows users and how much more correct this new text
model is for Windows users.

- The problem is not Python, the problem is the POSIX specification.

- The linux distributions really need to start supporting `C.UTF-8`
because they are stuck in the past.

- The problem is SSH because it passes incorrect encodings.  This is a
problem that needs to be fixed in SSH.

- The real problem with lots of unicode errors in Python 3 is that
people just don't pass explicit encodings and instead assume that
Python 3 does the right thing to figure it out (which it really can't
so you should pass explicit encodings).  Then there would be no
problems.

- I work with "boundary code" so obviously that's harder on Python
3 now (duh).

- I should spend my time fixing Python 3 instead of complaining on
Twitter and my blog.

- You're making problems where there are none.  Just let everybody fix
their environment and encodings everywhere and everything is fine.
It's a user problem.

- Java had this problem for ages, it worked just fine for developers.

You know what?  I did stop complaining while I was working with HTTP for a
while, because I buy the idea that a lot of the problems with HTTP/WSGI
are something normal people don't need to deal with.  But you know what?
The same problem appears in simple Hello World style scenarios.  Maybe I
should give up trying to achieve a high quality of Unicode support in my
libraries and just live with broken stuff.

I can bring up counter arguments for each of the point above, but
ultimately it does not matter.  If Python 3 was the only Python language I
would use, I would eat up all the problems and roll with it.  But it's
not.  There is a perfectly other language available called Python 2, it
has the larger user base and that user base is barely at all migrating
over.  At the moment it's just very frustrating.

Python 3 might be large enough that it will start to force UNIX to go the
Windows route and enforce Unicode in many places, but really, I doubt it.

The much more likely thing to happen is that people stick to Python 2 or
build broken stuff on Python 3.  Or they go with Go.  Which uses an even
simpler model than Python 2: everything is a byte string.  The assumed
encoding is UTF-8.  End of the story.
