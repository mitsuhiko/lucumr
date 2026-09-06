---
tags: ['thoughts', 'ai']
summary: "Vibecoding and the possible collapse of a shared language."
---

# The Tower Keeps Rising

I feel that some vibecoded software changes somewhat randomly and unexpectedly.
That made me think about Bruegel's ["The Tower of
Babel"](https://en.wikipedia.org/wiki/The_Tower_of_Babel_(Bruegel)) which shows
an already quite chaotic depiction of the Tower of Babel.  The story is one of
pride and ambition and ultimately why people no longer speak the same language.
But it is also a story about the unity that makes technological progress work.

The text begins with a technology upgrade:

> And they said one to another, Go to, let us make brick, and burn them
> thoroughly.  And they had brick for stone, and slime had they for morter.

They use it for a civilizational project:

> let us build us a city and a tower, whose top may reach unto heaven

But when God assesses the situation the bricks are not what concern him:

> the people is one, and they have all one language, […] and now nothing will be
> restrained from them.[^1]

They get their power through coordination which they have because they share a
language.  They can use this to coordination to combine their powers and build
something no one of them could build alone.  God does not take away the bricks
or their knowledge of how to make them but their ability to understand one
another.

With AI-assisted programming we should get better tools which lets us build more
ambitious software.  That is certainly true at the level of the individual and
without doubt a developer with an agent can change a codebase dramatically
quicker.  But large software projects have never been limited only by how
quickly an individual can produce code but they are limited by how well people
can coordinate their understanding of the system they are changing.

The shared language of a software project is the common understanding shared
among its developers.  This language is rarely written down in one place but it
lives in documentation and code.  It can also just be something that comes up in
code review or watercooler conversations or when one engineer has to explain a
change to someone else.  It can be about the architecture of the code, the
tradeoffs made or which invariants need to be upheld.

In the days before agents some of that shared understanding was maintained by
friction.  If I wanted to change someone's storage layer, I usually had to read
their code and ask them questions.  Changing that code might have required
coordination with another team whose service depended on it.  Some of this
friction was useful as it forced communication.  It also was a good touchpoint
for both of us discover if we still understood how the system worked.  I had
plenty of experiences in my career where through conversations with my fellow
engineer we collectively had to understand again why the system we had worked as
it did before we did some changes to it.

But with agents I can ask an agent to add OAuth, you can ask one to add caching,
and somebody else can ask one to rebuild the database from first principles and
make the UI pink.  Each change can be reasonable in isolation but since it's
frictionless, none of us necessarily has to talk to the others or familiarize
ourselves with the code we are changing.  The more we use agents, the less we
feel the pain as agents feel none of it, and a useful signal is gone.

When I look at some vibecoded scaled-up projects the codebases mirror the story
of Babel mostly because nobody needs to communicate.  Obviously nothing stops us
to talk to one another, but nothing forces us either.  Every developer has a
tireless machine that can explain a corner of the tower and make whatever local
modification they want.

Unlike in the bible though, in AI-assisted engineering, construction can
continue after shared understanding has already collapsed.  The complete lack of
an immediate failure is what makes it curious and a bit disorienting.  The tower
does not fall, it just keeps rising.

[^1]: [Genesis 11:3-6, KJV](https://www.biblegateway.com/passage/?search=Genesis%2011%3A3-6&version=KJV).
