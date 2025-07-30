---
tags: [thoughts, ai, vibecoding]
summary: Some of my attempts to make agents work better that just didn't work.
---

# Agentic Coding Things That Didn't Work

Using Claude Code and other agentic coding tools has become all the rage.  Not
only is it getting [millions of
downloads](https://npmtrends.com/@anthropic-ai/claude-code-vs-@sentry/react),
but these tools are also gaining features that help streamline workflows.  As
you know, [I got very excited](/2025/6/4/changes/) about agentic coding in May,
and I've tried many of the new features that have been added.  I've spent
considerable time exploring everything on my plate.

But oddly enough, very little of what I attempted I ended up sticking with.
Most of my attempts didn't last, and I thought it might be interesting to share
what didn't work.  This doesn't mean these approaches won't work or are bad
ideas; it just means I didn't manage to make them work.  Maybe there's
something to learn from these failures for others.

## Rules of Automation

The best way to think about the approach that I use is:

1. I only automate things that I do regularly.
2. If I create an automation for something that I do regularly, but then I stop
   using the automation, I consider it a failed automation and I delete it.

Non-working automations turn out to be quite common.  Either I can't get myself
to use them, I forget about them, or I end up fine-tuning them endlessly.  For
me, deleting a failed workflow helper is crucial.  You don't want unused Claude
commands cluttering your workspace and confusing others.

So I end up doing the simplest thing possible most of the time: just talk to
the machine more, give it more context, keep the audio input going, and dump my
train of thought into the prompt.  And that is 95% of my workflow.  The rest might
be good use of copy/paste.

## Slash Commands

Slash commands allow you to preload prompts to have them readily available in a
session.  I expected these to be more useful than they ended up being.  I do
use them, but many of the ones that I added I ended up never using.

There are some limitations with slash commands that make them less useful than
they could be.  One limitation is that there's only one way to pass arguments,
and it's unstructured.  This proves suboptimal in practice for my uses.
Another issue I keep running into with Claude Code is that if you do use a
slash command, the argument to the slash command for some reason [does not
support file-based
autocomplete](https://github.com/anthropics/claude-code/issues/818).

To make them work better, I often ask Claude to use the current Git state to
determine which files to operate on.  For instance, I have a command in this
blog that fixes grammar mistakes.  It operates almost entirely from the current
git status context because providing filenames explicitly is tedious without
autocomplete.

Here is one of the few slash commands I actually do use:

```markdown
## Context

- git status: !`git status`
- Explicitly mentioned file to fix: "$ARGUMENTS"

## Your task

Based on the above information, I want you to edit the mentioned file or files
for grammar mistakes.  Make a backup (eg: change file.md to file.md.bak) so I
can diff it later.  If the backup file already exists, delete it.

If a blog post was explicitly provided, edit that; otherwise, edit the ones
that have pending changes or are untracked.
```

My workflow now assumes that Claude can determine which files I mean from the
Git status virtually every time, making explicit arguments largely unnecessary.

Here are some of the many slash commands that I built at one point but ended
up not using:

* `/fix-bug`: I had a command that instructed Claude to fix bugs by pulling
  issues from GitHub and adding extra context. But I saw no meaningful
  improvement over simply mentioning the GitHub issue URL and voicing my
  thoughts about how to fix it.
* `/commit`: I tried getting Claude to write good commit messages, but
  they never matched my style. I stopped using this command, though I haven't
  given up on the idea entirely.
* `/add-tests`: I really hoped this would work. My idea was to have Claude
  skip tests during development, then use an elaborate reusable prompt to
  generate them properly at the end. But this approach wasn't consistently better
  than automatic test generation, which I'm still not satisfied with overall.
* `/fix-nits`: I had a command to fix linting issues and run formatters.
  I stopped using it because it never became muscle memory, and Claude
  already knows how to do this. I can just tell it "fix lint" in the
  CLAUDE.md file without needing a slash command.
* `/next-todo`: I track small items in a to-do.md file
  and had a command to pull the next item and work on it. Even
  here, workflow automation didn't help much.
  I use this command far less than expected.

So if I'm using fewer slash commands, what am I doing instead?

1. Speech-to-text.  Cannot stress this enough but talking to the machine means
   you're more likely to share more about what you want it to do.
2. I maintain some basic prompts and context for copy-pasting at the end or the
   beginning of what I entered.

Copy/paste is really, really useful because of how fuzzy LLMs are.  For
instance, I maintain link collections that I paste in when needed.  Sometimes I
fetch files proactively, drop them into a git-ignored folder, and mention them.
It's simple, easy, and effective.  You still need to be somewhat selective to
avoid polluting your context too much, but compared to having it spelunk in the wrong
places, more text doesn't harm as much.

## Hooks

I tried hard to make hooks work, but I haven't seen any efficiency gains from
them yet.  I think part of the problem is that I use yolo mode.  I wish hooks
could actually manipulate what gets executed.  The only way to guide Claude
today is through denies, which don't work in yolo mode.  For instance, I tried
using hooks to make it use uv instead of regular Python, but I was unable to do
so.  Instead, I ended up preloading executables on the PATH that override the
default ones, steering Claude toward the right tools.

For instance, this is really my hack for making it use `uv run python` instead
of `python` more reliably:

```sh
#!/bin/sh
echo "This project uses uv, please use 'uv run python' instead."
exit 1
```

I really just have a bunch of these in `.claude/interceptors` and preload that
folder onto `PATH` before launching Claude:

```sh
CLAUDE_BASH_MAINTAIN_PROJECT_WORKING_DIR=1 \
    PATH="`pwd`/.claude/interceptors:${PATH}" \
    claude --dangerously-skip-permissions
```

I also found it hard to hook into the right moment.  I wish I could run
formatters at the end of a long edit session.  Currently, you must run
formatters after each Edit tool operation, which often forces Claude to re-read
files, wasting context. Even with the Edit tool hook, I'm not sure if I'm
going to keep using it.

I'm actually really curious whether people manage to get good use out of hooks.
I've seen some discussions on Twitter that suggest there are some really good
ways of making them work, but I just went with much simpler solutions instead.

## Claude Print Mode

I was initially very bullish on Claude's print mode.  I tried hard to have
Claude generate scripts that used print mode internally.  For instance, I had
it create a mock data loading script — mostly deterministic code with a
small inference component to generate test data using Claude Code. 

The challenge is achieving reliability, which hasn't worked well for me yet.
Print mode is slow and difficult to debug.  So I use it far less than I'd like,
despite loving the concept of mostly deterministic scripts with small inference
components.  Whether using the Claude SDK or the command-line print flag, I
haven't achieved the results I hoped for. 

I'm drawn to Print Mode because inference is too much like a slot machine.
Many programming tasks are actually quite rigid and deterministic.  We love
linters and formatters because they're unambiguous.  Anything we can fully
automate, we should.  Using an LLM for tasks that don't require inference is
the wrong approach in my book.

That's what makes print mode appealing.  If only it worked better.  Use
an LLM for the commit message, but regular scripts for the commit and gh pr
commands.  Make mock data loading 90% deterministic with only 10% inference.

I still use it, but I see more potential than I am currently leveraging.

## Sub Tasks and Sub Agents

I use the task tool frequently for basic parallelization and context isolation.
Anthropic recently launched an agents feature meant to streamline this process,
but I haven't found it easier to use.

Sub-tasks and sub-agents enable parallelism, but you must be careful.  Tasks
that don't parallelize well — especially those mixing reads and writes — create
chaos.  Outside of investigative tasks, I don't get good results.  While
sub-agents should preserve context better, I often get better results by
starting new sessions, writing thoughts to Markdown files, or even switching to
o3 in the chat interface.

## Does It Help?

What's interesting about workflow automation is that without rigorous rules
that you consistently follow as a developer, simply taking time to talk to the
machine and give clear instructions outperforms elaborate pre-written prompts.

For instance, I don't use emojis or commit prefixes.  I don't enforce templates
for pull requests either.  As a result, there's less structure for me to teach
the machine.

I also lack the time and motivation to thoroughly evaluate all my created
workflows.  This prevents me from gaining confidence in their value.

Context engineering and management remain major challenges.  Despite my efforts
to help agents pull the right data from various files and commands, they don't
yet succeed reliably.  They pull in too much or too little.  Long sessions lead
to forgotten context from the beginning.  Whether done manually or with slash
commands, the results feel too random.  It's hard enough with ad-hoc
approaches, but static prompts and commands make it even harder.

The rule I have now is that if I do want to automate something, I must have done it a
few times already, and then I evaluate whether the agent gets any better results
through my automation.  There's no exact science to it, but I mostly measure
that right now by letting it do the same task three times and looking at the variance
manually as measured by: would I accept the result.

## Keeping The Brain On

Forcing myself to evaluate the automation has another benefit: I'm less likely to
just blindly assume it helps me.

Because there is a big hidden risk with automation through LLMs: it encourages
mental disengagement.  When you stop thinking like an engineer, quality drops,
time gets wasted and you don't understand and learn.  LLMs are already bad
enough as they are, but whenever I lean in on automation I notice that it
becomes even easier to disengage.  I tend to overestimate the agent's
capabilities with time.  There are real dragons there!

You can still review things as they land, but it becomes increasingly harder to
do so later.  While LLMs are reducing the cost of refactoring, the cost doesn't
drop to zero, and regressions are common.
