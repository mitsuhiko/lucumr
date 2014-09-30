public: yes
tags: [thoughts, rust, python]
summary: |
  An updated report on my experience with Rust and where I think it might
  be going.

A Fresh Look at Rust
====================

I have been programming with Rust for quite a long time now but that does
not mean much.  Rust has been changing for years now in such dramatic
ways that coming back after two months feels almost like working in a
different language.  One thing however never changed: the trajectory.
With every update, with every modification the whole thing became better
and better.

There is still no end to the changes in sight but it feels a lot more
stable now than a few months ago, and some API design patterns begin to
emerge.  I felt like now is a good time to explore this a bit more and
started to rewrite my `redis library
<http://github.com/mitsuhiko/redis-rs>`_ to fit better into the scope of
the language.


Where is Rust Positioned?
-------------------------

The three languages where I do most of my work in are Python, C and C++.
To C++ I have a very ambivalent relationship because I never quite know
which part of the language I should use.  C is straightforward because the
language is tiny.  C++ on the other hand has all of those features where
you need to pick yourself a subset that you can use and it's almost
guaranteed that someone else picks a different one.  The worst part there
is that you can get into really holy wars about what you should be doing.
I have a huge hatred towards both the STL and boost and that has existed
even before I worked in the games industry.  However every time the topic
comes up there is at last someone who tells me I'm wrong and don't
understand the language.

Rust for me fits where *I* use Python, C and C++ but it fills that spot in
very different categories.  Python I use as language for writing small
tools as well as large scale server software.  Python there works well for
me primarily because the ecosystem is large and when it breaks it's a
super straightforward thing to debug.  It also keeps stays running and can
report if things go wrong.

However one interesting thing about Python is that unlike many other
dynamic languages, Python feels very predictable.  For me this is largely
because I am a lot less dependent on the garbage collector that in many
other languages.  The reason for this is that Python for me means CPython
and CPython means refcounting.  I'm the guy who will go through your
Python codebase and break up cycles by introducing weak references.  Who
will put a refcount check before and after requests to make sure we're not
building up cycles.  Why?  Because I like when you can reason about what
the system is doing.  I'm not crazy and will disable the cycle collector
but I want it to be predictable.

Sure, Python is slow, Python has really bad concurrency support, the
interpreter is quite weak and it really feels like it should work
differently, but it does not cause me big problems.  I can start it and it
will still be there and running when I come back a month afterwards.

Rust is in your face with memory and data.  It's very much like C and C++.
However unlike C and C++ it feels more like you're programming with Python
from the API point of view because of the type inference and because the
API of the standard library was clearly written with programmer
satisfaction in mind.


You will run into Walls
-----------------------

I think an interesting thing about programming in Rust is that in the
beginning you will run into walls.  It's clearly not Python so lots of
things you can get away with in Python do not work in Rust.  At the same
time it's not C++ and the borrow checker will become your greatest enemy.
You will write some code and say: this stuff really should work, why do
you think you know better and stop me from doing this you stupid thing?

The truth is that the borrow checker is not perfect.  The borrow checker
prevents you from doing dangerous things and it does that.  However it
often feels too restrictive.  In my experience though the borrow checker
actually is wrong much less often than you think it is and just requires
you to think a bit differently.

I like the borrow checker personally a lot.  I agree with that sometimes
you feel there should be a way to disable it, but when you think more
about it you are quite happy it's there.  The borrow checker prevents you
from building up some of the worst technical debt you can acquire, the
kind of debt which you can never repay.  The Python programming language
acquired a global interpreter lock when it got threading support and it
really required it ever since the language existed.  The interpreter was
written in a way that nowadays we are not sure how to make it concurrent.

If you try, you can still make terrible decisions for concurrency in Rust,
but you really need to go out of your way to do it.  The language forces
you to think more and I believe that's a good thing.  I don't want to
become another "objective oriented programming is the billion dollar
mistake" preacher but I do think that the language decides largely what
code people write.  Because subclassing is easy in C++, Java, Python and
many more languages this is what we write.  And then birds are instances
of animal classes.  If you take that tool away you start thinking
differently and that's a good thing.  CPUs stop getting faster and looking
at one object at the time really no longer makes any sense at all.  We
need to start reasoning a lot more about collections of things and what
transformations we actually want to do.


Rust Inspires
-------------

For me programming in Rust is pure joy.  Yes I still don't agree with
everything the language currently forces me to do but I can't say I have
enjoyed programming that much in a long time.  It gives me new ideas how
to solve problems and I can't wait for the language to get stable.

Rust is inspiring for many reasons.  The biggest reason I like it is
because it's practical.  I tried Haskell, I tried Erlang and neither of
those languages spoke "I am a practical language" to me.  I know there are
many programmers that adore them, but they are not for me.  Even if I
could love those languages, other programmers would never do and that
takes a lot of enjoyment away.

