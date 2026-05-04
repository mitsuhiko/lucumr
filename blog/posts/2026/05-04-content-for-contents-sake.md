---
tags: ['ai']
summary: "Why are so many interactions online terrible now?"
---

# Content for Content's Sake

Language is constantly evolving, particularly in some communities.  Not
everybody is ready for it at all times.  I, for instance, cannot stand that my
community is now constantly "cooking" or "cooked", that people in it are "locked
in" or "cracked."  I don't like it, because the use of the words primarily
signals membership of a group rather than one's individuality.

But some of the changes to that language might now be coming from … machines?
Or maybe not.  I don't know.  I, like many others, noticed that some words keep
showing up more than before, and the obvious assumption is that LLMs are at
fault.  What I did was take 90 days' worth of my local coding sessions and look
for medium-frequency words where their use is inflated compared to what
[wordfreq](https://github.com/tecnickcom/wordfreq) would assume their frequency
should be.  Then I looked for the more common of these words and did a Google
Trends search (filtered to the US).  Note that some words like "capability" are
more likely going to show up in coding sessions just because of the nature of
the problem, so the actual increase is much more pronounced than you would
expect.

You can click through it; this is what the change over time looks like.  Note
that these are all words from agent output in my coding sessions that are
inflated compared to historical norms:

<div data-llm-word-trends>Loading word trend chart…</div>

<script src="/static/llm-word-trends.js"></script>

<noscript>The interactive word trend chart requires JavaScript.</noscript>

Something is going on for sure.  Google Trends, in theory, reflects words that
people search for.  In theory, maybe agents are doing some of the Googling, but
it might just be humans Googling for stuff that is LLM-generated; I don't know.
This data set might be a complete fabrication, but for all the words I checked
and selected, I also saw an increase on Google Trends.

So how did I select the words to check in the first place?  First, I looked for
the highest-frequency words.  They were, as you would expect, things like "add",
"commit", "patch", etc.  Then I had an LLM generate a word list of words that
it thought were engineering-related, and I excluded them entirely from the list.
Then I also removed the most common words to begin with.  In the end, I ended up
with the list above, plus some other ones that are internal project names.  For
instance, [habitat](https://earendil-works.github.io/absurd/tools/habitat/) and
[absurd](https://earendil-works.github.io/absurd/), as well as some other internal
code names, were heavily over-represented, and I had to remove those.  As you
can see, not entirely scientific.  But of the resulting list of words with a
high divergence compared to wordfreq, they *all* also showed spikes on Google
Trends.

There might also be explanations other than LLM generation for what is going on,
but I at least found it interesting that my coding session spikes also show up
as spikes on Google Trends.

## The Rise of LLM Slop

The choice of words is one thing; the way in which LLMs form sentences is
another.  It's not hard to spot LLM-generated text, but I'm increasingly
worried that I'm starting to write like an LLM because I just read so much more
LLM text.  The first time I became aware of this was that I used the word
"substrate" in a talk I gave earlier this year.  I am not sure where I picked it
up, but I really liked it for what I wanted to express and I did not want to use
the word "foundation".  Since then, however, I am reading this word everywhere.
This, in itself, might be a case of the [Baader–Meinhof
phenomenon](https://en.wikipedia.org/wiki/Frequency_illusion), but you can also
see from the selection above that my coding agent loves substrate more than it
should, and that Google Trends shows an increase.

We have all been exposed to LLM-generated text now, but I feel like this is
getting worse recently.  A lot of the tweet replies I get and some of the Hacker
News comments I see read like they are LLM-generated, and that includes people
I know are real humans.  It's really messing with my brain because, on the one
hand, I really want to tell people off for talking and writing like LLMs; on the
other hand, maybe we all are increasingly actually writing and speaking like
LLMs?

I was listening to a talk recording recently (which I intentionally will not
link) where the speaker used the same sentence structure that is
over-represented in LLM-generated text.  Yes, the speaker might have used an LLM
to help him generate the talk, but at the same time, the talk sounded natural.
So either it was super well-rehearsed, or it was natural.

## Engage and Farm

At least on Twitter, LinkedIn, and elsewhere, there is a huge desire among
people to write content and be read.  Shutting up is no longer an option and,
as a result, people try to get reach and build their profile by engaging with
anything that is popular or trending.  In the same way that everybody has
gazillions of Open Source projects all of a sudden, everybody has takes on
everything.

My inbox is a disaster of companies sending me AI-generated nonsense and I now
routinely see AI-generated blog posts (or at least ones that look like they are
AI-generated) being discussed in earnest on Hacker News and elsewhere.

Genuine human discourse had already been an issue because of social media
algorithms before, but now it has become incredibly toxic.  As more and more
people discover that they can use LLMs to optimize their following, they are
entering an arms race with the algorithms and real genuine human signal is
losing out quickly.  There are entire companies now that just exist to [automate
sending LLM-generated shit](https://polsia.com/) and people evidently pay money
for it.

## Speed Should Kill

If we take into account the idea that the highest-quality content should win
out, then the speed element would not matter.  If a human-generated comment
comes in 15 minutes after a clanker-generated one, but outperforms it by being
better, then this whole LLM nonsense would show up less.  But I think that
LLM-generated noise actually performs really well.  We see this plenty with Open
Source now.  Someone builds an interesting project, puts it on GitHub and within
hours, there are "remixes" and "reimplementations" of that codebase.  Not only
that, many of those forks come with sloppy marketing websites, paid-for domains,
and a whole story on socials about why this is the path to take.

I have complained before that Open Source is quickly deteriorating because
people now see the opportunity to build products on top of useful Open Source
projects, but the underlying mechanics are the same as why we see so much LLM
slop.  Someone has a formed opinion (hopefully) at lunch, and then has a
clanker-made post 3 minutes later.  It just does not take that much time to
build it.  For the tweets, I think it's worse because I suspect that some people
have scripts running to mostly automate the engagement.

And surely, we should hate all of this.  These low-effort posts, tweets, and Open
Source projects should not make it anywhere.  But they do!  Whatever they play
into, whether in the algorithms or with human engagement, they are not punished
enough for how little effort goes into them.

## Friction and Rate Limiting

That increases in speed and ease of access can turn into problems is a
long-understood issue.  ID cards are a very unpopular thing in the UK because
the British are suspicious of misuse of a central database after what happened in
Nazi Germany.  Likewise the US has the Firearm Owners Protection Act from 1986,
which also bans the US from creating a central database of gun owners.  The
gun-tracing methodologies that result from not having such a database [look like
something out of a Wes Anderson movie](https://www.youtube.com/watch?v=rMQ2b6ZwwCU).
We have known for a long time that certain things should not be easy, because of
the misuse that happens.

We know it in engineering; we know it when it comes to governmental overreach.
Now we are probably going to learn the same lesson in many more situations
because LLMs make almost anything that involves human text much easier.  This is
hitting existing text-based systems quickly.  Take, for instance, the EU
complaints system, which is now [buckling under the pressure of
AI](https://www.politico.eu/article/eu-system-buckles-under-pressure-of-ai-powered-complaints/).
Or take any AI-adjacent project's issue tracker.  [Pi](https://pi.dev/) is routinely
getting AI-generated issue requests, sometimes even
[without](https://github.com/badlogic/pi-mono/issues/4111) [the
knowledge](https://github.com/badlogic/pi-mono/issues/3862) [of the
author](https://github.com/badlogic/pi-mono/issues/3783).

## Trust Erosion and Gaslighting

I know that's a lot of complaining for "I am getting too many emails,
shitty Twitter mentions, and GitHub issues."  I really think, though, that now
that we know that it's happening, we have to change how we interact with people
who are increasingly automating themselves.  Not only do they produce a lot of
shitty slop that we all have to sit through; they are also influencing the world
in much more insidious ways, in that they are influencing our interactions with
each other.  The moment I start distrusting people I otherwise trust, because
they have started picking up LLM phrasing, it erodes trust all over society.

You also can't completely ban people for bad behavior, because some of this
increasingly happens accidentally.  You sending Polsia spam to me?  You're dead
to me.  You sending me an AI-generated issue request and following up with an
apology five minutes later?  Well, I guess mistakes happen.  Yet, in many ways,
what is going on and will continue to go on is unsettling.

I recently talked with my friend [Ben](https://github.com/benvinegar) who said
he forced someone to call him to continue a conversation because he was no
longer convinced he was talking to a human.

Not all of us have been exposed to the extreme cases of this yet, but I had a
handful of interactions in which I questioned reality due to the behavior of the
person on the other side.  I struggle with this, and I consider myself to be
pretty open to new technologies and AI in particular.  But how will my children
react to stuff like this?  My mother?  I have strong doubts that technology is
going to solve this for us.

## Suggestions for Change

The reason I don't think technology is going to solve this for us is that while
it can hide some spam and label some generated text, it won't fix us humans.
What is being damaged here are social interactions across the board: the
assumption that when someone writes to you, there is a person on the other side
who has put some care into the interaction.  I would rather have someone ghost
me or reject me than send me back some AI-generated slop.

Change has to start with awareness and an unfortunate development is that LLMs
don't just influence the text we read and they influence the text we write, even when
we don't use them.  Given the resulting ambiguity, we need to become more aware
of how easily we can turn into energy vampires when we use agents to back us up
in interactions with others.  Consider that every time someone reads text coming
from you, they will increasingly have to make a judgment call if it was
you, an LLM, or you and an LLM that produced the interaction.  Transparency in
either direction, when there is ambiguity, can help great lengths.

When someone sends us undeclared slop, we need to change how we engage with
them.  If we care about them, we should tell them.  If we don't care about them,
we should not give them visibility and not engage.

When it comes to creating platforms and interfaces where text can be submitted,
we need to throw more wrenches in.  The fact that it was cheap for you to
produce does not make it cheap for someone else to receive, and we need to find
more creative ways to increase the backpressure.  GitHub or whatever wants to
replace it, will have a lot to improve here and some of which might be going
against its core KPIs.  More engagement is increasingly the wrong thing to look
at if you want a long term healthy platform.

Whatever we can do to rate-limit social interactions is something we should try:
more in-person meetings, more platforms where trust has to be earned, and maybe
more acceptance that sometimes the right response is no response at all.

<small>

And as for AI assistance on this blog, I have an [AI transparency
disclaimer](/ai-transparency/) for a while.  In this particular blog post I used
Pi as an agent to help me generate the dynamic visualization and I used
to write the code to analyze and scrape Google Trends.

</small>
