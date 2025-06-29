---
tags:
  - python
  - thoughts
summary: |
---

# Python and the Principle of Least Astonishment

When you use something for a long time you will develop some kind of
sensing of what goes together and what does not appear to fit the common
pattern.  The Python community seems to have given this effect a name: if
something matches the common patterns it's “pythonic” if it's not, it's
deemed “unpythonic”.  Most aspects of the language itself are designed to
not surprise you if you use them in case there would be more than one
possible behavior.  This is what many people refer to the [Principle of
Least Astonishment](http://en.wikipedia.org/wiki/Principle_of_least_astonishment)).  In my
mind there are only a handful exceptions to that rule in the language
design which I will cover here as well.

However if you ask beginners in Python where the language does not behave
as expected you will get tons of results.  There is a good reason for
that: most beginners to Python are not beginners to programming.  They
have already a knowledge in some other language and are trying to use that
experience to understand Python.

I guess it would make a lot more sense to teach Python to experienced
programmers by showing them how the idioms in the language work, more than
what control structures there are in Python.  I was quite fond of Raymond
Hettinger's talk about what makes Python unique because he showed a bunch
of small examples that almost exclusively used the good parts of the
standard library and hardly any user written logic.  One example used
`itertools` and the `gzip` module to load a logfile, parse and analyze it.
I found that a very interesting example because it showed that if you do
not think of “I will use a while loop here, here and here, and a condition
there and then I have the first part” but as “this is what I want to do,
this is what I need and am done”.

I think Python does an amazing job by making people look at the broader
picture instead of boring implementation details.

## Why are you Astonished?

But let's assume for a moment that we are talking to a hypothetical new
Python developer that has extensive knowledge in Ruby and Java.  What, if
we ask such a developer, what will their answer be?

Something that comes up incredible often is why Python has a `len()`
function instead of a `.length` or `.size` property or method on the
object.  And by giving that question we already pretty much got the
answer.  Assuming we would not have a function like `len()`, what would
the method be called?  Would it be called `x.getLenght()`?  Or just
`.length()`?  Or would it be `.size()`?  Why have it has a method, why
not have a property instead called `.length`.  Or `.size`.  Or maybe
`.Count` like in C#.

Of course you could standardize that, but nobody would really enforce
that.  If you look at Java in comparison what will we find?  A builtin
array has a field called `.length`.  A builtin string however is an
actual object and has a method called `.length()`.  A map or list in
Java responds to `.size()`.  All the XML APIs in Java will use
`.getLenght()` instead, so will the reflection API for arrays and the
list goes on.

How is it in Ruby?  In Ruby collection objects respond to `.size`.  But
because it looks better almost all of them will also respond `.length`.
However not for every time one is an alias for the other, if you replace
the implementation for one you will also have to update the implementation
for the other or at least redirect the call.  Also just because something
responds to `.size` does not mean it's a collection with a size.  For
instance integers have a `.size` attribute but no `.length`.  And the
size is the number of bytes used to store that number.

How is it in Python?  `len()` returns the length of `x`.  How does it
do that?  It calls the special internal method `.__len__` on `x`.  So
you can still customize it.  Think of `len()` as an operator more than
a function.  So why, if it calls a method on `x`, why can't it just be a
method and let that method be called `.len()`?  In the early days that
might not have been the reason for this decision, but nowadays we are
very glad that this decision was made.  By keeping the special internal
methods named `__something__` instead of just `something` we can adapt
to pretty much any API in Python.  Because none of the regular method
names has any meaning it means we can use those method names for other
things.  Also that way you don't need code completion if you're not
exactly sure what methods you have available.  Does it represent a
collection object?  `len()` in Python will work them, promised.

For instance consider you have a class like this:

```python
class MyAPI(object):

    def get_time(self):
        return 'the current time as string'
```

Imagine we would want to expose all the methods of this class over HTTP
as JSON API or something.  We just iterate over all attributes of that
class that are callable and if they are not starting with an underscore
we expose that.  In Ruby, no chance, why?  Because if a method has a
special meaning cannot be known from the naming.  For instance if you look
at the basic `Object` type in ruby you will find a whole bunch of
methods with special semantics on there: `Object.new` allocates a new
object and initializes it.  `Object.display` prints the object to
standard error etc.  All of these methods we cannot give new meanings
without breaking other people's expectations of how objects in Ruby should
behave.

For instance every object in Ruby used to have an `Object.id` method.
Because it was so generic and frequently changed in semantics it was
renamed to `Object.object_id`.  However also the reverse is true.  In
one of the newer Ruby versions the basic object type got builtin YAML
support.  The `.to_yaml` method name now has a specific meaning attached
and if you were using that previously on your own with different semantics
your code might break now.

This is not a real problem in Ruby because everybody is aware of that and
in general the language was designed to encourage that behavior, but in
Python the whole language design evolves around protocols and special
methods.

In Java you don't have that particular issue because you are explicitly
telling the user of your class that it has a certain behavior by
implementing a specific interface you designed upfront.  That way you can
have one class where `toYAML()` means something entirely different than
`toYAML()` in another class.  For as long as a class does not want to
implement both at the same time there are no real issues.  But the Python
language for a long time did not want to dive into the realms of
interfaces.  With Python 2.6 that changed somewhat with the introduction
of abstract base classes, but those are more duck typing on steroids than
actual interfaces or real base classes (though they can be).

## Protocols

Most collections in Python can be implemented without attaching a single
non-special method!  While it's true that dicts and lists have a bunch of
extra methods to modify them and iterate over them in special ways, these
methods are by no means required.  For example one basic protocol in
Python is that when something has an `.__iter__` method that object is
iterable so you can use the for-loop to iterate over it.  You should not
call `.__iter__` yourself, instead use `iter(x)` if you really need
the iterator.  Why is that?  Why can't I just use `x.__iter__()` and be
happy?  Because having that one function doing that call gives us extra
powers.

For instance in Python if you have something that has a method named
`.__getitem__` (subscript operator `x[y]` == `x.__getitem__(y)`) and
the subscripted object is an integer and the special method will not raise
a lookup error if `0` is passed it means that obviously there is a first
item in the object.  Python will then assume it's iterable and continue to
subscript it incrementing integers (first iteration step is `x[0]`,
second is `x[1]` etc.).  You can easily test this yourself:

```pycon
>>> class Foo(object):
...  def __getitem__(self, x):
...   if x == 10: raise IndexError()
...   return chr(ord('a') + x)
...
>>> list(Foo())
['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j']
```

Why does Python behave this way?  Because it's useful.  Many collections
will be indexed by integers and for as long as nobody wants to have a
different iteration behavior (by implementing `.__iter__`) why not go
with that default.  Here is where `iter()` comes in handy as it knows
about how this `.__getitem__` based fallback works and can provide you
with a regular iterator:

```pycon
>>> a = iter(Foo())
>>> a
<iterator object at 0x100481950>
>>> a.next()
'a'
>>> a.next()
'b'
```

Now if you are asking, why is it `x.next()` and not `next(x)`: an
oversight that was corrected with Python 3.  There it is indeed
`next(x)` which will then call `x.__next__()`.  Why add a function
named `next()` again if all it does is calling another method?  Because
there again it makes sense to add more behavior.  For instance if you
cannot continue iterating in Python it will raise an exception.  If you
are iterating over an iterator by hand it's often very annoying to have to
catch that exception down, this is where `next()` is helpful:

```python
>>> next(iter([]))
Traceback (most recent call last):
  File "<stdin>", line 1, in <module>
StopIteration
>>> next(iter([]), 42)
42
```

## Seemingly Inverse Logic

Another thing that comes up very often where people seem to be surprised
is that it's `", ".join(list)` instead of `list.join(", ")`.  No other
programming language than Python has the joining operating on the string
object, why Python?  It's just a logical conclusion of Python's deep love
with protocols.  Above I said that you can have collections without any
public methods.  In Python 2.x the Tuple type for instance does not expose
any non-special methods and yet you can use it to make a string out of it:

```pycon
>>> tup = ('foo', 'bar')
>>> ', '.join(tup)
'foo, bar'
```

Even better, you can efficiently use this to make a string from a
generator:

```pycon
>>> ', '.join(x.upper() for x in ['foo', 'bar'])
'FOO, BAR'
```

Imagine Python would not work that way.  You would have to convert the
iterable into an actual list first to convert it into a string.  Ruby
people will now argue that Ruby solves this problem with mixing in
modules, and they are certainly correct that this is an option.  But this
is a concious design decision in the language which has many implications.
Python encourages loose coupling by having these protocols where the
actual implementations can be elsewhere.  One object is iterable, another
part in the system knows how to make it into a string.

An earlier implementation for joining of iterators into a string in Python
was the string module which had a `join` function.  This also solved the
same problem, but you needed an extra import and it did not look any nicer
I think:

```python
assert string.join(', ', iterable) == ', '.join(iterable)
```

## Pass by … What Exactly?

Is Python pass by value or pass by reference?  If you ask this question
you're coming probably from a C++ or PHP background and depending on where
you came from the Python experience can be frustrating in one way or
another.  C++ programmer will be annoyed that Python does not support
calling by reference and PHP programmers will be annoyed that Python
always calls by reference.  What?  Yeah, this is exactly what's the
problem.  C++ makes a copy of all objects unless you pass by reference,
PHP has different behavior for arrays or objects.  When either one is your
background you will probably not understand what's happening and be
frustrated.  But that's not something that is Python's fault, that's
because your experience hinted that stuff works different.

A PHP programmer will not expect this:

```pycon
>>> a = [1, 2, 3]
>>> b = a
>>> a.append(4)
>>> b
[1, 2, 3, 4]
```

In PHP if you assign an array to a new variable it will be copied.  What's
even funnier is that there is not even a proper equivalent of what PHP is
doing in Python.  The language was not designed to work that way and you
have to adapt.  What's cheap in PHP is not even possible in Python unless
you do a deep copy of that thing which can be slow.  PHP as a language was
designed to work that way, Python was not.

Likewise in C++ you can actually pass by reference which allows you do
swap things:

```c++
void swap_ints(int &a, int &b)
{
    int tmp = a;
    a = b;
    b = tmp;
}

int a = 1;
int b = 2;
swap_ints(a, b);
/* a == 2 now, b == 1 */
```

Python was never intended to support that.  But if it's just for the
swapping we have something cooler:

```pycon
>>> a = 1
>>> b = 2
>>> a, b = b, a
>>> a, b
(2, 1)
```

## The Actual Surprises

I would argue that within the boundaries of the Python design all these
design decisions make a lot of sense.  If I would have to come up with a
new version of Python, I would not change any of the things mentioned
before.  Also if you are aware of the design ideas behind Python, they
make sense and are easy to remember.  Also because it's a common pattern
all over the language it's hardly something that makes you feel icky after
a month of using the language.

There are however some issues I think could have been better designed:

1. Default parameters to functions are bound at function create time, not
at function evaluation time.  The positive side effects are that it's
faster, and also that it's quite easy to understand how it works with
the scoping rules once you're aware of that behavior.  The downside is
that if you have a mutable object as the default value in that
function and you attempt to modify it, you will notice that this
modification survives the call.

1. The complex literals and the floating point value exponents clash with
the integer literal syntax.  As a side effect of that you can do
`1.0.imag` and `1j.imag` but not `1.imag`.  The latter will only
work if written as `(1).imag` or `1 .imag`.  That's a little bit
sad.

1. Decorators are somewhat of a pain because there is a difference
between `@foo` and `@foo()`.  If they were declared in a way that
the former means the latter we would all be much happier now.  Every
time I want to introduce a parameter to a previously parameterless
decorator makes me want to hit myself and the author of the decorator
PEP with a stick.

## Learning from Mistakes

But then again, afterwards we all know better and without mistakes we
could not have better languages (or even language revisions) in the
future.  And looking back at the lifespan of Python 2.x one can see that a
lot went right in the design and that the language is easy to pick up and
a lot of fun to work with.  And in my mind programs written in Python are
some of the easiest to adapt and maintain.  And that is largely the
product of an amazing language design and decision-making.

And with Python 3 a lot of stuff that was learned was improved.  And I
can only assume it was also learned that making backwards incompatible
releases can be managed at least slightly better. ;-)
