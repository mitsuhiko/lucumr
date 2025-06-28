public: yes
tags: [rust, thoughts]
summary: |
  Look at a tiny syntax detail that shows up in current versions of rust
  that has profound implications on how the language deals with almost
  everything being an expression.

Such a Little Thing: The Semicolon in Rust
==========================================

I was very happy to see `Rust <http://www.rust-lang.org/>`_ 0.4 being
released yesterday.  It's the first language in a really long time that
genuinely interests me.  It might be the next language besides C, C# and
Python that I would really enjoy.  The language design strikes such an
exciting balance between doing new things and staying familiar enough to
feel easy to pick up.

One of the exciting things of Rust is how it learns from other languages
before in an experimental way.  The language is designed and overthrown as
it's being used and seeing the process unfold is very reminiscent of how
Python's early days must have looked like.

One of the surprising features of Rust is how it deals with statement
termination and it has not been without criticism.  Personally: I am
absolutely in love with how it does it but I have seen some people being
very opposed to it.  So here is me explaining why I think it's the best
thing since sliced bread.

What Ruby does that Python Lacks
--------------------------------

Before we can get to that, we need to do a detour into the dynamic
language camp, mostly into the Ruby and Python camps.  The languages seem
familiar on the surface but they are actually very far apart.  In fact,
the languages could not be different in many ways.  One of the most
striking differences is how Ruby and Python deal with methods and
statements versus expressions.

In Python everything is an object and that includes functions.  In fact
calling it a function would be wrong, Python programmers like to call them
callables.  The reason for that is that there are a lot of things you can
call but they behave differently in their lowlevel implementations.
That's something you will not notice as a Python novice but it certainly
shows up at times, especially when it comes to changing the implementation
and exposing unintended side effects.

For instance ``str()`` in Python used to be a function and was later
converted into a type.  ``dir()`` in Python is a builtin function whereas
``quit()`` is an instance of a quitter type.  ``cgi.escape()`` is a
“function”.  On the surface they all work exactly the same, but really the
only thing they have in common is that you can call them.

In Ruby there are no functions, instead there are objects that have
methods.  The idea is that instead of invoking a method on an object you
send a message to an object, at least that is the original design.  Not
having functions has some profound implications.  The most obvious one is
that without first class functions, functional programming works
differently.  Ruby developers will generally tell you that functional
programming works better in Ruby than it does in Python and will point out
that blocks are preferable over anonymous functions.  What are blocks?
They are basically syntactic sugar to create an object (called a ``Proc``)
with a method called ``call`` that can be invoked.  This proc is then
passed to a function in a special parameter.

Let's talk a bit more practice here.  Given a list of four numbers, here
is how you would calculate the power of two for each item.

First in Python:

.. sourcecode:: pycon

    >>> def power_it(x):
    ...  return x ** 2
    ... 
    >>> map(power_it, [1, 2, 3, 4])
    [1, 4, 9, 16]

Then in Ruby:

.. sourcecode:: irb
   
    >> [1, 2, 3, 4].map { |x| x ** 2 }
    => [1, 4, 9, 16]

The Python version is obviously not the way you would write that in
Python.  Making a function like this is not very useful.  Instead what you
do in Python is either using a list comprehension (avoiding the problem)
or to use the ``lambda`` keyword that allows you to create an unnamed
function that has a single expression as body.  Let's ignore that for a
moment though.  The example above shows something very interesting: it
shows how different the languages treat expressions.

In Python there are statements and expressions.  The syntax allows for
statements to contain other statements and expressions to contain other
expressions.  If an expression is used in the spot where a statement is
expected it's wrapped in what the grammar calls an “expression statement”.
The purpose of the expression statement is to throw away the resulting
value of the expression.  This is obvious in both the syntax
representation as well as the bytecode.

Take this very benign example:

.. sourcecode:: python

    foo()

On a syntax level this is the representation:

.. sourcecode:: python

    Module(body=[Expr(value=Call(func=Name(id='foo', ctx=Load()),
                                 args=[], keywords=[],
                                 starargs=None, kwargs=None))])

The call appears on module level, a module has multiple statements in the
body.  In this case it calls the name “foo” (which is loaded) with no
arguments or keyword arguments of any sort.  Since it's an expression it
is wrapped in an ``Expr`` node.  This allows an expression to be used
there and also then tells the code generator to throw away the result.
This would be the bytecode for it::

      2           0 LOAD_GLOBAL              0 (foo)
                  3 CALL_FUNCTION            0
                  6 POP_TOP

