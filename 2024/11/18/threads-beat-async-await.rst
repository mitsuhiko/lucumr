public: yes
tags: [thoughts, async, python, javascript, rust]
summary: Musings about async await again and why I think virtual threads
  are a better model.

Playground Wisdom: Threads Beat Async/Await
===========================================

It's been a few years since I wrote about my challenges with
`async`/`await`-based systems and how they just seem to not `support back
pressure well </2020/1/1/async-pressure/>`__.  A few years later, I do not
think that this problem has subsided much, but my thinking and
understanding have perhaps evolved a bit.  I'm now convinced that
`async`/`await` is, in fact, a bad abstraction for most languages, and we
should be aiming for something better instead and that I believe to be
thread.

In this post, I'm also going to rehash many arguments from very clever
people that came before me.  Nothing here is new, I just hope to bring it
to a new group of readers.  In particular, you should really consider
these who highly influential pieces:

* Bob Nystrom's `What Color is Your Function
  <https://journal.stuffwithstuff.com/2015/02/01/what-color-is-your-function/>`__
  post, which makes a very strong case that having two types of functions,
  which are only compatible in one direction, causes problems.
* Rob Pressler's `Please stop polluting our imperative languages with pure
  concepts <https://www.youtube.com/watch?v=449j7oKQVkc>`__ which I think
  is probably the single most important talk on that topic.
* Nathaniel J. Smith's `Notes on structured concurrency, or: Go statement
  considered harmful
  <https://vorpus.org/blog/notes-on-structured-concurrency-or-go-statement-considered-harmful/>`__
  which does a really good job laying out the motivation for structured
  concurrency.

Your Child Loves Actor Frameworks
---------------------------------

As programmers, we are so used to how things work that we make some
implicit assumptions that really cloud our ability to think freely.  Let
me present you with a piece of code that demonstrates this:

.. sourcecode:: python

    def move_mouse():
        while mouse.x < 200:
            mouse.x += 5
            sleep(10)

    def move_cat():
        while cat.x < 200:
            cat.x += 10
            sleep(10)

    move_mouse()
    move_cat()

Read that code and then answer this question: do the mouse and cat move at
the same time, or one after another?  I guarantee you that 10 out of 10
programmers will correctly state that they move one after another.  It
makes sense because we know Python and the concept of threads, scheduling
and whatnot.  But if you speak to a group of children familiar with
`Scratch
<https://en.wikipedia.org/wiki/Scratch_(programming_language)>`__,
they are likely to conclude that mouse and cat move simultaneously.

The reason is that if you are exposed to programming via Scratch you are
exposed to a primitive form of actor programming.  The cat and the mouse
are both actors.  In fact, the UI makes this pretty damn clear, just that
the actors are called “sprites”.  You attach logic to a sprite on the
screen and all these pieces of logic run *at the same time*.
Mind-blowing.  You can even send messages from sprite to sprite.

The reason I want you to think about this for a moment is that I think
this is rather profound.  Scratch is a very, very simple system and it's
intended to teaching programming to young kids.  Yet the model it promotes
is an actor system!  If you were to foray into programming via a
traditional book on Python, C# or some other language, it's quite likely
that you will only learn about threads at the very end.  Not just that, it
will likely make it sound really complex and scary.  Worse, you will
probably only learn about actor patterns in some advanced book that will
bombard you with all the complexities of large scale applications.

There is something else though you should keep in mind: Scratch will not
talk about threads, it will not talk about monads, it will not talk about
`async`/`await`, it will not talk about schedulers.  As far as you are
concerned as a programmer, it's an imperative (though colorful and visual)
language with some basic “syntax” support for message passing.
Concurrency comes natural.  A child can program it.  It's not something to
be afraid of.

Imperative Programming Is Not Inferior
--------------------------------------

The second thing I want you to take away is that imperative languages are
not inferior to functional ones.

While probably most of us are using imperative programming languages to
solve problems, I think we all have been exposed to the notion that it's
inferior and not particularly pure.  There is this world of functional
programming, with monads and other things.  This world have these nice things
involving composition, logic and maths and fancy looking theorems.  If you
program in that, you're almost transcending to a higher plane and looking
down to the folks who are stitching together if statements, for loops,
make side effects everywhere, and are doing highly inappropriate things
with IO.

