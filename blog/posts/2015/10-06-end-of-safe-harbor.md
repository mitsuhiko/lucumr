---
tags:
  - thoughts
  - europe
  - security
summary: |
  Some in detail analysis about what the end of safe harbor means for
  small companies, especially in Europe.
---

# The End of Safe Harbor and a Scary Path Forward

In the Austrian internets [the news about the end of the safe harbor act](http://www.politico.eu/wp-content/uploads/2015/10/schrems-judgment.pdf)
has been universally welcomed it seems.  Especially from non technical
folks that see this as a big win for their privacy.  Surprisingly many
technical people also welcomed this ruling.  And hey, if Snowden says
that's a good ruling, who will argue against.

I'm very torn about this issue because from a purely technical point of
view it is very tricky to follow the ruling and by keeping to the current
state of our data center environments in the light of some other rulings.

I'm as disappointed as everybody else that government agencies are
operating above what seems reasonable from a privacy point of view, but we
should be careful about what how this field develops.  Fundamentally
sharing information on the internet and the right to privacy stand in
conflict to each other and the topic is a lot more complex than to just
demand more privacy without considering what this means on a technical
level.

## What Was Safe Harbor?

The US-EU Safe Harbor laws declared US soil as a safe location for user
data to fulfill the European Privacy Directive.  In a nutshell: this was
the only reason any modern internet service could keep their primary user
data in the United States on services like Amazon EC2 or Heroku.

In essence Safe Harbor was a self assessment that an American company
could sign to make itself subject to the European Data Protection
Directive.  At least in principle.  Practically very few US companies
cared about privacy which is probably a big reason why we ended up in this
situation right now.  The second one is the NSA surveillance but I want to
cover this in particular separately a bit later.

## What Changed?

Maximillian Schrems, an Austrian citizen, has started an investigation
into Facebook and its data deletion policies a while ago and been
engaging with the Irish authorities on that matter ever since.  The Irish
rejected the complaint because they referred to the Safe Harbor act.  What
changed now is that the European Court of Justice ruled the following:

> In today’s judgment, the Court of Justice holds that the existence of
a Commission decision finding that a third country ensures an adequate
level of protection of the personal data transferred cannot eliminate
or even reduce the powers available to the national supervisory
authorities under the Charter of Fundamental Rights of the European
Union and the directive.
>
> […]
>
> **For all those reasons, the Court declares the Safe Harbour Decision
invalid**. This judgment has the consequence that the Irish supervisory
authority is required to examine Mr Schrems’ complaint with all due
diligence and, at the conclusion of its investigation, is to decide
whether, pursuant to the directive, transfer of the data of Facebook’s
European subscribers to the United States should be suspended on the
ground that that country does not afford an adequate level of
protection of personal data.
>

The detailed ramifications of this are a bit unclear, but if you were
relying on Safe Harbor so far, you probably have to move servers now.

## Why Was Safe Harbor Useful?

So if you take the internet three years ago (before the Ukrainian
situation happened) the most common of legally running an international
internet platform as a smallish startup was to put the servers somewhere
in the US and fill out the safe harbor self assessment every 12 months.

To understand why that was a common setup you need to consider why it was
chosen in the first place.  The European Data Protection Directive came
into effect quite a long time ago.  It's dated for the end of 1995 and
required user data to be either stored in EFTA states or optionally in
another country if it can be ensured that the same laws are upheld.  This
is what safe harbor did.  In absence of this, all data from European
citizens must be stored on European soil.

After the Ukrainian upraising and after Crimea fell to the Russian
Federation a few things changed.  International sanctions were put up
against Russia and Russia decided to adopt the same provision as the
European Union: Russian citizen's data has to be stored on Russian
servers.  This time however without an option to get exceptions to this
rule.

It's true that the US do not yet have a provision that requires US citizen
data to be stored in the States, but this is something that has been
discussed in the past and it's a requirement for working with the
government already.  However with both Russia and Europe we now have two
large international players that set the precedent and it can only get
worse from here.

## Privacy vs Data Control

The core of the issue currently is that data is considered power and
privacy is a secondary issue there.  While upholding privacy is an
important and necessary goal, we need to be careful to not forget that
the European countries are not any better.  While it's nice to blame the
NSA for world wide surveillance programs, we Europeans have our own
governmental agencies that act with very little supervision and especially
in the UK operate on the same invasiveness as in the US.

A European cloud provider will have to comply with local law enforcement
just as much as an American cloud provider will have to be with federal US
one.  The main difference just being the institutions involved.

The motivation for the Russian government is most likely related to law
enforcement over privacy.  I'm almost sure they care more about keeping
certain power over companies doing business in Russia to protect
themselves against international sanctions than their citizens privacy.

## Data Locality and Personal Data

So what exactly is the problem with storing European citizens data in
Europe, data of Americans in the states and the data of Russians somewhere
in the Russian Federation?  Unsurprisingly this is a very hard problem to
solve if you want to allow people from those different countries to
interact with each other.

Let's take a hypothetical startup here that wants to build some sort of
Facebook for climbers.  They have a very niche audience but they attract
users from all over the world.  Users of the platform can make
international friendships, upload their climbing trips, exchange messages
with each other and also purchase subscriptions for "pro" features like
extra storage.

So let's say we want to identify Russians, Americans and Europeans to keep
the data local to each of their jurisdictions.  The easy part is to set up
some servers in all of those countries and make them talk to each other.
The harder part is to figure out which user belongs to which jurisdiction.
One way would be to make users upload their passport upon account creation
and determine their main data center by their citizenship.  This obviously
would not cover dual citizens.  A Russian-American might fall into two
shards on a legal basis but they would only opt into one of them.  So
let's ignore those outliers.  Let's also ignore what happens if the
citizenship of a user changes because that process is quite involved and
usually takes a few years and does not happen all that commonly.

Now that we know where users are supposed to be stored, the question is
how users are supposed to interact with each other.  While distributed
databases exist, they are not magic.  Sending information from country to
country takes a lot of time so operations that affect two users from
different regions will involve quite a bit of delay.  It also requires
that the data temporarily crosses into another region.  So if an American
user sends data to a Russian user, that information will have to be
processed somewhere.

The problem however is if the information is not temporarily in flux.  For
instance sending a message from Russia to America could be seen as falling
as being a duplicated message that is both intended for the American and
Russian jurisdiction.  Tricker it gets with information that cannot be
directly correlated to a user.  For instance what your friends are.
Social relationships can only be modelled efficiently if the data is
sufficiently local.  We do not have magic in computing and we are bound to
the laws of physics.  If your friends are on the other side of the world
(which nowadays the most likely are) it becomes impossible to handle.

Credit card processing also falls in to this.  Just because you are
British does not mean your credit card is.  Many people live in other
countries and have many different bank accounts.  The data inherently
flows from system to system to clear the transaction.  Our world is very
connected nowadays and the concept of legal data locality is very much at
odds with the realities of our world.

The big cloud services are out, because they are predominantly placed in
the US.  Like it or not, Silicon Valley is many, many years ahead of what
European companies can do.  While there are some tiny cloud service
providers in Europe, they barely go further than providing you with
elastically priced hardware.  For European startups this is a significant
disadvantage over their American counterparts when they can no longer use
American servers.

## Privacy not Data Locality

The case has been made that this discussion is not supposed to be about
data locality but about privacy.  That is correct for sure, but
unfortunately data centers fall into the jurisdiction of where they are
placed.  Unless we come up with a rule where data centers are placed on
international soil where they computers within them are out of
government's reach, a lot of this privacy discussion is dishonest.

What if the bad player are the corporates and now the governments?  Well
in that case that was the whole point of safe harbor to begin with: to
enforce stricter privacy standards on foreign corporations for European
citizens.

## How to Comply?

Now the question is how to comply with what this is going into.  These new
rules are more than implementable for Facebook size corporations, but it
is incredibly hard to do for small startups.  It's also not quite clear
what can and what cannot be done with data now.  At which point data is
considered personal and at which point it is not, is something that
differs from country to country and is in some situations even not
entirely clear.  For instance according to the UK DPA user relationships
are personal information if they have "biographical significance".

## A Disconnected World

What worries me is that we are taking a huge step back from an
interconnected world where people can share information with each other,
to more and more incompatible decentralization.  Computer games
traditionally have already enforced shards where people from different
countries could not play together because of legal reasons.  For instance
many of my Russian friends could never play a computer game with me,
because they are forced to play in their own little online world.

Solutions will be found, and this ruling will probably have no significance
for the average user.  Most likely companies will ignore the ruling
entirely anyways because nobody is going to prosecute anyone unless they
are Facebook size.  However that decisions of this magnitude are made
without considering the technical feasibility is problematic.

## The Workaround

For all intents and purposes nothing will really change for large
companies like Facebook anyways.  They will have their lawyers argue that
their system cannot be implemented in a way to comply with forcing data to
live in Europe and as such will refer to Article 26 of the Data Protection
Directive which states that personal data to an untrusted third country on
either a user given consent to this or there being a technical necessity
for fulfilling the contract between user and service provider.  The TOS
will change, the lawyers will argue and in the end the only one who will
really have to pick up the shards are small scale companies which are
already overwhelmed by all the prior rules.

Today does not seem to be a good day for small cloud service providers.
