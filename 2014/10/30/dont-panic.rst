public: yes
tags: [thoughts, rust, api]
summary: |
  A look at stack unwinding, primarily in the context of Rust, why it
  exists and a discussion about if it's a good idea.

Don't Panic! The Hitchhiker's Guide to Unwinding
================================================

Rust has an awesome developer community but sometimes emotions can cloud
the discussions that are taking place.  One of the more interesting
discussions (or should I say flamewars) evolve around the concept of stack
unwinding in Rust.  I consider myself very strongly on one side of this
topic but I have not been aware of how hot this topic is until I
accidentally tweeted by preference.  Since then I spent a bit of time
reading up no the issue and figured I might write about it since it is
quite an interesting topic and has huge implications on how the language
works.

What is this About?
-------------------

As I wrote last time, there are two different error handling models in
Rust these days.  In this blog post I will call them result carriers and
panics.

A result carrier is a type that can carry either a success value or a
failure value.  In Rust there are currently two very strong ones and a
weak one:  the strong ones are `Result<T, E>` which carries a `T` result
value or an `E` error value and the `Option<T>` value which either carries
a `T` result value or `None` which indicates that no value exists.  By
convention there is also a weak one which is `bool` which generally
indicates success by signalling `true` and failure by signalling `false`.
There is a proposal to actually formalize the carrier concept by
introducing a `Carrier` trait that can (within reason) convert between any
of those types which would aid composability.

The second way to indicate failure is a panic.  Unlike value carriers
which are passed through the stack explicitly in the form of return
values, panics fly through the stack until they arrive at the frame of the
task in which case they will terminate it.  Panics are for all intents and
purposes task failures.  The way the work is by unwinding the stack slice,
invoking cleanup code at each level and finally terminate the task.
Panics are intended for situations where the runtime runs out of choices
about how to deal with this failure.

Why the Panic?
--------------

Currently there is definitely a case where there are too many calls in
Rust that will just panic.  For me one of the prime examples of something
that panics in a not very nice way is the default print function.  In
fact, your rust Hello World example can panic if invoked the wrong way::

    $ ./hello 
    Hello World!
    $ ./hello 1< /dev/null
    task '<main>' panicked at 'failed printing to stdout: Bad file descriptor'

The "task panicked" message a task responding to a panic.  It immediately
stops doing what it does and prints an error message to stderr.  It's a
very prevalent problem unfortunately with the APIs currently as people do
not want to deal with explicit error handling through value carriers and
as such use the APIs that just fail the task (like `println`).  That all
the tutorials in Rust also go down this road because it's easier to read
is not exactly helping.

One of my favorite examples is that the `rustc` compiler's pretty printing
will cause an internal compiler error when piped into `less` and less is
closed with the `q` key because the pipe is shutting down::

    $ rustc a-long-exapmle.rs --pretty=expanded|less
    error: internal compiler error: unexpected failure
    note: the compiler hit an unexpected failure path. this is a bug.
    note: we would appreciate a bug report: http://doc.rust-lang.org/complement-bugreport.html
    note: run with `RUST_BACKTRACE=1` for a backtrace
    task '<main>' panicked at 'failed printing to stdout: broken pipe (Broken pipe)'

The answer to why the panic is that computers are hard and many things can
fail.  In C for instance `printf` returns an integer which can indicate if
the command failed.  Did you ever check it?  In Rust the policy is to not
let failure go through silently and because nobody feels like handling
failures of every single print statement, that panicking behavior is in
place for many common APIs.

But let's assume those APIs would not panic but require explicit error
handling, why do we even need panics?  Primarily the problem comes up in
situations where a programming error happened that could not have been
detected at compile time or the environment in which the application is
executing is not providing the assumptions the application makes.  Some
good examples for the former are out of bound access in arrays and an
example for the latter are out of memory errors.

Rust has safe and unsafe access to array members but the vast majority of
array access goes through the unsafe access.  Unsafe in this case does not
mean that you get garbage back, but it means that the runtime will panic
and terminate the task.  Everything is still safe and everything but you
just killed your thread of execution.

For memory errors and things of that nature it's more tricky.  `malloc` in
C returns you a null pointer when it fails to allocate.  It looks a bit
obvious that if you just inherit this behavior you don't need to panic.
What that would allow you to do is to run a bit longer after you ran out
of memory but there is very little you can actually do from this point
onwards.  The reason for this is that you just ran out of memory and you
are at risk that any further thing you are going to do in order to recover
from it, is going to run into the same issue.  This is especially a
problem if your error representation in itself requires memory.  This is
hardly a problem that is unique to Rust.  Python for instance when it
boots up needs to preallocate a `MemoryError` so that if it ever runs out
of memory has an error it can use to indicate the failure as it might be
impossible at that point to actually allocate enough memory to represent
the out of memory failure.

You would be limited to only calling things that do not allocate anything
which might be close to impossible to do.  For instance there is no
guarantee that just printing a message to stdout does not require an
internal allocation.

What's Unwinding?
-----------------

Stack unwinding is what makes panics in Rust work.  To understand how it
works you need to understand that Rust sticks very close to the metal and
as such stack unwinding requires an agreed upon protocol to work.

When you raise an exception you need to immediately bubble up stack frame
by stack frame until you hit your exception handler.  In case of Rust you
will hit the code that shuts down the task as you cannot setup handlers
yourself.  However as you blaze through the stack frames, Rust needs to
execute all necessary cleanup code on each level so that no memory or
resources leak.

