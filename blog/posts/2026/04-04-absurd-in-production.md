---
tags: [ai, announcements]
summary: Five months of durable execution with just Postgres.
---

# Absurd In Production

About five months ago I wrote about [Absurd](/2025/11/3/absurd-workflows/), a
durable execution system we built for our own use at Earendil, sitting entirely
on top of Postgres and Postgres alone.  The pitch was simple: you don't need a
[separate](https://hatchet.run/) [service](https://www.inngest.com/), [a
compiler plugin](https://useworkflow.dev/), or [an entire
runtime](https://temporal.io/) to get durable workflows.  You need a SQL file
and a thin SDK.

Since then we've been running it in production, and I figured it's worth
sharing what the experience has been like.  The short version: the design
held up, the system has been a pleasure to work with, and other people seem
to agree.

## A Quick Refresher

Absurd is a durable execution system that lives entirely inside Postgres.
The core is a single SQL file
([absurd.sql](https://github.com/earendil-works/absurd/blob/main/sql/absurd.sql))
that defines stored procedures for task management, checkpoint storage, event
handling, and claim-based scheduling.  On top of that sit thin SDKs (currently
[TypeScript](https://www.npmjs.com/package/absurd-sdk),
[Python](https://pypi.org/project/absurd-sdk/) and an experimental
[Go](https://github.com/earendil-works/absurd/tree/main/sdks/go/absurd) one)
that make the system ergonomic in your language of choice.

The model is straightforward: you register tasks, decompose them into steps,
and each step acts as a checkpoint.  If anything fails, the task retries from
the last completed step.  Tasks can sleep, wait for external events, and
suspend for days or weeks.  All state lives in Postgres.

If you want the full introduction, the [original blog
post](/2025/11/3/absurd-workflows/) covers the fundamentals.  What follows here
is what we've learned since.

## What Changed

The project got multiple releases over the last five months.  Most of the
changes are things you'd expect from a system that people actually started
depending on: hardened claim handling, watchdogs that terminate broken workers,
deadlock prevention, proper lease management, event race conditions, and all the
edge cases that only show up when you're running real workloads.

A few things worth calling out specifically.

**Decomposed steps.**  The original design only had `ctx.step()`, where you pass
in a function and get back its checkpointed result.  That works well for many
cases but not all.  Sometimes you need to know whether a step already ran before
deciding what to do next.  So we added `beginStep()` / `completeStep()`, which
give you a handle you can inspect before committing the result.  This turned out
to be very useful for modeling intentional failures and conditional logic.
This in particular is necessary when working with "before call" and "after call"
type hook APIs.

**Task results.**  You can now spawn a task, go do other things, and later
come back to fetch or await its result.  This sounds obvious in hindsight, but
the original system was purely fire-and-forget.  Having proper result inspection
made it possible to use Absurd for things like spawning child tasks from within
a parent workflow and waiting for them to finish.  This is particularly useful
for debugging with agents too.

**absurdctl.**  We built this out as a proper CLI tool.  You can initialize
schemas, run migrations, create queues, spawn tasks, emit events, retry failures
from the command line.  It's installable via `uvx` or as a standalone binary.
This has been invaluable for debugging production issues.  When something is
stuck, being able to just `absurdctl dump-task --task-id=<id>` and see exactly
where it stopped is a very different experience from digging through logs.

**Habitat.**  A small Go application that serves up a web dashboard for
monitoring tasks, runs, checkpoints, and events.  It connects directly to
Postgres and gives you a live view of what's happening.  It's simple, but it's
the kind of thing that makes the system more enjoyable for humans.

**Agent integration.**  Since Absurd was originally built for agent workloads,
we added a bundled skill that coding agents can discover and use to debug
workflow state via `absurdctl`.  There's also a documented pattern for making
[pi](https://pi.dev/) agent turns durable by logging each message as a
checkpoint.

## What Held Up

The thing I'm most pleased about is that the core design didn't need to change
all that much.  The fundamental model of tasks, steps, checkpoints, events, and
suspending is still exactly what it was initially.  We added features around it,
but nothing forced us to rethink the basic abstractions.

Putting the complexity in SQL and keeping the SDKs thin turned out to be a
genuinely good call.  The TypeScript SDK is about 1,400 lines.  The Python SDK
is about 1,900 but most of this comes from the complexity of supporting colored
functions.  Compare that to Temporal's Python SDK at around 170,000 lines.  It
means the SDKs are easy to understand, easy to debug, and easy to port.  When
something goes wrong, you can read the entire SDK in an afternoon and understand
what it does.

The checkpoint-based replay model also aged well.  Unlike systems that require
deterministic replay of your entire workflow function, Absurd just loads the
cached step results and skips over completed work.  That means your code doesn't
need to be deterministic outside of steps.  You can call `Math.random()` or
`datetime.now()` in between steps and things still work, because only the step
boundaries matter.  In practice, this makes it much easier to reason about
what's safe and what isn't.

Pull-based scheduling was the right choice too.  Workers pull tasks from
Postgres as they have capacity.  There's no coordinator, no push mechanism, no
HTTP callbacks.  That makes it trivially self-hostable and means you don't have
to think about load management at the infrastructure level.

## What Might Not Be Optimal

I had some discussions with folks about whether the right abstraction should have been
a [durable
promise](https://www.distributed-async-await.io/specification/programming-model/durable-promise-specification).
It's a very appealing idea, but it turns out to be much more complex to
implement in practice.  It's however in theory also more powerful.  I did make
some attempts to see what absurd would look like if it was based on durable
promises but so far did not get anywhere with it.  It's however an experiment
that I think would be fun to try!

## What We Use It For

The primary use case is still agent workflows.  An agent is essentially a loop
that calls an LLM, processes tool results, and repeats until it decides it's
done.  Each iteration becomes a step, and each step's result is checkpointed.
If the process dies on iteration 7, it restarts and replays iterations 1 through
6 from the store, then continues from 7.

But we've found it useful for a lot of other things too.  All our crons just
dispatch distributed workflows with a pre-generated deduplication key from the
invocation.  We can have two cron processes running and they will only trigger
one absurd task invocation.  We also use it for background processing that needs
to survive deploys.  Basically anything where you'd otherwise build your own
retry-and-resume logic on top of a queue.

## What's Still Missing

Absurd is deliberately minimal, but there are things I'd like to see.

There's no built-in scheduler.  If you want cron-like behavior, you run your own
scheduler loop and use idempotency keys to deduplicate.  That works, and we have
a [documented pattern for
it](https://earendil-works.github.io/absurd/patterns/cron/), but it would be
nice to have something more integrated.

There's no push model.  Everything is pull.  If you need an HTTP endpoint to
receive webhooks and wake up tasks, you build that yourself.  I think that's the
right default as push systems are harder to operate and easier to overwhelm but
there are cases where it would be convenient.  In particular there are quite a
few agentic systems where it would be super nice to have webhooks natively
integrated (wake on incoming POST request).  I definitely don't want to have
this in the core, but that sounds like the kind of problem that could be a nice
adjacent library that builds on top of absurd.

The biggest omission is that it does not support partitioning yet.  That's
unfortunate because it makes cleaning up data more expensive than it has to be.
In theory supporting partitions would be pretty simple.  You could have weekly
partitions and then detach and delete them when they expire.  The only thing
that really stands in the way of that is that Postgres does not have a
convenient way of actually doing that.

The hard part is not partitioning itself, it's partition lifecycle management under
real workloads.  If a worker inserts a row whose `expires_at` lands in a month
without a partition, the insert fails and the workflow crashes.  So you need a
separate maintenance loop that always creates future partitions far enough ahead
for sleeps/retries, and does that for every queue.

On the delete side, the safe approach is `DETACH PARTITION CONCURRENTLY`, but
getting that to run from `pg_cron` doesn't work because it cannot be run within a
transaction, but `pg_cron` runs everything in one.

I don't think it's an unsolvable problem, but it's one I have not found a good
solution for and I would love [to get input
on](https://github.com/earendil-works/absurd/issues/4).

## Does Open Source Still Matter?

This brings me a bit to a meta point on the whole thing which is what the point
of Open Source libraries in the age of agentic engineering is.  Durable
Execution is now something that plenty of startups sell you.  On the other hand
it's also something that an agent would build you and people might not even look
for solutions any more.  It's kind of … weird?

I don't think a durable execution library can support a company, I really
don't.  On the other hand I think it's just complex enough of a problem that it
could be a good Open Source project void of commercial interests.  You do need a
bit of an ecosystem around it, particularly for UI and good DX for debugging,
and that's hard to get from a throwaway implementation.

I don't think we have squared this yet, but it's already much better to use than
a few months ago.

If you're using Absurd, thinking about it, or building adjacent ideas, I'd love
your feedback. Bug reports, rough edges, design critiques, and contributions are
all very welcome—this project has gotten better every time someone poked at it
from a different angle.
