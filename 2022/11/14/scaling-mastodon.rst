public: yes
summary: Now that Twitter is dying, what can replace it?

Scaling Mastodon is Impossible
==============================

In light of `recent events at Twitter
<https://en.wikipedia.org/wiki/Acquisition_of_Twitter_by_Elon_Musk>`__ a
lot of the people that I follow (or used to follow) on that platform have
started evaluating (or moved) to `Mastodon
<https://en.wikipedia.org/wiki/Mastodon_(software)>`__.  And `I also
have a Mastodon account now <https://hachyderm.io/@mitsuhiko>`__.  But
after a few days with this thing I have a lot of thoughts on this that are
too long for a Tweet or Toot.  Since some of my followers asked though I
decided do a longform version of this and explain my dissatifaction with
Mastodon a bit better.

The short version of this is that I believe that Mastodon — more
specifically federation and decentralization won't work out.

My Claim: Decentralization is a Questionable Goal
-------------------------------------------------

In the last few years a lot of centralized services did not develop like
people wanted which I believe resulted in the pendulum prominently swinging
towards decentralization.

Decentralization promotes an utopian view of the world that I belief fails
to address actual real problems in practice.  Yet on that decentralization
wave a lot of projects are riding from crypto-currencies [1]_, defi or things
such as Mastodon.  All of these things have one thing in common: distrust.
Some movements come from the distrust of governments or taxation, others
come from the distrust of central services.

In my mind the discussion about centralization and decentralization
completely misses the point of the intended outcomes.  Centralization or
decentralization should really be an implementation detail of the solution
to an actual problem.  For that particular problem the solution might be
one of those two things, or something in the middle.  But out of principle
it should be neither of those two things.

I rather understand what exactly the goals are that should be solved, and
out of that the right approach on a technical level can be found.

.. [1] Decentralization is these days most commonly associated
    with the crypto space but I'm actually not entirely sure why.  Traditional
    banks are also decentralized, but they follow shared rules.  I can send
    from my Austrian bank to a bank in Estonia and it will work.  The tech
    behind the scenes is not even all that terrible.  It does not really look
    like a decentralized thing because there is a lot of regulation and you
    can't just start a bank, but it would be hard to argue that it's not
    decentralized.

What are we trying to solve?
----------------------------

Let's ignore Twitter for a second and let's talk about software
engineering.  Specifically dependency management.  I think dependency
management is an interesting proxy for the problem here and there are some
lessons to be learned from it.  As a frequent reader of this blog you
might remember me writing quite a lot about `scaling
</2022/1/10/dependency-risk-and-funding/>`__ `code
</2019/7/29/dependency-scaling/>`__ `dependencies
</2016/3/24/open-source-trust-scaling/>`__.  When I started writing Python
developers used much fewer dependencies than today.  When you did use
dependencies, it was your own problem to figure out how to get it as
automated depencency downloading originally was not a thing yet.  The
Python tools over time gained the ability to declare dependencies and
they were able to pick them up from PyPI (or the cheese-shop as it was
frequently called) but we did not yet have centralized package hosting.

We used to self host our dependencies.  Even if we did not necessarily
want to pay for the hosting cost, we had to host them.  Many picked
third party websites such as SourceForge, Berlios or others to avoid
paying the cost of traffic.  This decentralization however came with a lot
of challenges and today decentralized package hosting is no longer
supported by the Python ecosystem.  This did not happen, because PyPI
turned evil and really wanted to kill decentralized package hosting,
but because it turns out that decentralized hosting came with a lot of
challenges.

For one as time went on, a lot of these packages went away because the
hosts they were hosted on shut down.  So the first cracks that showed up
just was an effect of things ageing.  People walk away of projects, in
some cases die and with that, their server bills go unpaid and domains
eventually lapse.  Some companies also go out of business.  SourceForge
did not really ever die, but they had financial challenges and made their
hosting page ever more hostile for the installers to give access to the
uploaded tarballs.

The second thing that became apparent over time was also that
decentralized services came with a lot of security risks.  Every one of
those hosts allowed the re-publishing of already existing packages.
Domains that lapsed could be re-registered by other people and new
packages could be placed there.

NPM and PyPI today can help secure the ecosystem by setting minimum
standards or by resurrecting accidentally published packages or to yank
hacked versions.  These are all clear benefits that we all get something
from as community.

Now a lot of these issues can be solved in a decentralized design, but
really there was a good reason why it went away, even in the entire
absence of a bad player!

Obviously there are nuances here and it's clear that central services come
with risks, but so do decentralized services and they don't have clear
upsides.  On decentralized systems in particular I encourage you to read
`Moxie's take on web3
<https://moxie.org/2022/01/07/web3-first-impressions.html>`__ which
outlines the challenges of this much better than I ever could.  In
particular it makes two very important points, namely that people don't
like self hosting (at scale) and that it's easier to move platforms than
(decentralized) protocols.  The latter in particular is also something
that the Python ecosystem learned.  PyPI today offers more secure
checksums than when Python originally started out.  It also has more
stringient rules around package names and unpublishing.  These are all
protocol decisions that i was able to push out because the python
packaging infrastructure in Python is rather tighly controlled.

