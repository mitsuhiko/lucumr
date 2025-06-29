---
tags:
  - thoughts
  - rust
  - python
summary: Thoughts on purity in software engineering.
---

# Seeking Purity

The concept of purity — historically a guiding principle in social and
moral contexts — is also found in passionate, technical discussions.  By
that I mean that purity in technology translates into adherence to a set
of strict principles, whether it be functional programming, test-driven
development, serverless architectures, or, in the case of Rust, memory
safety.

## Memory Safety

Rust positions itself as a champion of memory safety, treating it as a
non-negotiable foundation of good software engineering.  I love Rust: it's
probably my favorite language.  It probably won't surprise you that I have
no problem with it upholding memory safety as a defining feature.

Rust aims to achieve the goal of memory safety via safe abstractions, a
compile time borrow checker and a type system that is in service of those
safe abstractions.  It comes as no surprise that the Rust community is
also pretty active in codifying a new way to [reason about pointers](https://www.ralfj.de/blog/2020/12/14/provenance.html).  In many ways,
Rust pioneered completely new technical approaches and it it widely
heralded as an amazing innovation.

However, as with many movements rooted in purity, what starts as a
technical pursuit can evolve into something more ideological.  Similar to
how moral purity in political and cultural discourse can become charged,
so does the discourse around Rust, which has been dominated by the pursuit
of memory safety.  Particularly within the core Rust community itself,
discussion has moved beyond technical merits into something akin to
ideological warfare.  The fundamental question of “Is this code memory
safe?”, has shifted to “Was it made memory safe in the *correct* way?”.
This distinction matters because it introduces a purity test that values
methodology over outcomes.  Safe C code, for example, is often dismissed
as impossible, not necessarily because it *is* impossible, but because it
lacks the strict guarantees that Rust's borrow checker enforces.
Similarly, using Rust’s `unsafe` blocks is increasingly frowned upon,
despite their intended purpose of enabling low-level optimizations when
necessary.

This ideological rigidity creates significant friction when Rust
interfaces with other ecosystems (or gets introduced there), particularly
those that do not share its uncompromising stance.  For instance, the role
of Rust in the Linux kernel has been a hot topic.  The Linux kernel
operates under an entirely different set of priorities.  While memory
safety is important there is insufficient support for adopting Rust in
general.  The kernel is an old project and it aims to remain maintainable
for a long time into the future.  For it to even consider a rather young
programming language should be seen as tremendous success for Rust and
also for how open Linus is to the idea.

Yet that introduction is balanced against performance, maintainability,
and decades of accumulated engineering expertise.  Many of the kernel
developers, who have found their own strategies to write safe C for
decades, are not accepting the strongly implied premise that their work is
inherently flawed simply because it does not adhere to Rust's strict
purity rules.

Tensions rose when a kernel developer advocating for Rust's inclusion took
to social media to push for changes in the Linux kernel development
process.  The public shaming tactic failed, [leading the developer to
conclude](https://lkml.org/lkml/2025/2/6/1292):

> “If shaming on social media does not work, then tell me what does,
because I'm out of ideas.”
>

It's not just the kernel where Rust's memory safety runs up against the
complexities of the real world.  Very similar feelings creep up in the
gaming industry where people love to do wild stuff with pointers.  You do
not need large disagreements to see the purist approach create some
friction.  A [recent post of mine](/2025/2/4/fat-rand/) for instance
triggered some discussions about the trade-offs between more dependencies,
and moving unsafe to centralized crates.

I really appreciate that Rust code does not crash as much.  That part of
Rust, among many others, makes it very enjoyable to work with.  Yet I am
entirely unconvinced that memory safety should trump everything, at least
at this point in time.

What people want in the Rust in Linux situation is for the project leader
to come in to declare support for Rust's call for memory safety above all.
To make the detractors go away.

## Python's Migration Lesson

Hearing this call and discussion brings back memories.  I have lived
through a purity driven shift in a community before.  The move from Python
2 to Python 3 started out very much the same way.  There was an almost
religious movement in the community to move to Python 3 in a ratcheting
motion.  The idea that you [could maintain code bases that support both 2
and 3](/2013/5/21/porting-to-python-3-redux/) were initially very
loudly rejected.  I took a lot of flak at the time (and for years after)
for advocating for a more pragmatic migration which burned me out a lot.
That feedback came both in person and online and it largely pushed me away
from Python for a while.  Not getting behind the Python 3 train was seen
as sabotaging the entire project.  However, a decade later, I feel
somewhat vindicated that it was worth being pragmatic about that
migration.

At the root of that discourse was a idealistic view of how Unicode could
work in the language and that you can move an entire ecosystem at once.
Both those things greatly clashed with the lived realities in many
projects and companies.

I am a happy user of Python 3 today.  This migration has also taught me
the important lesson not be too stuck on a particular idea.  It would have
been very easy to pick one of the two sides of that debate.  Be stuck on
Python 2 (at the risk of forking), or go all in on Python 3 no questions
asked.  It was the path in between that was quite painful to advocate for,
but it was ultimately the right path.  I wrote about [my lessons of that
migration a in 2016](/2016/11/5/be-careful-about-what-you-dislike/) and
I think most of this still rings true.  That was motivated by even years
later people still reaching out to me who did not move to Python 3, hoping
for me to embrace their path.  Yet Python 3 has changed!  Python 3 is a
much better language than it was when it first released.  It is a great
language because it's used by people solving real, messy problems and
because it over time found answers for what to do, if you need to have
both Python 2 and 3 code in the wild.  While the world of Python 2 is
largely gone, we are still in a world where Unicode and bytes mix in
certain contexts.

## The Messy Process

Fully committing to a single worldview can be easier because you stop
questioning everything — you can just go with the flow.  Yet truths often
reside on both sides.  Allowing yourself to walk the careful middle path
enables you to learn from multiple perspectives.  You will face doubts and
open yourself up to vulnerability and uncertainty.  The payoff, however,
is the ability to question deeply held beliefs and push into the unknown
territory where new things can be found.  You can arrive at a solution
that isn't a complete rejection of any side.  There is genuine value in
what Rust offers—just as there was real value in what Python 3 set out to
accomplish.  But the Python 3 of today isn't the Python 3 of those early,
ideological debates; it was shaped by a messy, slow, often contentious,
yet ultimately productive transition process.

I am absolutely sure that in 30 years from now we are going to primarily
program in memory safe languages (or the machines will do it for us) in
environments where C and C++ prevail.  That glimpse of a future I can
visualize clearly.  The path to there however?  That's a different story
altogether.  It will be hard, it will be impure.  Maybe the solution will
not even involve Rust at all — who knows.

We also have to accept that not everyone is ready for change at the same
pace. Forcing adoption when people aren't prepared only causes the
pendulum to swing back hard.  It's tempting to look for a single authority
to declare “the one true way,” but that won't smooth out the inevitable
complications.  Indeed, those messy, incremental challenges are part of how
real progress happens.  In the long run, these hard-won refinements tend
to produce solutions that benefit all sides—if we’re patient enough to let
them take root.  The painful and messy transition is here to stay, and
that's exactly why, in the end, it works.
