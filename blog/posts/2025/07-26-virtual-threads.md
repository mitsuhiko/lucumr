---
tags: [async, javascript, python, thoughts]
summary: A follow-up to how I wish async would work.
---

# From Async/Await to Virtual Threads

Last November I wrote a post about how the programming interface of threads
[beats the one of async/await](/2024/11/18/threads-beat-async-await/).  In May,
Mark Shannon brought up the idea of [virtual threads for
Python](https://discuss.python.org/t/add-virtual-threads-to-python/91403)
on Python's discussion board and also referred back to that article that I
wrote.  At EuroPython we had a chat about that topic and that reminded me that
I just never came around to writing part two of that article.

## How We Got Here

The first thing to consider is that async/await did actually produce one
very good outcome for Python: it has exposed many more people to concurrent
programming.  By introducing a syntax element into the programming language, the
problem of concurrent programming has been exposed to more people.  The
unfortunate side effect is that it requires a very complex internal machinery
that leaks into the programming language to the user and it requires [colored
functions](https://journal.stuffwithstuff.com/2015/02/01/what-color-is-your-function/).

Threads, on the other hand, are in many ways a much simpler concept, but the
threading APIs that have proliferated all over the place over the last
couple of generations leave a lot to be desired.  Without doubt, async/await
in many ways improved on that.

One key part of how async/await works in Python is that nothing really
happens until you call await.  You're guaranteed not to be suspended.
Unfortunately, recent changes with
[free-threading](https://docs.python.org/3/howto/free-threading-python.html)
make that guarantee rather pointless.  Because you still need to write code to
be aware of other threads, and so now we have the complexity of both the async
ecosystem and the threading system at all times.

This is a good moment to rethink if we maybe have a better path in front of us
by fully embracing threads.

## Structured, Virtual Threads

Another really positive thing that came out of async in Python was that a lot of
experimentation was made to improve the ergonomics of those APIs.  The most
important innovation has been the idea of [structured
concurrency](https://vorpus.org/blog/notes-on-structured-concurrency-or-go-statement-considered-harmful/).
Structured concurrency is all about the idea of disallowing one task to outlive
its parent. And this is also a really good feature because it allows, for
instance, a task to also have a relationship to the parent task, which makes the
flow of information (such as context variables) much clearer than traditional
threads and thread local variables do, where threads have effectively no real
relationships to their parents. 

Unfortunately, task groups (the implementation of structured concurrency in
Python) are a rather recent addition, and unfortunately its rather strict
requirements on cancellation have often not been sufficiently implemented in
many libraries.  To understand why this matters, you have to understand how
structured concurrency works.  Basically, when you spawn a task as a child of
another task, then any adjacent task that fails will also cause the cancellation
of all the other ones.  This requires robust cancellations.

And robust cancellations are really hard to do when some of those tasks involve
real threads.  For instance, the very popular `aiofiles` library uses a thread
pool to move I/O operations into an I/O thread since there is no really good way
on different platforms to get real async I/O behavior out of standard files.
However, cancellations are not supported.  That causes a problem: if you spawn
multiple tasks, some of which are blocking on a read (with `aiofiles`) that
would only succeed if another one of those tasks concludes, you can actually end
up deadlocking yourself in the light of cancellations.  This is not a
hypothetical problem.  There are, in fact, quite a few ways to end up in a
situation where the presence of `aiofiles` in a task group will cause an
interpreter not to shut down properly.  Worse, the exception that was actually
caught by the task group will be invisible until the blocking read on the other
thread pool has been interrupted by a signal like a keyboard interrupt.  This is
a pretty disappointing developer experience. 

In many ways, what we really want is to go back to the drawing board and say,
"What does a world look like that only ever would have used threads with a
better API?"

## Only Threads

So if we have only threads, then we are back to some performance challenges
that motivated asyncio in the first place.  The solution for this will involve
virtual threads.  You can read all about them [in the previous
post](/2024/11/18/threads-beat-async-await/).

One of the key parts of enabling virtual threads is also a commitment to
handling many of the challenges with async I/O directly as part of the runtime.
That means that if there is a blocking operation, we will have to ensure that
the virtual thread is put back to the scheduler, and another one has a chance
to run.

But that alone will feel a little bit like a regression because we also want to
ensure that we do not lose structured concurrency.

## The Better API

Let's start simple: what does Python code look like where we download an
arbitrary number of URLs sequentially?  It probably looks a bit like this:

```python
def download_all(urls):
    results = {}

    for url in urls:
        results[url] = fetch_url(url)

    return results
```

No, this is intentionally not using any async or await, because this is not
what we want.  We want the most simple thing: blocking APIs.

The general behavior of this is pretty simple: we are going to download a bunch
of URLs, but if any one of them fails, we'll basically abort and raise an
exception, and will not continue downloading any other ones. The results that
we have collected up to that point are lost.

But how would we stick with this but introduce parallelism?  How can we
download more than one at a time?  If a language were to support structured
concurrency and virtual threads, we could achieve something similar with some
imaginary syntax like this:

```python
def download_all(urls):
    results = {}

    await:
        for url in urls:
            async:
                results[url] = fetch_url(url)

    return results
```

I'm intentionally using await and async here, but you can see from the usage
that it's actually inverted compared to what we have today.  Here is what this
would do:

* await: this creates a structured thread group.  Any spawned thread
  (async) within it attaches to this thread group and is awaited.  If any of
  the threads fails, future spawns are blocked and existing threads are told to
  cancel.
* async: you can think of this as being a function declaration that is paired
  with a spawn.  The entire body thus runs in another task.  Because there is a
  parent/child relationship of threads, the child inherits the context of the
  parent.  This is also how edge and level cancellation can travel to threads.

Behind the scenes, something like this would happen:

```python
from functools import partial

def download_all(urls):
    results = {}

    with ThreadGroup():
        def _thread(url):
            results[url] = fetch_url(url)

        for url in urls:
            ThreadGroup.current.spawn(partial(_thread, url))

    return results
```

Note that all threads here are virtual threads.  They behave like threads, but
they might be scheduled on different kernel threads.  If any one of those
spawned threads fails, the thread group itself fails and also prevents further
spawn calls from taking place.  A spawn on a failed thread group would also no
longer be permitted.

In the grand scheme of things, this is actually quite beautiful.  Unfortunately,
it does not match all that well to Python.  This syntax would be unexpected
because Python does not really have an existing concept of a hidden function
declaration.  Python's scoping also prevents this from working all that well.
Because Python doesn't have syntax for variable declarations, Python actually
only has a single scope for functions.  This is quite unfortunate because, for
instance, it means that a helper declared in a loop body cannot really close
over the loop iteration variable.

Regardless, I think the important thing you should take away from this is that
this type of programming does not require thinking about
[futures](https://en.wikipedia.org/wiki/Futures_and_promises).  Even though it
could support futures, you can actually express a whole lot of programming code
without needing to defer to an abstraction like that.

As a result, there are much fewer concepts that one has to consider when
working with a system like this.  I do not have to expose a programmer to the
concept of futures or promises, async tasks, or anything like that. 

## API Compromises

Now, I don't think that such a particular syntax would fit well into Python.
And it is somewhat debatable if automatic thread groups are the right solution.
You could also model this after what we have with async/await and make thread
groups explicit:

```python
from functools import partial

def download_and_store(results, url):
    results[url] = fetch_url(url)

def download_all(urls):
    results = {}

    with ThreadGroup() as g:
        for url in urls:
            g.spawn(partial(download_and_store, results, url))

    return results
```

This largely still has the same behavior, but it uses a little bit more explicit
operations and it does require you to create more helper functions.  But it
still fully avoids having to work with promises or futures.

## Complexity Goes Where It Belongs

What is so important about this entire concept is that it moves a lot of the
complexity of concurrent programming where it belongs: into the interpreter and
the internal APIs.  For instance, the dictionary in `results` has to be locked
for this to work.  Likewise, the APIs that `fetch_url` would use need to support
cancellation and the I/O layer needs to suspend the virtual thread and go back to
the scheduler.  But for the majority of programmers, all of this is hidden.

I also think that some of the APIs really aged badly for supporting
well-behaved concurrent systems.  For instance, I very much prefer Rust's idea
of enclosing values in a mutex over carrying a mutex somewhere on the side.

Also, semaphores are an incredibly potent system to limit concurrency and to
create more stable systems.  Something like this could also become a part of a
thread group, directly limiting how many spawns can happen simultaniously.

```python
from functools import partial

def download_and_store(results_mutex, url):
    with results_mutex.lock() as results:
        result = fetch_url(url)
        results.store(url, result)

def download_all(urls):
    results = Mutex(MyResultStore())

    with ThreadGroup(max_concurrency=8) as g:
        for url in urls:
            g.spawn(partial(download_and_store, results, url))

    return results
```

## Futures

There will be plenty of reasons to use futures and they would continue to hang
around. One way to get a future is to hold on to the return value of the
`spawn` method:

```python
def download_and_store(results, url):
    results[url] = fetch_url(url)

def download_all(urls):
    futures = []
    with ThreadGroup() as g:
        for url in urls:
            futures.append((url, g.spawn(lambda: fetch_url(url))))

    return {url: future.result() for (url, future) in futures}
```

## Spawn Without Thread Groups

One big question is if spawn should work if there is no thread group.  For
instance, in Trio, which is a Python async library, the decision was made that
you have to always have the equivalent of a thread group — they call it a
nursery — to spawn an operation.  I think that this is a very sensible policy,
but there are situations where you cannot really do that.  I can imagine various
different alternatives for this, such as having a default thread group hang
around for background tasks that is implicitly joined when the process is
shutting down.  However, I think the most important thing is to bring as much of
the intended behavior to the default APIs.

## Future of Async Await?

Inside your system, what would be the future of async/await?  Well, that is up
for debate, but it does seem rather reasonable to find ways to continue
asynchronous functionality for already existing code, but I do think it would
be entirely unnecessary for code in the future.

I would like you to consider this as a conversation starter about virtual
threads and less about a fully fleshed out idea.  There are a lot of questions
open about this, particularly in the context of Python, but the idea of no
longer having to deal with colored functions really appeals to me and I hope we
can explore it a bit.
