public: yes
tags: [python, thoughts, politics]
summary: |
  Observations about the problem of having strong opinions and sharing
  them with others.

Be Careful About What You Dislike
=================================

The last few months I keep making the same “discovery” over and over again
in various different contexts: that whenever you are confronted with a
very strong opinion about a topic, reasonable discussions about the topic
often involve arguments that are becoming scary parodies of themselves.

What I mean by that is that given a controversial topic a valid argument
for one side of the other is being repeated by a crowd of people that once
heard it, even after it stops being valid because the general situation
is no longer the same.  Instead of reevaluating the environment however,
goalposts are moved to restore the general sentiment of the opinion.

To give you a practical example of this problem I can just go by a topic I
have a very strong opinion about: Python 3.  When Python 3 was not a huge
thing yet I started having conversations with people in the community
about the problems I see with splitting the community, complexity of
porting and general questions about some of the text and byte decisions.
I started doing talks about the topic and write blog articles that kept
being shared.  Nowadays when I go to a conference I very quickly end up in
conversations where other developers come to me and see me as the "Does
not like Python 3 guy".  While I still am not a friend of some of the
decisions in Python 3 I am very much aware that Python 3 in 2016 is a very
different Python 3 than 6 years ago or earlier.

In fact, I myself campaigned for some changes to Python 3 that made it
possible to achieve better ports (like the reintroduction of the `u`
prefix on Unicode string literals).  In 2016 the problems that people have
with Python 3 are different than they used to be before.

This leads to very interesting conversations where I can have a highly
technical conversation about a very specific issue with Python 3 and
thoughts about how to do it differently (like some of the less obvious
consequences of the new text storage model) and another person joins into
the conversation with arguments against Python 3 that have long stropped
being valid.  Why?  Because there is a cost (or perceived cost) towards
porting to Python 3 and a chance is not seen.  This means that a person
with a general negativity towards Python 3 would seek me out and try to
reaffirm their opposition to a port to it.

Same thing is happening with JavaScript where there is a general negative
sentiment about programming in it but not everybody is having good
arguments for it.  There are some that actually program a lot in it and
dislike specific things about the current state of the ecosystem, but
generally acknowledge that the language is evolving, and then there are
those that take advantage of unhappiness and bring their heavily outdated
opposition against JavaScript into a conversation just to reaffirm their
own opinion.

This is hardly confined to the programming world.  I made the same
discovery about CETA.  CETA is a free trade agreement between the European
Union and Canada and it had the misfortune of being negotiated at the same
time as the more controversial TTIP with the US.  The story goes like
this: TTIP was negotiated in secrecy (as all trade agreements are) and
there were strong disagreements between what the EU and what the US
thought trade should look like.  That covered food safety standards and
other highly sensitive topics.  Various organizations on both the left and
right extremes of the political scale started to grab any remotely
controversial information that leaked out to shift the public opinion
towards negativity to TTIP.  Then the entire thing spiraled out of
control.  People not only railed against TTIP but took their opposition
and looked for similar contracts and found CETA.  Since both are trade
agreements there is naturally a lot of common ground between them.  The
subtleties where quickly lost.  When the initial arguments against TTIP
were food standards, public services and intransparent ISDS courts and
similar things many of the critics failed to realize that CETA
fundamentally was a different beast.  Not only was it already a much
improved agreement from the start, but it kept being modified from the
initial public version of it to the one that was finally sent to national
parliaments.

However despite what I would have expected: that critics go in and
acknowledge that their criticism was being heard instead slowly moved the
goalposts.  At this point there is so much emotion and misinformation in
the general community that the goalpost moved all the way to not
supporting further free trade at all.  In the general conversation about
ISDS and standards many people brought introduced their own opinions about
free trade and their dislike towards corporations and multinationals.

This I assume is human behavior.  Admitting that you might be wrong is
hard enough, but it's even harder when you had validation that you were
right in the past.  In particular that an argument against something might
no longer be valid because that something has changed in the meantime is
hard.  I'm not sure what the solution to this is but I definitely realized
in the few years on my own behavior that one needs to be more careful
about stating strong opinions in public.  At the same time however I think
we should all be more careful dispelling misinformation in conversations
even if the general mood supports your opinion.  While emotionally I like
hearing stories about how JavaScript's packaging causes pain to developers
I know from a rational point of view that the ecosystem is improving a
tremendous speeds.  Yes I have been burned by npm and I keep being burned
by it, but it's not like this is not tremendously improving.

Something that has been put to paper once is hard to remove from people's
minds.  In particular in the technological context technology moves so
fast that very likely something you read once might no longer be up to
date as little as six months later.

So I suppose my proposal to readers is to not fall into the trap to assume
that the environment around oneself keeps on changing.
