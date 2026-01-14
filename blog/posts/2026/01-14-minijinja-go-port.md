---
tags: ['go', 'rust', 'ai']
summary: "Agents can now port code bases much better than before."
---

# Porting MiniJinja to Go With an Agent

Turns out you can just port things now.  I already attempted this experiment in
the summer, but it turned out to be a bit too much for what I had time for.
However, things have advanced since.  Yesterday I ported
[MiniJinja](https://github.com/mitsuhiko/minijinja) (a Rust Jinja2 template
engine) to native Go, and I used an agent to do pretty much all of the work.  In
fact, I barely did anything beyond giving some high-level guidance on how I
thought it could be accomplished.

In total I probably spent around 45 minutes actively with it.  It worked for
around 3 hours while I was watching, then another 7 hours alone.  This post is a
recollection of what happened and what I learned from it.

All prompting was done by voice using [pi](https://buildwithpi.ai/), starting
with Opus 4.5 and switching to GPT-5.2 Codex for the long tail of test fixing.

- [PR #854](https://github.com/mitsuhiko/minijinja/pull/854)
- [Pi session transcript](https://shittycodingagent.ai/session/?29f75b708237ceead8b1c8cb55ea2305)
- [Narrated video of the porting session](https://www.youtube.com/watch?v=rqzY8Adxxns)

## What is MiniJinja

MiniJinja is a re-implementation of Jinja2 for Rust. I originally wrote it
because I wanted to do a infrastructure automation project in Rust and Jinja was
popular for that.  The original project didn't go anywhere, but MiniJinja itself
continued being useful for both me and other users.

The way MiniJinja is tested is with snapshot tests: inputs and expected outputs,
using [insta](https://insta.rs/) to verify they match.  These snapshot tests were
what I wanted to use to validate the Go port.

## Test-Driven Porting

My initial prompt asked the agent to figure out how to validate the port.
Through that conversation, the agent and I aligned on a path: reuse the existing
Rust snapshot tests and port incrementally (lexer -> parser -> runtime).

This meant the agent built Go-side tooling to:

- Parse Rust's test input files (which embed settings as JSON headers).
- Parse the reference insta `.snap` snapshots and compare output.
- Maintain a skip-list to temporarily opt out of failing tests.

This resulted in a pretty good harness with a tight feedback loop.  The agent had
a clear goal (make everything pass) and a progression (lexer -> parser ->
runtime).  The tight feedback loop mattered particularly at the end where it was
about getting details right.  Every missing behavior had one or more failing
snapshots.

## Branching in Pi

I used Pi's branching feature to structure the session into phases.  I rewound
back to earlier parts of the session and used the branch switch feature to
inform the agent automatically what it had already done.  This is similar to
compaction, but Pi shows me what it puts into the context.  When Pi switches
branches it does two things:

1. It stays in the same session so I can navigate around, but it makes a new
   branch off an earlier message.
2. When switching, it adds a summary of what it did as a priming message into
   where it branched off.  I found this quite helpful to avoid the agent doing
   vision quests from scratch to figure out how far it had already gotten.

Without switching branches, I would probably just make new sessions and have
more plan files lying around or use something like Amp's handoff feature which
also allows the agent to consult earlier conversations if it needs more
information.

## First Signs of Divergence

What was interesting is that the agent went from literal porting to behavioral
porting quite quickly.  I didn't steer it away from this as long as the behavior
aligned.  I let it do this for a few reasons.  First, the code base isn't that
large, so I felt I could make adjustments at the end if needed.  Letting the
agent continue with what was already working felt like the right strategy.
Second, it was aligning to idiomatic Go much better this way.

For instance, on the runtime it implemented a tree-walking interpreter (not a
bytecode interpreter like Rust) and it decided to use Go's reflection for the
value type.  I didn't tell it to do either of these things, but they made more
sense than replicating my Rust interpreter design, which was partly motivated by
not having a garbage collector or runtime type information.

## Where I Had to Push Back

On the other hand, the agent made some changes while making tests pass that I
disagreed with.  It completely gave up on all the "must fail" tests because the
error messages were impossible to replicate perfectly given the runtime
differences.  So I had to steer it towards fuzzy matching instead.

It also wanted to regress behavior I wanted to retain (e.g., exact HTML escaping
semantics, or that `range` must return an iterator).  I think if I hadn't steered
it there, it might not have made it to completion without going down problematic
paths, or I would have lost confidence in the result.

## Grinding to Full Coverage

Once the major semantic mismatches were fixed, the remaining work was filling
in all missing pieces: missing filters and test functions, loop extras, macros,
call blocks, etc.  Since I wanted to go to bed, I switched to Codex 5.2 and
queued up a few "continue making all tests pass if they are not passing yet"
prompts, then let it work through compaction.  I felt confident enough that the
agent could make the rest of the tests pass without guidance once it had the
basics covered.

This phase ran without supervision overnight.

## Final Cleanup

After functional convergence, I asked the agent to document internal functions
and reorganize (like moving filters to a separate file).  I also asked it to
document all functions and filters like in the Rust code base.  This was also
when I set up CI, release processes, and talked through what was created to come
up with some finalizing touches before merging.

## Parting Thoughts

There are a few things I find interesting here.

First: these types of ports are possible now.  I know porting was already
possible for many months, but it required much more attention.  This changes some
dynamics.  I feel less like technology choices are constrained by ecosystem lock-in.
Sure, porting NumPy to Go would be a more involved undertaking, and getting it
competitive even more so (years of optimizations in there).  But still, it feels
like many more libraries can be used now.

Second: for me, the value is shifting from the code to the tests and
documentation.  A good test suite might actually be worth more than the code.
That said, this isn't an argument for keeping tests secret -- generating tests
with good coverage is also getting easier.  However, for keeping code bases in
different languages in sync, you need to agree on shared tests, otherwise
divergence is inevitable.

Lastly, there's the social dynamic.  Once, having people port your code to other
languages was something to take pride in.  It was a sign of accomplishment -- a
project was "cool enough" that someone put time into making it available
elsewhere.  With agents, it doesn't invoke the same feelings.  Will McGugan
[also called out this
change](https://bsky.app/profile/willmcgugan.bsky.social/post/3mccn3l4qdk26).

## Session Stats

Lastly, some boring stats for the main session:

- Agent run duration: ~10 hours (~3 hours supervised)
- Active human time: ~45 minutes
- Total messages: 2,698
- My prompts: 34
- Tool calls: 1,386
- Raw API token cost: $60
- Total tokens: 2.2 million
- Models: `claude-opus-4-5` and `gpt-5.2-codex` for the unattended overnight run

This did not count the adding of doc strings and smaller fixups.
