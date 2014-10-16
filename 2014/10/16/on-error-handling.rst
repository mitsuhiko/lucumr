public: yes
tags: [thoughts, rust, api]
summary: |
  My thoughts about error handling in APIs after writing a Redis library
  in Rust.

On Error Handling in Rust
=========================

Rust is improving quite a lot lately and it makes it very exciting to play
with the language and see how good API design could look like.  There are
areas in it however that are a bit frustrating still.  For me one area is
error handling.  But some improvements might be coming up which I find
quite exciting because it changes things around a bit from what most
people are used to.

I actually wanted to write about about the API design in my little
redis library but I expect the changes in the error handling to change the
dynamics around a lot.  Because of that I want to write a bit about the
error handling in Rust currently and where it could be going.

Rust's Concept of Failure
-------------------------

Rust at present has two ways to indicate failure: results and hard task
failures.  In practical terms only the former is actually what you should
be concerned with.  Task failures are a last resort that you can fall back
to if there is nobody who can pick up on your problem or if the problem is
just of a nature that does not permit any error handling.

At present a result is as good as it gets.  A type ``Result<T, E>`` has
two possible states in which it can be: ``Ok(T)`` or ``Err(E)``.  So it
either succeeded with an object of value ``T`` or it failed with an object
of value ``E``.

I think this concept in generally is quite obvious to developers, even if
they have not used Rust.  Because failures are quite common there is also
a macro provided in Rust called `try!` which implements an early return
that propagates the error part upwards:

.. sourcecode:: rust

    fn load_document() -> Result<Document, DatabaseError> {
        let db = try!(open_database());
        try!(db.load("document_1"))
    }

With the `try!` macro expanded it looks a bit like this:

.. sourcecode:: rust

    fn load_document() -> Result<Document, DatabaseError> {
        let db = match open_database() {
            Ok(x) => x,
            Err(err) => { return Err(err); }
        };
        match db.load("document_1") {
            Ok(x) => x,
            Err(err) => { return Err(err); }
        }
    }

As you can see, the `try!` macro makes things quite straightforward.
There is however quite a big problem with it, and that is that all the
errors from the function have to be the same.  In many cases that is just
wrong.  A good example is my `redis-rs
<http://github.com/mitsuhiko/redis-rs>`_ library.  Since all operations
are happening over sockets you can either get an `IOError` or you might be
presented with a redis specific error.

Errors Across Abstraction Boundaries
------------------------------------

The problem of errors that want to cross an abstraction boundary are a
long standing issue in many programming languages.  There have been quite
a few extreme approaches to this problem.

The most extreme example is probably the concept of unchecked exceptions.
In Python for instance anything can fail with any error.  This fit's
Python's design quite well because Python is a highly dynamic language and
until you actually execute the thing you don't really know what's going to
happen.  However the same concept also exists in C# and other more static
languages where it feels much more alien.

Java has checked exceptions which have a terrible reputation (deservedly).
With checked exceptions you have the guarantee that (with the exception of
runtime exceptions which also exist) an API will not raise you an
exception you cannot deal with.  However it suffers from the same general
problem as you currently have in Rust where you need to figure out what
exactly you should do when your contract to the outside world is that you
only raise exception X but the function you are calling into raises
exception Z.  In Java this is especially annoying because the error
handling is very involved.

In some other languages like C the errors typically are an in-band signal
that indicates that something went wrong and an some state elsewhere that
you can query to figure out what happened.  This is by far the worst
because it requires that something holds state for you but it's reasonable
flexible.

The Python interpreter for instance has a thread local variable that
contains the "interpreter state" which holds a reference to the last
actual error that happened.  Individual calls return `NULL` pointers or
other indicator values.  When you fail in a function you return `NULL`
after creating an error object and storing in the interpreter state.  If
you call into another function and you can see that a failure indicator
(`NULL` pointer) comes back you just propagate the failure upwards.  Once
something that can handle the error sees a `NULL` it can go back to the
interpreter state to figure out what exactly happened.

What Rust has in Mind
---------------------

`One of the proposals
<https://github.com/aturon/rfcs/blob/error-chaining/active/0000-error-chaining.md>`_
for Rust currently introduce a new concept which combines various
different approaches by changing how errors would propagate.  It sticks
with the general idea that your functions return your errors but it
introduces the concept of error interoperability.

Think of it like this: the contract your library has with the outside
world is that your library exposes a certain behavior and some behavior is
an implementation detail.  While it's fairly obvious that your database
library will eventually do IO to talk to the database, it does not mean
that it will always do.  This has always been a problem with checked
exceptions in Java because some of the interfaces do not make sense in all
circumstances.  If for instance my redis library would ever start talking
to an in-memory simulation of Redis it will probably stop producing IO
errors internally.

The idea of the proposal is twofold.  The first one is that errors
generally follow a common pattern.  An error is whatever the user wants it
to be, but it needs to implement the `Error` trait and implement some
general methods to extract some information out of the error (Like a
description that gives an error message and optionally some more detail
information).  In addition the neat aspect is that an error can have a
cause which points to another error.

So in case of my redis library for instance if the library would have to
report an IO error it would report a redis error with a message like
"Encountered an IO error while talking to the server" and links back to
the actual IO error.

To wrap an error in another error the `FromError` trait exists that can
facilitate this.  So my redis library would implement a conversion of
`IOError` to a `RedisError` that also stores the IO error as cause.

The elegance becomes obvious once you see the actual usage code in action:

.. sourcecode:: rust

    impl FromError<IOError> for RedisError {
        fn from_err(err: IOError) -> RedisError {
            RedisError {
                descr: "Encountered an IO error",
                cause: Some(err),
            }
        }
    }

    fn read_value(host, port) -> Result<Parser, RedisError> {
        let sock = try!(TcpStream::connect(host, port));
        let mut parser = Parser::new(&mut sock as &mut Reader);
        try!(parser.parse_value())
    }

The ``TcpStream::connection`` method fails with an `IOError`.  Because our
own function fails with `RedisError`, the `try!` macro will automatically
invoke the ``FromError::from_err`` method to create a new redis error that
wraps the cause one.  Now we just need to make sure that `RedisError`
implements the `Error` trait to provide the useful bits for
introspection.

From try! To Navigation
-----------------------

But this is not where Rust wants to stop.  There is `another RFC
<https://github.com/rust-lang/rfcs/pull/243>`_ which proposes an operator
to replace the ``try!`` macro with an operator and it's actually really
neat.

In a nutshell ``try!(x)`` would become ``x?``.  The consequences are quite
cool because you can then arbitrarily nest failure conditions:

.. sourcecode:: rust

    fn load_document() -> Result<Document, DatabaseError> {
        open_database()?.load("document_1")
    }

This is quite a dramatic improvement over the initial version.  There are
even more things proposed that would go quite far in emulating exceptions
without exceptions.  For more information `read the RFC
<https://github.com/rust-lang/rfcs/pull/243>`_.

And in Python?
--------------

I think the interesting bit about the `FromError` trait is that the
general concept is very good in other languages too.  In Python for
instance it would be very welcome if libraries would start being a bit
more hygienic with the exceptions they can report.  For instance with the
requests library I generally have to catch down a whole bunch of
exceptions that are not officially part of the contract (socket
exceptions, SSL errors etc.).

Especially in Python 3 where exceptions generally get chained if rethrown
correctly there really is no reason for not catching down and rethrowing
internal exceptions through one exception type of the library.  Having to
only deal with a `RequestFailed` exception is much more convenient and
future proof.
