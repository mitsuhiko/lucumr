public: yes
tags: [thoughts, rust, python]
summary: |
  Some notes about what appears to be current trend of programming
  languages and my thoughts about it.

Revenge of the Types
====================

This is part two about "The Python I Would Like To See" and it explores a
bit the type system of Python in light of recent discussions.  Some of
this references the `earlier post about slots
</2014/8/16/the-python-i-would-like-to-see/>`__.  Like the earlier post
this is a bit of a diving into the CPython interpreter, the Python
language with some food for thoughts for future language designers.

As a Python programmer, types are a bit suspicious to you.  They clearly
exist and they interact in different ways with each other, but for the
most part you really only notice their existence when you fail and an
exception tells you that a type does not behave like you think it does.

Python was very proud of it's approach to typing.  I remember reading the
language FAQ many years ago and it had a section about how cool duck
typing is.  To be fair: in practical terms duck typing is a good solution.
Because there is basically no type system that fights against you, you are
unrestricted in what you can do, which allows you to implement very nice
APIs.  Especially the common things are super simple in Python.

Almost all the APIs I designed for Python do not work in other languages.
Even such simple things such as `click <http://click.pocoo.org/>`_'s
general interface just does not work in other languages.  The largest
reason for that is that you constantly fight against types.

Recently there have been discussions about adding static typing to Python
and I wholeheartedly believe that train long left the station and will
never come back.  So for the interested, here my thoughts on why I hope
Python will not adapt explicit typing.


What's a Type System?
---------------------

A type system are the rules of how types interact with each other.  There
is actually a whole part of computer science that seems to be exclusively
concerned with types which is pretty impressive by itself.  But even if
you are not particularly interested in theoretical computer science, type
systems are hard to ignore.

I don't want to go too much into type systems for two reasons.  The first
one is that I barely understand them at all myself.  The second one is
that they are really not all that important to understand in order to
"feel" the consequences of them.  For me the way types behave is important
because it influences how APIs are designed.  So consider this basic
introduction more influenced by my obsession with nice APIs than with a
correct introduction to types.

Type systems can have many properties but the most important one that sets
them all apart is the amount of information they provide when you try to
reason with them.

As an example you can take Python.  Python has types.  There is the number
``42`` and when you ask the number what type it is, it will reply that it
is an integer type.  That makes a lot of sense and it allows the
interpreter to define the rules of how integers interact with other
integers.

However there is one thing Python does not have, and that is composite
types.  All Python types are primitive.  That means that you basically can
only work with one of them at the time.  The opposite of that is composite
types.  You do see them in Python every once in a while in other contexts.

The most straightforward composite type that most programming languages
have are structs.  Python does not have them directly, but there are many
situations where libraries need to define their own structs.  For instance
a Django or SQLAlchemy ORM model is essentially a struct.  Each database
column is represented through a Python descriptor which in this case,
corresponds directly to a field in a struct.  So when you say the primary
key is called ``id`` and it's an ``IntegerField()`` you are defining your
model as composite type.

Composite types are not limited to structs.  When you want to work with
more than one integer for instance you would use a collection like an
array.  In Python you have lists and each item in the list can be of an
arbitrary type.  This is in contrast with lists defined to be specific to
a type (like list of integer).

"List of integer" always says more than list.  While you could argue that
by iterating over the list you can figure out of which type it is, the
empty list causes a problem.  When you are given a list in Python without
elements in it, you cannot know the type.

The exact same problem is caused by the null reference (``None``) in
Python.  When you pass a user to a function and that user might become
``None`` you all the sudden do not know that it could be a user object.

So what's the solution?  Not having null references and having explicitly
typed arrays.  Haskell obviously is the language that everybody knows that
does this, but there are others which look less hostile.  For instance
Rust is a language that looks much more like C++ and as such more familiar
but brings a very powerful type system to the table.

So how do you express "no user present" if there are no null references?
The answer in Rust for instance are option types.  ``Option<User>`` means
there is either ``Some(user)`` or ``None``.  The former is a tagged enum
which wraps a value (a specific user).  Because now the variable can be
either some value or nothing, all code that deals with it needs to
explicitly handle the ``None`` case of it will not even compile.


The Future is Gray
------------------

In the past the world was very clearly divided between interpreted
languages with dynamic typing and ahead of time compiled languages with
static typing.  This is changing as new trends emerge.

The first indication that we're moving into some unexplored territory was
C#.  It's a statically compiled language and when it started it was very
similar to Java in how the language operated.  As the language was
improved many new type system related features landed.  The most important
was the introduction of generics which allowed non compiler provided
collections like lists and dictionaries to be strongly typed.  After that
they also went into the opposite direction of allowing sections of code to
opt out of static typing on a variable by variable basis.  This is
ridiculously useful, especially on the context of working with data
provided by webservices (JSON, XML etc.) where you just do some
potentially unsafe processing and catch down any type system related
exceptions to inform the user about bad input data.

Today C#'s type system is very powerful supporing generics with covariance
and contravariance specifications.  Not only that, it also grew a lot of
language level support to deal with nullable types.  For instance the
null-coalescing operator (``??``) was introduced to provide default values
for objects represented as null.  While C# already went down too far to
get rid of ``null`` they are controlling the damage that can be done.

