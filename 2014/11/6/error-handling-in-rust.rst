public: yes
tags: [rust]
summary: |
  Overview of how to handle errors in the current version of the Rust
  programming language.

Improved Error Handling in Rust
===============================

Rust just got a huge update: it landed multidispatch and the `FromError
trait
<https://github.com/rust-lang/rfcs/blob/master/text/0201-error-chaining.md>`_.
The combination of both of those things improves error handling in Rust
significantly.  The change is in fact so significant that you can expect
many APIs to change greatly in the upcoming weeks.

While error handling in Rust is definitely not a closed case, I assume that
the paradigm enabled through these changes is going to hang around for a
long, long time.

This article is going to give a quick introduction in how error handling
works from this moment forward and why.

The Problem
-----------

I have `written about this problem a bit before
</2014/10/16/on-error-handling/>`_ but in essence the core issue with
error handling is that possible errors become part of your API contract.
This means that if you modify the implementation of your function, any new
error case you introduce, modifies your contract to your caller ever so
slightly.  This is especially an issue as you refactor your function to
call into a new range of functions that can fail with a whole new set of
errors.

The problem is to find a middle ground between extensibility and API
stability.  As an API developer you want to be able to be future proof in
the sense that you can change your implementation and call into entire new
libraries that you did not envision in the past.  For instance your cache
layer of choice might so far only have failed with general IO errors but
now you change your implementation to use a new library which all the
sudden wants to fail with redis errors.  While you could just hide those
errors and report them under a new name, it's really more interesting to 
the user to *also* expose the original root cause of the error.

And whatever you do, you do not want to negatively affect your existing
users.

It's not just evolving APIs though.  If you have a function that can fail
with two different errors, you want to have to write as little boilerplate
as necessary to handle the errors from different origins.

To be a bit more concrete: imagine you build a command line application
that does HTTP requests to the internet.  Such an application will have to
deal with a whole range of failures: command line argument parsing errors,
IO errors, HTTP failures, SSL failures etc.  Some of those errors you want
to be able to act on (for instance to convert HTTP status codes for
timeouts from an error into an implicit retry), others you want to bubble
up until you eventually show them to the user.  And all of that with as
little code as possible.

The Solution
------------

Rust's solution for this problem is the ``FromError`` trait.  The idea is
simple but clever.  The ``FromError`` trait provides a standardized
conversion of errors into another error.  This conversion however for the
most part will not actually "convert" the error but "wrap" it.  There is
no requirement for this however, you have all the freedom you need.  If
you want you can completely hide the original error.  In addition to that
it does not actually restrict it to other errors, so you can convert quite
freely between different things.  If you want you can convert error codes
into fully fleshed out error structs through the same machinery.

Errors in Rust are as of now, supposed to implement this trait:

.. sourcecode:: rust

    pub trait Error: Send {
        fn description(&self) -> &str;

        fn detail(&self) -> Option<String> { ... }
        fn cause(&self) -> Option<&Error> { ... }
    }

This is not a lot of information, and it's quite likely that this trait
will grow in the future, but for the moment it holds at least some
information that we can show error messages.  `description` returns a
string slice to a general description that is available whereas `detail`
holds optional information that can provide more details.  The latter is
considered to be information that might be required to compute.

The third trait method is `cause` which allows an error to point to
another error which was the cause.  For instance if you have a library
that does HTTP calls, and one API method fails on the IO layer your error
could point to the originating ``IoError`` as cause.

The actual conversion between errors is kicked off by the ``FromError``
trait which you need to implement for all compatible errors.  For instance
for the HTTP library example it could look like this:

.. sourcecode:: rust

    use std::{io, error};

    enum LibError {
        BadStatusCode(int),
        IoError(io::IoError),
    }

    impl FromError<io::IoError> for LibError {
        fn from_error(err: io::IoError) -> LibError {
            IoError(err)
        }
    }

In this case we have our own error type `LibError` which has two possible
failures: A `BadStatusCode` which is a failure that clearly indicates a
problem in our own library as well as `IoError` which wraps another error
from another library (in this case the IO system in Rust).  Through the
`FromError` trait we now get a standardized conversion from `IoError` to
`LibError` from our own library.  This functionality is provided through
multidispatch.  All this dispatching however is done at compile time.

At this point we can also to implement the actual error trait to make our
error useful.  It looks like this:

.. sourcecode:: rust

    impl error::Error for LibError {
        fn description(&self) -> &str {
            match self {
                &BadStatusCode => "bad status code",
                &IoError(err) => "encountered an I/O error",
            }
        }

        fn detail(&self) -> Option<String> {
            match self {
                &BadStatusCode(code) => Some(format!("status code was {}", code)),
                _ => None,
            }
        }

        fn cause(&self) -> Option<&error::Error> {
            match self {
                &IoError(ref err) => Some(&*err as &error::Error),
                _ => None,
            }
        }
    }

