---
tags:
  - python
  - thoughts
summary: "What I would imagine an better Python would look like."
---

# The Python I Would Like To See

It's no secret that I'm not a fan of Python 3 or where the language is
currently going.  This has led to a bunch of emails flying my way over the
last few months about questions about what exactly I would prefer Python
would do.  So I figured I might share some of my thoughts publicly to
maybe leave some food for thought for future language designers :)

Python is definitely a language that is not perfect.  However I think what
frustrates me about the language are largely problems that have to do with
tiny details in the interpreter and less the language itself.  These
interpreter details however are becoming part of the language and this is
why they are important.

I want to take you on a journey that starts with a small oddity in the
interpreter (slots) and ends up with the biggest mistake in the language
design.  If the reception is good there will be more posts like this.

In general though these posts will be an exploration about design
decisions in the interpreter and what consequences they have on both the
interpreter and the resulting language.  I believe this is more
interesting from a general language design point of view than as a
recommendation about how to go forward with Python.

## Language vs Implementation

I added this particular paragraph after I wrote the initial version of
this article because I think it has been largely missed that Python as a
language and CPython as the interpreter are not nearly as separate as
developers might believe.  There is a language specification but in many
cases it just codifies what the interpreter does or is even lacking.

In this particular case this obscure implementation detail of the
interpreter changed or influenced the language design and also forced
other Python implementations to adopt.  For instance PyPy does not know
anything about slots (I presume) but it still has to operate as if slots
were part of the interpreter.

## Slots

By far my biggest problem with the language is the stupid slot system.  I
do not mean the `__slots__` but the internal type slots for special
methods.  These slots are a "feature" of the language which is largely
missed because it is something you rarely need to be concerned with.  That
said, the fact that slots exist is in my opinion the biggest problem of
the language.

So what's a slot?  A slot is the side effect of how the interpreter is
implemented internally.  Every Python programmer knows about "dunder
methods": things like `__add__`.  These methods start with two
underscores, the name of the special method, and two underscores again.
As each developer knows, `a + b` is something like `a.__add__(b)`.

Unfortunately that is a lie.

Python does not actually work that way.  Python internally does actually
not work that way at all (nowadays).  Instead here is roughly how the
interpreter works:

1. When a type gets created the interpreter finds all descriptors on the
class and will look for special methods like `__add__`.

1. For each special method the interpreter finds it puts a reference to
the descriptor into a predefined slot on the type object.

For instance the special method `__add__` corresponds to two
internal slots: `tp_as_number->nb_add` and
`tp_as_sequence->sq_concat`.

1. When the interpreter wants to evaluate `a + b` it will invoke
something like `TYPE_OF(a)->tp_as_number->nb_add(a, b)` (more
complicated than that because `__add__` actually has multiple
slots).

So on the surface `a + b` does something like `type(a).__add__(a, b)`
but even that is not correct as you can see from the slot handling.  You
can easily verify that yourself by implementing `__getattribute__` on a
metaclass and attempting to hook a custom `__add__` in.  You will notice
that it's never invoked.

The slot system in my mind is absolutely ridiculous.  It's an optimization
that helps for some very specific types in the interpreter (like integers)
but it actually makes no sense for other types.

To demonstrate this, consider this completely pointless type (`x.py`):

```python
class A(object):
    def __add__(self, other):
        return 42
```

Since we have an `__add__` method the interpreter will set this up in a
slot.  So how fast is it?  When we do `a + b` we will use the slots, so
here is what it times it as:

```
$ python3 -mtimeit -s 'from x import A; a = A(); b = A()' 'a + b'
1000000 loops, best of 3: 0.256 usec per loop
```

If we do however `a.__add__(b)` we bypass the slot system.  Instead the
interpreter is looking in the instance dictionary (where it will not find
anything) and then looks in the type's dictionary where it will find the
method.  Here is where that clocks in at:

```
$ python3 -mtimeit -s 'from x import A; a = A(); b = A()' 'a.__add__(b)'
10000000 loops, best of 3: 0.158 usec per loop
```

Can you believe it: the version without slots is actually faster.  What
magic is that?  I'm not entirely sure what the reason for this is, but it
has been like this for a long, long time.  In fact, old style classes
(which did not have slots) where much faster than new style classes for
operators and had more features.

More features?  Yes, because old style classes could do this (Python
2.7):

```pycon
>>> original = 42
>>> class FooProxy:
...  def __getattr__(self, x):
...   return getattr(original, x)
...
>>> proxy = FooProxy()
>>> proxy
42
>>> 1 + proxy
43
>>> proxy + 1
43
```

Yes.  We have less features today than we had in Python 2 for a more
complex type system.  Because the code above cannot be done with new style
classes and more.  It's actually worse than that if you consider how
lightweight oldstyle classes were:

```pycon
>>> import sys
>>> class OldStyleClass:
...  pass
...
>>> class NewStyleClass(object):
...  pass
...
>>> sys.getsizeof(OldStyleClass)
104
>>> sys.getsizeof(NewStyleClass)
904
```

## Where do Slots Come From?

