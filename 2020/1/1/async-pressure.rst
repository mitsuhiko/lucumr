public: yes
tags: [async, python]
summary: |
  An introduction to back pressure in systems and why it matters.

I'm not feeling the async pressure
==================================

Async is all the rage.  Async Python, async Rust, go, node, .NET, pick
your favorite ecosystem and it will have some async going.  How good this
async business works depends quite a lot on the ecosystem and the runtime
of the language but overall it has some nice benefits.  It makes one thing
really simple: to await an operation that can take some time to finish.
It makes it so simple, that it creates innumerable new ways to blow ones
foot off.  The one that I want to discuss is the one where you don't
realize you're blowing your foot off until the system starts overloading
and that's the topic of back pressure management.  A related term in
protocol design is flow control.

What's Back Pressure
--------------------

There are many explanations for back pressure and a great one is
`Backpressure explained — the resisted flow of data through software
<https://medium.com/@jayphelps/backpressure-explained-the-flow-of-data-through-software-2350b3e77ce7>`__
which I recommend reading.  So instead of going into detail about what
back pressure is I just want to give a very short definition and
explanation for it: back pressure is resistance that opposes the flow of
data through a system.  Back pressure sounds quite negative — who does not
imagine a bathtub overflowing due to a clogged pipe — but it's here to
save your day.

The setup we're dealing with here is more or less the same in all cases:
we have a system composed of different components into a pipeline and that
pipeline has to accept a certain number of incoming messages.

You could imagine this like you would model luggage delivery at airports.
Luggage arrives, gets sorted, loaded into the aircraft and finally
unloaded.  At any point an individual piece of luggage is thrown together
with other luggage into containers for transportation.  When a container
is full it will need to be picked up.  When no containers are left that's
a natural example of back pressure.  Now the person that would want to
throw luggage into a container can't because there is no container.  A
decision has to be made now.  One option is to wait: that's often referred
to as queueing or buffering.  The other option is to throw away some
luggage until a container arrives — this is called dropping.  That sounds
bad, but we will get into why this is sometimes important later.  However
there is another thing that plays into here.  Imagine the person tasked
with putting luggage into a container does not receive a container for an
extended period of time (say a week).  Eventually if they did not end up
throwing luggage away now they will have an awful lot of luggage standing
around.  Eventually the amount of luggage they will have to sort through
will be so enormous that they run out of physical space to store the
luggage.  At that point they are better off telling the airport not to
accept any more incoming luggage until their container issue is resolved.
This is commonly referred to as `flow control
<https://en.wikipedia.org/wiki/Flow_control_(data)>`__ and a crucial
aspect of networking.

All these processing pipelines are normally scaled for a certain amount of
messages (or in this case luggage) per time period.  If the number exceeds
this — or worst of all — if the pipeline stalls terrible things can
happen.  An example of this in the real world was the London Heathrow
Terminal 5 opening where 42,000 bags failed to be routed correctly over 10
days because the IT infrastructure did not work correctly.  They had to
cancel more than 500 flights and for a while airlines chose to only permit
carry-on only.

Back Pressure is Important
--------------------------

What we learn from the Heathrow disaster is that being able to communicate
back pressure is crucial.  In real life as well as in computing time is
always finite.  Eventually someone gives up waiting on something.  In
particular even if internally something would wait forever, externally it
wouldn't.

A real time example for this: if your bag is supposed to be going via
London Heathrow to your destination in Paris, but you will only be there
for 7 days, then it is completely pointless for your luggage to arrive
there with a 10 day delay.  In fact you want your luggage to be re-routed
back to your home airport.

It's in fact better to admit defeat — that you're overloaded — than to
pretend that you're operational and keep buffering up forever because at
one point it will only make matters worse.

So why is back pressure all the sudden a topic to discuss when we wrote
thread based software for years and it did not seem to come up?  A
combination of many factors some of which are just the easy to shoot
yourself into the foot.

