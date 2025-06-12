public: yes
tags: [thoughts, ai]
summary: Current recommendations of agentic coding.

Agentic Coding Recommendations
==============================

There is currently an explosion of people sharing their experiences with
agentic coding.  After my last `two </2025/6/4/changes/>`__ `posts
</2025/6/10/genai-criticism/>`__ on the topic, I received quite a few
questions about my own practices.  So, here goes nothing.

Preface
-------

For all intents and purposes, here's what I do: I predominently use
`Claude Code <https://www.anthropic.com/claude-code>`__ with the cheaper
Max subscription for $100 a month [1]_.  That works well for several
reasons:

* I exclusively use the cheaper Sonnet model. It's perfectly adequate for
  my needs, and in fact, I prefer its outputs over the more expensive Opus
  model.
* I optimize my tool usage to be token efficient. I avoid screenshots and
  browser interactions wherever possible.  More on that later.

My general workflow involves assigning a job to an agent (which
effectively has full permissions) and then waiting for it to complete the
task.  I rarely interrupt it, unless it's a small task.  Consequently, the
role of the IDE — and the role of AI in the IDE — is greatly diminished;
I mostly use it for final edits.  This approach has even revived my usage
of Vim, which lacks AI integration.

One caveat: I expect this blog post to age very poorly.  The pace of
innovation here is insane; what was true a month ago barely holds true
today.  That's why I'm sticking to concepts I believe have staying power.

If you want to a small session of me working on an Open Source library
with it, I have `a recording you can watch <https://www.youtube.com/watch?v=sQYXZCUvpIc>`__.

The Basics
----------

I disable all permission checks.  Which basically means I run ``claude
--dangerously-skip-permissions``.  More specifically I have an alias
called `claude-yolo` set up.  Now you can call that irresponsible and
there are definitely risks with it, but you can manage those risks with
moving your dev env into docker.  I will however say that if you can watch
it do its thing a bit, it even works surprisingly well without
dockerizing.  YMMV.

MCP.  This is a term you cannot avoid.  It basically is a standardized
protocol to give agents access to more tools.  Honestly: at this point I
barely use it, but I do use it.  The reason I barely use it is because
Claude Code is very capable of just running regular tools.  So MCP for me
is really only needed if I need to give Claude access to something that
finds too hard to use otherwise.  A good example for this is the
`playwright-mcp <https://github.com/microsoft/playwright-mcp>`__ for
browser automation.  I use it because I haven't found anything better yet.
But for instance when I want my agent to poke around in my database, I
just uses whatever it finds to be available.  In my case it loves to use
`psql` and that's more than good enough.

In general I really only start using MCP if the alternative is too
unreliable.  That's because MCP servers themselves are sometimes not super
reliable and they are an extra thing that can go wrong.  Trying to keep
things very simple.  My custom tools are normal scripts that it just runs.

Choice Of Language
------------------

I've evaluated agent performance across different languages my workload,
and if you can choose your language, I strongly recommend Go for new
backend projects.  Several factors strongly favor Go:

* **Context system:** Go provides a capable copy-on-write data bag that
  explicitly flows through the code execution path, similar to contextvars
  in Python or .NET's execution context.  Its explicit nature greatly
  simplifies things for AI agents.  If the agent needs to pass stuff to
  any call site, it knows how to do it.

* **Test caching:** Surprisingly crucial for efficient agentic loops. In
  Rust, agents sometimes fail because they misunderstand `cargo test`'s
  invocation syntax.  In Go, tests run straightforwardly and
  incrementally, significantly enhancing the agentic workflow.  It does
  not need to figure out which tests to run, go does.

* **Go is sloppy:** Rob Pike famously described Go as suitable for
  developers who aren't equipped to handle a complex language.  Substitute
  “developers” with “agents,” and it perfectly captures why Go's
  simplicity benefits agentic coding.

* **Structural interfaces:** interfaces in Go are structural.  If a type
  has the methods an interface expects, then it conforms.  This is
  incredibly easy for LLMs to “understand”.  There is very little surprise
  for the agent.

* **Go has low eco-system churn:** Go's entire ecosystem embraces
  backwards compatiblity and explicit version moves.  This greatly reduces
  the likelihood of AI generating outdated code — starkly contrasting
  JavaScript's fast-moving ecosystem for instance.

For comparison, Python — my initial choice — often poses significant
challenges.  Agents struggle with Python's magic (eg: Pytest’s fixture
injection) or complex runtime challenges (eg: wrong event loop when
working with async), frequently producing incorrect code that even the
agentic loop has challenges resolving.  Python also has practical
performance problems.  I don't mean that it writes slow code, i mean that
the agent loop is really slow.  That's because the agent loves to spawn
processes and test scripts, and it can take quite a while for the
interpreter to boot up and initialize the entire application.