Okay, maybe it's not quite as bad, but I don't think I'm completely wrong
with those vibes.  And look, I get it.  I feel happy chaining together
lambdas in Rust and JavaScript.  But we should also be aware that these
constructs are, in many languages, bolted on.  Go, for instance, gets away
without most of this, and that does not make it an inferior language!

So what you should keep in mind here is that there are different
paradigms, and mentally you should try to stop thinking for a moment that
functional programming has all its stuff figured out, and imperative
programming does not.

Instead, I want to talk about how functional languages and imperative
languages are dealing with “waiting”.

The first thing I want to back to is the example from above.  Both of the
functions (for the cat and the mouse) can be seen as separate threads of
execution.  When the code calls ``sleep(10)`` there's clearly an
expectation by the programmer that the computer will temporarily pause the
execution and continue later.  I don't want to bore you with monads, so as
my “functional” programming language, I will use JavaScript and promises.
I think that's an abstraction that most readers will be sufficiently
familiar with:

.. sourcecode:: javascript

    function moveMouseBlocking() {
      while (mouse.x < 200) {
        mouse.x += 5;
        sleep(10);  // a blocking sleep
      }
    }

    function moveMouseAsync() {
      return new Promise((resolve) => {
        function iterate() {
          if (mouse.x < 200) {
            mouse.x += 5;
            sleep(10).then(iterate);  // non blocking sleep
          } else {
            resolve();
          }
        }
        iterate();
      });
    }

You can immediately see a challenge here: it's very hard to translate the
blocking example into a non blocking example because all the sudden we
need to find a way to express our loop (or really any control flow).  We
need to manually decompose it into a form of recursive function calling
and we need the help of a scheduler and executor here to do the waiting.

This style obviously eventually became annoying enough to deal with that
`async`/`await` was introduced to mostly restore the sanity of the old
code.  So it now can look more like this:

.. sourcecode:: javascript

    async function moveMouseAsync() {
      while (mouse.x < 200) {
        mouse.x += 5;
        await sleep(10);
      }
    }

Behind the scenes though, nothing has really changed, and in particular,
when you call that function, you just get an object that encompasses the
“composition of the computation”.  That object is a promise which will
eventually hold the resulting value.  In fact, in some languages like C#, the
compiler will really just transpile this into chained function calls.
With the promise in hand, you can await the result, or register a callback
with `then` which gets invoked if this thing ever runs to completion.

For a programmer, I think `async`/`await` is clearly understood as some
sort of neat abstraction — an abstraction over promises and callbacks.
However strictly speaking, it's just worse than where we started out,
because in terms of expressiveness, we have lost an important affordance:
we cannot freely suspend.

In the original blocking code, when we invoked `sleep` we suspended for 10
milliseconds implicitly; we cannot do the same with the async call.  Here
we have to “`await`” the sleep operation.  This is the crucial aspect of
why we're having these “colored functions”.  Only an async function can
call another async function, as you cannot `await` in a sync function.

Halting Problems
----------------

The above example shows another problem that `async`/`await` causes:
what if we never resolve?  A normal function call eventually
returns, the stack unwinds, and we're ready to receive the result.  In an
async world, someone has to call `resolve` at the very end.  What if that
is never called?  Now in theory, that does not seem all that different from
someone calling `sleep()` with a large number to suspend for a very long time,
or waiting on a pipe that never gets data sent into.  But it is different!
In one case, we keep the call stack and everything that relates to it
alive; in another case, we just have a promise and are waiting for
independent garbage collection with everything already unwound.

Contract wise, there is absolutely nothing that says one has to call
`resolve`.  As we know from theory `the halting problem is undecidable
<https://en.wikipedia.org/wiki/Halting_problem>`__ so it's going to be
actually impossible to know if someone will call resolve or not.

That sounds pedantic, but it's very important because promises/futures and
`async`/`await` are making something strictly worse than not having them.
Let's consider a JavaScript promise to be the most canonical example of
what this looks like.  A promise is created by an anonymous function, that
is invoked to eventually call `resolve`.  Take this example:

.. sourcecode:: javascript

    let neverSettle = new Promise((resolve) => {
      // this function ends, but we never called resolve
    });

Let me clarify first that this is not a JavaScript specific problem, but
it's nice to show it this way.  This is a completely legal thing!  It's a
promise, that never resolves.  That is not a bug!  The anonymous function
in the promise itself will return, the stack will unwind, and we are left
with a “pending” promise that will eventually get garbage collected.  That
is a bit of a problem because since it will never resolve, you can also
never await it.

Think of the following example, which demonstrates this problem a bit.  In
practice you might want to reduce how many things can work at once, so
let's imagine a system that can handle up to 10 things that run
concurrently.  So we might want to use a semaphore to give out 10 tokens
so up to 10 things can run at once; otherwise, it applies back pressure.
So the code looks like this:

.. sourcecode:: javascript

    const semaphore = new Semaphore(10);

    async function execute(f) {
      let token = await semaphore.acquire();
      try {
        await f();
      } finally {
        await semaphore.release(token);
      }
    }

But now we have a problem.  What if the function passed to the `execute`
function returns `neverSettle`?  Well, clearly we will never release the
semaphore token.  This is strictly worse compared to blocking functions!
The closest equivalent would be a stupid function that calls a very
long running `sleep`.  But it's different!  In one case, we keep the call
stack and everything that relates to it alive; in the other case case we
just have a promise that will eventually get garbage collected, and we will
never see it again.  In the promise case, we have effectively decided that
the stack is not useful.

There are ways to fix this, like making promise finalization available so
we can get informed if a promise gets garbage collected etc.  However I
want to point out that as per contract, what this promise is doing is
completely acceptable and we have just caused a new problem, one that we
did not have before.

And if you think Python does not have that problem, it does too.  Just
``await Future()`` and you will be waiting until the heat death of the
universe (or really when you shut down your interpreter).

The promise that sits there unresolved has no call stack.  But that
problem also comes back in other ways, even if you use it correctly.  The
decomposed functions calling functions via the scheduler flow means that
now you need extra affordances to stitch these async calls together into
full call stacks.  This all creates extra problems that did not exist
before.  Call stacks are really, really important.  They help with
debugging and are also crucial for profiling.

Blocking is an Abstraction
--------------------------

Okay, so we know there is at least some challenge with the promise model.
What other abstractions are there?  I will make the argument that a
function being able to “suspend” a thread of execution is a bloody great
capability and abstraction.  Think of it for a moment: no matter where I
am, I can say I need to wait for something and continue later where I left
off.  This is particularly crucial to apply back-pressure if you decide to
need it later.  The biggest footgun in Python asyncio remains that `write`
is non blocking.  That function will stay problematic forever and you need
to follow up with ``await s.drain()`` to avoid buffer bloat.

In particular it's an important abstraction because in the real world we
have constantly faced with things in fact not being async all the time, and
some of the things we think might not block, will in fact block.  Just
like Python did not think that `write` should be able to block when it was
designed.  I want to give you a colorful example of this.  Why is the
following code blocking, and what is?

.. sourcecode:: python

    def decode_object(idx):
        header = indexes[idx]
        object_buf = buffer[header.start:header.start + header.size]
        return brotli.decompress(object_buf)

It's a bit of a trick question, but not really.  The reason it's blocking
is `because memory access can be blocking
<https://huonw.github.io/blog/2024/08/async-hazard-mmap/>`__!  You might
not think of it this way, but there are many reasons why just touching a
memory region can take time.  The most obvious one is memory-mapped files.
If you're touching a page that hasn't been loaded yet, the operating
system will have to shovel it into memory before returning back to you.
There is no “await touching this memory” expression, because if there were,
we would have to `await` *everywhere*.  That might sound petty but
blocking memory reads were at the source of a series of incidents at
Sentry [1]_.

The trade-off that `async`/`await` makes today is that the idea is that
not everything needs to block or needs to suspend.  The reality, however,
has shown me that many more things really want to suspend, and if a random
memory access is a case for suspending, then is the abstraction worth
anything?