This unwinding protocol is highly related to the calling conventions and
not at all standardized.  One of the big problems with stack unwinding is
that it's not exactly an operation that comes natural to program
execution, at least not on modern processors.  When you want to fly
through some stack frames you need to figure out what was the previous
stack frame.  On AMD64 for instance there is no guaranteed way to get a
stacktrace at all without implementing `DWARF
<http://www.dwarfstd.org/>`_.  However stack unwinding does have the
assumed benefit that because you are generally not going down the error
path, there are less branches to take when a function returns as the
calling frame does not have to check for an error result.  If an error
does occur, stack unwinding automatically jumps to the error branch and
otherwise it's not considered.

What's the Problem with Unwinding?
----------------------------------

Traditionally I think there are two problems with stack unwinding.  The
first one is that unlike function calling conventions, stack unwinding is
not particularly standardized.  This is especially a problem if you try to
combine functions from different programing languages together.  The most
portable ABI is the C ABI and that one does not know anything about
stack unwinding.  There is some standardization on some operating systems
but even then it does not guarantee that it will be used.  For instance on
Windows there is Structured Exception Handling (SEH) which however is not
used by LLVM currently and as such not by Rust.

If the stack unwinding is not standardized between different languages it
automatically limits the usefulness.  For instance if you want to use a
C++ library from another programming language, your best bet is actually
to expose a C interface for it.  This also means that any function you
invoke through the C wrapper needs to catch down all exceptions and report
them through an alternative mechanism out, making it more complicated for
everybody.  This even causes quite a bit of pain in the absence of
actually going through a programming language boundary.  If you ever used
the PPL libraries (a framework for asynchronous task handling and
parallelism) on Windows you might have seen how it internally catches down
exceptions and reconstructs them in other places to make them travel
between threads safely.  

The second problem with stack unwinding is that it's really complex.  In
order to unwind a stack you need to figure out what your parent frame
actually is.  This is not necessarily a simple thing to do.  On AMD64 for
instance there is not enough information available on the stack to find
higher stack frames so your only option is to implement the very complex
DWARF spec or change the calling conventions so that you do have enough
meta information on the stack.  This might be simple for a project that
has full control of all dependencies, but the moment you call into a
library you did not compile, this no longer works.

It's no surprise that stack unwinding traditionally is one of the worse
supported features in programming languages.  It's not unheard of that a
compiler does not implement exceptions for C++ and the reason for this is
that stack unwinding is a complex thing.  Even if they do implement it,
very often exceptions are just made to work but not made to be fast.

Exceptions in a Systems Language
--------------------------------

You don't have to be a kernel developer to not be a fan of stack
unwinding.  Any person that wants to develop a shared library that is used
by other people will sooner or later have to think about how to prevent
things from throwing exceptions.  In C++ it's not hard to actually wrap
all exported functions in huge try / catch blocks that will just catch
down everything and report a failure code out, but in Rust it's currently
actually a bit more complex.

The reason for this is that in Rust you cannot actually handle exceptions.
When a function panics it terminates the task.  This implies that there
needs to be task in the first place that can isolate the exception or you
cause issues for your users.  Because tasks furthermore are actually
threads the cost of encapsulating every function call in a thread does not
sound very appealing.

Today you already are in the situation in Rust that if you write a library
that wants to export a C ABI and is used by other people you can already
not call into functions that panic unless you are in the situation where
your system is generally running a thread and you dispatch messages into
it.

Panicking Less and Disabling Unwinding
--------------------------------------

I wish I personally have for the language is that you can write code that
is guaranteed to not panic unless it really ends up in a situation where
it has no other choice.  The biggest areas of concern there are
traditionally memory allocations.  However in the vast majority of
situations failure from memory allocation is actually not something you
need to be concerned with.  Modern operating systems make it quite hard to
end up in a situation where an allocation fails.  There is virtual memory
management and swapping and OOM killers.  An malloc that returns null in a
real world situation, other than by passing an unrealistically large size,
is quite uncommon.  And on embedded systems or similar situations you
usually already keep an eye on if you are within your budget and you just
avoid ever hitting the limit.  This allocation problem is also a lot
smaller if you are you a specialized context where you just avoid generic
containers that allocate memory on regular operations.

Once panics are unlikely to happen, it's an option to disable the support
for unwinding and to just abort the application if a panic ever happens.
While this sounds pretty terrible, this is actually the right thing to do
for a wide range of environments.

The best way to isolate failures is on the operating system level through
separate processes.  This sounds worse than it actually is for two
reasons: the first is that the operating system provides good support for
shipping data between processes.  Especially for server applications the
ability to have a watchdog processes that runs very little critical code,
opens sockets and passes the file descriptors into worker processes is a
very convincing concept.  If you do end up crashing the worker no request
is lost other than the currently handled one if it's single threaded.  And
if it's multi threaded you might kill a few more requests but new,
incoming requests are completely oblivious that a failure happened as they
will queue up in the socket held by the watchdog.  This is something that
systemd and launchd for instance provide out of the box.

In Rust especially a process boundary is a lot less scary than in other
programming languages because the language design strongly discourages
global state and encourages message passing.

Less Panic Needs Better APIs
----------------------------

The bigger problem than making panic a fatal thing and removing unwinding,
is actually providing good APIs that make this less important.  The
biggest problem with coming up with replacements for panics is that any
stack frame needs to deal with failure explicitly.  If you end up writing
a function that only ever returned a `true` or `false` for indicating
success or failure, but you now need to call into something that might
fail with important and valuable error information you do not have a
channel to pass that information out without changing your own function's
interface.

The other problem is that nobody wants to deal with failure if they can
avoid doing so.  The print example is a good one because it's the type of
application where people really do not want to deal with it.  "What can go
wrong with printing".  Unfortunately a lot.  There are some proposals for
Rust about how error propagation and handling can be made nicer but we're
quite far from this reality.

Until we arrive there, I don't think disabling of stack unwinding would be
a good idea.  On the long run however I hope it's a goal because it would
make Rust both more portable and interesting as a language to write
reusable libraries in.
