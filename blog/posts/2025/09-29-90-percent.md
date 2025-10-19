---
tags: ['ai', 'thoughts']
summary: "AI is writing 90% of the code I was in charge of"
---

# 90%

> "I think we will be there in three to six months, where AI is writing 90% of
> the code. And then, in 12 months, we may be in a world where AI is writing
> essentially all of the code"
>
> — [Dario Amodei](https://www.businessinsider.com/anthropic-ceo-ai-90-percent-code-3-to-6-months-2025-3)

[Three months ago](/2025/6/4/changes/) I said that AI changes everything.  I
came to that after plenty of skepticism.  There are still good reasons to doubt
that AI will write all code, but my current reality is close.

For the infrastructure component I started at my new company, I'm probably
north of 90% AI-written code.  I don't want to convince you — just share what I
learned.  In parts, because I approached this project differently from my first
experiments with AI-assisted coding.

The service is written in Go with few dependencies and an OpenAPI-compatible
REST API.  At its core, it sends and receives emails.  I also generated SDKs
for Python and TypeScript with a custom SDK generator.  In total: about 40,000
lines, including Go, YAML, Pulumi, and some custom SDK glue.

I set a high bar, especially that I can operate it reliably.  I've run similar
systems before and knew what I wanted.

## Setting it in Context

Some startups are already near 100% AI-generated.  I know, because many build
in the open and you can see their code.  Whether that works long-term remains
to be seen.  I still treat every line as my responsibility, judged as if I
wrote it myself.  AI doesn't change that.

There are no weird files that shouldn't belong there, no duplicate
implementations, and no emojis all over the place.  The comments still follow
the style I want and, crucially, often aren't there.  I pay close attention to
the fundamentals of system architecture, code layout, and database interaction.
I'm incredibly opinionated.  As a result, there are certain things I don't let
the AI do.  I know it won't reach the point where I could sign off on a commit.
That's why it's not 100%.

As contrast: another quick prototype we built is a mess of unclear database
tables, markdown file clutter in the repo, and boatloads of unwanted emojis.
It served its purpose — validate an idea — but wasn't built to last, and we had
no expectation to that end.

## Foundation Building

I began in the traditional way: system design, schema, architecture.  At this
state I don't let the AI write, but I loop it in AI as a kind of rubber duck.
The back-and-forth helps me see mistakes, even if I don't need or trust the
answers.

I did get the foundation wrong once.  I initially argued myself into a more
complex setup than I wanted.  That's a part where I later used the LLM to redo
a larger part early and clean it up.

For AI-generated or AI-supported code, I now end up with a stack that looks
something like something I often wanted, but was too hard to do by hand:

* **Raw SQL:** This is probably the biggest change to how I used to write
  code.  I really like using an ORM, but I don't like some of its effects.  In
  particular, once you approach the ORM's limits, you're forced to switch to
  handwritten SQL.  That mapping is often tedious because you lose some of the
  powers the ORM gives you.  Another consequence is that it's very hard to find
  the underlying queries, which makes debugging harder.  Seeing the actual SQL
  in your code and in the database log is powerful.  You always lose that with
  an ORM.

  The fact that I no longer have to write SQL because the AI does it for me is
  a game changer.

  I also use raw SQL for migrations now.

* **OpenAPI first:** I tried various approaches here.  There are many
  frameworks you can use.  I ended up first generating the OpenAPI specification
  and then using code generation from there to the interface layer.  This
  approach works better with AI-generated code.  The OpenAPI specification is
  now the canonical one that both clients and server shim is based on.

## Iteration

Today I use Claude Code and Codex. Each has strengths, but the constant is
Codex for code review after PRs.  It's very good at that.  Claude is
indispensable still when debugging and needing a lot of tool access (eg: why do
I have a deadlock, why is there corrupted data in the database etc.).  The
working together of the two is where it's most magical.  Claude might find the
data, Codex might understand it better.

I cannot stress enough how bad the code from these agents can be if you're not
careful.  While they understand system architecture and how to build something,
they can't keep the whole picture in scope.  They will recreate things that
already exist.  They create abstractions that are completely inappropriate for
the scale of the problem.

You constantly need to learn how to bring the right information to the context.
For me, this means pointing the AI to existing implementations and giving it
very specific instructions on how to follow along.

I generally create PR-sized chunks that I can review.  There are two paths to
this:

1. **Agent loop with finishing touches:** Prompt until the result is close,
   then clean up.

2. **Lockstep loop:** Earlier I went edit by edit. Now I lean on the first
   method most of the time, keeping a todo list for cleanups before merge.

It requires intuition to know when each approach is more likely to lead to the
right results.  Familiarity with the agent also helps understanding when a task
will not go anywhere, avoiding wasted cycles.

## Where It Fails

The most important piece of working with an agent is the same as regular
software engineering.  You need to understand your state machines, how the
system behaves at any point in time, your database.

It is easy to create systems that appear to behave correctly but have unclear
runtime behavior when relying on agents.  For instance, the AI doesn't fully
comprehend threading or goroutines.  If you don't keep the bad decisions at bay
early it, you won't be able to operate it in a stable manner later.

Here's an example: I asked it to build a rate limiter.  It "worked" but lacked
jitter and used poor storage decisions.  Easy to fix if you know rate limiters,
dangerous if you don’t.

Agents also operate on conventional wisdom from the internet and in tern do
things I would never do myself.  It loves to use dependencies (particularly
outdated ones).  It loves to swallow errors and take away all tracebacks.
I'd rather uphold strong invariants and let code crash loudly when they fail,
than hide problems.  If you don't fight this, you end up with opaque,
unobservable systems.

## Where It Shines

For me, this has reached the point where I can't imagine working any other way.
Yes, I could probably have done it without AI.  But I would have built a
different system in parts because I would have made different trade-offs.  This
way of working unlocks paths I'd normally skip or defer.

Here are some of the things I enjoyed a lot on this project:

* **Research + code, instead of research and code later:** Some things that
  would have taken me a day or two to figure out now take 10 to 15 minutes.  
  It allows me to directly play with one or two implementations of a problem.
  It moves me from abstract contemplation to hands on evaluation.

* **Trying out things:** I tried three different OpenAPI implementations and
  approaches in a day.

* **Constant refactoring:** The code looks more organized than it would
  otherwise have been because the cost of refactoring is quite low.  You need
  to know what you do, but if set up well, refactoring becomes easy.

* **Infrastructure:** Claude got me through AWS and Pulumi.  Work I generally
  dislike became a few days instead of weeks.  It also debugged the setup issues
  as it was going through them.  I barely had to read the docs.

* **Adopting new patterns:** While they suck at writing tests, they turned out
  great at setting up test infrastructure I didn't know I needed.  I got a
  recommendation on Twitter to use
  [testcontainers](https://golang.testcontainers.org/) for testing against
  Postgres.  The approach runs migrations once and then creates database clones
  per test.  That turns out to be super useful.  It would have been quite an
  involved project to migrate to.  Claude did it in an hour for all tests.

* **SQL quality:** It writes solid SQL I could never remember.  I just need to
  review which I can.  But to this day I suck at remembering `MERGE` and `WITH`
  when writing it.

## What does it mean?

Is 90% of code going to be written by AI?  I don't know.  What I do know is,
that for me, on this project, the answer is already yes.  I'm part of that
growing subset of developers who are building real systems this way.

At the same time, for me, AI doesn't own the code.  I still review every line,
shape the architecture, and carry the responsibility for how it runs in
production.  But the sheer volume of what I now let an agent generate would
have been unthinkable even six months ago.

That's why I'm convinced this isn't some far-off prediction.  It's already here
— just unevenly distributed — and the number of developers working like this is
only going to grow.

That said, none of this removes the need to actually be a good engineer.  If you
let the AI take over without judgment, you'll end up with brittle systems and
painful surprises (data loss, security holes, unscalable software).  The tools
are powerful, but they don't absolve you of responsibility.
