---
tags: ['thoughts', 'ai', 'api']
summary: "Using programming agents to measure measuring developer productivity."
---

# We Can Just Measure Things

This week I spent time with friends to letting agents go wild
and see [what we could build in 24 hours](https://vibetunnel.sh/).  I
took some notes for myself to reflect on that experience.  I won't bore
you with another vibecoding post, but you can read [Peter's post](https://steipete.me/posts/2025/vibetunnel-turn-any-browser-into-your-mac-terminal)
about how that went.

As fun as it was, it also was frustrating in other ways and in entire
predictable ways.  It became a meme about how much I hated working with
Xcode for this project.  This got me thinking quite a bit more that this
has been an entirely unacceptable experience for a long time, but with
programming agents, the pain becomes measurable.

When I first dove into programming I found the idea of [RTFM](https://en.wikipedia.org/wiki/RTFM) quite hilarious.  “Why are you
asking dumb questions, just read it up.”  The unfortunate reality is that
the manual often doesn't exist — or is wrong.  In fact, we as engineers
are quite willing to subject each others to completely inadequate tooling,
bad or missing documentation and ridiculous API footguns all the time.
“User error” is what we used to call this, nowadays it's a “skill issue”.
It puts the blame on the user and absolves the creator, at least
momentarily.  For APIs it can be random crashes if you use a function
wrong, for programs it can be impossible to navigate UI or lack of error
messages.  There are many different ways in which we humans get stuck.

What agents change about this is, is that I can subject them to something
I wouldn't really want to subject other developers to: measuring.  I
picked the language for my current project by running basic evals and it
worked well.  I learned from that, that there are objectively better and
worse language when it comes to my particular problem.  The choice however
is not just how much the AI knows about the language from the corpus of
examples during training.  It's also tooling, the inherent capabilities
of the language, ecosystem churn and other aspects.

Using agents to measure code quality is great because agents don't judge
me, but they do judge the code they are writing.  Not all agents will
swear, but they will [express frustration with libraries](https://x.com/ankrgyl/status/1934415308800053485) when loops don't go
well or give up.  That opens up an opportunity to bring some measurements
into not agent performance, but the health of a project.

We should pay more attention to how healthy engineering teams are, and
that starts with the code base.  Using agents we can put some numbers to
it in which we cannot do with humans (or in a very slow and expensive
way).  We can figure out how successful agents are in using the things are
are creating in rather objective ways which is in many ways a proxy for
how humans experience working with the code.  Getting together with fresh
souls to walk them through a tutorial or some tasks is laborious and
expensive.  Getting agents that have never seen a codebase start using a
library is repeatable, rather cheap, fast and if set up the right way very
objective.  It also takes the emotion out of it or running the experiment
multiple times.

Now obviously we can have debates over if the type of code we would write
with an agent is objectively beautiful or if the way agents execute tools
creates the right type of tools.  This is a debate worth having.  Right at
this very moment though what programming agents need to be successful is
rather well aligned with what humans need.

So what works better than other things?  For now these are basic
indicators, for agents and humans alike:

- **Good test coverage:** they help with future code writing but they also
greatly help preventing regressions.  Hopefully no surprise to anyone.
I would add though that this is not just for the tests, but also for
examples and small tools that a user and agent can run to validate
behavior manually.

- **Good error reporting:** a compiler, tool or an API that does not
provide good error reporting is a bad tool.  I have been harping on this
for years when working at Sentry, but with agents it becomes even
clearer that this investment pays off.  It also means errors should be
where they can be found.  If errors are hidden in an obscure log neither
human nor agent will find it.

- **High ecosystem stability:** if your ecosystem churns a lot, if APIs keep
changing you will not just upset humans, you will also slow down the
agent.  It will find outdated docs, examples and patterns and it will
slow down / write bad code.

- **Few superfluous abstractions:** too many layers just make data flow and
refactoring expensive.  We might even want to start questioning the
value proposition of (most) ORMs today because of how much harder they
make things.

- **Everything needs to be fast and user friendly:** The quicker tools
respond (and the less useless output they produce) the better.
Crashes are tolerable; hangs are problematic.  `uv` for instance is a
much better experience in Python than any of the rest of the ecosystem,
even though most of the ecosystem points at `pip`.  Agents are super
happy to use and keep using `uv` because they get good infos out of it,
and low failure rates.

- **A good dev environment:** If stuff only reproduces in CI you have to move
your agent into CI.  That's not a good experience.  Give your agent a
way to run Docker locally.  If you write a backend, make sure there is a
database to access and introspect, don't just mock it out (badly).
Deferring things into a CI flow is not an option.  It's also important
that it's clear when the devenv is broken vs the code is broken.  For
both human and agent it can be hard to distinguish this if the tooling
is not set up correctly.

When an agent struggles, so does a human.  There is a lot of code and
tooling out there which is objectively not good, but because of one reason
or another became dominant.  If you want to start paying attention to
technology choices or you want to start writing your own libraries, now
you can use agents to evaluate the developer experience.

Because so can your users.  I can confidently say it's not just me that
does not like Xcode, my agent also expresses frustration — measurably so.