Rust is something that anyone can pick up and it's fun all around.  First
of all (unless you hit a compiler bug) it won't crash on you.  It also
gives you nice error messages if it fails compiling.  Not perfect, but
pretty good.  It comes with a package manager that handles dependencies
for you, so you can start using libraries other people wrote without
having to deal with a crappy or non existing ecosystem.  Python got much
better over the years but packaging is still the biggest frustration
people have.  `Cargo <http://crates.io/>`_ (rust's package manager) is
barely half a year old, but it has a full time developer on it and it's
fun to use.

Even just the installation experience of the language is top notch.  It
gives you compiler + documentation tool + package manager and you're good
to go.  The fact alone that it has a documentation tool that spits out
beautifully looking documentation out of the box is a major contributor to
enjoying programming in it.  While I wish it had a bit more of Sphinx and
a bit less of javadoc, it's a really good start for more.

But what's really inspiring about Rust are the small things.  When I first
played with Rust what amazed me the most was the good FFI support.  Not
only could you call into C libraries easily: it also found and linked them
for you.  There is so much more though and it's hidden everywhere.  There
is a macro (``include_str!``) that will read a file next to your source at
compile time into a string into your binary (How cool is that!?).  Not
can you bake in contents of files, you can also pull environment variables
into your binaries for instance.


Designing APIs
--------------

The most interesting part currently is definitely finding out how to
properly write APIs for Rust.  Rust as a language is undoubtedly more
complex than most other but thankfully not in a way that it overwhelms
you.  What makes Rust complex from an API point of view is that as a
programmer you feel a bit of a tension between writing the straightforward
code that you expect when programming in a systems language and providing
a nice high level API like you expect in Python.

The reason I feel making nice APIs is because the language encourages it.
First of all the language in itself is super expressive and it makes a lot
of fun to write things in it — on the other hand there is just so much
possibility.

To give you an idea why it's fun to design APIs for Rust is that the type
system is just so damn good.  So Rust is statically type checked but it
has inference so you get away with writing really beautiful code.  In my
rust driver for instance, you can write code like this:

.. sourcecode:: rust

    extern create redis;

    fn main() {
        let client = redis::Client::open("redis://127.0.0.1/").unwrap();
        let con = client.get_connection().unwrap();

        let (k1, k2) : (i32, i32) = redis::pipe()
            .cmd("SET").arg("key_1").arg(42i).ignore()
            .cmd("SET").arg("key_2").arg(43i).ignore()
            .cmd("GET").arg("key_1")
            .cmd("GET").arg("key_2").query(&con).unwrap();

        println!("result = {}", k1 + k2);
    }

To give you an idea how the same code looks in Python currently:

.. sourcecode:: python

    import redis

    def main():
        client = redis.Redis('127.0.0.1', 6379)
        pipe = client.pipeline()
        rv = pipe \
            .set("key_1", 42) \
            .set("key_2", 43) \
            .get("key_1") \
            .get("key_2").execute()
        k1 = int(rv[2])
        k2 = int(rv[3])
        print 'result = {}'.format(k1 + k2)

    if __name__ == '__main__':
        main()

What I find interesting about this is that the Rust library is nearly as
small and clear as the Python one, but is a much lower-level binding.
Unlike the Python library which gives each call a separate method, the
Rust library (because quite new) only wraps the low-level API and you need
to create the request manually by chaining calls for each argument.  Yet
the end result for a user is nearly as nice.  Granted there is extra
handling needed in Rust for the errors (which I avoided here a bit by
using `unwrap` which makes the app terminate, but then the same is the
case in the Python version where I also miss error handling).

The cool thing though is that the Rust library is completely type safe.
And yet in total there are exactly *two* places where types are mentioned
and that's the same ones, where a cast to an integer was necessary in
Python.

This however is not the best we could do in Rust.  Rust has compiler
extensions which open up a whole range of possibilities.  For instance
there is a Rust library which statically verifies that Postgres SQL
commands are well formed: `rust-postgres-macros
<https://github.com/sfackler/rust-postgres-macros>`_::

    test.rs:8:26: 8:63 error: Invalid syntax at position 10: syntax error at or near "FORM"
    test.rs:8     let bad_query = sql!("SELECT * FORM users WEHRE name = $1");
                                       ^~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    error: aborting due to previous error

This sort of stuff excites me a whole lot.

(*If you're into API design in rust, join us in #rust-apidesign on the
Mozilla IRC network*)


Rust's Future
-------------

Is Rust's memory tracking concept strong enough that we will accept it as a
valid programming model?  I am not sure.  I do believe though that Rust
can stand on its own feet already.  Even if it would turn out that the
borrow checker is not sound, I believe it would not hurt the language at
all to widespread adoption.  It's shaping up to be a really good language,
it works really well without GC and you can use it without a runtime.

Rust is an exceptionally good open source project.  And it needs more
helping hands.  The Windows support (while getting better) especially
needs more love.

If there is interest in some more practical Rust experience I will
probably write something up about my experience making `redis-rs
<https://github.com/mitsuhiko/redis-rs/>`__.
