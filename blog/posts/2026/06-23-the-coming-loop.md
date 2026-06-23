---
tags: ['ai', 'pi']
summary: "Loops, harnesses, and why even loop skeptics may end up with them."
---

# The Coming Loop

> I don’t prompt Claude anymore. I have loops running that prompt Claude and
> figuring out what to do. My job is to write loops.
>
> — Boris Cherny

Over the last months I have watched more and more people build something on top
of coding agents that feels meaningfully different from just using a coding
agent.  Some of this happens on top of [Pi](https://pi.dev/) which is cool to
see for sure!  The pattern is the same everywhere though: work is put into a
queue of sorts, a machine picks it up, attempts it, stops, and then some harness
decides whether that was actually the end.

If not, the harness continues the same session, injects another message, starts
a fresh session with modified context, or sends the task to another machine.  The
task stays alive beyond the point where the model by itself would normally have
said: "I am done."

I think about that type of loop more than I want to admit.

There is already an agent loop inside every coding agent.  The model calls a
tool, incorporates the result, calls another tool, reads a file, edits a file,
runs tests, and eventually produces some answer.  That loop is one we have been
quite familiar with for a long time.  The other loop is the harness level loop:
the loop outside the agent loop.  That loop is also [not
new](https://ghuntley.com/ralph/).  We have been doing versions of this since
early Claude Code days, but that loop is becoming ever more present in agentic
engineering and in recent weeks it has started to dominate the Twitter
discourse.

## I Am Not Good At This Yet

My current status is that I have not had much success with this way of working
for code I deeply care about which turns out to be quite a lot of code.

Part of that is taste and part of it is control.  I attempt to set a high bar
for what I want code to look like, and I want to understand the code I ship.
Under pressure, or in a discussion with another human, I want to be able to
explain what the system does without first having to ask a clanker to explain it
to me.  Now there is obviously a question if this desire to understand the code
is one that I will still have a few years from now.  For now I have not moved
past the point of comprehension being important to me.

Given this desire, there is something I lack with my experience of code written
without me paying attention, particularly from loops.  Present-day models tend
to produce code that is too defensive, too complex, too local in its reasoning.
They avoid strong invariants.  They add fallbacks instead of making bad states
impossible.  They duplicate code, invent bad abstractions, and paper over
unclear design with more machinery.  Worse though: I so far see very little
progress of this improving.  If anything, on that front it feels to me that
we might even be making steps in the wrong direction.  At least for my taste,
present-day hands-off harnesses like Claude Code with ultracode produce worse
code than what we were producing last autumn.  That's because Claude Code, with
Fable for instance will be working uninterrupted on a problem for thirty minutes
or more, when previously the process would have been much more human in the
loop.

Furthermore it's well understood that models tend to observe some local failure
and add a local defense.  [Karpathy
mentioned](https://x.com/karpathy/status/1976082963382272334) how they are
“mortally terrified of exceptions”.  In systems with important invariants,
especially persisted data formats or core infrastructure, the right fix is not
"handle every malformed case."  The right fix is to make the malformed case
unrepresentable or impossible to write in the first place.  Yet even with a lot
of manual steering, that type of code does not come out of LLMs naturally, and
even if the code comes out naturally like that, they will still attempt to
handle now impossible errors.

When you take that behavior and you put it behind loops, you tend to amplify it.
If each iteration adds another small defense, the system slowly becomes less
understandable while appearing more robust.  The more hands-off you are, the
more that happens.  It also teaches really bad practices when tools like this
are given to juniors without clear guidance.  Because if you ask them, why they
are doing all that, they will convincingly argue their case.

## Where Loops Work

At the same time, it would be dishonest to pretend the loop pattern does not
work because it already works astonishingly well in some domains.

Porting code one of them.  There are already impressive examples of large
automatic porting efforts, including the reported work around moving parts of
[Bun from Zig to
Rust](https://ziggit.dev/t/bun-is-being-ported-from-zig-to-rust/15330).  I have
used it with success myself [to port MiniJinja to
Go](/2026/1/14/minijinja-go-port/).  Performance explorations are another case
where this works beautifully.  A machine can try experiments, benchmark them,
discard failures, and keep searching.  Security scanning fits naturally too and
so does almost any type of research: asking a system to explore a complex
problem space and report back without necessarily committing lasting code.  One
thing that many of these have in common is that they either do not generate new
code, but transform code that already exists, or they produce code that
intentionally does not have a long shelf life.  They either produce proof of
concepts or ideas, surface findings or are more akin to mechnical
transformation.

I believe that loops that produce artifacts without necessity of longevity or
that create some form of clearly verifiable mechnical translation matters more
than the general ability of a harness to mechanically measure a goal.  Many
successful applications of loops use another LLM as a judge or as an
orchestrator.  The mechnical translation case can be verified with a binary test
case, but it can also be judged by an LLM instead!

Claude Code, for instance, is increasingly good at creating entire experimental
workflows that it will then execute.  Sure, the code it produces is slop, but
that's more the fault of the model than the harness not being a good judge on if
a step in the workflow resulted in a net improvement or completion.

The harness just needs some signal that lets it continue.  It does not have to
be objective or binary, it just has to be useful enough to drive another
iteration.

I absolutely love loops already that take the boring parts out of my day to
experiment and measure and to give me ideas.

## Software As Organism

On the other hand using that same looping methodology to write lasting code does
not yet sit well with me.  The metaphor I like to reach for is one of moving
from software as a deterministic machine to software as an organism.

I became a software engineer in an enviornment that encouraged me to understand
the machine.  There was always a layer you could peel off to deepen your
understanding.  Machines that did not exhibit deterministic observable behavior
were maybe accepted, but generally seen as not exactly optimal.  Software
architecture-wise, I saw it as desireable to push further towards more
determinism rather than less.  Likewise the ability to understand the code has
been an undeniable goal.  In practice not always possible we still took pride in
writing code so that it became possible even for new engineers to navigate
complex code bases through clever architecture.  On well designed systems there were
always engineers that knew where the invariantes lived, which parts were
load-bearing and which changes were safe.  Ideally all of that was also well
documented.  Where that understanding was lacking, it was generally regarded as
something to improve upon.

Obviously that ideal has always been strained.  Many software systems,
especially very successful ones had periods where engineers on the team were
able to keep them clean.  Large software systems are not infrequently too big,
too dynamic and too dependent on external services to fit into anyone's head.
Even without LLMs we already diagnose distributed systems somewhat like doctors
in that we observe symptoms, form hypotheses, "order more tests", try some
remedies, and observe again.

Yet with LLMs we're pushing much further in that direction and much quicker.  We
use them to write the code and we also use them for diagnosis and remedy.
There are plenty of engineers that already live in a world in which the first
step after the occurrence of a production issue is followed by having a clanker
read logs, propose root causes and proactively put up a patch.  The resulting
patch is then often picked up by another machine that reviews, sometimes even
landing it on main without any human supervision.

Obviously that is powerful and I cannot deny that it sounds appealing.  But
giving in to that idea, particularly with less and less human oversight means
accepting that we may no longer understand the whole system in the same way.  We
treat it, we monitor it, we stabilize it, but we do not necessarily comprehend
it.

I have no doubts that for some software, that is okay.  Not every line of code
deserves human authorship and worse code might have been written in the past.

But do I want all software to be authored this way?

## You Cannot Quite Opt Out

What's very uncomfortable is that opting out of this fully machine-driven
future may not be an option.

Security is the clearest example today.  Even if you do not use loops to build
your software, other people will use loops against your software.  Attackers
will run machines continuously and even if it's not attackers, then security
researchers will and some of that automated work will throw up dust but also
find real issues.  And both the signal and the noise will come your way at a
volume that makes it almost impossible to deal with unless you yourself throw a
machine at the problem.

Daniel Stenberg's post about curl's [summer of
bliss](https://daniel.haxx.se/blog/2026/06/15/curl-summer-of-bliss/) is a good
example of the pressure maintainers are already under.  As far as I know, AI
does not play a tremendous role in the core development of curl today.  Yet
despite all of this, maintainers are overwhelmed by reports, most of which are
now AI-generated ones.

If attackers and reporters loop, defenders will eventually need to loop too to
keep up.  Maybe not to write patches directly, maybe just to triage and
reproduce and pressure will increase.

The same is true competitively as some teams will out-build others through raw
speed.  Some projects will suddenly move faster because a tiny group figures out
how to orchestrate machines effectively.  Some startups will do with five people
what used to require fifty.  Some people might literally put a machine against
your product in a loop and ask it to "make it like the other one."  And if their
users are happy, does it really matter?

Not all software will be equally affected.  Some domains will punish sloppiness
and demand trust and responsibility, but a lot of software lives in a world
where raw speed, quick experimentation, and vast coverage matter enormously.

## Building New Dependencies

The scariest part to me is that we become dependent on these new machines in new
ways.  Software has always depended on tools.  I remember the time when I had to
pay for compilers.  These new tools are a flashback to times where creating
software came with real costs.  But now it's no longer a one-time payment, it's
a constant dependency.  Not just a dependency on a filled wallet, but also a
cognitive dependency.

If a codebase is produced by loops, reviewed by loops, patched by loops, and
kept alive by loops, what happens when you no longer have access to the same
class of systems?  What happens when some trade restrictions take away access to
the most powerful models?  What if just the cost becomes unbearable?  What if
you and your team just lose the last remaining ability to understand the code
without using the machine?

We may create codebases that are not merely hard to maintain by humans, but that
assume machine participation as part of their maintenance model.  This is
already happening!  It's not happening everywhere, and it might not even be
happening in ways that are seen as problematic, but we see more and more of it.
People more and more merge code they cannot fully explain.  People lose their
ability to create issue reports or discuss things in chat, without augmenting or
rephrasing their messages with the context provided by a clanker.  Too many
people increasingly rely on a machine to summarize or contextualize it.  More
and more do I encounter people who converse with me through the indirection of
an LLM.

Again, maybe that is not even going to be wrong, but it's a massive change to
how we did things.

## Future Harnesses

I have little doubt that this is where things are going but going there will
require us to do something about our tooling everywhere, and not just in the
coding agents.

Just orchestrating more loops won't be enough.  Better visualizations of changes
or orchestration or agents will not restore our understanding.  Either we need
to find clever ways to jolt the human back into the loop and make the changes of
the loops legible long term, or we need to find better ways to compose these
ever more complex systems.

This is also where my thinking about the role of Pi is changing.  Pi has been
cautious, and I think that caution is good.  I do not want a future where every
interaction turns into an uncontrolled swarm of machines making changes I cannot
follow.  I would not want Pi to become an unmaintainable mess in an effort to
win the race towards software that writes itself and I would not want Pi to
promote this type of engineering either.  At the same time Pi is a harness and
harnesses are at the center of people running these new types of experiments.

Task queues for coding tasks, orchestration of agents, subagents, durable
sessions will matter more and more.  Even those of us who have their
reservations and are not blindly embracing loops will have to start doing those
experiments.  We need to, because we need to understand how to make this future
bounded and survivable.

## Controlling Loops

As you can read from this post, I'm very uneasy about this future.  Not cause of
fear, but because of caution given experiences with this technology so far.

Adopting the idea of harness loops means that the harness decides when work is
finished.  In the agent loop, the model eventually says "done" and I review.
Even before that, I usually steer along the way.  I am involved and I enjoy
learning along the way.  In the harness operated loop I'm not sure what my role
even is.  Even the "done" signal loses all meanings and just becomes
communicated to yet another machine that judges.  My role is reduced to that of
a messenger.

Today I do not like much of the code that I see from systems built that way and
neither do I enjoy interacting with too much of software built with AI
assistence.  Looping is powerful but it removes responsibility more and more,
and it at least today very much encourages us to give in to the machine.

And yet I have no doubts that this looping future is going to be our future
despite the fact that I presently resent it.  I already see astonishingly small
teams building at impossible speed and I see codebases turning more and more
into obscure and confusing organisms that can only be diagnosed by more
machines.  Those codebases are simultaniously useful and messy.

So I guess I'm coming to terms with that the question is not whether we will
loop because clearly we will.  Maybe the question is that in a future of loops,
how do we don't abdicate judgment, how we can retain rules of good engineering,
how we can ensure that responsible human can continue to supervise, how we need
to re-think how we architect code to retain sanity along the way.
