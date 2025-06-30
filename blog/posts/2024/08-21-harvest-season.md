---
tags: ['python', 'announcement', 'rye']
summary: "My thoughts on Rye and uv."
---

# Rye and uv: August is Harvest Season for Python Packaging

It has been a few months since I wrote about [Rye](https://rye.astral.sh/) here last.  You might remember that in
February I passed over stewardship of my Rye packaging too to [Astral](https://astral.sh/).  The folks over there have been super busy in
building a lot of amazing tooling for Python packaging in the last few
months.  If you have been using Rye in the last few months you will have
noticed that the underlying resolver and installer [uv](https://docs.astral.sh/uv/) got a lot better and faster.

As of the most recent release, `uv` also gained a lot of functionality that
previously required Rye such as manipulating `pyproject.toml` files,
workspace support, local package references and script installation.  It
now also can manage Python installations for you so it's getting much
closer.

If you are using Rye today, consider this blog post as a reminder that you
should probably starting having a closer look at `uv` and [give feedback to
the Astral folks](https://github.com/astral-sh/rye/discussions/1342).

I gave a talk just recently in Prague at EuroPython about my current view
of the Python packaging, the lessons I learned when creating Rye and one
of the things I mentioned there is that the goal of a packaging tool has
to be that it will dominate the space.  The tool that absolutely everybody
uses has to be the best tool: it's the thing any new person to Python gets
to see when they start their programming journey.  After that talk a lot
of people walked up to me and had a lot of questions about that in
particular.

Python in the last two years has become an incredibly hot and popular
platform for many new developers.  That has in part been fueled by all the
investments and interest that went into AI and ML.  I really want
everybody who gets to learn and experience Python not to remember it as an
old language with bad tooling, but as an amazing language with a stellar
developer experience.  Unfortunately that's not the case today because
there is so much choice, so many tools that are not quite compatible, and
by the inconsistency everywhere.  I have seen people walk down one tool,
just to re-emerge moving their entire stack to conda and back because they
hit some wall.

Domination is a goal because it means that most investment will go into
one stack.  I can only re-iterate my wish and desire that Rye (and with it
a lot of other tools in the space) should cease to exist once the
dominating tool has been established.  For me `uv` is poised to be that
tool.  It's not quite there today yet for all cases, but it will be in no
time, and now is the moment to step up as a community and start to start
to rally around it.  That doesn't mean that this tool will be the tool
forever.  Things come and go and maybe there is a future for some other
tool.

But today I'm looking forward to the moment when there will be a final
release of Rye that is no remaining functionality other than to just
largely alias to uv, that retires Rye specific functionality and migrates
you over to uv.

However I *only have the power to retire one tool, and that won't be
enough*.  Today we are using so many other package managing solutions for
Python and we should be advertising fewer.  I understand how much time and
effort went into many of those, and everybody's contributions are
absolutely appreciated.  Software like Rye and uv were built on the
advancements of the ecosystem underneath it.  They leverage years and
years of work that went into migrating the Python ecosystems from setup.py
files to eggs and finally wheels.  From not having a metadata standard to
having one.  From coupled to decoupled build systems.  Much of what makes
Rye so enjoyable were individuals that worked towards making
redistributable and downloadable Python binaries a possibility.  There was
a lot of work that was put into building out an amazing ecosystem of Rust
crates and Python libraries needed to make these tools work.  All of that
brought us to that point where we are today.

But it is my believe that we need to take the next step and be willing to
say as a community that some tools are no longer recommended.  Maybe not
today, but that moment will come quicker than we think.  I remember a time
when many of us who maintained Python libraries pointed new developers to
using `ez_setup.py` and `easy_install` in our onboarding guides.  Years
later we removed the mentions of `ez_setup.py` from our guides to replace
them with `pip`.  Some of us have pointed developers at `pip-tools`, at
`poetry` or `PDM`.  Many projects today even show 5 different installation
guides because of that wild variety of tools available because they no
longer feel like they can recommend one.

If you maintain an important Python project I would ask you to give `uv` a
try and ask yourself if you would consider pointing people towards it.  I
think that this is our best shot in the community at finding ourselves in
a much better position than we have ever been.

Have a look at the blog post that Charlie from Astral wrote about what [uv
can do today](https://astral.sh/blog/uv-unified-python-packaging).
It's a true accomplishment worth celebrating and enjoying.

---

<small>**Postscriptum:** there is an elephant in the room which is that Astral is a
VC funded company.  What does that mean for the future of these tools?
Here is my take on this: for the community having someone pour money into
it can create some challenges.  For the PSF and the core Python project
this is something that should be considered.  However having seen the code
and what uv is doing, even in the worst possible future this is a very
forkable and maintainable thing.  I believe that even in case Astral shuts
down or were to do something incredibly dodgy licensing wise, the
community would be better off than before uv existed.

</small>