At the same time other languages that are traditionally ahead of time
compiled and statically typed also explore new areas.  While C++ will
always be statically typed, it started to explore with type inference on
many levels.  The days of ``MyType<X, Y>::const_iterator iter`` are gone.
Today you can in almost all situations replace the type with a mere
``auto`` and the compiler will fill in the type for you.

Rust as a language has also excellent support for type inference which
lets you write statically typed programs that are entirely void of any
type declarations:

.. sourcecode:: rust

    use std::collections::HashMap;

    fn main() {
        let mut m = HashMap::new();
        m.insert("foo", vec!["some", "tags", "here"]);
        m.insert("bar", vec!["more", "here"]);

        for (key, values) in m.iter() {
            println!("{} = {}", key, values.connect("; "));
        }
    }

I believe we're moving in a future with powerful type systems.  I do not
believe that this will be the end of dynamic typing but there appears to
be a noticable trend of embracing powerful static typing with local type
inference.


Python and Explicit Typing
--------------------------

So not long ago someone apparently convinced someone else at a conference
that static typing is awesome and should be a language feature.  I'm not
exactly sure how that discussion went but the end result was that mypy's
type module in combination with Python 3's annotation syntax were declared
to be the gold standard of typing in Python.

In case you have not seen the proposal yet, it advocates something like
this:

.. sourcecode:: python

    from typing import List

    def print_all_usernames(users: List[User]) -> None:
        for user in users:
            print(user.username)

I honestly believe that this is not exactly a good decision for many
reasons, the largest being that Python is already suffering having a not
exactly good type system.  The language actually has different semantics
depending on how you look at it.

For static typing to make sense the type system needs to be good.  A type
system where you take two types and you can figure out how they relate to
each other.  Python doesn't have that.


Python's Type Semantics
-----------------------

If you have read the previous post about the slot system you might
remember that Python has different semantics depending on if a type is
implemented in C or in Python.  This is a very unique feature of the
language and is usually not found in many other places.  While it is true
that many languages for bootstrapping purposes have types implemented on
the interpreter level, they are typically fundamental types and as such
special cased.

In Python there are no real "fundamental" types.  There are however a
whole bunch of types that are implemented in C.  These are not at all
limited to primitives and fundamental types, they can appear everywhere
and without any logic.  For instance ``collections.OrderedDict`` is a type
implemented in Python whereas ``collections.defaultdict`` from the same
module is implemented in C.

This is actually causing quite a few problems for PyPy which has to
emulate the original types as good as possible to achieve a similar enough
API that these differences are not noticeable.  It is very
important to understand what this general difference between C level
interpreter code and the rest of the language means.

As an example I want to point out the ``re`` module up to Python 2.7.
(This behavior has ultimately been changed in the ``re`` module, but the
general problem of the interpreter working different than the language are
still present.)

The ``re`` module provides a function (``compile``) to compile a regular
expression into a regular expression pattern.  It takes a string and
returns a pattern object.  Looks roughly like this:

.. sourcecode:: pycon

    >>> re.compile('foobar')
    <_sre.SRE_Pattern object at 0x1089926b8>

As you can see this pattern object comes from the ``_sre`` module which is
a bit internal but generally available:

.. sourcecode:: pycon

    >>> type(re.compile('foobar'))
    <type '_sre.SRE_Pattern'>

Unfortunately it's a bit of a lie, because the ``_sre`` module does not
actually contain that type:

.. sourcecode:: pycon

    >>> import _sre
    >>> _sre.SRE_Pattern
    Traceback (most recent call last):
      File "<stdin>", line 1, in <module>
    AttributeError: 'module' object has no attribute 'SRE_Pattern'

Alright, fair enough, would not be the first time that a type lied about
it's location and it's an internal type anyways.  So moving on.  We know
the type of the pattern, it's an ``_sre.SRE_Pattern`` type.  As such it's
a subclass of ``object``:

.. sourcecode:: pycon

    >>> isinstance(re.compile(''), object)
    True

And all objects implement some very common methods as we know.  For
instance all objects implement ``__repr__``:

.. sourcecode:: pycon

    >>> re.compile('').__repr__()
    Traceback (most recent call last):
      File "<stdin>", line 1, in <module>
    AttributeError: __repr__

Oh.  What happened here?  Well, the answer is pretty bizarre.  Internally
the SRE pattern object for reasons unknown to me, until Python 2.7, had a
custom ``tp_getattr`` slot.  In this slot there was a custom attribute
lookup which provided access to some custom methods and attributes.  When
you actually inspect the object with ``dir()`` you will notice that lots
of stuff is missing:

.. sourcecode:: pycon

    >>> dir(re.compile(''))
    ['__copy__', '__deepcopy__', 'findall', 'finditer', 'match',
     'scanner', 'search', 'split', 'sub', 'subn'] 

In fact, this leads you down to a really bizarre adventure of how this
type actually functions.  Here is what's happening:

