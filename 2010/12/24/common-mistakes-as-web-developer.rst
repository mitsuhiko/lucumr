public: yes
tags: [python, web]
summary: |
  A short list of common mistakes in Python web applications in terms of
  security and architecture.

Common Mistakes as Python Web Developer
=======================================

A few weeks ago I had a heated discussion with a bunch of Python and Open
Source people at a local meet-up about the way Python's path joining works.
I was always pretty sure that people are aware of how the path joining
works and why it works that way.  However a bit of searching around on the
internet quickly showed that it's actually a pretty common mistake to use
the `os.path.join` function with arbitrary and unfiltered input, leading
to security issues.  Because the most common case where user input comes
from another system is web development I went a bit further and tried to
find a few other cases where people might be blindly trusting an API or
operating system.

So here it is: my list of things not to do when doing Python web
development.

Untrusted Data and File Systems
-------------------------------

Unless you are running on a virtualized filesystem like when you are
executing code on Google Appengine, chances are, vital files can be
accessed with the rights your application has.  Very few deployments
actually reduce the rights of the executing user account to a level where
it would become save to blindly trust user submitted filenames.  Because
it typically isn't, you have to think about that.

In PHP land this is common knowledge by now because many people write
innocent looking code like this:

.. sourcecode:: php

    <?php

    include "header.php";
    $page = isset($_GET['page']) ? $_GET['page'] : 'index';
    $filename = $page . '.php';
    if (file_exists($filename))
        include $filename;
    else
        include "missing_page.php";
    include "footer.php";

Now the problem is that if you accept the filename blindly one could
just pass a string with some leading “go one layer up” markers and access
files somewhere else on the file system.  Now many people thought that
wouldn't be a problem because the file has to end with “.php” so only PHP
files can be accessed.  Turns out that PHP never (at least not until
recently) removed nullbytes from the string before opening the file.  Thus
the underlying C function that opened the file stopped reading at the null
byte.  So if one attacker would access the page
``?page=../../../../htpasswd%00`` he would see the contents of the passwd
file.

Python programmers apparently don't care too much about this problem
because Python's file opening functions don't have this problem and
reading files from the filesystem is a very uncommon thing to do anyways.
However in the few situations where people do work with the filenames,
always always will you find code like this:

.. sourcecode:: python

    def upload_file(file):
        destination_file = os.path.join(UPLOAD_FOLDER, file.filename)
        with open(destination_file, 'wb') as f:
            copy_fd(file, f)

The problem there is that you expect `os.path.join` never to go a folder
up.  While in fact, that's exactly what `os.path.join` is capable of
doing:

.. sourcecode:: pycon

    >>> import os
    >>> os.path.join('/var/www/uploads', '../foo')
    '/var/www/uploads/../foo'
    >>> os.path.join('/var/www/uploads', '/foo')
    '/foo'

While in this case the attacker is “just” able to overwrite files anywhere
on the filesystem where the user has access (might be able to override
your code and inject code that way!) it's not uncommon to read files on
the filesystem as well and expose information that way.

So yes, `os.path.join` is totally not safe to use in a web context.
Various libraries have ways that help you deal with this problem.
Werkzeug for instance has a function called `secure_filename` that will
strip any path separators from the file, slashes, even remove non-ASCII
characters from the path as character sets and filesystems are immensly
tricky.  At the very least you should do this:

.. sourcecode:: python

    import os, re

    _split = re.compile(r'[\0%s]' % re.escape(''.join(
        [os.path.sep, os.path.altsep or ''])))

    def secure_filename(path):
        return _split.sub('', path)

This will remove any slashes and null bytes from the filename.  Why also
remove the Null byte if Python does not have a problem with that?  Because
Python might not, but your code.  A nullbyte in the filename will trigger
a `TypeError` which very few people are expecting:

.. sourcecode:: pycon

    >>> open('\0')
    Traceback (most recent call last):
      File "<stdin>", line 1, in <module>
    TypeError: file() argument 1 must be encoded string without NULL bytes, not str

On Windows you furthermore have to make sure people are not naming their
files after device files, but that is outside of the scope of this post.
If you are curious, check how Werkzeug does it.

If you actually do want to allow slashes in the filename there are a
couple of things you have to consider.  On POSIX the whole system is
incredible easy: if it starts with a trailing slash or the combination of
``../`` it will or might try to reference a file outside of the folder you
want the file to be in.  That's easy to prevent:

.. sourcecode:: python

    import posixpath

    def is_secure_path(path):
        path = posixpath.normpath(path)
        return not path.startswith(('/', '../'))

On windows the whole situation is more tricky (and I fell into that trap a
few days ago as well).  First of all you have backslashes you have to
consider.  Technically you would also have to consider colons on Mac OS,
but there are very few people that still aim for Mac OS compatibility.
Thus the backslash is the main culprit.  Secondly you can't just test for
absolute paths by checking if the path starts with a slash.  On windows
there are multiple different kinds of absolute paths: regular Unix
absolute paths and secondly absolute paths that also include a drive
letter.  Thankfully the path module provides ways to reliably check if the
path is absolute.