Bad Defaults
------------

To understand why back pressure matters in async code I want to give you
a seemingly simple piece of code with Python's asyncio that showcases a
handful of situations where we accidentally forgot about back pressure:

.. sourcecode:: python3

    from asyncio import start_server, run
    
    async def on_client_connected(reader, writer):
        while True:
            data = await reader.readline()
            if not data:
                break
            writer.write(data)
    
    async def server():
        srv = await start_server(on_client_connected, '127.0.0.1', 8888)
        async with srv:
            await srv.serve_forever()

    run(server())

If you are new to the concept of async/await just imagine that at any
point where await is called, the function suspends until the expression
resolves.  Here the `start_server` function that is provided by Python's
`asyncio` system runs a hidden `accept` loop.  It listens on a socket and
spawns an independent task running the `on_client_connected` function for
each socket that connects.

Now this looks pretty straightforward.  You could remove all the `await`
and `async` keywords and you end up with code that looks very similar to
how you would write code with threads.

However that hides one very crucial issue which is the root of all our
issues here: and that are function calls that do not have an `await` in
front of it.  In threaded code any function can yield.  In async code only
async functions can.  This means for instance that the `writer.write`
method cannot block.  So how does this work?  So it will try to write the
data right into the operating system's socket buffer which is non
blocking.  However what happens if the buffer is full and the socket would
block?  In the threading case we could just block here which would be
ideal because it means we're applying some back pressure.  However because
there are not threads here we can't do that.  So we're left with buffering
here or dropping data.  Because dropping data would be pretty terrible,
Python instead chooses to buffer.  Now what happens if someone sends a lot
of data in but does not read?  Well in that case the buffer will grow and
grow and grow.  This API deficiency is why the Python documentation says
not to use `write` at all on it's own but to follow up with `drain`:

.. sourcecode:: python3

    writer.write(data)
    await writer.drain()

Drain will drain some excess on the buffer.  It will not cause the entire
buffer to flush out, but just enough to prevent things to run out of
control.  So why is `write` not doing an implicit `drain`?  Well it's a
massive API oversight and I'm not exactly sure how it happened.

An important part that is very important here is that most sockets are
based on TCP and TCP has built-in flow control.  A writer will only write
so fast as the reader is willing to accept (give or take some buffering
involved).  This is hidden from you entirely as a developer because not
even the BSD socket libraries expose this implicit flow control handling.

So did we fix our back pressure issue here?  Well let's see how this whole
thing would look like in a threading world.  In a threading world our code
most likely would have had a fixed number of threads running and the
accept loop would have waited for a thread to become available to take
over the request.  In our async example however we now have an unbounded
number of connections we're willing to handle.  This similarly means
we're willing to accept a very high number of connections even if it means
that the system would potentially overload.  In this very simple example
this is probably less of an issue but imagine what would happen if we were
to do some database access.

Picture a database connection pool that will give out up to 50
connections.  What good is it to accept 10000 connections when most of
them will bottleneck on that connection pool?

Waiting vs Waiting to Wait
--------------------------

So this finally leads me to where I wanted to go in the first place.  In
most async systems and definitely in most of what I encountered in Python
even if you fix all the socket level buffering behavior you end up in a
world where you chain a bunch of async functions together with no regard
of back pressure.

If we take our database connection pool example let's say there are only
50 connections available.  This means at most we can have 50 concurrent
database sessions for our code.  So let's say we want to let 4 times as
many requests be processed as we're expecting that a lot of what the
application does is independent of the database.  One way to go about it
would be to make a semaphore with 200 tokens and to acquire one at the
beginning.  If we're out of tokens we would start waiting for the
semaphore to release a token.

But hold on.  Now we're back to queueing!  We're just queueing a bit
earlier.  If we were to severely overload the system now we would queue all
the way at the beginning.  So now everybody would wait for the maximum
amount of time they are willing to wait and then give up.  Worse: the
server might still process these requests for a while until it realizes
the client has disappeared and is no longer interested in the response.