Type type claims that it's a subclass of ``object``.  This is true for the
CPython interpreter world, but not true for Python the language.  That
these are not the same things is disappointing but generally the case.
The type does not corresponds to the interface of ``object`` on the Python
layer.  Every call that goes through the interpreter works, every call
that goes through the Python language fails.  So ``type(x)`` succeeds,
whereas ``x.__class__`` fails.


What's a Subclass
-----------------

The above example shows that you can have a class in Python that is a
subclass of another thing, that disagrees with the behavior of the
baseclass.  This is especially a problem if you talk about static typing.
In Python 3 for instance you cannot implement the interface of the
``dict`` type unless you write the type in C.  The reason for this is that
the type guarantees a certain behavior of the view objects that just
simply cannot be implemented.  It's impossible.

So when you would statically annotate that the function takes a dictionary
with string keys and integer objects, it would not be clear at all if it
takes a dict, a dict like object or if it would permit a dictionary
subclass.


Undefined Behavior
------------------

The bizarre behavior of the pattern objects was changed in Python 2.7,
but the core issue remains.  As mentioned with the behavior of dicts for
instance, the language has different behavior depending on how the code
was written and the exact semantics of the type system are completely
impossible to understand.

A super bizarre case of these interpreter internals are for instance type
comparisons in Python 2.  This particular case does not exist like that
on Python 3 because the interfaces were changed, but the fundamental
problem can be found on many levels.

Let's take sorting of sets as an example.  Sets in Python are useful
types, but they have very bizarre comparison behavior.  In Python 2 we
have this function called ``cmp()`` which given two types will return a
numeric value that indicates which side is larger.  A return value smaller
than zero means that the first argument is smaller than the second, a
return value of zero means that they are equal and any positive number
means the second value is larger than the first.

Here is what happens if you compare sets:

.. sourcecode:: pycon

    >>> cmp(set(), set())
    Traceback (most recent call last):
      File "<stdin>", line 1, in <module>
    TypeError: cannot compare sets using cmp()

Why is that?  Not exactly sure to be honest.  Probably because of how the
comparison operators are actually set subsets and they could not make that
work with ``cmp()``.  However for instance frozensets compare just fine:

.. sourcecode:: pycon

    >>> cmp(frozenset(), frozenset())
    0

Except when one of the sets is not empty it will fail.  Why?  The answer
to this is that this is not a language feature, but an optimization in the
CPython interpreter.  A frozenset interns common values.  The empty
frozenset is always the same value (as it is immutable and you cannot add
to it), so any empty frozenset is the same object.  When two objects have
the same pointer address, then ``cmp`` will generally return ``0``.  Why
exactly I could not figure out quickly due to how complex the comparison
logic in Python 2 is, but there are multiple code paths in the comparison
routines which might produce this result.

The point is not so much that there is a bug, but that Python does not
actually have proper semantics for how types interact with each other.
Instead the type system's behavior for a really long time has been
"whatever CPython does".

You can find countless of changesets in PyPy where they tried to
reconstruct behavior in CPython.  Given that PyPy is written in Python, it
becomes quite an interesting problem for the language.  If the Python
language was defined purely like the actual Python part of the language
is, PyPy would have a lot less problems.


Instance Level Behavior
-----------------------

Now let's assume there would be a hypothetical version of Python that
fixes all of the problems mentioned, static types would still not be
something that would fit into Python well.  A big reason for this is that
on the Python language level, types traditionally had very little meaning
in regards to how objects interact.

For instance datetime objects are generally comparable with other things,
but datetime objects are only comparable to other datetime objects if
their timezone awareness is compatible.  Similarly the result of many
operations is not clear until you look at the object at hand.  Adding two
strings together in Python 2 can either construct a unicode or a
bytestring object.  APIs like decoding or encoding from the codecs system
can return any object.

Python as a language is too dynamic for annotations to work well.  Just
consider how important generators are for the language, yet generators
could perform different type conversions on every single iteration.

Type annotations would be spotty at best but they might even have negative
impact on API design.  At the very least they will make things slower
unless they are removed at runtime.  They could never implement a language
that compiles efficiently statically without making Python something it is
not.


Baggage and Semantics
---------------------

I think my personal takeaway from Python the language is that it got
ridiculously complex.  Python is a language that suffers from not having a
language specification and already such complex interactions between
different types, that we will probably never end up with one.  There are
so many quirks and odd little behaviors that the only thing a language
specification would ever produce, is a textual description of the CPython
interpreter.

On this foundation it makes very little sense in my mind to put type
annotations.

I think if someone would want to develop another predominantly dynamically
typed language in the future, they should probably go the extra mile to
clearly define how types should work.  JavaScript does a pretty good job
at that.  All semantics of builtin types are clearly defined even if they
are bizarre.  I think this generally is a good thing.  Once you have
clearly defined how the semantics work, you are open to optimize or later
put optional static typing on top.

Keeping a language lean and well defined seems to be very much worth the
troubles.  Future language designers definitely should not make the
mistake that PHP, Python and Ruby did, where the language's behavior ends
up being "whatever the interpreter does".

I think for Python this is very unlikely to ever change at this point,
because the time and work required to clean up language and interpreter
outweighs the benefits.
