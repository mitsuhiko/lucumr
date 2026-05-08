---
tags: ['ai', 'thoughts']
summary: "Local models need focus and polish."
---

# Pushing Local Models With Focus And Polish

I really, really want local models to work.

I want them to work in the very practical sense that I can open my coding agent,
pick a local model, and get something that feels competitive enough that I do
not immediately switch back to a hosted API after five minutes.  There are a lot
of reasons why I want this, but the biggest quite frankly is that we're so early
with this stuff, and the thought of locking all the experimentation away from the
average developer really upsets me.

Frustratingly, right now that is still much harder than it should be but for
reasons that have little to do with the complexity of the task or the quality of
the models.

We have an enormous amount of activity around local inference, which is great.
We have good projects, fast kernels, and people are doing great quantization work.
A lot of very smart people are making all of this better, and yet the experience
for someone trying to make this work with a coding agent is worse than it has
any right to be.

Putting an API key into [Pi](https://pi.dev/) and using a hosted model is a very
boring operation.  You select the provider, paste the key and then you are done
thinking about how to get tokens.  Doing the same thing locally, even when you
have a high-end Mac with a lot of memory, is a completely different experience.
You choose an inference engine, then a model, then a quantization, then a
template, then a context size, then you've got to throw a bunch of JSON configs
into different parts of the stack and then you discover that one of those choices
quietly made the model worse or that something just does not work at all.

That is the gap I am interested in.

## Runnable Is Not Finished

A lot of local model work optimizes for making models runnable.  That is
necessary, but it is not the same thing as making them feel finished.  I give
you a very basic example here to illustrate this gap: tool parameter streaming.

For whatever reason, most of the stuff you run locally does not support tool
parameter streaming.  I cannot quite explain it, but the consequences of that
are actually surprisingly significant.  If you are not familiar with how these
APIs work, the simplest way to think about them is that they are emitting tokens
as they become available.  For text that is trivial, but for tool calls that is
often not done, despite the completions API supporting this.  As a result you
only see what edits are being done on a file once the model has finished
streaming the entire tool call.

This is bad for a lot of reasons:

* **A dead connection is a weird connection:** local models are slow, so when
  you don't get any tokens for 5 minutes then you can't tell if the connection
  died or just nothing came.  This means you need to increase the inactivity
  timeouts to the point where they are pointless.

* **You won't see what will happen:** if you are somewhat hands-on, not seeing
  what bash invocation the system is concocting slowly in the background means
  potentially wasted tokens, and also means that you won't be able to interrupt
  it until way too late.

* **It's just not SOTA.** We can do better, and we should aim for having the
  best possible experience.  Tool parameter streaming is as important as token
  streaming in other places.

Having a model spit out tokens doesn't take long, but making the experience
great end to end does take a lot more energy.

## Fragmentation

The local stack is fragmented across many engines and layers.  There is
llama.cpp, Ollama, LM Studio, MLX, Transformers, vLLM, and many other pieces
depending on hardware and taste.  All of these are amazing projects!  The
problem is not that they exist or that there are that many of them (even though,
quite frankly, I'm getting big old Python packaging vibes), the problem is that
for a given model, the actual behavior you get depends on a long chain of small
decisions that most users just don't have the energy for.

Did the chat template render exactly right?  Are the reasoning tokens handled in
the intended way?  Is the tool-call format translated correctly?  Is the context
window real?  Are the KV caches actually working for a coding agent?  Did I pick
the right quantized model from Hugging Face?  Are you accidentally leaving a lot
of performance on the table because the model is just mismatched for your
hardware?  Does streaming usage work across all channels?  Does the model need
its previous reasoning content preserved in assistant messages?  Is the coding
agent set up correctly for it?

You also need to install many different things in addition to just your coding
agent.

All of these things matter.  They matter a lot.

The result is that people try a local model and get a result that is neither a
fair evaluation of the model nor a polished product experience and this results
in both people dismissing local models and energy being distributed across way
too many separate efforts instead of getting one effort going great end to end.

This is a terrible way to build confidence.

## Too Little Critical Mass

In line with our general "slow the fuck down" mantra, I want to reiterate once
more how fast this industry is moving.

Every week there is a new model and a new vibeslopped thing.  The attention
immediately moves to making the next thing run instead of making one thing run
really, really well in one harness.  I get the excitement and dopamine hit, but
it also means that too little critical mass accumulates behind any one model,
hardware, inference engine, harness combo to find out how good it can really
become when the entire stack is built around it.

Hosted model providers do not ship a bag of weights and ask you to figure out
the rest, and we need to approach that line of thinking for local models too.  I
want someone to pick one model, pairs it up with one serving path, directly
within a coding agent.  Initially just for one hardware configuration, then for
more.  Pick a winner hard.  If a tool call breaks, that is a product bug and
then it's fixed no matter where in the stack it failed.  If the model's
reasoning stream is malformed, that is a product bug.  If latency is much worse
than it should be, that is a product bug.  We need to start applying that
mentality to local models too.

And not for every model!  That is the point.  Let's pick one winner and polish
the hell out of it.  Learn what it takes to make that one configuration good,
then take those learnings to the next config.

## The DS4 Bet

This is why I am excited about [ds4.c](https://github.com/antirez/ds4).  It's
Salvatore Sanfilippo's deliberately narrow inference engine for DeepSeek V4
Flash on Macs with 128GB+ of RAM only.  It is not a generic GGUF runner and it
is not trying to be a framework.  It is a model-specific native engine with a
Metal path, model-specific loading, prompt rendering, KV handling, server API
glue, and tests.

DeepSeek V4 Flash is a good candidate for this kind of experiment because it has
a combination of properties that are unusual for local use.  It is large enough
to feel meaningfully different from many smaller dense models, but sparse enough
that the active parameter count makes it plausible to run.  It has a very large
context window.  Since ds4.c targets Macs and Metal only, it can move KV caches
into SSDs which greatly helps the kind of workloads we expect from coding agents.

To run `ds4.c` you don't need MLX, Ollama or anything else.  It's the whole
package.

## Embedding It In Pi

Which made me build [pi-ds4](https://github.com/mitsuhiko/pi-ds4) which is a Pi
extension to directly embed the whole thing into Pi itself.  Taking what ds4 is
and dogfooding the hell out of it with a coding agent and zero configuration.
To answer the question how good can the local model experience become if Pi
treats this as a first-class provider rather than as a pile of manual
configuration?

The extension registers `ds4/deepseek-v4-flash`, compiles and starts
`ds4-server` on demand, downloads and builds the runtime if needed, chooses the
quantization based on the machine, keeps a lease while Pi is using it, exposes
logs, and shuts the server down again through a watchdog when no clients are
left.  It doesn't even give you knobs right now, because I want to figure out how
to set the knobs automatically.

This is not about hiding the fact that local inference is complicated.  It is
about putting the complexity in one place where it can be improved, because
there is a lot that we need to improve along the stack to make it work better.

I think we can do better with caching and there is probably some performance
that can be gained if we all put our heads together.

## Focusing and Learning

The experiment I want to run is not "can a local model run?" because we already
know that it can.  I want to know if, for people with beefed-out Macs for a
start, we can get as close as possible to the ergonomics of a hosted provider
with decent tool-calling performance: how to get caches to work well, how to
improve the way we expose tools in harnesses for these models, and then scale it
gradually to more hardware configs and later models.

I also want everybody to have access to this.  Engineers need hammers and a
hammer that's locked behind a subscription in a data center in another country
does not qualify.  I know that the price tag on a Mac that can run this is
itself astronomical, but I think it's more likely that this will go down.  Even
worse, Apple right now due to the RAM shortage does not even sell the Mac Studio
with that much RAM.  So yes, it's a selected group of people where ds4.c will
start out.

But despite all of that, what matters is that a critical mass of pepole start to
focus their efforts on a thing, tinker with it, improve it, not locked away, out
in the open, and most importantly not limited by what the hyperscalers make
available.

But if you have the right hardware and you care about local agents, I would love
for you to try it within pi:

```
pi install https://github.com/mitsuhiko/pi-ds4
```

My hope is that this becomes a useful forcing function to really polish one
coding agent experience.  But really, the focal point should be [ds4.c
itself](https://github.com/antirez/ds4).