You might now get the impression that I'm really into centralization.  I'm
not really, but I think my position here is complicated.  Going back to
the topic of decentralized dependency hosting you might remember that I
was recently `quite critical of PyPI </2022/7/9/congratulations/>`__.  I'm
very well aware that a centralized service comes with risks and that you
need to follow whatever rules that service sets.

Decentralization is appealing, particularly when things are very
centralized and we're exposed to it's faults much more.

In my mind in recent years decentralization mostly gained a lot of popular
support because of the erosion of society.  There is a backlash by some
against western governments which are seen as behaving irresponsibly with
regulatory over-reach, increasing levels of corruption, decreasing quality
of public services and frustration about taxation.  And there is some
merit to these ideas.  There is also a proxy war going on about freedom of
speech and expression and the desire to create safe spaces.  I welcome you
to watch Jonathan Haidt's talk about `the moral roots of liberals and
conservatives <https://www.youtube.com/watch?v=8SOQduoLgRw>`__ for a bit
of context on that.

So really before we talk about centralization and decentralization, I
think we actually need to understand what we want to accomplish.  And
really I think this is where we likely already disagree tremendously.
Mastodon encourages not just decentralization, but federation.  You can
pick your own mastodon server but you can also communicate with people on
other instances.  I will make the point that **this is the root of the
issue here**.

We can't agree
--------------

So let's talk more about Mastodon here.  I have been using this for a few
weeks now in different ways and it's pretty clear that this thing is
incredibly brittle.  The ActivityPub is a pretty messy protocol, and
it also appears to not have been  written with scalability in mind much.
The thing does not scale to the number of users it currently has and there
is probably no trivial way to fix it up.

But before we even hit the issue of the technology, we hit the issue of
there being absolutely no agreement of what the thing should look like or
what the issue actually is and that's I think much more interesting.

Some people claim the solution to the technical scalability issue is huge
instances, some other people have the belief that the actual intended
design and solution were micro-instances of in extreme cases a user each.

On the topic of moderation the very same issue is even more absurd.  Some
instances want uncontrolled free speech where some instances effectively
are pure shit-posting instances which are completely de-federated from the
most of the fediverse as a result.  Other instances really like to control
their content, where some popular ones such as fosstodon ban all languages
than English as a result to allow moderation.  There also is no real
agreement on if larger or smaller instance are going to make the problem
of moderation better or worse.

Yet there is the belief that you can somehow create a coherent experience
into a “whatever”.  Whatever it is actually.  My first mastodon instance
was `de-federated by accident from my current instance
<https://github.com/hachyderm/hack/issues/4>`__.  I moved to that instance
though because many other hackers in the Open Source space did, and unlike
Fosstodon it seems to allow non English content which I do care about
quite a bit.  (After all my life and household is multilingual and I don't
live in an English speaking country.)  Yet that instance `still defederates
qoto <https://github.com/hachyderm/hack/issues/8>`__ and I'm guessing
because qoto permits unpopular opinions and does not block servers itself.

Federation makes all of these questions play out chaotically and there is
no consistency.  My first experience of being on Mastodon was in fact that
I got shitposted at by accounts on poa.st.  The n-word was thrown at me
within hours of signed up.  Why?  I'm not sure.  So moderation is
something of an issue.

Unpaid Labour and Opsec
-----------------------

We clearly won't come to an agreement across all of mastodon about what
acceptable behavior is, and there is no central entity controlling it.  It
will always be a messy process.  I guess this is something that Mastodon
will have to learn living with, even though I can't imagine what that
means.  That is however a second aspect to this mess which is money.

Unlike Twitter which was a public company with a certain level of
responsibility and accountability, Mastodon is messy legally speaking as
well.  It's not above the law, even if it maybe wants to be, and instances
will have to follow the laws of the countries they are embedded in.  We
already know how messy this is even for centralized services.  But at
least those enterprises were large enough to pay lawyers and figures this
out in courts.

For large mastodon instances this might turn into a problem, and for small
instances the legal risk of hosting the wrong thing might be completely
overwhelming.  I used to host a pastebin for a few years.  It was Open
Source and with that others also hosted it.  I had to shut it down after
it became (by a small percentage of users) used to host illegal content.
In some cases links to very, very illegal content.  Even today I still
receive emails from users who beg me to take down pastes of that software
from other domains, because people use it to host doxxed content.  I
really hard a hard few weeks when I first discovered what my software
ended up being used for.

But at least you could make the argument that a pastebin is “just” hosting
content.  I think running a Mastodon server is worse and being hosted by
one that you're not on comes with a whole lot of extra risks.