How exactly your error however looks is entirely up to you.  For instance
you could convert certain `IoError`\s into errors of your type entirely.
For instance one could imagine converting an `FileNotFound` IO error into
something else.

Utility Macros
--------------

Now at this point you will be asking: what actually uses `FromError`?  The
answer is that right now in Rust there is only a single place where this
is being used and that's in the `try!` macro.  It looks like this:

.. sourcecode:: rust

    macro_rules! try (
        ($expr:expr) => ({
            match $expr {
                Ok(val) => val,
                Err(err) => return Err(::std::error::FromError::from_error(err))
            }
        })
    )

As you can see it implements processing of a `Result` value.  If the value
is `Ok` it will return the wrapped value, otherwise it will issue an early
return where the conversion goes through `FromError`.  How does it know
which error it should convert to?  From the signature of the function it's
being used in:

.. sourcecode:: rust

    fn make_request(method: &str, url: &str) -> Result<Vec<u8>, LibError> {
        let (host, port, path) = parse_url(url);
        let socket = try!(open_socket(host, port));
        let req = try!(make_request(method, host, port, path));
        try!(socket.write(req));
        Ok(try!(socket.recv()))
    }

This obviously is a bit of pseudocode but you get the idea.  Because the
function returns a `Result` with `LibError` it will invoke the `FromError`
conversion to `LibError` which is the type in our own library.  For as long
as all the `try!` macros go to compatible errors for which we defined a
conversion this code will work.  In this case `try!` macro can have code
that either fails with `IoError` or `LibError` itself (each error
implicitly noop converts to itself through a default generic
implementation).

There is a second macro I started using which I called ``fail!`` for
aborting with an error:

.. sourcecode:: rust

    macro_rules! fail {
        ($expr:expr) => (
            return Err(::std::error::FromError::from_error($expr));
        )
    }

It's basically just the error part of the ``try!`` macro but it's very
useful because it goes through the `FromError` machinery.  This allows you
to ``fail!`` with any compatible error.

Non-Error Conversions
---------------------

The `FromError` trait however also has another nice benefit.  Because it
can work with arbitrary types and not just types implementing `Error` you
can build convenience methods to create errors.  In `redis-rs` for
instance I implemented `FromError` for tuples that create the most common
errors:

.. sourcecode:: rust

    impl error::FromError<(ErrorKind, &'static str)> for RedisError {
        fn from_error((kind, desc): (ErrorKind, &'static str)) -> RedisError {
            RedisError { kind: kind, desc: desc, detail: None }
        }
    }

With this I can now write code like that:

.. sourcecode:: rust

    fn connect_to_url(url: Url) -> RedisResult<Connection> {
        if url.scheme[] != "redis" {
            fail!((InvalidClientConfig, "URL provided is not a redis URL"));
        }
        Ok(try!(open_connection(url.host, url.port)))
    }

In the absence of that machinery I would have to write something like
this:

.. sourcecode:: rust

    fn connect_to_url(url: Url) -> RedisResult<Connection> {
        if url.scheme[] != "redis" {
            return Err(RedisError {
                kind: InvalidClientConfig,
                desc: "URL provided is not a redis URL",
                detail: None,
            });
        }
        match open_connection(url.host, url.port) {
            IoError(err) => {
                Err(RedisError {
                    kind: InternalIoError(err),
                    desc: "An internal IO error ocurred.",
                    detail: None
                }),
                Ok(con) => Ok(con),
            }
        }
    }

Designing Errors
----------------

As you can see from the last example, the error type in Redis is a struct.
That also goes for the `IoError` which is a struct of similar layout.  But
you could make your error as small as an enum if you would want.  So what
are best practices for designing your errors?

Simplified Enums
````````````````

The fastest but most inflexible error representation is an enum of simple
individual fields.  In that case the original cause gets lost because we
never store it.  However this can be fine in cases where the possibly
encountered errors are of such a small subset that it's okay to lose a bit
of information.  This pattern is especially useful in places where errors
can happen very regularly:

.. sourcecode:: rust

    enum LibError {
        EntryMissing,
        BadFileFormat,
        InternalError,
        CouldNotOpenFile,
    }

    impl error::Error for LibError {
        fn description(&self) -> &str {
            match *self {
                EntryMissing => "entry is missing",
                BadFileFormat => "a bad file format encountered",
                CouldNotOpenFile => "unable to open file",
                InternalError => "an internal error occurred",
            }
        }
    }

    impl FromError<io::IoError> for LibError {
        fn from_error(err: io::IoError) -> LibError {
            match err {
                { kind: io::FileNotFound, .. } => CouldNotOpenFile,
                { kind: io::PermissionDenied, .. } => CouldNotOpenFile,
                _ => InternalError,
            }
        }
    }

In that case the only description of the error you can report is a static
string for each of those values and we do not have a cause.  For some IO
errors we can produce different error codes and for anything else that
comes up we will produce a fallback `internal error`.  If you see those
creeping up you might want to make your `LibError` larger.

Complex Enums
`````````````

Similar to the simplified enums example you can take it a bit further and
keep using simple enum values for your own errors but wrap external errors
entirely.  This allows you to keep the original cause around:

.. sourcecode:: rust

    enum LibError {
        EntryMissing,
        BadFileFormat,
        IoError(io::IoError),
    }

    impl error::Error for LibError {
        fn description(&self) -> &str {
            match *self {
                EntryMissing => "entry is missing",
                BadFileFormat => "a bad file format encountered",
                IoError(_) => "an I/O error occurred",
            }
        }

        fn cause(&self) -> Option<&error::Error> {
            match *self {
                IoError(ref err) => Some(&*err as &error::Error),
                _ => {},
            }
        }
    }

    impl FromError<io::IoError> for LibError {
        fn from_error(err: io::IoError) -> LibError {
            IoError(err)
        }
    }

In this case our own internal errors are still a bit light on the error
reporting but for any IO error we have the full original cause hanging
around.

Struct-Like Enum Variants
`````````````````````````

Struct-like enum variants are a feature that until recently were behind a
feature gate and as such not commonly used because they were too much of a
hassle.  The idea is that a enum field can look like a struct, not just
like an enum.  This is especially useful when dealing with errors because
depending on which error you report, different fields might be relevant.
For instance we can take the above example and add extra error information
where available:

.. sourcecode:: rust

    enum LibError {
        EntryMissing { name: String },
        BadFileFormat,
        IoError(io::IoError),
    }

    impl error::Error for LibError {
        fn description(&self) -> &str {
            match *self {
                EntryMissing { .. } => "entry is missing",
                BadFileFormat => "a bad file format encountered",
                IoError(_) => "an I/O error occurred",
            }
        }

        fn detail(&self) -> Option<String> {
            match *self {
                EntryMissing { name: n } => Some(format!("Name of entry: {}", n)),
                _ => {}
            }
        }

        fn cause(&self) -> Option<&error::Error> {
            match self {
                &IoError(ref err) => Some(&*err as &error::Error),
                _ => {},
            }
        }
    }

    impl FromError<io::IoError> for LibError {
        fn from_error(err: io::IoError) -> LibError {
            IoError(err)
        }
    }

Because you can do pattern matching on those struct enum variants a user
can trivially extract the information they need if they want to act on it.
For generic error reporting we can use that information ourselves to
implement the `detail` method and generate a better error message from
extra information available.

Fat Error Structs
`````````````````

If you expect your errors to contain a lot of important information beyond
just an error code it's a good idea to investigate using a struct.  How
you lay out that struct is up to you.  The following example is how I
set it up in `redis-rs`.  This pattern makes sense if you expect errors to
be infrequent but carry a lot of information when they happen:

.. sourcecode:: rust

    enum ErrorKind {
        EntryMissing,
        BadFileFormat,
        IoError(io::IoError),
    }

    struct LibError {
        pub kind: ErrorKind,
        pub detail: Option<String>,
    }

    impl error::Error for LibError {
        fn description(&self) -> &str {
            match *self.kind {
                EntryMissing => "entry is missing",
                BadFileFormat => "a bad file format encountered",
                IoError(_) => "an I/O error occurred",
            }
        }

        fn detail(&self) -> Option<String> {
            self.detail.clone(),
        }

        fn cause(&self) -> Option<&error::Error> {
            self.cause.map(|x| &x as &error::Error)
        }
    }

    impl FromError<io::IoError> for LibError {
        fn from_error(err: io::IoError) -> LibError {
            LibError {
                kind: IoError(err),
                detail: None,
            }
        }
    }

It's a good idea to always have an error kind enum so that users of your
library can do pattern matching on your errors to figure out what exactly
went wrong.  This is crucial if you want to allow recovery of a problem.
For instance code might want to act upon an `EntryMissing` error but not
on any other error.

The Outlook
-----------

At the moment it looks like what we have currently is pretty much what we
will be stuck with until after 1.0.  The `Carrier` trait that would allow
options and results to be handled similarly will most likely not land,
same for the syntax support.  However it's quite likely that we will see
some experimentation in external crates and with custom macros to see
where error handling could go from here.

To be a good citizen in the Rust world I changed all my example code in
`the redis-rs documentation <http://mitsuhiko.github.io/redis-rs/redis/>`_
to use ``try!`` instead of `unwrap` and it looks pretty good.

I do have some hopes that `fail! will make it into the stdlib
<https://github.com/rust-lang/rfcs/issues/434>`_ but it's so easy to write
yourself that I expect that macro to pop up in many places.  Not having it
in the language will not be the end of the world.