On the frontend I settled on tailwind, react with tanstack's query and
router as well as vite.  I'm not amazingly happy with it, but I found it
better than the alternatives.  Tailwind and vite are great, no complaints
there.  Tanstack's file based router does not make me super happy.  In
parts because it likes to have dollar signs in the file names and those
really like to confuse the agent.  For instance it's quite common that it
tries to edit `$param.tsx` but it edits the file `.tsx` instead because it
to confused by shell interpolation.  It's a minor thing, but a very
annoying thing.

Tools, Tools, Tools
-------------------

Regardless of language, effective tooling is paramount.  Key rules:

* **Anything can be a tool**.  A shell script can be a tool, an MCP server
  can be a tool, a log file can be a tool.  If the agent can interact or
  observe it, it counts.
* Tools need to be **fast**.  The quicker they respond (and the less
  useless output they produce) the better.  Crashes are tolerable; hangs
  are problematic.
* Tools need to be **user friendly**!  Tools must clearly inform agents of
  misuse or errors to ensure forward progress.
* Tools need to be **protected against an LLM chaos monkey** using them
  completely wrong.  There is no such things as user error or undefined
  behavior!
* Tools need to provide the right **debuggability and observability**.

Example: I place critical tools into a `Makefile`.  A ``make dev`` command
starts my services via a process manager. I made two key changes to what I
normally do:

1. I had to protect the process manager against being spawend a second
   time when it's already running.  I use a `fork of shoreman
   <https://gist.github.com/mitsuhiko/8ca80fda0bf48045d54bcd34d76ad887>`__
   which writes a pidfile.  When spanwed a second time it errors and logs
   “services already running”.  Why does that matter?  Because the agent
   sometimes does not know if the server is already running and otherwise
   happily spawns it a second time resulting in two version of the
   service bound to the same port.
2. I am not only printing the output to my terminal, I'm also always
   logging it to a file.  This allows the agent to read the log file to 
   diagnose what's happening.

Here an example agentic interaction that demonstrates this rather well::

    ⏺ Great! The formatting looks good. Now let me run the development server to test the
       dynamic onboarding:

    ⏺ Bash(make dev)
      ⎿  Error: error: services are already running
         make: *** [dev] Error 1
    
    ⏺ The development server is already running. Let me check the logs to see the frontend URL:
    
    ⏺ Bash(make tail-log)
      ⎿ 01:06:55 backend    | Starting server on localhost:8080
        01:07:39 backend    | [Running: sh -c 'cd backend && go run cmd/server/main.go serve']
        01:07:39 backend    | Starting server on localhost:8080
        08:45:34 backend    | "GET http://localhost:8080/api/users/me HTTP/1.1" from 127.0.0.1:61804 - 200
        39.252666ms
        … +96 lines (ctrl+r to expand)
    
    ⏺ Perfect! I can see the frontend is running on http://localhost:3000/ and the latest changes
       have been hot-reloaded. Let me test the dynamic onboarding functionality using playwright:

In general logging is super important.  For instance my app currently has
a sign in and register flow that sends an email to the user.  In debug
mode (which the agent runs in), the email is just logged to stdout.  This
is crucial!  It allows the agent to complete a full sign-in with a remote
controlled browser without extra assistence.  It knows that emails are
being logged thanks to a `CLAUDE.md` instruction and it automatically
consults the log for the necessary link to click.

Does it count as a tool?  In my book it does.

It's All About Speed
--------------------

Agentic coding's inefficiency largely arises from inference cost and
suboptimal tool usage.  Let me reiterate: quick, clear tool responses are
vital.  What we did not talk about yet is that some tools are "emergent,"
temporarily written by agents themselves.  Quick compilation and execution
significantly boost productivity of the agent.  So how can we help it?

With the right instructions it must be possible for the AI to create a new
tool, by following existing conventions very quickly.  This is necessary
because you want the AI to write some new code, and run it.  There is a
big difference in the quality and speed of the flow, if that tool takes
3ms to run vs it compiles for 5 seconds and then needs another minute to
boot and connect to database and kafka broker and 100 lines of nonsensical
log output.

If your stuff is indeed slow, then consider vibe-coding a demon that you
can dynamically load stuff into.  As an example Sentry takes too long to
reload code and it takes too long to restart.  To trial some agentic
coding there my workaround was a module that watches a file system
location and just imports and executes all python modules placed there,
then writes the outputs into a log it can cat.  That's not perfect, but it
was a significant help for the agent to evaluate some basic code in the
context of the application.

