---
tags: ['ai']
summary: "What is AI generated text anyways?"
---

# Interpreting Pangram

Yesterday David Sacks [wrote a
tweet](https://x.com/DavidSacks/status/2098973625252708460) and within a few
minutes people did, what they usually do, and they asked Pangram if it was AI.
And Pangram said it's [entirely AI
generated](https://www.pangram.com/history/a6f16402-f194-4cc7-8315-ae8caeffbb67?ucc=c1me1lFm6Pf).
To which David replied that these AI detectors [are
bogus](https://x.com/DavidSacks/status/2099040321351106807?s=20).

Now Pangram has a pretty low false positive rate, but if you have ever used an
LLM as a writing assitant, you will have probably noticed that it claims your
posts 100% AI, even though you don't feel like they are.

Pangram itself is a trained model, that attempts to detect segments of text as
being definitely human, definitely AI and a mixture of the two.  If you want to
know how it works, [they published a paper](https://arxiv.org/abs/2607.27183).
The short summary is that they are manufacturing its own training data by
starting from collections of known human authored text.  An LLM is then tasked
to understand the text and write a fresh new text on the same topic.  They also
let the LLM perform partial edits on that original human text and through that
they can pick up on these co-authored details.  Pangram claims their model to
have rates of 0.0041% false AI accusations and 0.34% missed AI text.

So now that we know this I figured it might be fun to have an LLM re-create
David's tweet.  I firstI came up with a prompt.  And when I say I came up with
that prompt I in fact used an LLM to propose to me from that tweet what I might
want to say for the structure.  I'm sure if you ask Pangram about if the above
text is AI, it will probably say so, but that's not really the point.  The point
is that I then used Opus 5 to generate a text which reads entirely AI generated.

If you are curious, this is the prompt I used:

<details><summary>Original prompt to generate a David Sacks like tweet</summary>

> Please write an 8 paragraph tweet about "Pacing the Frontier", not longer than 350 words.
> 
> Context of this tweet is this post by Dario:
> https://darioamodei.com/post/we-must-pace-the-frontier
>
> And this tweet by Sam Altman: <tweet>I agree with Dario that we need to pace
> the frontier. This has been a primary topic of discussions we've had at OpenAI
> in recent weeks.
> 
> Committing to having independent evaluators with employee-like access is a
> great idea, and we will do the same. We'll have more to share soon.</tweet>
> 
> Structure for the post:
> 
> - Open with a concession: Note that Dario ("We Must Pace the Frontier") and Sam Altman both want to slow down at the frontier. Say "go ahead" which reads as a surprising response.
> - Establish they own the frontier: Argue OpenAI and Anthropic hold a duopoly on frontier intelligence by all kind of metrics (market share, capability, revenue etc.) and that they themselves claim the lead is widening via RSI.
> - Concede you can't see their unreleased models, so if those are scary, being responsible is their call.
> - Follow with a list of a rapid-fire paragraph ("stop pretending") rejecting the asks from Dario's post.
> - Name the commercial self-interest (Slowing down isn't purely altruistic)
> - Close with the challenge that pacing buys room for a smarter regulatory debate than Bernie Sanders "shut it all down". Say something about China and Open Weight models.

</details>

The text that Opus 5 then wrote, was this one:

> Dario published "We Must Pace the Frontier." Sam agreed, and said OpenAI will
> also commit to independent evaluators with employee-like access. My response is
> not the one they expect: go ahead. Please do.
> 
> Because you two *are* the frontier. OpenAI and Anthropic hold a duopoly on
> frontier intelligence by every metric anyone actually uses: capability, revenue,
> enterprise share, developer mindshare. And you both keep telling us the lead is
> widening, that models are starting to improve models. If that's true, pacing
> costs you a quarter you can reclaim whenever you like.
> 
> I also can't see your unreleased checkpoints. If what's sitting behind the
> curtain genuinely scares the people who trained it, then slowing down is your
> call to make, and the right one. I'm not going to second-guess a risk assessment
> I have no access to.
> 
> But stop pretending the rest of us are the problem. Stop pretending this is a
> collective action failure in which a handful of startups are the defectors.
> 
> Stop pretending open weights are the dangerous frontier while the two of you
> ship the most capable model in the world every few months. Stop pretending
> third-party evals require new law, when you both just committed to them
> voluntarily, in public, on a blog.
> 
> And stop pretending it's purely altruism. Pacing the frontier is also margin
> repair. It slows the price war, stabilizes the capex story, stretches
> depreciation schedules across a longer product cycle, and makes life
> considerably harder for fast followers who survive by distilling whatever you
> shipped last month. Safety and self-interest are pointing the same direction
> here. That's worth saying out loud.
> 
> Still, the upside is real. Pacing buys room for a smarter regulatory debate than
> the one on offer, where the loudest alternative is Bernie Sanders' "shut it all
> down." That's a slogan, not policy. Meanwhile China keeps shipping competitive
> open weights, and any rule that binds two American labs while the rest of the
> world downloads its capability for free isn't safety, it's theater with a very
> expensive ticket price.

And well, Pangram agrees [that this is 100%
AI](https://www.pangram.com/history/6c189841-c4e3-4dfe-b3e7-0db39a183ef1).  So
far, so uninteresting.  It does read *somewhat* like David's tweet, but obviously
not entirely.  Given that the original prompt does not have enough information to
re-create the tweet entirely you would expect some divergences.

The actual thing that interests me is if you can take this output at all, and
then rewrite it from scratch, but by sticking to the general structure and
ideas.  Will Pangram give us a AI or human rating?

I read the generated text.  Then I read each paragraph and decided to rewrite
and rephrase it without an LLM.  According to some similarity checkers, they the
final texts are 50% similar which seems about right.  But strictly speaking, not
a single sentence is the same.  Here is the 100% human rewritten text of the
above one.  No LLM was used to write it, but an LLM was used to fix up typos in
the end.  That from my experience really does nothing to tick off an LLM
detector.

> Dario has written "We Must Pace the Frontier," and Sam from OpenAI has agreed.
> My response might surprise people: go ahead, please.
> 
> You two are the frontier!  Your companies, OpenAI and Anthropic, are at the
> frontier by all metrics: revenue, developer mindshare, adoption, capabilities.
> And yet you both claim that your lead is widening as a result of recursive
> self-improvement as models are improving models.  You currently are the
> duopoly of self-improving models!
> 
> I am unable to see what unreleased models you have.  When what you have behind
> those doors really scares your folks, then you should slow down.  I'm not going
> to tell you otherwise and I support you.
> 
> But please don't pretend we are the problem.  Stop pretending you need our
> permission.  Stop pretending this is all a collective issue when in reality this
> is all on you.  Stop pretending open weights are the problem here.  Stop
> pretending pulling third-party evaluators in requires lawmaker involvement.  And
> for the love of all the good things in the world: stop pretending this is all
> about altruism.
> 
> Pacing the frontier is also about your margins, and it makes it harder for fast
> followers.  And it patches up your capex story and has the potential for slowing
> down the price war ahead of the IPOs.
> 
> But yes: pacing might give us the space for a better debate than Bernie Sanders'
> "shut it all down."  There is no policy there.  And while we're having fights at
> home, China will keep shipping competitive open-weight models and won't adhere
> to any American agreements.
> 
> This is all regulatory capture hiding behind a safety debate, and the rest of
> the world is watching.

So what does it say?  Well this text too comes back as [100%
slop](https://www.pangram.com/history/9106f398-e1c3-406b-bea5-127f230dfc03).
And it does not surprise me all that much.  I have generally noticed that if you
rely on an LLM to give your text structure, it will score badly on Pangram even
if you do plenty of edits over it.  In fact, it's quite unlikely you're going to
get a post that starts out as slop into a structure that will make it appear
that it's not.

I came to quite appreciate the existance of Pangram because at the very least it
has made me quite aware of some of the effects that using LLMs for writing blog
posts has.  This blog has been AI supported for about two years (as you can see
from the [AI transparency](/ai-transparency/) link on the bottom but I did
notice that I became both more reliant on those tools and that they have become
much more aggressive editors and it gave me pause.

Yet, I also think that plenty of people will find a "100% AI" rating misleading
when in fact the author has done plenty of editing.  But maybe it's fair to have
this to show up as entirely AI?