It tells the interpreter: load the value for the global variable “foo”,
then call it without arguments, then throw away the return value.

This is very different from Ruby.  In Ruby many statements are implemented
in a way that they are either expressions or at least behave in such a
way.  The language also very often does not throw away values like Python
does.  This is helpful because for instance methods return the value of
the last expression when they return.  Ruby follows that design mantra to
ridiculous ways.  For instance the following example defines a variable
called ``foo`` and an empty class ``Bar`` where ``foo`` contains the last
expression within ``Bar``\'s body:

.. sourcecode:: irb

    >> foo = class Bar
    >>   42
    >> end
    => 42
    >> foo
    => 42

(Notice also how the assignment is also an expression that returns the
value that was assigned in the expression)

Neat idea huh?  But there is also a problem with that, and that's that you
could return something as a side effect.  For instance imagine you have a
function that acts as a setter in ruby:

.. sourcecode:: irb

    >> class Foo
    >>  def set_x val
    >>   @x = val
    >>  end
    >> end
    => nil
    >> f = Foo.new
    => #<Foo:0x007fcaa09b1500>
    >> f.set_x 42
    => 42

The setter now returns the value as a side-effect.  Since you can just
ignore that in Ruby it's generally not a problem, but people might now
start to rely on that.  Very often people are countering that problem by
writing ``nil`` at the end of the function to prevent the unintended
result:

.. sourcecode:: irb

    >> class Foo
    >>  def set_x val
    >>   @val = val
    >>   nil
    >>  end
    >> end
    => nil
    >> f = Foo.new
    => #<Foo:0x007feab11af4e8>
    >> f.set_x 42
    => nil

I can already see the argument that is brought up against that example
from people doing more Ruby than me which is that nobody writes setters in
Ruby.  That is correct since ruby as special callback methods for setting
attributes.  The reason I did not use them is because they have their own
semantics attached where the return value of the setter is ignored and
overridden with the right hand of the assignment:

.. sourcecode:: irb

    >> class Foo
    >>  def x= val
    >>   @x = val
    >>   nil
    >>  end
    >> end
    => nil
    >> f = Foo.new
    => #<Foo:0x007fa17b92ff80>
    >> f.x = 42
    => 42

Blocks are not Functions
------------------------

So let's stick with Ruby for a bit.  Often it's argued that blocks are
basically just anonymous functions.  That however is not the case because
they do more things than just functions, and that's important due to how
the language works.  Notice how we did not use ``return`` anywhere in the
above examples despite the fact that ruby has ``return``.  That's because
``return`` is doing something else than just returning the last value when
used within a block.  A ``return`` within a block returns from the calling
scope (which is pretty crazy if you think about it):

.. sourcecode:: irb

    >> def foo
    >>  [1, 2, 3].each { |x| puts x; return 42; }
    >> end
    => nil
    >> foo
    1
    => 42

How does it do that?  It users interpreter internal magic by setting a
jump point before the invocation.  That also means the block behaves
differently when returned from the function:

.. sourcecode:: irb

    >> def foo
    >>  Proc.new { return 42 }
    >> end
    => nil
    >> p = foo
    => #<Proc:0x007ff25b0efda8@(irb):10>
    >> p.call
    LocalJumpError: unexpected return
        from (irb):10:in `block in foo'
        from (irb):13:in `call'

So it's pretty clear that blocks are a whole different beast and pretty
much require the fact that the last expression is the return value from
the block since ``return`` is there to have other purposes.  Why does
``return`` return from the calling method and not the block?  That's
because of how iteration works in Ruby.  Iteration is implemented exactly
the other way round compared to Python.  In Python iteration works by
creating an iterator that can be called to produce more values until an
exception is raised.  If needs be that iterator keeps a interpreter frame
alive in a suspended state (called generators in Python).

In Ruby iteration is implemented by letting something call a block
repeatedly until the end of the iteration.  The interpreter provides jump
points in order to implement skipping or breaking the iteration.  A
``continue`` is implemented as a form of jumping to the end of the block,
a ``break`` is implemented by jumping past the call to the iterator
function.  Without the ``return`` it would be very awkward to return
something from the function.  Imagine a function that returns the first
even item from a list:

.. sourcecode:: irb

    >> def find_even iterable
    >>  iterable.each { |x| return x if x % 2 == 0 }
    >> end
    => nil
    >> find_even [1, 3, 5, 6]
    => 6