Balancing log verbosity is crucial: informative yet concise logs optimize
token usage and inference speed, avoiding unnecessary costs and rate
limits.  If you cannot find the balance, provide some easy to turn knobs
for the AI to control.

In an idea setup you get useful log output as a natural byproduct of the
agent writing code.  Getting observability from the first shot of code
generation beats writing code, failing to run it and only then going back
to a debug loop where debug information is added.

Stability and Copy/Paste
------------------------

Stable ecosystems are what you really want.  LLMs are great with Go and
they love to use Flask, because those are quite stable ecosystems with
little churn.  The same thing is true for your codebase.  The AI likes to
leave all kinds of breadcrumbs lying around when writing code that can
turn into confusion later.  For instance I have seen the agents leave
useful comments about why it chose one path over another.  If you
nilly-willy let the AI upgrade libraries where some of those decisions no
longer make sense, you now might have the AI continue making a now
outdated pattern.

In theory this should be the same for agents and humans, but the reality
is that agents make upgrades so “cheap” that it's tempting to just let the
AI do it and see if tests still pass.  I do not find this to be a
successful path at all.  Be even more conservative about upgrades than
before.

Likewise with AI I strongly prefer more code generation over using more
dependencies.  I wrote about why you `should write your own code
</2025/1/24/build-it-yourself/>`__ before, but the more I work with
agentic coding, the more I am convinced of this.

Write Simple Code
-----------------

Simple code significantly outperforms complex code in agentic contexts.  I
just recently wrote about `ugly coce
<https://lucumr.pocoo.org/2025/2/20/ugly-code/>`__ and I think in the
context of agents this is worth re-reading.  Have the agent do “the
dumbest possible thing that will work”.

* **Prefer functions** with clear, descriptive and longer than usual
  function names over classes.
* Avoid inheritance and overly clever hacks.
* **Use plain SQL**.  I mean it.  You get excellent SQL out of agents and
  they can match the SQL they write with the SQL logs.  That beats them
  min-maxing your ORM's capabilities and getting lost in the SQL output in
  a log.
* **Keep important checks local.**  You really want to make sure that
  permission checks are very clear to the AI, and that they are taking
  place where it AI can see it.  Hiding permission checks in another file
  or some config file will amost guarantee you that the AI will forget to
  add permission checks in when adding new routes.

Make It Parallelizable
----------------------

Agents aren't exceptionally fast individually, but parallelization boosts
overall efficiency.  Find a way to manage shared states like the file
system, databases, or Redis instances so that you can run more than one.
Avoid them, or find a way to quickly segment stuff out.

Your initial shared state is just the file system and a second check-out
will do.  But really I don't have an amazing solution yet.  There are some
good initial attempts.  For instance one of the tools to watch is
`container-use <https://github.com/dagger/container-use>`__.  It's an MCP
server that instructs Claude or other agents to run their experiments
entirely in Docker.

Then there are tools like Cursor's background agents and Codex which are
moving this entire stuff into CI which will be interesting.  So far, I
don't this is working for me yet, but let's see again in a month.

Learn To Refactor
-----------------

Agentic coding alters refactoring priorities.  Agents handle tasks
effectively until project complexity surpasses some manageable thresholds.
Too big here is defined by the total amount of stuff that it has to
consider.  So for instance you can vibe code your frontend together for a
while, but eventually you reach the point where you absolutely need to
tell it to make a component library.  Why?  Because if the total tailwind
class mess is splitered across 50 files you will find it very hard to get
the AI to make redesigns or extract components without major regressions.

An agentic workflow encourages good code maintenance and refactoring at
the right moment.  You don't want to do it too early and you definitely do
not want to do it too late.

What Next?
----------

Agentic coding is rapidly evolving, and my workflow today may look
dramatically different tomorrow.  What's clear though is that integrating
agents into your development process can unlock significant productivity
gains.  I encourage you to keep experimenting.  The tools and techniques
will evolve, but the core principles — simplicity, stability,
observability and smart parallelization — will remain essential.

Ultimately, the goal is not just to leverage agents to write code faster,
but to write better, more maintainable, and resilient code.  Already today
the code looks nothing like the terrible slop from a few months ago.  Stay
adaptable, and happy coding!

.. [1] This is not an advertisment for Claude Code.  It's just the agent I
   use at the moment.  What else is there?  Alternatives that are similar
   in their user experiences are `OpenCode
   <https://github.com/sst/opencode>`__, `goose
   <https://block.github.io/goose/>`__, `Codex
   <https://github.com/openai/codex>`__ and many others.  There is also
   `Devin <https://devin.ai/>`__ and Cursor's `background agents
   <https://docs.cursor.com/background-agent>`__ but they work a bit
   different in that they run in the cloud.
