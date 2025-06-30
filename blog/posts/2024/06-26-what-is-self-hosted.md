---
tags: ['thoughts']
summary: "Some thoughts on self hosted Open Source software."
---

# What is Self Hosted? What is a Stack?

My colleague [Ben Vingar](https://x.com/bentlegen/) wrote a tool called
[Counterscale](https://counterscale.dev/) which I would describe as
“deploy your own analytics”.  Except there is a catch: it needs Cloudflare
to run.  Is it really self hosted if your only way to deploy it is some
proprietary cloud vendor?

## What's a Stack?

Many years ago we talked about software stacks.  A common one happened to
be “LAMP”.  Short for: Linux, Apache, MySQL and typically PHP, though
Python and Perl were choices for the P just as well.  LAMP lends itself
very well for self hosting because all of it is Open Source software you
can run and operate yourself free of charge.  There was however also a
second stack which was not entirely unpopular: “WAMP“ (The W meaning
Microsoft Windows).  You would not necessarily run it yourself if you had
a choice, but I deployed more than one of these.  Why? Because some SMEs
were already running Windows.  If you wrote some software in PHP, having
people run the software on their already existing Windows servers was
preferable to also running some Linux thing they did not know how to
operate.

What makes LAMP, WAMP and whatever work are a few basic technological
choices.  Originally one of those abstractions was a protocol called CGI
which allowed you to marry a programming language to the web server.
Later also things like FastCGI appeared to deal with some of the
performance challenges that CGI brought and there were also attempts to
move PHP right into the web server as embedded language with `mod_php`.
For the database the abstraction in many cases was a dialect of SQL.  I
built a tool a long time ago that a company ended up running on
Microsoft's SQL server with rather minimal changes.  So in some sense what
made this work was that one was targeting some form of abstraction.

## What's Self Hosted?

Counterscale targets something that the open source ecosystem does not
really have abstracted today: an analytics engine and some serverless
runtime.  What was CGI and SQL in case of Counterscale is some serverless
runtime environment and a column store.  All these things do exist in the
Open Source ecosystem.  All the pieces are there to build your own
serverless runtime and all the things are there to build an analytics
store on top of ClickHouse, DuckDB or similar databases and Kafka.  But we
did not agree on protocols and we definitely did not really have that
stuff today in a neatly packaged and reusable thing.

Now of course you can build software that runs entirely on Open Source
software.  In case of Counterscale you don't even have to look very far:
Plausible exists.  It's also Open Source, it's also an analytics tool, but
rather than being like a “CGI script” in spirit, it's a pretty heavy thing.
You gotta run docker containers, run a rather beefy ClickHouse
installation, I believe it needs Kafka etc.  Running Plausible yourself is
definitely not neatly as easy as setting up Counterscale.  You do however,
have the benefit of not relying on Cloudflare.

## Level up the Protocols

So what does that leave us with?  I'm not sure but I'm starting to think
that the web needs new primitives.  We now run some things commonly but
the abstractions over them are not ideal.  So people target (proprietary)
systems directly.  The modern web needs the CGI type protocols for queues,
for authentication, for columns stores, for caches etc.  Why does it need
that?  I think it needs it to lower the cost of building small scale open
source software.

The reason it's so easy and appealing to build something like Counterscale
directly against Cloudflare or similar services is that they give you
higher level abstractions than you would find otherwise.  You don't have
to think about scaling workers, you don't have to think about scaling
databases.  The downside of course is that it locks you into that platform.

But what would be necessary to have your “own Cloudflare” thing you can
run once and then run all your cool mini CGI like scripts above?  We miss
some necessary protocols.  Yet building these protocols is tricky because
you target often the least common denominator.  Technology also here is
hardly the problem.  Don't need any new innovative technology here, but you
need the social contract and the mindset.  Those are hard things, they require
dedication and marketing.  I have not *yet* seen that, but I'm somewhat
confident that we might see it.

We probably want these protocols and systems built on top of it because it
makes a lot of things easier.  Sometimes of the cost of doing something
drops low enough, it enables a whole new range of things to exist.

Many times when you start building abstractions over these things, you
simplify.  Even CGI was an incredibly high level abstraction over HTTP if
you think about it.  CGI in many ways is the original serverless.  It
abstracts over both HTTP and how a process spawns and its lifecycle.
Serverless is bringing back a bit of that, but so far not in a way where
this is actually portable between different clouds.

## Abstract over Great Ideas

If you have ever chucked up an OG CGI app you might remember the magic.
You write a small script, throw it into a specific folder and you are off
to the races.  No libraries, no complex stuff.  CGI at its core was a
great idea: make a web server dynamic via a super trivial protocol anyone
can implement.  There are more ideas like that.  Submitting tasks to a
worker queue is a great idea, batch writing a lot of data into a system is
a great idea, kafka like  topics are a great idea, caches are a great idea,
so are SQL databases, column stores and much more.

Laravel Forge does a tiny bit of that I feel.  Forge goes a bit in to that
direction in the sense that it says quite clearly that some components are
useful: databases, caches, SSL, crons etc.  However it's ambition stops at
the boundary of the Laravel ecosystem which is understandable.

Yet maybe over time we can see more of a “SaaS in a box” kind of
experience.  A thing you run, that you can plug your newfangled,
serverless mini tools in, that can leverage auth and all the needs of a
modern web application like queues, column stores, caches etc.
