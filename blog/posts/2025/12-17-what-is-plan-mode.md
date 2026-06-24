---
tags: [ai]
summary: "What I learned about plan mode as a non-plan mode user who plans."
---

# What Actually Is Claude Code's Plan Mode?

I've mentioned this a few times now, but when I started using Claude it was
because [Peter](https://x.com/steipete/) got me hooked on it.  From the very
beginning I became a religious user of what is colloquially called YOLO mode,
which basically gives the agent all the permissions so I can just watch it do
its stuff.

One consequence of YOLO mode though is that it didn't work well together with
the plan mode that Claude Code had.  In the beginning it didn't inherit all the
tool permissions, so in plan mode it actually asked for approval all the time.
I found this annoying and as a result I never really used plan mode.

Since I haven't been using it, I ended up with other approaches.  I've talked
about this before, but it's a version of iterating together with the agent on
creating a form of handoff in the form of a markdown file.  My approach has
been getting the agent to ask me clarifying questions, taking these questions
into an editor, answering them, and then doing a bunch of iterations until I'm
decently happy with the end result.

That has been my approach and I thought that this was pretty popular these days.
For instance Mario's [pi](https://shittycodingagent.ai/) which I also use, does
not have a plan mode and Amp is [removing
theirs](https://x.com/beyang/status/2001150592480313425).

However today I had two interesting conversations with people who really like
plan mode.  As a non-user of plan mode, I wanted to understand how it works.  So
I specifically looked at the Claude Code implementation to understand what it
does, how it prompts the agent, and how it steers the client.  I wanted to use
the tool loop just to get a better understanding of what I'm missing out on.

This post is basically just what I found out about how it works, and maybe it's
useful to someone who also does not use plan mode and wants to know what it
actually does.

## Plan Mode in Claude Code

First we need to agree on what a plan is in Claude Code.  A plan in Claude Code
is effectively a markdown file that is written into Claude's plans folder by
Claude in plan mode.  The generated plan doesn't have any extra structure beyond
text.  So at least up to that point, there really is not much of a difference
between you asking it to write a markdown file or it creating its own internal
markdown file.

There are however some other major differences.  One is that there are recurring
prompts to remind the agent that it's in read-only mode.  The tools for writing
files through the agent's built-in tools are actually still there.  It has a
little state machine going on to enter and exit plan mode that it can use.
Interestingly, it seems like the edit file tool is actually used to manipulate
the plan file.  So the agent is seemingly editing its own plan file!

Because plan mode is also a tool (or at least the entering and exiting plan mode
is), the agent can enter it itself.  This has the same effect as if you were to
press shift+tab. [^1]

To encourage the agent to write the plan file, there is a custom prompt injected
when you enter it.  There is no other enforcement from what I can tell.  Other
agents might do this differently.

When exiting plan mode it will read the plan file that it wrote to disk and then
start working off that.  So the path towards spec in the prompt always goes via
the file system.

## Can You Plan Mode Without Plan Mode?

This obviously raises the question: if the differences are not that significant
and it is just "the prompt" and some workflow around it, how much would you
have to write into the prompt yourself to get very similar behavior to what the
plan mode in Claude Code does?

From a user experience point of view, you basically get two things.

1. You get a markdown file, but you never get to see it because it's hidden away
   in a folder.  I would argue that putting it into a specific file has some
   benefits because you can edit it.
2. However there is something which you can't really replicate and that is that
   plan mode at the end comes with a prompt to the user.  That user interface
   you cannot bring up trivially because there is no way to bring it up without
   going through the exit plan mode flow, which requires the file to be in a
   specific location.

But if we ignore those parts and say that we just want similar behavior to what
plan mode does from prompting alone, how much prompt do we have to write?  What
specifically is the delta of entering plan mode versus just writing stuff into
the context manually?

## The Prompt Differences

When entering plan mode a bunch of stuff is thrown into the context in addition
to the system prompt.  I don't want to give the entire prompt here verbatim
because it's a little bit boring, but I want to break it down by roughly what it
sends.

The first thing it sends is general information that is now in plan mode which
is read-only:

> Plan mode is active. The user indicated that they do not want you to execute
> yet -- you MUST NOT make any edits (with the exception of the plan file
> mentioned below), run any non-readonly tools (including changing configs or
> making commits), or otherwise make any changes to the system.  This supersedes
> any other instructions you have received.

Then there's a little bit of stuff about how it should read and edit the plan
mode file, but this is mostly just to ensure that it doesn't create new plan
files.  Then it sets up workflow suggestions of how plans should be structured:

> ### Phase 1: Initial Understanding
>
> Goal: Gain a comprehensive understanding of the user's request by reading
> through code and asking them questions.
>
> 1. Focus on understanding the user's request and the code associated with
>    their request
>
> 2. (Instructions here about parallelism for tasks)
>
> ### Phase 2: Design
>
> Goal: Design an implementation approach.
>
> (Some tool instructions)
>
> In the agent prompt:
>
> - Provide comprehensive background context from Phase 1 exploration including
>   filenames and code path traces
> - Describe requirements and constraints
> - Request a detailed implementation plan
>
> ### Phase 3: Review
> Goal: Review the plan(s) from Phase 2 and ensure alignment with the user's intentions.
>
> 1. Read the critical files identified by agents to deepen your understanding
> 2. Ensure that the plans align with the user's original request
> 3. Use TOOL_NAME to clarify any remaining questions with the user
>
> ### Phase 4: Final Plan
> Goal: Write your final plan to the plan file (the only file you can edit).
> - Include only your recommended approach, not all alternatives
> - Ensure that the plan file is concise enough to scan quickly, but detailed
>   enough to execute effectively
> - Include the paths of critical files to be modified

I actually thought that there would be more to the prompt than this.  In
particular, I was initially under the assumption that the tools actually turn
into read-only.  But it is just prompt reinforcement that changes the behavior
of the tools and also which tools are available.  It is in fact just a rather
short predefined prompt that enters plan mode.  The tool to enter or exit plan
mode is always available, and the same is true for edit and read files.  The
exiting of the plan mode tool has a description that instructs the agent to
understand when it's done planning:

> Use this tool when you are in plan mode and have finished writing your plan to
> the plan file and are ready for user approval.
>
> ### How This Tool Works
> - You should have already written your plan to the plan file specified in the
>   plan mode system message
> - This tool does NOT take the plan content as a parameter - it will read the
>   plan from the file you wrote
> - This tool simply signals that you're done planning and ready for the user to
>   review and approve
> - The user will see the contents of your plan file when they review it
> 
> ### When to Use This Tool IMPORTANT: Only use this tool when the task requires
> planning the implementation steps of a task that requires writing code. For
> research tasks where you're gathering information, searching files, reading
> files or in general trying to understand the codebase - do NOT use this tool.
> 
> ### Handling Ambiguity in Plans Before using this tool, ensure your plan is
> clear and unambiguous. If there are multiple valid approaches or unclear
> requirements

So the system prompt is the same.  It is just a little bit of extra verbiage
with some UX around it.  Given the length of the prompt, you can probably have
a slash-command that just copy/pastes a version of this prompt into the context
but you will not get the UX around it.

The thing I took from this prompt is recommendations about how to use the
subtasks and some examples.  I'm actually not sure if that has a meaningful
impact on how it's done because at least from the limited testing that I did, I
don't observe much of a difference for how plan mode invokes tools versus how
regular execution invokes tools but it's quite possible, that this comes down to
my prompting styles.

## Why Does It Matter?

So you might ask why I even write about plan mode.  The main motivation is that
I am always quite interested in where the user experience in an agentic tool has
to be enforced by the harness versus when that user experience comes naturally
from the model.

Plan mode as it exists in Claude has this sort of weirdness in my mind where it
doesn't come quite natural to me.  It might come natural to others!  But why can
I not just ask the model to plan with me?  Why do I have to switch the user
interface into a different mode?  Plan mode is just one of many examples where I
think that because we are already so used to writing or talking to machines,
bringing in more complexity in the user interface takes away some of the magic.
I always want to look into whether just working with the model can accomplish
something similar enough that I don't actually need to have another user
interaction or a user interface that replicates something that natural language
could potentially do.

This is particularly true because my workflow involves wanting to double check
what these plans are, to edit them, and to manipulate them.  I feel like I'm
more in control of that experience if I have a file on disk somewhere that I
can see, that I can read, that I can review, that I can edit before actually
acting on it.  The Claude integrated user experience is just a little bit too
far away from me to feel natural.  I understand that other people might have
different opinions on this, but for me that experience really was triggered by
the thought that if people have such a great experience with plan mode, I want
to understand what I'm missing out on.

And now I know: It's mostly a custom prompt to give it structure, and some system
reminders and a handful of examples.

[^1]: This incidentally is also why it's possible for the plan mode
    confirmation screen to come up with an error message, that [there is no
plan](https://x.com/mitsuhiko/status/1997983563891818736) unprompted.
