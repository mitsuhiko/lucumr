public: yes
tags: [thoughts, python]
summary: |
  Furthermore I am of the oppinion that Python developers should write
  more classes.

Start Writing More Classes
==========================

The Python community in my mind has the dangerous opinion that classes are
unnecessary fluff that should be replaced with functions wherever
possible.  The fact that there is a talk of the title “Stop Writing
Classes” with 50.000 views on YouTube is not helping.  I want to give a
counter argument to this idea that classes are evil by sharing some
examples of why I think we can't have enough classes.

Classes and API Design
----------------------

First of all let me preface all of this by saying that functions are
awesome.  When I'm arguing for more classes I'm not saying that we should
have less functions.  I love the idea of the Java IO system.  What I do
not love is how complicated it's to use — it is without a doubt a horrible
end-user API:

.. sourcecode:: java

    static String readFirstLine(String filename) {
        try {
            BufferedReader br = new BufferedReader(new FileReader(path));
            try {
                return br.readLine();
            } finally {
                if (br != null)
                    br.close();
            }
        } catch (IOException error) {
            return null;
        }
    }

I don't think many of you will mention the above code example as something
you want to write many times a day.  But did you know that the Python
``io.open()`` function (or Python 3's builtin ``open()``) function does
the same thing behind the scenes?

Have a look at this example:

.. sourcecode:: pycon

    >>> f = io.open('/tmp/test.txt', 'r')
    >>> f
    <_io.TextIOWrapper name='/tmp/test.txt' encoding='utf-8'>
    >>> f.buffer
    <_io.BufferedReader name='/tmp/test.txt'>
    >>> f.buffer.raw
    <_io.FileIO name='/tmp/test.txt' mode='rb'>

In fact if you look closer, you will notice that Python adds an additional
level of indirection in the form of a ``TextIOWrapper`` on top of what's
there from the Java example.  Yes, at the end of the day all you need to
do is to call ``open()`` with a filename and a mode parameter and you get
back an object you can operate with, but under the hood this is
implemented through the decorator pattern and a ton of classes.

Python gives us a function at the end of the day, but the function does
not hide away its inner workings.  The function ``open()`` acts as a
helper for the most common case of opening files and it will behind the
scenes do whatever logic necessary to come back with the most appropriate
implementation of a reader interface and use that to open the given file.

I love concise APIs and I love such functions but these functions should
be just helpers for the common case and not the sole API.

Condoms for Onions
------------------

Have you ever written a parser in C by hand?  C is pretty low level and as
such parsing can get a little bit tedious at times.  The way I approach
that generally is by layering these things.  The first piece of
functionality I am generally writing in such cases is a little abstraction
around reading a single byte from some source of bytes.  While I'm at it,
I'm also adding support for peeking one byte into the future.  What I end
up in that situation is basically two functions: read byte and peek byte.
Alternatively read byte and push byte, whatever feels more natural.

The next layer is one that combines multiple characters into larger tokens
(like identifiers, number literals, strings etc.).  At that level I would
create a thing that keeps a reference to the reader that produces bytes
and probably some internal buffer that builds up my current token.  For
instance while I have not yet reached the end of the string I would feed
my characters into a buffer until I found the end of the string, then I
let my function return.

The next level above that would be to combine multiple tokens into a tree
of nodes.  For instance the tokens ``[`` ``"bar"`` ``,`` ``42`` and ``]``
would become ``list(string("bar"), int(42))``.

.. raw:: html

    <small>

Sometimes parsers go a bit further and blend the separation between the
thing that produces characters (reader) and the thing that produces tokens
(tokenizer/lexer) a bit for efficiency reason.  Very rarely do computers
these days give you individual characters.  IO is pretty much the slowest
thing our computers can do, especially networking.  The next thing that
computers don't do particularly well is context switching.  Because both
of these things are usually involved when doing networking your operating
system will make this whole process faster by buffering up data somewhere.

The way this usually works is that a you define a buffer of a certain size
and then tell the kernel to receive some bytes from the network and then
fell it into that buffer.  The whole story is obviously more complicated
than that, but this is good enough to get the point across.

The point however is that instead of reading characters step by step some
lexers will instead have a look at a buffer of a certain size and move a
pointer around in that buffer and modify some bytes in place (in-situ).
Strings in JSON for instance will always only get shorter after parsing.
For starters they have two unnecessary characters at start and end (the
quotes) and then they also have escapes (like ``\u0061`` which really is
just another way to write ``a``) which also make a string less long.  This
form of lexing is pretty efficient for as long as the token is fully
terminated within that buffer.  If for instance you read ``4096`` bytes
into a buffer and the buffer contents are ``["hello world"]`` then each
token is fully terminated in the buffer.  If however the buffer would have
only been 12 bytes long then only ``["hello worl`` would have fitted in.
In that case in-situ processing of the string “hello world” is not
possible without some extra buffering.

.. raw:: html

    </small>

Why am I writing all of this?  Turns out parsing in Python is not really
any different.  While you might not be reading character by character
because that's pretty damn slow, parsers are still internally having a
tokenizer that makes tokens.  No matter how you implement your parser, at
the end of the day you have an internal thing that reads a resource and
yields tokens, then combines those tokens into some form of nested
structure.

So you would think.  Some libraries manage to skip the token part.  (I'm
looking at you simplejson, a library that even with the best intentions in
mind is impossible to teach stream processing)

Unfortunately the Python community has decided that it's better to hide
this beautiful layered architecture away behind a preservative that
prevents you from tapping and customizing the individual layers.

C is good for you
-----------------

Here is the extend on the public API that you get from the standard
library JSON module: ``json.loads(input_string) -> output_object``.  (Bear
with me, I know there is more).  It takes a string and then it does it's
magic and will return a nested Python structure of things.  Why is this
bad?  It's bad because internally that parser obviously had to deal with
taking bytes and making them into Python objects to begin with so it's
just removed functionality.

Why is it a problem that functionality was removed?  Mainly because my
only choice in this case to customize the behavior is to copy/paste the
code and modify the original source.  There is no API for me to hook into.
While the JSON module has *a tiny bit* of customizability by subclassing
the ``json.JSONDecoder`` object this one only has two methods that are
useless for most cases.  The internal tokenizer is not at all exposed.

At the very least this makes stream processing absolutely impossible.
What's stream processing?  Imagine someone sends you a JSON document of
2GB of data.  The only way to use the standard library module would be to
have >8GB of RAM and then loading that whole thing into your memory before
parsing.  You will need between 2GB RAM just to buffer up the input
string, then you will need between 2GB and 8GB RAM additionally to keep
the parsed object before you can drop the other 2GB for the input data.

This is so disappointing considering you can see that internally that JSON
library has exactly the functionality one would need for stream
processing.

“But I don't need stream processing”.  That's a pretty weak argument.  For
starters it goes against the current trend of what Pythonistas are raving
about: user level context switches aka cooperative multitasking aka green
threads aka gevent.  It's nice and everything if your IO is neatly
asynchronous but that illusion of concurrency falls flat on the floor if
you start hogging CPU away.  If your neat little web server is getting
10000 requests a second through gevent but is using ``json.loads`` then I
can probably make it crawl to a halt by sending it 16MB of well crafted
and nested JSON that hog away all your CPU.  Since nothing within
``json.loads`` is going to yield to another green thread I just DOS'ed
your application by just sending you regular JSON data.

.. raw:: html

    <small>

What data did I send?  Just a very benign ``[[[0] for x in xrange(2000)]
for y in xrange(2000)]`` which is roughly 15MB of data.  My rather fancy
Macbook Pro clocked at 2.4GHz takes 1.36 seconds if using the C extension.
If I use the pure Python implementation of simplejson instead the whole
thing needs 25 seconds, so a significantly smaller payload would already
do the trick to keep your neat little green server disabled.

.. raw:: html

    </small>

If you write C code you constantly have memory consumption in mind.  Never
ever would a C programmer thing: alright, that thing grows arbitrary large
and buffers up all data if necessary.  Since every memory allocation could
potentially fail a C programmer always keeps an eye open in regards to how
large memory consumption might grow.  That's a mindset that also
translates well to other C inspired languages, even if they manage memory
for you.  At the very least C++ and C# are language where people keep such
things in mind.

Outside the Box
---------------

Let's have a look outside of our comfy Python box.  A family of libraries
I like a lot is `msgpack <http://msgpack.org/>`__.  It's essentially a
binary version of JSON that's quite efficient to parse.  The Python
library essentially suffers like many other libraries from the “one
method to rule them all” mantra.  (Yes, there is a streaming reader but
that suffers from the same problem)

This is (pretty much the only) Python API:

.. sourcecode:: python

    >>> data = '\x93\x01\x02\x03'
    >>> msgpack.loads(data)
    (1, 2, 3)

Looks familiar?  Indeed!  But let's see how the C# library for msgpack
works:

.. sourcecode:: c#    

    var data = new byte[] { 0x93, 0x01, 0x02, 0x03 };
    var unpacker = Unpacker.Create(new MemoryStream(data));
    var result = unpacker.ReadItem();
    // result == MessagePackObject[3] {
    //   MessagePackObject { Int = 1 },
    //   MessagePackObject { Int = 2 },
    //   MessagePackObject { Int = 3 }
    // };

That looks awfully familiar.  What's the difference?  So far none.  It
read one item from the stream and what it read was a message pack array of
three integers (also represented as nested message pack objects).  In
fact, this example so far is exactly the same as the Python version.
However unlike the Python version it does not hide it's internal API.
Look:

.. sourcecode:: c#    

    var data = new byte[] { 0x93, 0x01, 0x02, 0x03 };
    var unpacker = Unpacker.Create(new MemoryStream(data));
    var result = unpacker.Read();
    // result == MessagePackObject { IsMapStart = true }

What's result now?  It's a message pack object again, but instead of
containing an integer it has an internal flag flipped that says: I'm the
start of a map (dictionary).  If you would read another item it would say:
I'm the integer 1 and so forth.  This makes it trivial to switch to and
from stream processing at any point in time.  For instance one could look
assert that the toplevel object is an array and then buffer up the one
object in between.  This could even be improved by keeping track of the
depth of the object that is consumed by ``ReadItem()`` and error out if
it's too deep or an array grows too large.

In fact, the whole ``Unpacker`` class is only a handful of lines long and
basically does nothing else than providing a few helpers around resource
management and subtree reconstruction.  All the low-level details are
exposed and it's trivial to extend this library in almost any shape or
form.  The design is flexible enough that you could make your own unpacker
based on the exposed low-level APIs that you could both yield to other
green threads, do depth and array length sanitization, skip past
uninteresting parts of a sub tree, stream processing or to convert
incoming data to custom data types.

And none of that is rocket science.  It's the natural way to write this
library in C#.  Nobody would come up with the idea to hide all that logic
behind one monolithic function, certainly nobody from the C/C++ or C#
community would embrace the idea of a monolithic function.

Methods all the Way Down
------------------------

So let's have a look at a practical example that is not data
serialization.  (You should not get the idea that that's all I have in
mind!)  For instance Flask comes with a function called
``render_template`` which takes a template name and some keyword arguments
which are forwarded as parameters to the template.  Internally it roughly
looks like this:

.. sourcecode:: python

    def render_template(template_name, **context):
        template = current_app.jinja_env.get_template(template_name)
        return template.render(context)

This is a convenience function, it does not implement actual template
rendering.  It just further simplifies a common case.  So what does
``jinja_env.get_template`` look like?  Basically like this:

.. sourcecode:: python

    def get_template(self, name, parent=None, globals=None):
        if parent is not None:
            name = self.join_path(name, parent)
        return self.loader.load(self, name, globals)

What's ``loader.load``?

.. sourcecode:: python

    def load(self, environment, name, globals=None):
        if globals is None:
            globals = {}
        source, filename, uptodate = self.get_source(environment, name)
        code = environment.compile(source, name, filename)
        return environment.template_class.from_code(environment, code,
                                                    globals, uptodate) 

Notice how the loader points back to the environment class to figure out
which template class to instantiate or how to compile a template from a
given sourcecode to bytecode.  Every single point can be overridden.

Here is how ``environment.compile`` looks like:

.. sourcecode:: python

    def compile(self, source, name, filename=None):
        # template code to jinja's abstract syntax tree
        source = self._parse(source, name, filename)
        # jinja's abstract syntax tree to python source
        source = self._generate(source, name, filename)
        # python source to bytecode
        return self._compile(source, filename)

In fact the Jinja2 environment is full of methods that are just waiting to
be overridden.  There are still internal unstable APIs you're not supposed
to modify but generally there is a lot of stuff you can customize.  This
is useful!  Yes.  At the end of the day Flask's ``render_template`` is all
you're going to use in 99% of all cases, but that 1% of the other cases
should not require you to rewrite all of the library.

There is nothing more frustrating than figuring out that your library
you have been using until now requires a patch in a C extension to
continue functioning for you.

So let's stop with this misleading idea of putting functionality in
functions and let's start writing classes instead.

.. raw:: html

    <small>

Something else I want to mention: what's written above will most likely
result in some sort of warmed up discussion in regards to object oriented
programming versus something else.  Or inheritance versus strategies.  Or
virtual methods versus method passing.  Or whatever else hackernews finds
worthy of a discussion this time around.

All of that is entirely irrelevant to the point I'm making which is that
monolithic pieces of code are a bad idea.  And our solution to monolithic
code in Python are classes.  If your hammer of choice is Haskell then use
whatever the equivalent in Haskell looks like.  Just don't force me to
fork your library because you decided a layered API is not something you
want to expose to your user.

.. raw:: html

    </small>
