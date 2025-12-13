---
tags: [ai, thoughts]
summary: "Some findings of using Skills and the loadout pattern with MCP."
---

# Skills vs Dynamic MCP Loadouts

I've been moving all my MCPs to skills, including the remaining one I still
used: the Sentry MCP[^1].  Previously I had already moved entirely away from
Playwright to a Playwright skill.

In the last month or so there have been discussions about using [dynamic tool
loadouts](https://www.anthropic.com/engineering/advanced-tool-use) to defer
loading of tool definitions until later.  Anthropic has also been toying around
with the idea of wiring together MCP calls via code, something [I have
experimented with](/2025/7/3/tools/).

I want to share my updated findings with all of this and why the deferred tool
loading that Anthropic came up with does not fix my lack of love for MCP.  Maybe
they are useful for someone else.

## What is a Tool?

When the agent encounters a tool definition through reinforcement learning or
otherwise, it is encouraged to emit tool calls through special tokens when it
encounters a situation where that tool call would be appropriate.  For all
intents and purposes, tool definitions can only appear between special tool
definition tokens in a system prompt.  Historically this means that you cannot
emit tool definitions later in the conversation state.  So your only real option
is for a tool to be loaded when the conversation starts.

In agentic uses, you can of course compress your conversation state or change
the tool definitions in the system message at any point.  But the consequence is
that you will lose the reasoning traces and also the cache.  In the case of
Anthropic, for instance, this will make your conversation significantly more
expensive.  You would basically start from scratch and pay full token rates plus
cache write cost, compared to cache read.

One recent innovation from Anthropic is deferred tool loading.  You still
declare tools ahead of time in the system message, but they are not injected
into the conversation when the initial system message is emitted.  Instead they
appear at a later point.  The tool definitions however still have to be static
for the entire conversation, as far as I know.  So the tools that could exist
are defined when the conversation starts.  The way Anthropic discovers the tools
is purely by regex search.

## Contrasting with Skills

This is all quite relevant because even though MCP with deferred loading feels
like it should perform better, it actually requires quite a bit of engineering
on the LLM API side.  The skill system gets away without any of that and, at
least from my experience, still outperforms it.

Skills are really just short summaries of which skills exist and in which file
the agent can learn more about them.  These are proactively loaded into the
context.  So the agent understands in the system context (or maybe somewhere
later in the context) what capabilities it has and gets a link to the manual for
how to use them.

Crucially, skills do not actually load a tool definition into the context.  The
tools remain the same: bash and the other tools the agent already has.  All it
learns from the skill are tips and tricks for how to use these tools more
effectively.

Because the main thing it learns is how to use other command line tools and
similar utilities, the fundamentals of how to chain and coordinate them together
do not actually change.  The reinforcement learning that made the Claude family
of models very good tool callers just helps with these newly discovered tools.

## MCP as Skills?

So that obviously raises the question: if skills work so well, can I move the
MCP outside of the context entirely and invoke it through the CLI in a similar
way as Anthropic proposes?  The answer is yes, you can, but it doesn't work
well.  One option here is Peter Steinberger's
[mcporter](https://github.com/steipete/mcporter).  In short, it reads the
`.mcp.json` files and exposes the MCPs behind it as callable tools:

```
npx mcporter call 'linear.create_comment(issueId: "ENG-123", body: "Looks good!")'
```

And yes, it looks very much like a command line tool that the LLM can invoke.
The problem however is that the LLM does not have any idea about what tools are
available, and now you need to teach it that.  So you might think: why not make
some skills that teach the LLM about the MCPs?  Here the issue for me comes from
the fact that MCP servers have no desire to maintain API stability.  They are
increasingly starting to trim down tool definitions to the bare minimum to
preserve tokens.  This makes sense, but for the skill pattern it's not what you
want.  For instance, the Sentry MCP server at one point switched the query
syntax entirely to natural language.  A great improvement for the agent, but my
suggestions for how to use it became a hindrance and I did not discover the
issue straight away.

This is in fact quite similar to Anthropic's deferred tool loading: there is no
information about the tool in the context at all.  You *need* to create a
summary.  The eager loading of MCP tools we have done in the past now has ended
up with an awkward compromise: the description is both too long to eagerly load
it, and too short to really tell the agent how to use it.  So at least
from my experience, you end up maintaining these manual skill summaries for MCP
tools exposed via mcporter or similar.

## Path Of Least Resistance

This leads me to my current conclusion: I tend to go with what is easiest, which
is to ask the agent to write its own tools as a skill.  Not only does it not
take all that long, but the biggest benefit is that the tool is largely under my
control.  Whenever it breaks or needs some other functionality, I ask the agent
to adjust it.  The Sentry MCP is a great example.  I think it's probably one of
the better designed MCPs out there, but I don't use it anymore.  In part because
when I load it into the context right away I lose around 8k tokens out of the
box, and I could not get it to work via mcporter.  On the other hand, I have
Claude maintain a skill for me.  And yes, that skill is probably quite buggy and
needs to be updated, but because the agent maintains it, it works out better.

It's quite likely that all of this will change, but at the moment manually
maintained skills and agents writing their own tools have become my preferred
way.  I suspect that dynamic tool loading with MCP will become a thing, but it
will probably quite some protocol changes to bring in skill-like summaries and
built-in manuals for the tools.  I also suspect that MCP would greatly benefit
of protocol stability.  The fact that MCP servers keep changing their tool
descriptions at will does not work well with materialized calls and external
tool descriptions in READMEs and skill files.

[^1]: Keen readers will remember that last time, the last MCP I used was
    Playwright.  In the meantime I added and removed two more MCPs: Linear and
    Sentry, mostly because of authentication issues and neither having a great
    command line interface.