The following function checks if paths will not manage to escaped a
folder on POSIX and Windows:

.. sourcecode:: python

    import os

    non_slash_sep = [sep for sep in (os.path.sep, os.path.altsep)
                     if sep not in (None, '/')]

    def is_in_folder(filename):
        filename = os.path.normpath(filename)
        for sep in non_slash_seps:
            if sep in filename:
                return False
        return os.path.isabs(filename) or filename.startswith('../')

The idea is that we consider the filenames to be in posix notation and
that the operating system is fine with filenames containing slashes.  That
is the case for all operating systems you would care about these days.
Then if the native operating system path separator is in the string we can
assume it's not a valid character for a filename on the web anyways and
consider it unsafe.  Once that passed we make sure the path is not
absolute or does not start with the special ``../`` string that indicates
going to a higher level on both Windows and POSIX.

Generally speaking though, if you do aim for windows compatibility you
have to be extra careful because Windows has its special device files in
every folder on the filesystem for DOS compatibility.  Writing to those
might be problematic and could be abused for denial of service attacks.


Mixing up Data with Markup
--------------------------

This is a topic that always makes me cringe inside.  I know it's very
common and many don't see the issue with it but it's the root of a whole
bunch of problems and unmaintainable code.  Let's say you have some data.
That data for all practical purposes will be a string of some arbitrary
maximum length and that string will be of a certain format.  Let's say
it's prosaic text and we want to preserve newlines but collapse all other
whitespace to a single space.

A very common pattern.

However that data is usually displayed on a website in the context of
HTML, so someone will surely bring up the great idea to escape the input
text and convert newlines to ``<br>`` before feeding the data into the
database.  Don't do this!

There are a bunch of reasons for this but the most important one is called
“context”.  Web applications these days are getting more and more complex,
mainly due to the concept of APIs.  A lot of the functionality of the
website that was previously only avaiable in an HTML form is now also
available as RESTful interfaces speaking some other format such as JSON.

The context of a rendered text in your web application will most likely be
“HTML”.  In that context, ``<br>`` makes a lot of sense.  But what if your
transport format is JSON and the client on the other side is not
(directly) rendering into HTML?  This is the case for twitter clients for
instance.  Yet someone at Twitter decided that the string with the
application name that is attached to each tweet should be in HTML.  When I
wrote my first JavaScript client for that API I was parsing that HTML with
jQuery and fetching the application name as a string because I was only
interested in that.  Annoying.  However even worse: someone found out a
while later that this particular field could actually be used to emit
arbitrary HTML.  `A major security disaster
<http://praetorianprefect.com/archives/2010/06/persistent-xss-on-twitter-com/>`_.

The other problem is if you have to reverse the stuff again.  If you want
to be able to edit that text again you would have to unescape it,
reproduce the original newlines etc.

So there should be a very, very simple rule (and it's actually really
simple): store the data as it comes in.  Don't flip a single bit!  (The
only acceptable conversion before storing stuff in the database might be
Unicode normalization)

When you have to display your stored information: provide a function that
does that for you.  If you fear that this could become a bottleneck:
memcache it or have a second column in your database with the rendered
information if you absolutely must.  But never, ever let the HTML
formatted version be the only thing you have in your database.  And
certainly never expose HTML strings over your API if all you want to do is
to transmit text.

Every time I get a notification on my mobile phone from a certain
notification service where the message would contain an umlaut the
information arrives here completely broken.  Turns out that one service
assumes that HTML escaped information is to be transmitted, then however
the other service only allows a few HTML escaped characters and completely
freaks out when you substitute “ä” with “&auml;”.  If you ever are in the
situation where you have to think about “is this plain text that is HTML
escaped or just plain text” you are in deep troubles already.

Spending too much Time with the Choice of Framework
---------------------------------------------------

This should probably go to the top.  If you have a small application (say
less than 10.000 lines of code) the framework probably isn't your problem
anyways.  And if you have more code than that, it's still not that hard to
switch systems when you really have to.  In fact even switching out core
components like an ORM is possible and achievable if you write a little
shim and get rid of that step by step.  Better spend your time making the
system better.  The framework choice used to be a lot harder when the
systems were incompatible.  But this clearly no longer is the case.

In fact, combine this with the next topic.

Building Monolithic Systems
---------------------------

We are living in an agile world.  Some systems become deprecated before
they are even finished :)  In such an agile world new technologies are
introduced at such a high speed that your favorite platform might not
support it yet.

As web developers we have the huge advantage that we have a nice protocol
to separate systems: it's called HTTP and the base of all we do.  Why not
leverage that even further?  Write small services that speak HTTP and
bridge them together with another application.  If that does not scale,
put a load balancer between individual components.  This has the nice side
effect that each part of the system can be implemented in a different
system.  If Python does not have the library you need or does not have the
performance: write a part of the System in Ruby/Java or whatever comes to
mind.

But don't forget to still make it easy to deploy that system and put
another machine in.  If you end up with ten different programming
languages with different runtime environments you are quickly making the
life of your system administrator hell.