This raises the question why slots exist.  As far as I can tell the slot
system exists because of legacy more than anything else.  When the Python
interpreter was created initially, builtin types like strings and others
were implemented as global and statically allocated structs which held all
the special methods a type needs to have.  This was before `__add__` was
a thing.  If you check out a Python from 1990 you can see how objects were
built back then.

This for instance is how integers looked:

```c
static number_methods int_as_number = {
    intadd, /*tp_add*/
    intsub, /*tp_subtract*/
    intmul, /*tp_multiply*/
    intdiv, /*tp_divide*/
    intrem, /*tp_remainder*/
    intpow, /*tp_power*/
    intneg, /*tp_negate*/
    intpos, /*tp_plus*/
};

typeobject Inttype = {
    OB_HEAD_INIT(&Typetype)
    0,
    "int",
    sizeof(intobject),
    0,
    free,       /*tp_dealloc*/
    intprint,   /*tp_print*/
    0,          /*tp_getattr*/
    0,          /*tp_setattr*/
    intcompare, /*tp_compare*/
    intrepr,    /*tp_repr*/
    &int_as_number, /*tp_as_number*/
    0,          /*tp_as_sequence*/
    0,          /*tp_as_mapping*/
};
```

As you can see, even in the first version of Python that was ever
released, `tp_as_number` was a thing.  Unfortunately at one point the
repo probably got corrupted for old revisions so in those very old
releases of Python important things (such as the actual interpreter) are
missing so we need to look at little bit into the future to see how these
objects were implemented.  By 1993 this is what the interpreter's add
opcode callback looked like:

```c
static object *
add(v, w)
    object *v, *w;
{
    if (v->ob_type->tp_as_sequence != NULL)
        return (*v->ob_type->tp_as_sequence->sq_concat)(v, w);
    else if (v->ob_type->tp_as_number != NULL) {
        object *x;
        if (coerce(&v, &w) != 0)
            return NULL;
        x = (*v->ob_type->tp_as_number->nb_add)(v, w);
        DECREF(v);
        DECREF(w);
        return x;
    }
    err_setstr(TypeError, "bad operand type(s) for +");
    return NULL;
}
```

So when were `__add__` and others implemented?  From what I can see they
appear in 1.1.  I actually managed to get a Python 1.1 to compile on OS X
10.9 with a bit of fiddling:

```
$ ./python -v
Python 1.1 (Aug 16 2014)
Copyright 1991-1994 Stichting Mathematisch Centrum, Amsterdam
```

Sure.  It likes to crash and not everything works, but it gives you an
idea of how Python was like back then.  For instance there was a huge
split between types implemented in C and Python:

```
$ ./python test.py
Traceback (innermost last):
  File "test.py", line 1, in ?
    print dir(1 + 1)
TypeError: dir() argument must have __dict__ attribute
```

As you can see, no introspection of builtin types such as integers.  In
fact, while `__add__` was supported for custom classes, it was a whole
feature of custom classes:

```
>>> (1).__add__(2)
Traceback (innermost last):
  File "<stdin>", line 1, in ?
TypeError: attribute-less object
```

So this is the heritage we even today have in Python.  The general layout
of a Python type has not changed but it was patched on top for many, many
years.

## A Modern PyObject

So today many would argue the difference between a Python object
implemented in the C interpreter and a Python object implemented in actual
Python code is very minimal.  In Python 2.7 the biggest difference seemed
to be that the `__repr__` that was provided by default reported
`class` for types implemented in Python and `type` for types
implemented in C.  In fact this difference in the repr indicated if a type
was statically allocated (`type`) or on dynamically on the heap
(`class`).  It did not make a practical difference and is entirely gone
in Python 3.  Special methods are replicated to slots and vice versa.  For
the most part, the difference between Python and C classes seems to have
disappeared.

However they are still very different unfortunately.  Let's have a look.

As every Python developer knows, Python classes as "open".  You can look
into them, see all the state they store, detach and reattach method on
them even after the class declaration finished.  This dynamic nature is
not available for interpreter classes.  Why is that?

There is no technical restriction in itself of why you could not attach
another method to, say, the `dict` type.  The reason the interpreter
does not let you do that actually has very little to do with programmer
sanity in the first place as the fact that builtin types are not on the
heap.  To understand the wide ranging consequences of this you need to
understand how the Python language starts the interpreter.

## The Damn Interpreter

In Python the intepreter startup is a very expensive process.  Whenever
you start the Python executable you invoke a huge machinery that does
pretty much everything.  Among other things it will bootstrap the internal
types, it will setup the import machinery, it will import some required
modules, work with the OS to handle signals and to accept the command line
parameters, setup internal state etc.  When it's finally done it will run
your code and shut down.  This is also something that Python is doing like
this for 25 years now.

In pseudocode this is how this looks like:

```c
/* called once */
bootstrap()

/* these three could be called in a loop if you prefer */
initialize()
rv = run_code()
finalize()

/* called once */
shutdown()
```

The problem with this, is that Python's interpreter has a huge amount of
global state.  In fact, you can only have one interpreter.  A much better
design would be to setup the interpreter and run something on it:

```c
interpreter *iptr = make_interpreter();
interpreter_run_code(iptr):
finalize_interpreter(iptr);
```

This is in fact how many other dynamic languages work.  For instance this
is how lua implementations operate, how javascript engines work etc.  The
clear advantage is that you can have two interpreters.  What a novel
concept.

Who needs multiple interpreters?  You would be surprised.  Even Python
needs them or at least thought they are useful.  For instance those exist
so that an application embedding Python can have things run independently
(for instance think web applications implemented in `mod_python`.  They
want to run in isolation).  So in Python there are sub interpreters.  They
work within the interpreter but because there is so much global state.
The biggest piece of global state is also the most controversial one: the
global interpreter lock.  Python already decided on this one interpreter
concept so there is lots of data shared between subinterpreters.  As those
are shared there needs to be a lock around all of them, so that lock is on
the actual interpreter.  What data is shared?

If you look at the code I pasted above you can see these huge structs
sitting around.  These structs are actually sitting around as global
variables.  In fact the interpreter exposes those type structs directly to
the Python code.  This is enabled by the `OB_HEAD_INIT(&Typetype)` macro
which gives this struct the necessary header so that the interpreter can
work with it.  For instance in there is the refcount of the type.

Now you can see where this is going.  These objects are shared between sub
interpreters.  So imagine you could modify this object in your Python
code.  Two completely independent pieces of Python code that have nothing
to do with each other could change each other's state.  Imagine this was
in JavaScript and the Facebook tab would be able to change the
implementation of the builtin array type and the Google tab would
immediately see the effects of this.

This design decision from 1990 or so still has ripples that can be felt
today.

On the bright side, the immutability of builtin types has generally been
accepted as a good feature by the community.  The problems of mutable
builtin types has been demonstrated by other programming languages and
it's not something we missed much.

There is more though.

## What's a VTable?

So Python types coming from C are largely immutable.  What else is
different though?  The other big difference also has to do with the open
nature of classes in Python.  Classes implemented in Python have their
methods as "virtual".  While there is no "real" C++ style vtable, all
methods are stored on the class dictionary and there is a lookup
algorithm, it boils down to pretty much the same.  The consequences are
quite clear.  When you subclass something and you override a method, there
is a good chance another method will be indirectly modified in the process
because it's calling into it.

A good example are collections.  Lots of collections have convenience
methods.  As an example a dictionary in Python has two methods to retrieve
an object from it: `__getitem__()` and `get()`.  When you implement a
class in Python you will usually implement one through the other by doing
something like `return self.__getitem__(key)` in `get(key)`.

For types implemented by the interpreter that is different.  The reason is
again the difference between slots and the dictionary.  Say you want to
implement a dictionary in the interpreter.  Your goal is to reuse code
still, so you want to call `__getitem__` from `get`.  How do you go
about this?

A Python method in C is just a C function with a specific signature.  That
is the first problem.  That function's first purpose is to handle the
Python level parameters and convert them into something you can use on the
C layer.  At the very least you need to pull the individual arguments from
a Python tuple or dict (args and kwargs) into local variables.  So a
common pattern is that `dict__getitem__` internally does just the
argument parsing and then calls into something like `dict_do_getitem`
with the actual parameters.  You can see where this is going.
`dict__getitem__` and `dict_get` both would call into `dict_get`
which is an internal static function.  You cannot override that.

There really is no good way around this.  The reason for this is related
to the slot system.  There is no good way from the interpreter internally
issue a call through the vtable without going crazy.  The reason for this
is related to the global interpreter lock.  When you are a dictionary your
API contract to the outside world is that your operations are atomic.
That contract completely goes out of the window when your internal call
goes through a vtable.  Why?  Because that call might now go through
Python code which needs to manage the global interpreter lock itself or
you will run into massive problems.

Imagine the pain of a dictionary subclass overriding an internal `dict_get`
which would kick off a lazy import.  You throw all your guarantees out of
the window.  Then again, maybe we should have done that a long time ago.

## For Future Reference

In recent years there is a clear trend of making Python more complex as a
language.  I would like to see the inverse of that trend.

I would like to see an internal interpreter design could be based on
interpreters that work independent of each other, with local base types
and more, similar to how JavaScript works.  This would immediately open up
the door again for embedding and concurrency based on message passing.
CPUs won't get any faster :)

Instead of having slots and dictionaries as a vtable thing, let's
experiment with just dictionaries.  Objective-C as a language is entirely
based on messages and it has made huge advances in making their calls
fast.  Their calls are from what I can see much faster than Python's calls
in the best case.  Strings are interned anyways in Python, making
comparisons very fast.  I bet you it's not slower and even if it was a
tiny bit slower, it's a much simpler system that would be easier to
optimize.

You should have a look through the Python codebase how much extra logic is
required to handle the slot system.  It's pretty incredible.

I am very much convinced the slot system was a bad idea and should have
been ripped out a long ago.  The removal might even have benefited PyPy
because I'm pretty sure they need to go out of the way to restrict their
interpreter to work like the CPython one to achieve compatibility.