So maybe to allow any function call block and suspend really was the right
abstraction to begin with.

But then we need to talk about spawning threads next, because a single
thread is not worth much. The one affordance that `async`/`await` system
gives you that you don't have otherwise, is actually telling two things to
run concurrently.  You get that by starting the async operation and
deferring the awaiting to later.  This is where I will have to concede
that `async`/`await` has something going for it.  It moves the reality of
concurrent execution right into the language.  The reason concurrency
comes so natural to a Scratch programmer is that it's right there, so
`async`/`await` solves a very similar purpose here.

In a traditional imperative language based on threads, the act of spawning
a thread is usually hidden behind a (often convoluted) standard library
function.  More annoyingly threads very much feel bolted on and completely
inadequate to even to the most basic of operations.  Because not only do
we want to spawn threads, we want to join on them, we want to send values
across thread boundaries (including errors!).  We want to wait for either
a task to be done, or a keyboard input, messages being passed etc.

Classic Threading
-----------------

So lets focus on threads for a second.  As said before, what we are
looking for is the ability for any function to yield / suspend.  That's
what threads allow us to do!

When I am talking about “threads” here, I'm not necessarily referring to a
specific kind of implementation of threads.  Think of the example of
promises from above for a moment: we had the concept of “sleeping”, but we
did not really say how that is implemented.  There is clearly some
underlying scheduler that can enable that, but how that takes places is
outside the scope of the language.  Threads can be like that.  They could
be real OS threads, they could be virtual and be implemented with fibers
or coroutines.  At the end of the day, we don't necessarily have to care
about it as developer if the language gets it right.

The reason this matters is that when I talk about “suspending” or
“continuing somewhere else,” immediately the thought of coroutines and
fibers come to mind.  That's because many languages that support them give
you those capabilities.  But it's good to step back for a second and just
think about general affordances that we want, and not how they are
implemented.

We need a way to say: run this concurrently, but don't wait for it to
return, we want to wait later (or never!).  Basically, the equivalent in
some languages to call an async function, but to not await.  In other
words: to schedule a function call.  And that is, in essence, just what
spawning a thread is.  If we think about Scratch: one of the reasons
concurrency comes natural there is because it's really well integrated,
and a core affordance of the language.  There is a real programming
language that works very much the same: go with its goroutines.  There is
syntax for it!

So now we can spawn, and that thing runs.  But now we have more problems
to solve: synchronization, waiting, message passing and all that jazz are
not solved.  Even Scratch has answers to that!  So clearly there is
something else missing to make this work.  And what even does that spawn
call return?

A Detour: What is Async Even
----------------------------

There is an irony in `async`/`await` and that irony is that it exists in
multiple languages, it looks completely the same on the surface, but works
completely different under the hood.  Not only that, the origin stories of
`async`/`await` in different languages are not even the same.

I mentioned earlier that code that can arbitrary block is an abstraction
of sorts.  That abstraction for many applications really only makes sense
is if the CPU time while you're blocking can be used in other useful ways.
On the one hand, because the computer would be pretty bored if it was only
doing things in sequence, on the other hand, because we might need things
to run in parallel.  At times as programmers we need to do two things to
make progress simultaneously before we can continue.  Enter creating
more threads.  But if threads are so great, why all that talking about
coroutines and promises that underpins so much of `async`/`await` in
different languages?

I think this is the point where the story actually becomes confusing
quickly.  For instance JavaScript has entirely different challenges than
Python, C# or Rust.  Yet somehow all those languages ended up with a form
of `async`/`await`.

Let's start with JavaScript.  JavaScript is a single threaded language
where a function scope cannot yield.  There is no affordance in the
language to do that and threads do not exist.  So before `async`/`await`,
the best you could do is different forms of callback hell.  The first
iteration of improving that experience was adding promises.
`async`/`await` only became sugar for that afterward.  The reason that
JavaScript did not have much choice here is that promises was the only
thing that could be accomplished without language changes, and
`async`/`await` is something that can be implemented as a transpilation
step.  So really; there are no threads in JavaScript.  But here is an
interesting thing that happens: JavaScript on the language level has the
concept of concurrency.  If you call `setTimeout`, you tell the runtime to
schedule a function to be called later.  This is crucial!  In particular
it also means that a promise created, will be scheduled automatically.
Even if you forget about it, it will run!

