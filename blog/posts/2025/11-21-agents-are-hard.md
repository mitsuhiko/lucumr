---
tags: ['ai']
summary: "My Agent abstractions keep breaking somewhere I don't expect."
---

# Agent Design Is Still Hard

I felt like it might be a good time to write about some new things I've
learned.  Most of this is going to be about building agents, with a little bit
about using agentic coding tools.

TL;DR: Building agents is still messy.  SDK abstractions break once you hit
real tool use.  Caching works better when you manage it yourself, but differs
between models.  Reinforcement ends up doing more heavy lifting than expected,
and failures need strict isolation to avoid derailing the loop.  Shared state
via a file-system-like layer is an important building block.  Output tooling is
surprisingly tricky, and model choice still depends on the task.

## Which Agent SDK To Target?

When you build your own agent, you have the choice of targeting an underlying
SDK like the OpenAI SDK or the Anthropic SDK, or you can go with a higher level
abstraction such as the Vercel AI SDK or Pydantic.  The choice we made a while
back was to adopt the Vercel AI SDK but only the provider abstractions, and to
basically [drive the agent loop
ourselves](https://ai-sdk.dev/cookbook/node/manual-agent-loop).  At this point
[we](https://earendil.com/) would not make that choice again.  There is
absolutely nothing wrong with the Vercel AI SDK, but when you are trying to
build an agent, two things happen that we originally didn't anticipate:

The first is that the differences between models are significant enough that
you will need to build your own agent abstraction.  We have not found any of
the solutions from these SDKs that build the right abstraction for an agent.  I
think this is partly because, despite the basic agent design being just a loop,
there are subtle differences based on the tools you provide.  These differences
affect how easy or hard it is to find the right abstraction (cache control,
different requirements for reinforcement, tool prompts, provider-side tools,
etc.).  Because the right abstraction is not yet clear, using the original SDKs
from the dedicated platforms keeps you fully in control.  With some of these
higher-level SDKs you have to build on top of their existing abstractions,
which might not be the ones you actually want in the end.

We also found it incredibly challenging to work with the Vercel SDK when it
comes to dealing with provider-side tools.  The attempted unification of
messaging formats doesn't quite work.  For instance, the web search tool from
Anthropic routinely destroys the message history with the Vercel SDK, and we
haven't yet fully figured out the cause.  Also, in Anthropic's case, cache
management is much easier when targeting their SDK directly instead of the
Vercel one.  The error messages when you get things wrong are much clearer.

This might change, but right now we would probably not use an abstraction when
building an agent, at least until things have settled down a bit.  The benefits
do not yet outweigh the costs for us.

Someone else might have figured it out.  If you're reading this and think I'm
wrong, please drop me a mail.  I want to learn.

## Caching Lessons

The different platforms have very different approaches to caching.  A lot has
been said about this already, but Anthropic makes you pay for caching.  It
makes you manage cache points explicitly, and this really changes the way you
interact with it from an agent engineering level.  I initially found the manual
management pretty dumb.  Why doesn't the platform do this for me?  But I've
fully come around and now vastly prefer explicit cache management.  It makes
costs and cache utilization much more predictable.

Explicit caching allows you to do certain things that are much harder
otherwise.  For instance, you can split off a conversation and have it run in
two different directions simultaneously.  You also have the opportunity to do
context editing.  The optimal strategy here is unclear, but you clearly have a
lot more control, and I really like having that control.  It also makes it much
easier to understand the cost of the underlying agent.  You can assume much
more about how well your cache will be utilized, whereas with other platforms
we found it to be hit and miss.

The way we do caching in the agent with Anthropic is pretty straightforward.
One cache point is after the system prompt.  Two cache points are placed at the
beginning of the conversation, where the last one moves up with the tail of the
conversation.  And then there is some optimization along the way that you can
do.

Because the system prompt and the tool selection now have to be mostly static,
we feed a dynamic message later to provide information such as the current
time.  Otherwise, this would trash the cache.  We also leverage reinforcement
during the loop much more.

## Reinforcement In The Agent Loop

Every time the agent runs a tool you have the opportunity to not just return
data that the tool produces, but also to feed more information back into the
loop.  For instance, you can remind the agent about the overall objective and
the status of individual tasks.  You can also provide hints about how the tool
call might succeed when a tool fails.  Another use of reinforcement is to
inform the system about state changes that happened in the background.  If you
have an agent that uses parallel processing, you can inject information after
every tool call when that state changed and when it is relevant for completing
the task.

Sometimes it's enough for the agent to self-reinforce.  In Claude Code, for
instance, the todo write tool is a self-reinforcement tool.  All it does is
take from the agent a list of tasks that it thinks it should do and echo out
what came in.  It's basically just an echo tool; it really doesn't do anything
else.  But that is enough to drive the agent forward better than if the only
task and subtask were given at the beginning of the context and too much has
happened in the meantime.

We also use reinforcements to inform the system if the environment changed
during execution in a way that's problematic for the agent.  For instance, if
our agent fails and retries from a certain step forward but the recovery
operates off broken data, we inject a message informing it that it might want
to back off a couple of steps and redo an earlier step.

## Isolate Failures

If you expect a lot of failures during code execution, there is an opportunity
to hide those failures from the context.  This can happen in two ways.  One is
to run tasks that might require iteration individually.  You would run them in
a subagent until they succeed and only report back the success, plus maybe a
brief summary of approaches that did not work.  It is helpful for an agent to
learn about what did not work in a subtask because it can then feed that
information into the next task to hopefully steer away from those failures.

The second option doesn't exist in all agents or foundation models, but with
Anthropic you can do context editing.  So far we haven't had a lot of success
with context editing, but we believe it's an interesting thing we would love to
explore more.  We would also love to learn if people have success with it.
What is interesting about context editing is that you should be able to
preserve tokens for further down the iteration loop.  You can take out of the
context certain failures that didn't drive towards successful completion of the
loop, but only negatively affected certain attempts during execution.  But as
with the point I made earlier: it is also useful for the agent to understand
what didn't work, but maybe it doesn't require the full state and full output
of all the failures.

Unfortunately, context editing will automatically invalidate caches.  There is
really no way around it.  So it can be unclear when the trade-off of doing that
compensates for the extra cost of trashing the cache.

## Sub Agents / Sub Inference

As I mentioned a couple of times on this blog already, most of our agents are
based on code execution and code generation.  That really requires a common
place for the agent to store data.  Our choice is a file system—in our case a
virtual file system—but that requires different tools to access it.  This is
particularly important if you have something like a subagent or subinference.

You should try to build an agent that doesn't have dead ends.  A dead end is
where a task can only continue executing within the sub-tool that you built.
For instance, you might build a tool that generates an image, but is only able
to feed that image back into one more tool.  That's a problem because you might
then want to put those images into a zip archive using the code execution tool.
So there needs to be a system that allows the image generation tool to write
the image to the same place where the code execution tool can read it.  In
essence, that's a file system.

Obviously it has to go the other way around too.  You might want to use the
code execution tool to unpack a zip archive and then go back to inference to
describe all the images so that the next step can go back to code execution and
so forth.  The file system is the mechanism that we use for that.  But it does
require tools to be built in a way that they can take file paths to the virtual
file system to work with.

So basically an `ExecuteCode` tool would have access to the same file system as
the `RunInference` tool which could take a `path` to a file on that same
virtual file system.

## The Use Of An Output Tool

One interesting thing about how we structured our agent is that it does not
represent a chat session.  It will eventually communicate something to the user
or the outside world, but all the messages that it sends in between are usually
not revealed.  The question is: how does it create that message?  We have one
tool which is the output tool.  The agent uses it explicitly to communicate to
the human.  We then use a prompt to instruct it when to use that tool.  In our
case the output tool sends an email.

But that turns out to pose a few other challenges.  One is that it's
surprisingly hard to steer the wording and tone of that output tool compared to
just using the main agent loop's text output as the mechanism to talk to the
user.  I cannot say why this is, but I think it's probably related to how these
models are trained.

One attempt that didn't work well was to have the output tool run another quick
LLM like Gemini 2.5 Flash to adjust the tone to our preference.  But this
increases latency and actually reduces the quality of the output.  In part, I
think the model just doesn't word things correctly and the subtool doesn't have
sufficient context.  Providing more slices of the main agentic context into the
subtool makes it expensive and also didn't fully solve the problem.  It also
sometimes reveals information in the final output that we didn't want to be
there, like the steps that led to the end result.

Another problem with an output tool is that sometimes it just doesn't call the
tool.  One of the ways in which we're forcing this is we remember if the output
tool was called.  If the loop ends without the output tool, we inject a
reinforcement message to encourage it to use the output tool.

## Model Choice

Overall our choices for models haven't dramatically changed so far.  I think
Haiku and Sonnet are still the best tool callers available, so they make for
excellent choices in the agent loop.  They are also somewhat transparent with
regards to what the RL looks like.  The other obvious choices are the Gemini
models.  We so far haven't found a ton of success with the GPT family of models
for the main loop.

For the individual sub-tools, which in part might also require inference, our
current choice is Gemini 2.5 if you need to summarize large documents or work
with PDFs and things like that.  That is also a pretty good model for
extracting information from images, in particular because the Sonnet family of
models likes to run into a safety filter which can be annoying.

There's also probably the very obvious realization that token cost alone
doesn't really define how expensive an agent.  A better tool caller will do the
job in fewer tokens.  There are some cheaper models available than sonnet
today, but they are not *necessarily* cheaper in a loop.

But all things considered, not that much has changed in the last couple of
weeks.

## Testing and Evals

We find testing and evals to be the hardest problem here.  This is not entirely
surprising, but the agentic nature makes it even harder.  Unlike prompts, you
cannot just do the evals in some external system because there's too much you
need to feed into it.  This means you want to do evals based on observability
data or instrumenting your actual test runs.  So far none of the solutions we
have tried have convinced us that they found the right approach here.
Unfortunately, I have to report that at the moment we haven't found something
that really makes us happy.  I hope we're going to find a solution for this
because it is becoming an increasingly frustrating aspect of building an agent.

## Coding Agent Updates

As for my experience with coding agents, not really all that much has changed.
The main new development is that I'm trialing [Amp](https://ampcode.com/) more.
In case you're curious why: it's not that it's objectively a better agent than
what I'm using, but I really quite like the way they're thinking about agents
from what they're posting.  The interactions of the different sub agents like
the Oracle with the main loop is beautifully done, and not many other harnesses
do this today.  It's also a good way for me to validate how different agent
designs work.  Amp, similar to Claude Code, really feels like a product built
by people who also use their own tool.  I do not feel every other agent in the
industry does this.

## Quick Stuff I Read And Found

That's just a random assortment of things that I feel might also be worth
sharing:

* [What if you don't need MCP at
  all?](https://mariozechner.at/posts/2025-11-02-what-if-you-dont-need-mcp/):
  Mario argues that many MCP servers are overengineered and include large
  toolsets that consume lots of context.  He proposes a minimalist approach for
  browser-agent use-cases by relying on simple CLI tools (e.g., start, navigate,
  evaluate JS, screenshot) executed via Bash, which keeps token usage small and
  workflows flexible.  I [built a Claude/Amp Skill out of
it](https://github.com/mitsuhiko/agent-commands/tree/main/skills/web-browser).
* [The fate of "small" open
  source](https://nolanlawson.com/2025/11/16/the-fate-of-small-open-source/):
  The author argues that the age of tiny, single-purpose open-source libraries is
  coming to an end, largely because built-in platform APIs and AI tools can now
  generate simple utilities on demand.  [Thank fucking
god](https://lucumr.pocoo.org/2025/1/24/build-it-yourself/).
* [Tmux is love](https://x.com/mitsuhiko/status/1991997262810218983).  There is
  no article that goes with it, but the TLDR is that Tmux is great.  If you
  have anything that remotely looks like an interactive system that an agent
  should work with, you should [give it some Tmux
  skills](https://github.com/mitsuhiko/agent-commands/tree/main/skills/tmux).