Imagine the non-local return was not available, you would have to rewrite
it like this:

.. sourcecode:: irb

    >> def find_even iterable
    >>  done = false
    >>  rv = nil
    >>  iterable.each { |x|
    >>   if x % 2 == 0
    >>    done = true
    >>    rv = x
    >>    break
    >>   end
    >>  }
    >>  rv
    >> end

Back to Rust
------------

Now what does any of this have to do with Rust?  Quite a lot actually.  If
you have not paid much attention to Rust here is a very short primer of
what the language is about: compile time verification of a lot of things.
The language is designed to catch many errors at compile time.  It's
operating on a similar low level than C or C++ do so you get direct access
to memory if you want, but it will still verify at compile time that you
are never dealing with uninitialized memory by accident.

The way it does that is by using different pointer types with different
associated semantics.  You have pointers where the compiler determines
statically that at any point in time there is only one owner, there are
pointers with limited garbage collection and there are pointers that are
lent memory temporarily.  There is a lot more to the language, but that's
the most important aspect of it if you have no idea of the language
otherwise.

This has a lot of implications of how the language works.  For instance
it's quite easy to give a loan to memory if you can guarantee that a
caller will only temporarily use the memory (for the duration of the
call).  All you need to do is to verify that the value never persists for
longer than the duration of the call.  If you think about it: that's how
iteration in ruby works as well.  You have a block that closes over some
variables and that closure lives for as long as the iteration is ongoing.

Rust in fact models it's iteration model very close to ruby and even uses
some of the same syntax.  The iteration protocol however itself works
slightly different by utilizing the return value to indicate a break or
continue.

In accordance with Rust's memory model there are different “blocks”
(called closures) as well.  Here is also where Rust diverges from Ruby.
In Ruby a block is a syntactical suffix to a method invocation, in Rust a
closure is a syntactical construct that can stand on itself.  Closures can
either be stored on the stack (perfect for things like iteration) or be
tracked by the garbage collector or unique in which case only one variable
at the time can own the memory.

In this example I'm only talking about stack stored closures which are
special in a number of ways.  The first and most obvious one is that the
syntax looks slightly different (basically like ruby blocks) but also that
they can only be passed around, not stored.  They additionally also have
compiler support which I will come to later.

As mentioned, the syntax for closures is ruby inspired:

.. sourcecode:: ruby

    /* a closure that takes a variable, creates the power of two and
       returns it */
    |x: int| -> int { x ** 2 }

Since Rust has powerful type inference the type annotations can be ignored
in places where such a closure is passed as a callback to something else.
For instance the map example from above in Rust looks very much like Ruby:

.. sourcecode:: ruby

    let powers = [1, 2, 3, 4].map(|x| { x ** 2 });

In fact, you can even leave out the braces if they only contain a single
expression:

.. sourcecode:: ruby

    let powers = [1, 2, 3, 4].map(|x| x ** 2);

Looks like it can only hold an expression, but in fact in Rust — like in
Ruby — almost everything is an expression.  For instance you could do this
if you want:

.. sourcecode:: ruby

    let powers = [1, 2, 3, 4].map(|x| {
        let power = x * 2;
        power
    })

Like in Ruby, the last expression returns.  But it comes with a twist.
Notice how there is a lack of semicolon at the end?

The Semicolon!
--------------

Now we finally arrive where I wanted to go all the time: the semicolon in
Rust.  So Rust shares with Ruby that almost everything is an expression,
but Rust also has static typing with type inference.  That can very much
be asking for trouble due to unintended side effects of the last
expression.  For instance remember how the assignment in Ruby leaks the
right hand side in the expression?  That would be quite annoying in Rust
where the closure would suddenly return a value that is not expected by
the caller's callback signature.

Rust has solved that problem currently in an incredible elegant way and
that is by giving the presence or absence of the semicolon a meaning.

Trailing semicolon in the last expression in a block means: ignore value
(or convert it to “nil” (``()``)), the absence of it means to bubble up
that expression.

Before we go further with that I want to point out how amazing semicolons
are.  I love extreme solutions because they are generally more stable than
some wonky ideas in between.  Python for instance has a very strong stance
on statement termination: newlines terminate statements.  C has one as
well:  semicolons terminate statements.  JavaScript `is flailing
</2011/2/6/automatic-semicolon-insertion/>`_.  Are semicolons annoying to
type?  Probably, I got used to them.  But the alternative to semicolons is
making line endings significant.  Ruby gets away quit well with (what I
think is magic or with) some sort of controlled chaos in the grammar.