Python on the other hand had a completely different origin story.  In the
days before `async`/`await`, Python already had threads — real,
operating system level threads.  What it did not have however was the
ability for multiple of those threads to run in parallel.  The reason for
this obviously the GIL (Global Interpreter Lock).  However that “just” makes
things not to scale to more than one core, so let's ignore that for a
second.  Because it had threads, it also rather early had people
experiment with implementing virtual threads in Python.  Back in the day
(and to some extend today) the cost of an OS level thread was pretty high,
so virtual threads were seen as a fast way to spawn more of these
concurrent things.  There were two ways in which Python got virtual
threads.  One was the Stackless Python project, which was an alternative
implementation of Python (many patches for cpython rather) that
implemented what's called a “stackless VM” (basically a VM that does not
maintain a C stack).  In short, what that enabled is implementing something
that stackless called “tasklets” which were functions that could be
suspended and resumed.  Stackless did not have a bright future because the
stackless nature meant that you could not have interleaving Python -> C ->
Python calls and suspend with them on the stack.

There was a second attempt in Python called “greenlet”.  The way greenlet
worked was implementing coroutines in a custom extension module.  It is
pretty gnarly in its implementation, but it does allow for cooperative
multi tasking.  However, like stackless, that did not win out.  Instead,
what actually happened is that the generator system that Python had for
years was gradually upgraded into a coroutine system with syntax support,
and the async system was built on top of that.

One of the consequences of this is that it requires syntax support to
suspend from a coroutine.  This meant that you cannot implement a function
like `sleep` that, when called, yields to a scheduler.  You *need* to
`await` it (or in earlier times you could use `yield from`).  So we ended
up with `async`/`await` because of how coroutines work in Python under the
hood.  The motivation for this was that it was seen as a positive thing
that you know when something suspends.

One interesting consequence of the Python coroutine model is that at
least on the coroutine model it can transcend OS level threads.  I could
make a coroutine on one thread, ship it off to another, and continue it
there.  In practice, that does not work because once hooked up with the IO
system, it cannot travel to another event loop on anther thread any more.
But you can already see that fundamentally it does something quite
different to JavaScript.  It can travel between threads at least in
theory; there are threads; there is syntax to yield.  A coroutine in
Python will also start out with not running, unlike in JavaScript where
it's effectively always scheduled.  This is also in parts because the
scheduler in python can be swapped out, and there are competing and
incompatible implementations.

Lastly let's talk about C#.  Here the origin story is once again entirely
different.  C# has real threads.  Not only does it have real threads, it
also has per-object locks and absolutely no problems with dealing with
multiple threads running in parallel.  But that does not mean that it does
not have other issues.  The reality is that threads alone are just not
enough.  You need to synchronize and talk between threads quite often and
sometimes you just need to wait.  For instance you need to wait for user
input.  You still want to do something, while you're stuck there
processing that input.  So over time .NET introduced “tasks” which are an
abstraction over async operations.  They are part of the .NET threading
system and the way you interact with them is that you write your code in
there, you can suspend from tasks with syntax.  .NET will run the task on
the current thread, and if you do some blocking you stay blocked.  This is
in that sense, quite different from JavaScript where while no new “thread”
is created, you pend the execution in the scheduler.  The reason it works
this way in .NET is that some of the motivation of this system was to
allow UI triggered code to access the main UI thread without blocking it.
But the consequence again is, that if you block for real, you just screwed
something up.  That however is also why at least at one point what C# did
was just to splice functions into chained closures whenever it hit an
`await`.  It just decomposes one logical piece of code into many separate
functions.

I really don't want to go into Rust, but Rust's async system is probably
the weirdest of them all because it's polling-based.  In short: unless you
actively “wait” for a task to complete, it will not make progress.  So the
purpose of a scheduler there is to make sure that a task actually can make
progress.  Why did rust end up with `async`/`await`?  Primarily because
they wanted something that works without a runtime and a scheduler and the
limitations of the borrow checker and memory model.

