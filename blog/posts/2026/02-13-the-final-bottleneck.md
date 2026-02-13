---
tags: ['ai']
summary: "AI speeds up writing code, but accountability and review capacity still impose hard limits."
---

# The Final Bottleneck

Historically, writing code was slower than reviewing code.

It might not have felt that way, because code reviews sat in queues until
someone got around to picking it up.  But if you compare the
actual acts themselves, creation was usually the more expensive part.  In teams
where people both wrote and reviewed code, it never felt like "we should
probably program slower."

So when more and more people tell me they no longer know what code is in their
own codebase, I feel like something is very wrong here and it's time to
reflect.

## You Are Here

Software engineers often believe that [if we make the bathtub
bigger](/2020/1/1/async-pressure/), overflow disappears.  It doesn't.
[OpenClaw](https://en.wikipedia.org/wiki/OpenClaw) right now has north of 2,500
pull requests open.  That's a big bathtub.

Anyone who has worked with queues knows this: if input grows faster than
throughput, you have an accumulating failure.  At that point, backpressure and
load shedding are the only things that retain a system that can still operate.

If you have ever been in a Starbucks overwhelmed by mobile orders, you know the
feeling.  The in-store experience breaks down.  You no longer know how many
orders are ahead of you.  There is no clear line, no reliable wait estimate, and
often no real cancellation path unless you escalate and make noise.

That is what many AI-adjacent open source projects feel like right now.  And
increasingly, that is what a lot of internal company projects feel like in
"AI-first" engineering teams, and that's not sustainable.  You can't triage, you
can't review, and many of the PRs cannot be merged after a certain point because
they are too far out of date. And the creator might have lost the motivation to
actually get it merged.

There is huge excitement about newfound delivery speed, but in private
conversations, I keep hearing the same second sentence: people are also confused
about how to keep up with the pace they themselves created.

## We Have Been Here Before

Humanity has been here before.  Many times over.  We already talk about the
Luddites a lot in the context of AI, but it's interesting to see what led up to
it.  Mark Cartwright wrote a great [article about the textile
industry](https://www.worldhistory.org/article/2183/the-textile-industry-in-the-british-industrial-rev/)
in Britain during the industrial revolution.  At its core was a simple idea:
whenever a bottleneck was removed, innovation happened downstream from that.
Weaving sped up? Yarn became the constraint. Faster spinning? Fibre needed to be
improved to support the new speeds until finally the demand for cotton went up
and that had to be automated too.  We saw the same thing in shipping that led
to modern automated ports and containerization.

As software engineers we have been here too.  Assembly did not scale to larger
engineering teams, and we had to invent higher level languages.  A lot of what
programming languages and software development frameworks did was allow us
to write code faster and to scale to larger code bases.  What it did not do up
to this point was take away the core skill of engineering.

While it's definitely easier to write C than assembly, many of the core problems
are the same.  Memory latency still matters, physics are still our ultimate
bottleneck, algorithmic complexity still makes or breaks software at scale.

## Giving Up?

When one part of the pipeline becomes dramatically faster, you need to throttle
input.  [Pi](https://pi.dev/) is a great example of this.  PRs are auto closed
unless people are trusted.  It takes [OSS
vacations](https://x.com/badlogicgames/status/2021164603506368693).  That's one
option: you just throttle the inflow.  You push against your newfound powers
until you can handle them.

## Or Giving In

But what if the speed continues to increase?  What downstream of writing code do
we have to speed up?  Sure, the pull request review clearly turns into the
bottleneck.  But it cannot really be automated.  If the machine writes the code,
the machine better review the code at the same time.  So what ultimately comes
up for human review would already have passed the most critical possible review
of the most capable machine.  What else is in the way?  If we continue with the
fundamental belief that machines cannot be accountable, then humans need to be
able to understand the output of the machine.  And the machine will ship
relentlessly.  Support tickets of customers will go straight to machines to
implement improvements and fixes, for other machines to review, for humans to
rubber stamp in the morning.

A lot of this sounds both unappealing and reminiscent of the textile industry.
The individual weaver no longer carried responsibility for a bad piece of cloth.
If it was bad, it became the responsibility of the factory as a whole and it was
just replaced outright.  As we're entering the phase of single-use plastic
software, we might be moving the whole layer of responsibility elsewhere.

## I Am The Bottleneck

But to me it still feels different.  Maybe that's because my lowly brain can't
comprehend the change we are going through, and future generations will just
laugh about our challenges.  It feels different to me, because what I see taking
place in some Open Source projects, in some companies and teams feels deeply
wrong and unsustainable.  Even Steve Yegge himself now [casts
doubts](https://steve-yegge.medium.com/the-ai-vampire-eda6e4f07163) about the
sustainability of the ever-increasing pace of code creation.

So what if we need to give in?  What if we need to pave the way for this new
type of engineering to become the standard?  What affordances will we have to
create to make it work?  I for one do not know.  I'm looking at this with
fascination and bewilderment and trying to make sense of it.

Because it is not the final bottleneck.  We will find ways to take
responsibility for what we ship, because society will demand it.  Non-sentient
machines will never be able to carry responsibility, and it looks like we will
need to deal with this problem before machines achieve this status.
Regardless of how [bizarre they appear to
act](https://en.wikipedia.org/wiki/Moltbook) already.

[I too am the bottleneck
now](https://x.com/thorstenball/status/2022310010391302259).  But you know what?
Two years ago, I too was the bottleneck.  I was the bottleneck all along.  The
machine did not really change that.  And for as long as I carry responsibilities
and am accountable, this will remain true.  If we manage to push accountability
upwards, it might change, but so far, how that would happen is not clear.