So instead of waiting straight away we would want some feedback.  Imagine
you're in a post office and you are drawing a ticket from a machine that
tells you when it's your turn.  This ticket gives you a pretty good
indication of how long you will have to wait.  If the waiting time is too
long you can decide to abandon your ticket and head out to try again
later.  Note that the waiting time you have until it's your turn at the
post office is independent of the waiting time you have for your request
(for instance because someone needs to fetch your parcel, check documents
and collect a signature).

So here is the naive version where we can only notice we're waiting:

.. sourcecode:: python3

    from asyncio.sync import Semaphore

    semaphore = Semaphore(200)

    async def handle_request(request):
        await semaphore.acquire()
        try:
            return generate_response(request)
        finally:
            semaphore.release()

For the caller of the `handle_request` async function we can only see that
we're waiting and nothing is happening.  We can't see if we're waiting
because we're overloaded or if we're waiting because generating the
response just takes so long.  We're basically endlessly buffering here
until the server will finally run out of memory and crash.

The reason for this is that we have no communication channel for back
pressure.  So how would we go about fixing this?  One option is to add a
layer of indirection.  Now here unfortunately `asyncio`'s semaphore is no
use because it only lets us wait.  But let's imagine we could ask the
semaphore how many tokens are left, then we could do something like this:

.. sourcecode:: python3

    from hypothetical_asyncio.sync import Semaphore, Service

    semaphore = Semaphore(200)

    class RequestHandlerService(Service):
        async def handle(self, request):
            await semaphore.acquire()
            try:
                return generate_response(request)
            finally:
                semaphore.release()

        @property
        def is_ready(self):
            return semaphore.tokens_available()

Now we have changed the system somewhat.  We now have a
`RequestHandlerService` which has a bit more information.  In particular
it has the concept of readiness.  The service can be asked if it's ready.
That operation is inherently non blocking and a best estimate.  It has to
be, because we're inherently racy here.

The caller now would now turn from this:

.. sourcecode:: python3

    response = await handle_request(request)

Into this:

.. sourcecode:: python3

    request_handler = RequestHandlerService()
    if not request_handler.is_ready:
        response = Response(status_code=503)
    else:
        response = await request_handler.handle(request)

There are multiple ways to skin the cat, but the idea is the same.  Before
we're actually going to commit ourself to doing something we have a way to
figure out how likely it is that we're going to succeed and if we're
overloaded we're going to communicate this upwards.

Now the definition of the service I did not come up with.  The design of
this comes from Rust's `tower <https://github.com/tower-rs/tower>`__ and
Rust's `actix-service <https://docs.rs/actix-service/>`__.  Both have a
very similar definition of the service trait which is similar to that.

Now there is still a chance to pile up on the semaphore because of how
racy this is.  You can now either take that risk or still fail if `handle`
is being invoked.

A library that has solved this better than `asyncio` is `trio` which
exposes the internal counter on the semaphore and a `CapacityLimiter`
which is a semaphore optimized for the purpose of capacity limiting which
protects against some common pitfalls.

Streams and Protocols
---------------------

Now the example above solves us RPC style situations.  For every call we
can be informed well ahead of time if the system is overloaded.  A lot of
these protocols have pretty straightforward ways to communicate that the
server is at load.  In HTTP for instance you can emit a 503 which can also
carry a `retry-after` header that tells the client when it's a good idea
to retry.  This retry adds a natural point to re-evaluate if what you want
to retry with it still the same request or if something changed.  For
instance if you can't retry in 15 seconds, maybe it's better to surface
this inability to the user instead of showing an endless loading icon.

