---
tags: ['thoughts', 'licensing', 'privacy']
summary: "Some thoughts about the meaning of pseudonyms and anonymous contributions in Open Source."
---

# Skin in the Game

There was a bit of a [kerfuffle](https://www.openwall.com/lists/oss-security/2024/03/29/4) about
subverting open source projects recently.  That incident made me think
about something that's generally on my mind.  That thought again was
triggered by that incident but is otherwise not in response to it.  I want
to talk about some of the stresses of being an Open Source contributor and
maintainer but specifically about something that have been unsure over the
years about: anonymity and pseudonymity.

Over the years it has been pretty clear that some folks are contributing
in the Open Source space and don't want to have their name attached to
their contributions.  I'm not going to judge if they have legitimate
reasons for doing so or if pseudonymity a good or bad thing.  That it is
happening, is simply a fact of life.  The consequences of that however are
quite interesting and I think worth discussing.

When I talk about names, I primarily think about the ability to associate
an online handle and a contribution to a real human being.  That does not
imply that it should be necessarily trivial for people to find that
information, but it should be something that is at least in principle be
possible.  There is obviously a balance to all of this, but given that
there are real consequences to “doing stuff on the internet” there has to
be a way to get in contact with the person behind it.  So as far as
“naming a person” here is concerned it's not so much about a particular
name, but as in being able to identify the human being behind it.

While we might get away with believing nothing on the internet matters and
laws do not apply, that's not really true.  In fact particularly with Open
Source we're all leveraging copyright laws and the ability to enforce
contracts to work together.  And no matter how much we write “THIS
SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS “AS IS” AND
ANY EXPRESS OR IMPLIED WARRANTIES” not all legal consequences can be waived.

Which leads me to some development in internet anonymity I have observed
over the last 20 years which I find worth reflecting on.  When I got
started with Open Source, pseudonyms felt much less common.  The distance
to the legal system at least to me felt much closer than today.  I give
you a handful examples of this: When I got started doing stuff on the
internet and you did something really stupid, someone called your ISP and
you had an angry conversation.  Because the subscriber of that line was
known.  A lot of the systems on the earlier internet were based on a lot
more trust than would be acceptable today.  An angry ISP was not the worst
that would happen to you, a lot of people got charged with wire-fraud for
things that today are just being ignored because they have become too
commonplace (like probably most DDOS attacks these days).  When I created
my first SourceForge account, the “real name” field was not optional, CLAs
talked about names and asked for signatures.  When my stuff was packaged
up in Debian some of the first things that came my way were folks
explaining me some legal stuff about licenses I was unaware before.  After
I started getting involved with Ubuntu I went to a key signing party where
I showed my passport to other human beings to demonstrate that I exist.
When I became a Python core contributor I signed a physical paper for the
CLA.

A lot of this feels quite untypical today.  We no longer do a lot of these
things and I believe it mostly just works because people don't go to court
much about Open Source projects any more.  It probably also works because
over time Open Source became more established.  If you contribute via
GitHub today, even the terms of service probably help resolving copyright
issues by being quite explicit about how contributions to public
repositories happen (you contribute under the license of the repository).

But sometimes people do go to court.  Open Source projects in many ways
are an unclear amalgamation of different contributions and we just
collectively hope that we all agree that contributions come in under the
same licenses as the file in the root of the project.  The Linux kernel
once did not accept contributions from pseudonymous users.  It did so for
good reasons.  They need to know who the person is that contributes so
they know what to do in case of a licensing conflict and there was more
than one lawsuit involving Linux.  This was true even after the [DCO](https://en.wikipedia.org/wiki/Developer_Certificate_of_Origin) was put
in place.  Today, pseudonyms are accepted.  Not just in Linux, but also in
many large projects.  An example of that is the CNCF which found a nice
middle ground on the name and what you sign off with: “A real name does
not require a legal name, nor a birth name, nor any name that appears on
an official ID (e.g. a passport).  Your real name is the name you convey
to people in the community for them to use to identify you as you.”

Most important however is this part: “Your real name should not be an
anonymous id or false name that misrepresents who you are.”  The need of
getting in contact with the person exists and did not go away.  It always
existed and it quite likely will continue to exist.  There are good
reasons why you want to know who the person is.  Maybe the person
contributed code they did not own the copyright of, maybe their employer
writes you an angry email.  Concerns about licensing are a common reason
for why people want to know who the people are that contribute.  Maybe
sanctions or other legal restrictions prevent to accept contributions from
that person.  Another reason you might need to get in contact with the
author is to change the license.  You might remember that a lot of
projects tried to move from GPL v2 to GPL v2 or later.  A change that
required the agreement of every person that contributed before.  Reaching
out to people sometimes is not the easiest of tasks.

However in addition to pseudonymous contributions, there is also a sharp
increase of anonymous contributions.  Particularly thanks to GitHub pull
requests it's incredibly common that you get commits now from folks whose
only identity is a made up user name, no visible email address and some
default avatar that GitHub generated.

This is not necessarily a problem, but to me it feels like a trend that
I'm not sure how to work with.  It creates a somewhat complex form of
interaction where one person might be out in the open, the other person
might be entirely anonymous.  Many of us old timers who went into Open
Source in former times have a pretty well established online identity
(either via a “real name” or pseudonym).  I also think that many of us who
are in this for a while feel quite a bit of stress and responsibility for
the things we created, at least that is very much true for me.  Multiple
times over the years did I hear or read online that a person chooses to
contribute anonymously is because their employer bans Open Source work.
One the one hand it's great that people find a way to avoid these
restrictions, on the other hand if that ever gets found out you probably
are going to have some unfriendly talks with someone else's legal team.
While in practice none of my code is important enough that I think
something like this will happen, I can absolutely see this happen to large
Open Source projects where a rogue employee contributes on their
employer's time or otherwise proprietary code.

I have a heard the sentiment a few times now that one should vet the
contributions, not the contributors.  That's absolutely true.  Yet at the
same time many of us are quite frankly assuming good actors and just happy
to get contributions.  We sometimes merge pull requests not in the best
state of mind, sometimes we feel pressured.  It can be quite hard to spot
back doors and hostile commits, particularly if the other side is
sufficiently motivated.  But here is the thing: you know who I am, I do
not know who a lot of the people are that send pull requests against my
libraries.  An asymmetry I need to work with.

What motivates me to write this, is that I feel quite a bit of asymmetry
in contributions these days.  It's a lot easier to contribute to Open
Source these days and that's a good thing.  But it also comes at a cost.
It's impossible to find yourself having become a critical piece of
software deployed all over the world by accident.  Your users update to
the latest version of your code without any vetting on their own.  Yet the
brunt of the responsibility falls on you, the person associated with the
project.  A person that might be known.  Yet a lot of the contributions
are random people, and you might not have a good change to identify them.
Sometimes it's not even the contributions, it's already anonymous users on
the issue trackers that increase that pressure.

I find that environment at time to be emotionally stressful, much more
than it has been.  I don't even maintain particularly popular pieces of
Open Source libraries these days but I still feel much more stressed about
that experience than years ago and a pretty big element of it is that I
feel that a lot of the issues and commits are from people who show up once
and then leave.  Maybe it's because I'm older, or because I also have
other things in my life than Open Source, but the situation is what it is.

Which brings me back to the identity thing.  It's probably great for a
lot of people that their online identity is not clearly linked to the real
world identity.  What I find less great is that with this loss of real
identity many of the real world legal consequences are then stuck with me,
a person that can be identified.  I don't assume that knowing who the
folks are that contribute will solve any problems, mind you.  While I do
have some probably unrealistic hope that law enforcement agencies would
find it a bit easier to get involved if they can better identify a bad
actor, I'm not even sure if they find much of an interest to get involved
in the first place.  To me, it's mostly a piece of mind thing.

Everybody's contribution into ones projects turns into a permanent
liability in a way.  I take responsibility of someone else's commit with
the moment I press the merge button.  While many of those contributions
are benign no matter what, you do start to trust repeated contributors
after a while.  A well established identity on the internet creates a form
of inner peace, a handing over a project more and more to a person you
don't know less so.  Yet it can happen absolutely gradually.  Maybe
verified identities an illusion, but sometimes these illusions is all
that's needed to feel more relaxed.

I don't think we should force people to have a real world identity on the
internet, but we also have to probably take a step back and look at how we
came here and if we like it this way.  In a sense this is a generic rant
about missing the “good old times” (that probably never were), where
people talked to each other eye to eye.  Instead more and more,
interactions on the internet feel like that they are happening with
faceless figures you will probably never ever meet, see, talk or write to.

So what's left?  I don't know.  Neither do I know if this is a problem
that only I feel, nor do I know a solution to it if it was one.  All I can
say is that I find Open Source stressful [more](/2023/12/25/life-and-death-of-open-source/) [than](/2024/3/26/rust-cdo/) [one](/2023/10/14/eurorust-whats-a-conference/) way these days.