I really despise what Erlang is doing where the semicolon is not a
terminator but a separator and a dot is used as terminator.  Why?  Because
it makes for awkward diffs where you affect the line before if you add a
new statement.  I understand why Erlang does it, but that does not make it
a good idea.

So hereby I declare: I love semicolons and I love languages that take a
strong stance on them.  Semicolons in Rust have a lot of value.

Since only the last expression can be bubbled anyways the fact that the
last semicolon can be present or absent does not even cause a problem in
the language grammar.  Some semicolon terminated grammars traditionally
did not care about the last semicolon in a block anyways (like PHP or CSS
for instance).

Iteration Protocol
------------------

So why is Rust not requiring an explicit return?  Well first of all
because it would be ugly, but secondly because it shares part of the
iteration protocol with Ruby.  For instance here is the Rust version of
accepting a list of values and returning the first even one:

.. sourcecode:: ruby

    fn find_even(vector: &[int]) -> Option<int> {
        for vector.each |x| {
            if *x % 2 == 0 {
                return Some(*x);
            }
        }
        None
    }

Since the language is statically typed and the type system is algebraic
there is no special `null` type that can be used for any value.  As such
the return value from the function is either the value wrapped or None.
Also the iterator yields pointers that need to be dereferences, but ignore
that part for the moment.  The important part is the ``return``.  It's
inside a stack closure yet it returns from the outer function.  How the
hell does that work?  And what's that ``for`` statement.  Let's answer the
latter question first.  The function above could be rewritten like this:

.. sourcecode:: ruby

    fn find_even(vector: &[int]) -> Option<int> {
        let mut rv: Option<int> = None;
        vector.each(|x| {
            if *x % 2 == 0 {
                rv = Some(*x);
                false
            } else {
                true
            }
        });
        rv
    }

As you can see, the iteration callback closure has a return value by
itself and that is the indication if the iteration should continue or
terminate.  The ``for`` statement is a neat little syntax abstraction
around the iteration protocol that adds the ``return true`` and ``return
false`` for you to make it look nicer.  Since the return at that point is
up for new use it can be repurposed to mean “return from outer function”,
and that's what it does.  So Rust, like Ruby benefits greatly from having
the ``return`` up for other use.

Why is Rust using Ruby style iteration and not Python style iteration?
Because it's much easier to understand given the restrictions the type
system gives you.  It's a small price to pay for what the language gives
you in return.

Intermission: Make it Generic
-----------------------------

One thing that should be noted here is that unlike the Python or Ruby
version this will not work for floating point values.  Traditionally that
particular example is really hard to implement in languages that have
generics and not full templates.  This however is still somewhat
trivially solvable in Rust due to the support of the language.  The
following would be a version of ``find_first_even`` for arbitrary numbers:

.. sourcecode:: ruby

    fn find_even<T: Copy num::Num cmp::Eq>(vec: &[T]) -> Option<T> {
        let zero: T = num::from_int(0);
        let two: T = num::from_int(2);
        for vec.each |x| {
            if *x % two == zero {
                return Some(*x);
            }
        }
        return None;
    }

The function becomes generic and some trait requirements are defined.  The
type has to be a number and a number that can be compared with the
equivalency operator.  Since we are now dealing with arbitrary numbers
literals directly are no longer possible.  Instead we need to use
``num::from_int(0)`` and have that convert into a value of the specific
number type before we can use it in the comparison expression.  But even
with all that extra stuff, it's still very readable code and *possible*.
Something that cannot be said about generics in C# for instance.

The Semicolon Matters
---------------------

Now given all these things, here is why the semicolon trick is awesome.
From the iteration example you see the explicit ``return`` is not really
an option because it's too important.  So what's the downside of always
returning the last value?  The downside is that you would have to put
``()`` (Rust's version of “nil”) in a bunch of functions to fulfil the
requirements of the callback's signature since otherwise the type inferred
from the function would be the value of the last expression.  This would
be especially annoying if different branches yield different types.
Imagine a callback with an if where the first branch assigns a string and
the second assigns an integer.  The compiler would in this case complain
that the function returns inconsistent types.

And this is why the special behavior of the semicolon in Rust is pretty
clever design.  Brings the nice effects of everything being an expression
like in Ruby into a statically typed environment without becoming a pain
to use and unintended side-effects.