However request/response style protocols are not the only ones.  A lot of
protocols have persistent connections open and let you stream a lot of
data through.  Traditionally a lot of these protocols were based on TCP
which as was mentioned earlier has built-in flow control.  This flow
control is however not really exposed through socket libraries which is
why high level protocols typically need to add their own flow control to
it.  In HTTP 2 for instance a custom flow control protocol exists because
HTTP 2 multiplexes multiple independent streams over a single TCP
connection.

Coming from a TCP background where flow control is managed silently behind
the scenes can set a developer down a dangerous path where one just reads
bytes from a socket and assumes this is all there is to know.  However the
TCP API is misleading because flow control is — from an API perspective
— completely hidden from the user.  When you design your own streaming
based protocol you will need to absolutely make sure that there is a
bidirectional communication channel and that the sender is not just
sending, but also reading to see if they are allowed to continue.

With streams concerns are typically different.  A lot of streams are just
streams of bytes or data frames and you can't just drop packets in
between.  Worse: it's often not easy for a sender to check if they should
slow down.  In HTTP2 you need to interleave reads and writes constantly on
the user level.  You absolutely must handle flow control there.  The
server will send you (while you are writing) `WINDOW_UPDATE` frames when
you're allowed to continue writing.

This means that streaming code becomes a lot more complex because you need
to write yourself a framework first that can act on incoming flow control
information.  The `hyper-h2 <https://github.com/python-hyper/hyper-h2>`__
Python library for instance has a surprisingly complex `file upload server
example with flow control
<https://python-hyper.org/projects/h2/en/stable/curio-example.html>`__
based on curio and that example is not even complete.

New Footguns
------------

async/await is great but it encourages writing stuff that will behave
catastrophically when overloaded.  On the one hand because it's just so
easy to queue but also because making a function `async` after the fact is
an API breakage.  I can only assume this is why Python still has a non
awaitable `write` function on the stream writer.

The biggest reason though is that async/await lets you write code many
people wouldn't have written with threads in the first place.  That's I
think a good thing, because it lowers the barrier to actually writing
larger systems.  The downside is that it also means many more developers
who previously had little experience with distributed system now have many
of the problems of a distributed system even if they only write a single
program.  HTTP2 is a protocol that is complex enough due to the
multiplexing nature that the only reasonable way to implement it is based
on async/await as an example.

And it's not just async await code that is suffering from these issues.
`Dask <https://dask.org/>`__ for instance is a parallelism library for
Python used by data science programmers and despite not using async/await
there are bug reports of the system running out of memory due to the lack
`of back pressure <https://github.com/dask/distributed/issues/2602>`__.
But these issues are rather fundamental.

The lack of back pressure however is a type of footgun that has the size of
a bazooka.  If you realize too late that you built a monster it will be
almost impossible to fix without major changes to the code base because
you might have forgotten to make some functions async that should have
been.  And a different programming environment does not help here.  The
same issues people have in all programming environments including the
latest additions like go and Rust.  It's not uncommon to find open issues
about “handle flow control” or “handle back pressure” even on very popular
projects that are open for a lengthy period of time because it turns out
that it's really hard to add after the fact.  For instance go has an open
issue from 2014 `about adding a semaphore to all filesystem IO
<https://github.com/golang/go/issues/7903>`__ because it can overload the
host.  aiohttp has `an issue dating back to 2016
<https://github.com/aio-libs/aiohttp/issues/1368>`__ about clients being
able to break the server due to insufficient back pressure.  There are
many, many more examples.

If you look at the Python hyper-h2 docs there are a shocking amount of
examples that say something along the lines of “does not handle flow
control”, “It does not obey HTTP/2 flow control, which is a flaw, but it
is otherwise functional” etc.  I believe the fact flow control is very
complex once it shows up in the surface and it's easy to just pretend it's
not an issue, is why we're in this mess in the first place.  Flow control
also adds a significant overhead and doesn't look good in benchmarks.

So for you developers of async libraries here is a new year's resolution
for you: give back pressure and flow control the importance they deserve
in documentation and API.