First of all there is the issue of what illegal content might be hosted
there, but then there is also the issue of what happens if someone
popular joins the instance.  Imagine you're a rather small server and
suddenly `Eli Lilly and Company <https://en.wikipedia.org/wiki/Eli_Lilly_and_Company>`__
joins your instance.  Today they have around 140K followers on Twitter
and they are a publicly traded company.  First of all with an account
that large, every one of their posts will cause a lot of load on your
infrastructure.  Secondly though, they are a very interesting target to
attack.  A fake tweet attributed to them recently `caused their stock to
plumet
<https://www.forbes.com/sites/brucelee/2022/11/12/fake-eli-lilly-twitter-account-claims-insulin-is-free-stock-falls-43/>`__
after it became possible to verify on Twitter for 8 USD no questions
asked.  That problem is only worse on Mastodon.  Not only is this a
problem for the server operator, it is also one for a company.

But you don't even need to be that popular to be worried about what your
instance is like.  People put a lot of trust into Twitter accounts over
the years.  I had plenty of exchanges over private DMs with people which
I really would not want to be public.  Yet how do I know that my instance
operator does not really like to secretly read my communication?  Do I
know if my instance operator could even keep the communication private in
the light of hackers?  I'm sure over the years thousands of credit card
numbers, token access credentials or passwords were exchanged in Twitter
DMs.  Imagine what a juicy target that would be on Mastodon servers.

For a large company there at least the money aspect helps a bit here.
Particularly public companies have a desire to exist, not go under and
invest into security.  I'm not so convinced that a business model can be
found for most Mastodon hosts that aligns the incentives right for all
users.

Mastodon is Old
---------------

Mastodon is getting some traction today, but Mastodon is around for a long
time.  And with that, may of the problems it had over the years are
still unresolved.  For instance you might read about `Wil Wheaton's
failure to use Mastodon </2020/1/1/async-pressure/>`__ due to his
popularity and `another server operator's take on the issue
<https://nolanlawson.com/2018/08/31/mastodon-and-the-challenges-of-abuse-in-a-federated-system/>`__.
You might be interested to learn that the `oldest open Mastodon issue
<https://github.com/mastodon/mastodon/issues/34>`__ is six years old and
asks for backfilling posts after first subscribing and is still unsolved.
Or that the `most controversial and replied to issue
<https://github.com/mastodon/mastodon/issues/8565>`__ is about optionally
disabling replies to posts like on Twitter.

Or that `there are popular forks of Mastodon
<https://github.com/hometown-fork/hometown>`__ with different goals than
Mastodon who can't get their changes merged back.  There is also
`glitch-soc <https://glitch-soc.github.io/docs/>`__ which has even more of
a departure from core Mastodon from what I can tell.

And alongside the Mastodon forks, there are countless of other ActivityPub
implementations around as well.  This will make protocol changes going
forward even harder.

Technical Challenges
--------------------

To be honest, code is simple in comparison, but actually making Mastodon
scale technically too will require changes if it wants to absorb some of
the larger users on Twitter.

One thing seems relatively certain: if Mastodon wants to host a sizable
community where some people have followers from most other instances, then
the size of an individual instance will matter a lot and I'm pretty sure
that the only sensible approach will be to either not permit small
instances to participate at all, or for those to come with some other
restrictions that will require special handling.

Many developers don't want to accept the problem of back-pressure.  (A
topic `I wrote about quite a bit </2020/1/1/async-pressure/>`__
incidentally).  Unfortunately some bad servers can really break you, and
you will have to avoid federating to them.  In general too many small
servers will likely cause issues for very popular accounts on popular
servers.

A Market Based Approach
-----------------------

In my mind a better alternative to these two extremes of Twitter and
Mastodon would be to find a middle ground.  A service like Twitter is much
cheaper and easier to run if it does not have to deal with federation on a
technical level.  An Open Source implementation of Twitter that is
significantly cheaper to run than a Mastodon host that can scale to
larger user numbers should be possible.  And that being Open Source
would potentially permit us to see this work out in practice by letting
different communities exist side by side if we can't agree on common
rules.

Ideally at least some of these communities would try to be run like non
profit foundations, then maybe they have a chance of hanging around.

Wikipedia for all it's faults shows quite well that a centralized thing
can exist with the right model behind it.  The software and the content is
open, and if WikiMedia were to fuck up too much, then someone else could
step into place and replace it.  But the risk of that happening, keeps the
organization somewhat in check.

Wikipedia is also not unique in that regard.  The very popular chess
platform `lichess <https://lichess.org/>`__ is both `Open Source and a
foundation
<https://lichess.org/blog/Y1wpBhEAAB8AwbeG/taking-lichess-to-the-next-level>`__.
I personally would love to see more than this.

A “Not Twitter Foundation” that runs an installation of an Open Source
implementation of a scalable micro blogging platform is very appealing to
me.  And maybe with a foundation behind it, it could become a “town
square”.  And maybe that means that there will be different town squares
with different languages and following different local laws.

And then let the market figure out if that foundation does a good job at
running it, and if not someone else will replace it.