Of all those languages, I think the argument for `async`/`await` is the
strongest for Rust and JavaScript.  Rust because it's a systems language
and they wanted a design that works with a limited runtime.  JavaScript to
me also makes sense because the language does not have real threads, so
the only alternative to `async`/`await` is callbacks.  But for C# the
argument seems much weaker.  Even the problem of having to force code to
run on the UI thread could be just used by having a scheduling policy for
virtual threads.  The worst offender here in my mind is Python.
`async`/`await` has ended up with a really complex system where the
language now has coroutines and real threads, different synchronization
primitives for each and async tasks that end up being pinned to one OS
thread.  The language even has different futures in the standard library
for threads and async tasks!

The reason I wanted you to understand all this is that all these different
languages share the same syntax, yet what you can do with it is completely
different.  What they all have in common is that async functions can only
be called by async functions (or the scheduler).

What Async Isn't
----------------

Over the years I heard a lot of arguments about why for instance Python
ended up with `async`/`await` and some of the arguments presented don't
hold up to scrutiny from my perspective.  One argument that I have heard
repeatedly is that if you control when you suspend, you don't need to deal
with locking or synchronization.  While there is some truth to that (you
don't randomly suspend), you still end up with having to lock.  There is
still concurrency so you need to still protect all your stuff.  In Python
in particular this is particularly frustrating because not only do you
have colored functions, you also have colored locks.  There are locks for
threads and there are locks for async code, and they are different.

There is a very good reason why I showed the example above of the
semaphore: semaphores are real in async programming.  They are very often
needed to protect a system from taking on too much work.  In fact, one of
the core challenges that many `async`/`await`-based programs suffer from
is bloating buffers because there is an inability to exert back pressure
(I once again point you to my `post on that
</2020/1/1/async-pressure/>`__).  Why can they not?  Because unless an API
is `async`, it is forced to buffer or fail.  What it cannot do, is block.

Async also does not magically solve the issues with GIL in Python.  It
does not magically make real threads appear in JavaScript, it does not
solve issues when random code starts blocking (and remember, even memory
access can block).  Or you very slowly calculate a large Fibonacci
number.

Threads are the Answer, Not Coroutines
--------------------------------------

I already alluded to this above a few times, but when we think about being
able to “suspend” from an arbitrary point in time, we often immediately
think of coroutines as a programmers.  For good reasons: coroutines are
amazing, they are fun, and every programming language should have them!

Coroutines are an important building block, and if any future language
designer is looking at this post: you should put them in.

But coroutines should be very lightweight, and they can be abused in ways
that make it very hard to follow what's going on.  Lua, for instance, gives
you coroutines, but it does not give you the necessary structure to do
something with them easily.  You will end up building your own scheduler,
your own threading system, etc.

So what we really want is where we started out with: threads!  Good old
threads!

The irony in all of this is, that the language that I think actually go
this right is modern Java.  `Project Loom <https://openjdk.org/projects/loom/>`__
in Java has coroutines and all the bells and whistles under the hood, but
what it exposes to the developer is good old threads.  There are virtual
threads, which are mounted on carrier OS threads, and these virtual
threads can travel from thread to thread.  If you end up issuing a
blocking call on a virtual thread, it yields to the scheduler.

Now I happen to think that threads alone are not good enough!  Threads
require synchronization, they require communication primitives etc.
Scratch has message passing!  So there is more that needs to be built to
make them work well.

I want to follow up on an another blog post about what is needed to make
threads easier to work with.  Because what `async`/`await` clearly
innovated is bringing some of these core capabilities closer to the user
of the language, and often modern `async`/`await` code looks easier to
read than traditional code using threads is.

Structured Concurrency and Channels
-----------------------------------

Lastly I do want to say something nice about `async`/`await` and celebrate
the innovations that it has brought up.  I believe that this language
feature singlehandedly drove some crucial innovation about concurrent
programming by making it widely accessible.  In particular it moved many
developers from a basic “single thread per request” model to breaking down
tasks into smaller chunks, even in languages like Python.  For me, the
biggest innovation here goes to `Trio
<https://trio.readthedocs.io/en/stable/>`__, which introduced the concept
of structured concurrency via its nursery.  That concept has eventually
found a home even in asyncio with the concept of the `TaskGroup API
<https://docs.python.org/3/library/asyncio-task.html#asyncio.TaskGroup>`__
and is `finding its way into Java <https://openjdk.org/jeps/453>`__.

I recommend you to read Nathaniel J. Smith's `Notes on structured
concurrency, or: Go statement considered harmful
<https://vorpus.org/blog/notes-on-structured-concurrency-or-go-statement-considered-harmful/>`__
for a much better introduction.  However if you are unfamiliar with it,
here is my attempt of explaining it:

* **There is a clear start and end of work**: every thread or task has a
  clear beginning and end, which makes it easier to follow what each
  thread is doing.  All threads spawned in the context of a thread, are
  known to that thread.  Think of it like creating a small team to work on
  a task: they start together, finish together, and then report back.

* **Threads don't outlive their parent**: if for whatever reason the
  parent is done before the children threads, it automatically awaits
  before returning.

* **Error propagate and cause cancellations**: If something goes wrong in
  one thread, the error is passed back to the parent.  But more importantly, it
  also automatically causes other child threads to cancel.  Cancellations
  are a core of the system!

I believe that structured concurrrency needs to become a thing in a threaded
world.  Threads must know their parents and children.  Threads also need
fo find convenient ways to ways to pass their success values back.
Lastly context should flow from thread to thread implicity through context
locals.

The second part is that `async`/`await` made it much more apparent that
tasks / threads need to talk with each other.  In particular the concept
of channels and selecting on channels became more prevalent.  This is an
essential building block which I think can be further improved upon.  As
food for thought: if you have structured concurrency, in principle each
thread's return value really can be represented as a buffered channel
attached to the thread, holding up to a single value (successful return
value or error) that you can select on.

Today, although no language has perfected this model, thanks to many years
of experimentation, the solution seems clearer than ever, with structured
concurrency at its core.

Conclusion
----------

I hope I was able to demonstrate to you that `async`/`await` has been a
mixed bag.  It brought some relief from callback hell, but it also saddled
us with new issues like colored functions, new back-pressure challenges,
and introduced new problems all entirely such as promises that can just
sit around forever without resolving.  It has also taken away a lot of
utility that call stacks brought, in particular for debugging and
profiling.  These aren't minor hiccups; they're real obstacles that get in
the way of the straightforward, intuitive concurrency we should be aiming
for.

If we take a step back, it seems pretty clear to me that we have veered
off course by adopting `async`/`await` in languages that have real
threads.  Innovations like Java's Project Loom feel like the right fit
here.  Virtual threads can yield when they need to, switch contexts when
blocked, and even work with message-passing systems that make concurrency
feel natural.  If we free ourselves from the idea that the functional,
promise system has figured out all the problems we can look at threads
properly again.

However at the same time `async`/`await` has moved concurrent programming
to the forefront and has resulted in real innovation.  Making concurrency
a core feature of the language (via syntax even!) is a good thing.
Maybe the increased adoption and people struggling with it, was what made
structured concurrency a real thing in the Python `async`/`await` world.

Future language design should rethink concurrency once more: Instead of
adopting `async`/`await`, new languages should model themselves more like
Java's Project Loom but with more user friendly primitives.  But like
Scratch, it should give programmers really good APIs that make concurrency
natural.  I don't think actor frameworks are the right fit, but a
combination of structured concurrency, channels, syntax support for
spawning/joining/selecting will go a long way.  Watch this space for a
future blog post about some things I found to work better than others.

.. [1] Sentry works with large debug information files such as PDB or
   DWARF.  These files can be gigabytes in size and we memory map
   terrabytes of preprocessed files into memory during processing.  Memory
   mapped files can block is hardly a surprise, but what we learned in the
   process is that thanks to containerization and memory limits, you can easily 
   navigate yourself into a situation where you spend much more time on
   page faults than you expected and the system crawls to a halt.
