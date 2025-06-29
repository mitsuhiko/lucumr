---
day-order: 1
tags:
  - python
  - thoughts
summary: |
---

# About the Lack of Updates

If you look over my contributions to my own open source projects over the
last six months you will have noticed that I became less active.  Why is
that?  There is no big conspiracy ongoing and I also don't plan on keeping
it this way, but there are two reasons for this.  The first one is that I
am now working for a computer game middleware company and we're using my
tools in production here.  The change in scenery caused me to use my own
stuff in a completely new environment and the amount of stuff I'm learning
on a daily basis is quite insane.

You would think using eating your own dogfood results in more active
contributions but it turns out that quite the opposite is happening.  As I
have written about before we're using Werkzeug itself instead of Flask for
it and we went some new and interesting ways in utilizing our stack.  I'm
very proud about what we accomplished in the last half year and it gave me
a few new insights into software architecture which I eventually want to
integrate into my libraries.

However a naive implementation also means breaking compatibility and I am
not very keen on that.  However with Python 3 becoming more and more
interesting I am currently playing with different ideas how to evolve the
libraries in interesting ways.

The second reason is that I have to change my workflow.  The way I was
handling my email inbox over the last few years worked fine for me until
now.  If you sent me a mail in the last two months there is a high chance
I might have missed it.  The truth is that running your own mail server
these days has become a science in itself and I am no longer willing to do
that.  At the same time however I don't want to migrate mails off to a
hosted solution without ensuring I get stuff out of there easily if the
need ever comes up.  As it stands right now I clear out my mailbox in the
morning and at night I have 120 mails in it after filters.  And 90% of
that is what I would classify as various types of spam that my spamfilter
does not assume is spam.  I'm spending too much time currently dealing
with mail and that generally leaves me in a very unhappy state overwards
so that I don't want to deal with my github inbox as well.

Worst part about all that is that it just piles up.

So yeah, not going to keep it this way but I think I might have to invest
a week into migrating my mail to something else and go over *all* the
things that piled up for my projects and make some clear decisions in how
to improve that flow.
