---
tags: ['personal', 'thoughts']
summary: "A personal recap of 2025 and a year of a new style of engineering."
---

# A Year Of Vibes

2025 draws to a close and it's been quite a year.  Around this time last year, I
wrote a post that reflected [on my life](/2024/12/26/reflecting-on-life/).  Had
I written about programming, it might have aged badly, as 2025 has been a year
like no other for my profession.

## 2025 Was Different

2025 was the year of changes.  Not only did I leave Sentry and start my new
company, it was also the year I stopped programming the way I did before.  [In
June](/2025/6/4/changes/) I finally felt confident enough to share that my way
of working was different:

> Where I used to spend most of my time in Cursor, I now mostly use Claude Code,
> almost entirely hands-off. […] If you would have told me even just six months
> ago that I'd prefer being an engineering lead to a virtual programmer intern
> over hitting the keys myself, I would not have believed it.

While I set out last year wanting to write more, that desire had nothing to do
with agentic coding.  Yet I published 36 posts — almost 18% of all posts on this
blog since 2007.  I also had around a hundred conversations with programmers,
founders, and others about AI because I was fired up with curiosity after
falling into the agent rabbit hole.

2025 was also a not so great year for the world.  To make my peace with it, I
[started a separate blog](https://dark.ronacher.eu/) to separate out my thoughts
from here.

## The Year Of Agents

It started with a growing obsession with Claude Code in April or May, resulting
in months of building my own agents and using others'.  Social media exploded
with opinions on AI: some good, some bad.

Now I feel I have found a new stable status quo for how I reason about where we
are and where we are going.  I'm doubling down on code generation, file systems,
programmatic tool invocation via an interpreter glue, and skill-based learning.
Basically: what Claude Code innovated is still state of the art for me.  That
has worked very well over the last few months, and seeing foundation model
providers double down on skills reinforces my belief in this approach.

I'm still perplexed by how TUIs made such a strong comeback.  At the moment I'm
using [Amp](https://ampcode.com/), [Claude
Code](https://claude.com/product/claude-code), and
[Pi](https://shittycodingagent.ai/), all from the command line.  Amp feels like
the Apple or Porsche of agentic coding tools, Claude Code is the affordable
Volkswagen, and Pi is the Hacker's Open Source choice for me.  They all feel
like projects built by people who, like me, use them to an unhealthy degree to
build their own products, but with different trade-offs.

I continue to be blown away by what LLMs paired with tool execution can do. At
the beginning of the year I mostly used them for code generation, but now a big
number of my agentic uses are day-to-day things.  I'm sure we will see some
exciting pushes towards consumer products in 2026.  LLMs are now helping me with
organizing my life, and I expect that to grow further.

## The Machine And Me

Because LLMs now not only help me program, I'm starting to rethink my
relationship to those machines.  I increasingly find it harder not to create
parasocial bonds with some of the tools I use.  I find this odd and
discomforting.  Most agents we use today do not have much of a memory and have
little personality but it's easy to build yourself one that does.  An LLM with
memory is an experience that is hard to shake off.

It's both fascinating and questionable.  I have tried to train myself for two
years, to think of these models as mere token tumblers, but that reductive view
does not work for me any longer.  These systems we now create have human
tendencies, but elevating them to a human level would be a mistake.  I
increasingly take issue with calling these machines "agents," yet I have no
better word for it.  I take issue with "agent" as a term because agency and
responsibility should remain with humans.  Whatever they are becoming, they can
trigger emotional responses in us that [can be
detrimental](https://en.wikipedia.org/wiki/Chatbot_psychosis) if we are not
careful.  Our inability to properly name and place these creations in relation
to us is a challenge I believe we need to solve.

Because of all this unintentional anthropomorphization, I'm really struggling at
times to find the right words for how I'm working with these machines.  I know
that this is not just me; it's others too.  It creates even more discomfort when
working with people who currently reject these systems outright.  One of the
most common comments I read in response to agentic coding tool articles is this
rejection of giving the machine personality.

## Opinions Everywhere

An unexpected aspect of using AI so much is that we talk far more about vibes
than anything else.  This way of working is less than a year old, yet it
challenges half a century of software engineering experience.  So there are many
opinions, and it's hard to say which will stand the test of time.

I found a lot of conventional wisdom I don't agree with, but I have nothing to
back up my opinions.  How would I?  I quite vocally shared my lack of success
with [MCP](https://en.wikipedia.org/wiki/Model_Context_Protocol) throughout the
year, but I had little to back it up beyond "does not work for me."  Others
swore by it.  Similar with model selection.  [Peter](https://steipete.me/), who
got me hooked on Claude early in the year, moved to Codex and is happy with it.
I don't enjoy that experience nearly as much, though I started using it more.  I
have nothing beyond vibes to back up my preference for Claude.

It's also important to know that some of the vibes come with intentional
signalling.  Plenty of people whose views you can find online have a financial
interest in one product over another, for instance because they are
investors in it or they are paid influencers.  They might have become investors
because they liked the product, but it's also possible that their views are
affected and shaped by that relationship.

## Outsourcing vs Building Yourself

Pick up a library from any AI company today and you'll notice they're built with
Stainless or Fern.  The docs use Mintlify, the site's authentication system
might be Clerk.  Companies now sell services you would have built yourself
previously.  This increase in outsourcing of core services to companies
specializing in it meant that the bar for some aspects of the user experience
has risen.

But with our newfound power from agentic coding tools, you can build much of
this yourself.  I had Claude build me an SDK generator for Python and TypeScript
— partly out of curiosity, partly because it felt easy enough.  As you might
know, I'm a proponent of [simple code](/2025/2/20/ugly-code/) and [building it
yourself](/2025/1/24/build-it-yourself/).  This makes me somewhat optimistic
that AI has the potential to encourage building on fewer dependencies.  At the
same time, it's not clear to me that we're moving that way given the current
trends of outsourcing everything.

## Learnings and Wishes

This brings me not to predictions but to wishes for where we could put our
energy next.  I don't really know what I'm looking for here, but I want to point
at my pain points and give some context and food for thought.

### New Kind Of Version Control

My biggest unexpected finding: we're hitting limits of traditional tools for
sharing code.  The pull request model on GitHub doesn't carry enough information
to review AI generated code properly — I wish I could see the prompts that led
to changes.  It's not just GitHub, it's also git that is lacking.

With agentic coding, part of what makes the models work today is knowing the
mistakes.  If you steer it back to an earlier state, you want the tool to
remember what went wrong.  There is, for lack of a better word, value in
failures.  As humans we might also benefit from knowing the paths that did not
lead us anywhere, but for machines this is critical information.  You notice
this when you are trying to compress the conversation history.  Discarding the
paths that led you astray means that the model will try the same mistakes again.

Some agentic coding tools have begun spinning up worktrees or creating
checkpoints in git for restore, in-conversation branch and undo features.
There's room for UX innovation that could make these tools easier to work with.
This is probably why we're seeing discussions about stacked diffs and
alternative version control systems like [Jujutsu](https://www.jj-vcs.dev/).

Will this change GitHub or will it create space for some new competition?  I
hope so.  I increasingly want to better understand genuine human input and tell
it apart from machine output.  I want to see the prompts and the attempts that
failed along the way.  And then somehow I want to squash and compress it all on
merge, but with a way to retrieve the full history if needed.

### New Kind Of Review

This is related to the version control piece: current code review tools assign
strict role definitions that just don't work with AI.  Take the GitHub code
review UI: I regularly want to use comments on the PR view to leave notes for
my own agents, but there is no guided way to do that.  The review interface
refuses to let me review my own code, I can only comment, but that does not
have quite the same intention.

There is also the problem that an increased amount of code review now happens
between me and my agents locally.  For instance, the Codex code review feature
on GitHub stopped working for me because it can only be bound to one
organization at a time.  So I now use Codex on the command line to do reviews,
but that means a whole part of my iteration cycles is invisible to other
engineers on the team.  That doesn't work for me.

Code review to me feels like it needs to become part of the VCS.

### New Observability

I also believe that observability is up for grabs again.  We now have both the
need and opportunity to take advantage of it on a whole new level.  Most people
were not in a position where they could build their own
[eBPF](https://en.wikipedia.org/wiki/EBPF) programs, but LLMs can.  Likewise,
many observability tools shied away from SQL because of its complexity, but LLMs
are better at it than any proprietary query language.  They can write queries,
they can grep, they can map-reduce, they remote-control LLDB.  Anything that has
some structure and text is suddenly fertile ground for agentic coding tools to
succeed.  I don't know what the observability of the future looks like, but my
strong hunch is that we will see plenty of innovation here.  The better the
feedback loop to the machine, the better the results.

I'm not even sure what I'm asking for here, but I think that one of the
challenges in the past was that many cool ideas for better observability —
specifically dynamic reconfiguration of services for more targeted filtering —
were user-unfriendly because they were complex and hard to use.  But now those
might be the right solutions in light of LLMs because of their increased
capabilities for doing this grunt work.  For instance Python 3.14 landed [an
external debugger
interface](https://docs.python.org/3/whatsnew/3.14.html#whatsnew314-remote-debugging)
which is an amazing capability for an agentic coding tool.

### Working With Slop

This may be a little more controversial, but what I haven't managed this year is
to give in to the machine.  I still treat it like regular software engineering
and review a lot.  I also recognize that an increasing number of people are not
working with this model of engineering but instead completely given in to the
machine.  As crazy as that sounds, I have seen some people be quite successful
with this.  I don't yet know how to reason about this, but it is clear to me
that even though code is being generated in the end, the way of working in that
new world is very different from the world that I'm comfortable with.  And my
suspicion is that because that world is here to stay, we might need some new
social contracts to separate these out.

The most obvious version of this is the increased amount of these types of
contributions to Open Source projects, which are quite frankly an insult to
anyone who is not working in that model.  I find reading such pull requests
quite rage-inducing.

Personally, I've tried to attack this problem with contribution guidelines and
pull request templates.  But this seems a little like a fight against windmills.
This might be something where the solution will not come from changing what
we're doing.  Instead, it might come from vocal people who are also pro-AI
engineering speaking out on what good behavior in an agentic codebase looks
like.  And it is not just to throw up unreviewed code and then have another
person figure the shit out.
