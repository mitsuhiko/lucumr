---
tags: ['ai']
summary: "Maybe the LLM message APIs should be rethought as a synchronization problem."
---

# LLM APIs are a Synchronization Problem

The more I work with large language models through provider-exposed APIs, the
more I feel like we have built ourselves into quite an unfortunate API surface
area.  It might not actually be the right abstraction for what's happening
under the hood.  The way I like to think about this problem now is that it's
actually a distributed state synchronization problem.

At its core, a large language model takes text, tokenizes it into numbers, and
feeds those tokens through a stack of matrix multiplications and attention
layers on the GPU.  Using a large set of fixed weights, it produces activations
and predicts the next token.  If it weren't for temperature (randomization),
you could think of it having the potential of being a much more deterministic
system, at least in principle.

As far as the core model is concerned, there's no magical distinction between
"user text" and "assistant text"—everything is just tokens.  The only
difference comes from special tokens and formatting that encode roles (system,
user, assistant, tool), injected into the stream via the prompt template.  You
can look at the system prompt templates on Ollama for the different models to
get an idea.

## The Basic Agent State

Let's ignore for a second which APIs already exist and just think about what
usually happens in an agentic system.  If I were to have my LLM run locally on
the same machine, there is still state to be maintained, but that state is very
local to me.  You'd maintain the conversation history as tokens in RAM, and the
model would keep a derived "working state" on the GPU — mainly the attention
key/value cache built from those tokens.  The weights themselves stay fixed;
what changes per step are the activations and the KV cache.

One further clarification: when I talk about state I don't just mean the
visible token history because the model also carries an internal working state
that isn't captured by simply re-sending tokens.  In other words: you can
replay the tokens and regain the text content, but you won't restore the exact
derived state the model had built.

From a mental-model perspective, caching means "remember the computation you
already did for a given prefix so you don't have to redo it."  Internally, that
usually means storing the attention KV cache for those prefix tokens on the
server and letting you reuse it, not literally handing you raw GPU state.

There are probably some subtleties to this that I'm missing, but I think this
is a pretty good model to think about it.

## The Completion API

The moment you're working with completion-style APIs such as OpenAI's or
Anthropic's, abstractions are put in place that make things a little different
from this very simple system.  The first difference is that you're not actually
sending raw tokens around.  The way the GPU looks at the conversation history
and the way you look at it are on fundamentally different levels of
abstraction.  While you could count and manipulate tokens on one side of the
equation, extra tokens are being injected into the stream that you can't see.
Some of those tokens come from converting the JSON message representation into
the underlying input tokens fed into the machine.  But you also have things
like tool definitions, which are injected into the conversation in proprietary
ways.  Then there's out-of-band information such as cache points.

And beyond that, there are tokens you will never see.  For instance, with
reasoning models you often don't see any real reasoning tokens, because some
LLM providers try to hide as much as possible so that you can't retrain your
own models with their reasoning state.  On the other hand, they might give you
some other informational text so that you have something to show to the user.
Model providers also love to hide search results and how those results were
injected into the token stream.  Instead, you only get an encrypted blob back
that you need to send back to continue the conversation.  All of a sudden, you
need to take some information on your side and funnel it back to the server so
that state can be reconciled on either end.

In completion-style APIs, each new turn requires resending the entire prompt
history.  The size of each individual request grows linearly with the number of
turns, but the cumulative amount of data sent over a long conversation grows
quadratically because each linear-sized history is retransmitted at every step.
This is one of the reasons long chat sessions feel increasingly expensive.  On
the server, the model's attention cost over that sequence also grows
quadratically in sequence length, which is why caching starts to matter.

## The Responses API

One of the ways OpenAI tried to address this problem was to introduce the
Responses API, which maintains the conversational history on the server (at
least in the version with the saved state flag).  But now you're in a bizarre
situation where you're fully dealing with state synchronization: there's hidden
state on the server and state on your side, but the API gives you very limited
synchronization capabilities.  To this point, it remains unclear to me how long
you can actually continue that conversation.  It's also unclear what happens if
there is state divergence or corruption.  I've seen the Responses API get stuck
in ways where I couldn't recover it.  It's also unclear what happens if there's
a network partition, or if one side got the state update but the other didn't.
The Responses API with saved state is quite a bit harder to use, at least as
it's currently exposed.

Obviously, for OpenAI it's great because it allows them to hide more
behind-the-scenes state that would otherwise have to be funneled through with
every conversation message.

## State Sync API

Regardless of whether you're using a completion-style API or the Responses API,
the provider always has to inject additional context behind the scenes—prompt
templates, role markers, system/tool definitions, sometimes even provider-side
tool outputs—that never appears in your visible message list.  Different
providers handle this hidden context in different ways, and there's no common
standard for how it's represented or synchronized.  The underlying reality is
much simpler than the message-based abstractions make it look: if you run an
open-weights model yourself, you can drive it directly with token sequences and
design APIs that are far cleaner than the JSON-message interfaces we've
standardized around.  The complexity gets even worse when you go through
intermediaries like OpenRouter or SDKs like the Vercel AI SDK, which try to
mask provider-specific differences but can't fully unify the hidden state each
provider maintains.  In practice, the hardest part of unifying LLM APIs isn't
the user-visible messages—it's that each provider manages its own partially
hidden state in incompatible ways.

It really comes down to how you pass this hidden state around in one form or
another.  I understand that from a model provider's perspective, it's nice to
be able to hide things from the user.  But synchronizing hidden state is
tricky, and none of these APIs have been built with that mindset, as far as I
can tell.  Maybe it's time to start thinking about what a state synchronization
API would look like, rather than a message-based API.

The more I work with these agents, the more I feel like I don't actually need a
unified message API.  The core idea of it being message-based in its current
form is itself an abstraction that might not survive the passage of time.

## Learn From Local First?

There's a whole ecosystem that has dealt with this kind of mess before: the
local-first movement.  Those folks spent a decade figuring out how to
synchronize distributed state across clients and servers that don't trust each
other, drop offline, fork, merge, and heal.  Peer-to-peer sync, and
conflict-free replicated storage engines all exist because "shared state but
with gaps and divergence" is a hard problem that nobody could solve with naive
message passing.  Their architectures explicitly separate canonical state,
derived state, and transport mechanics — exactly the kind of separation missing
from most LLM APIs today.

Some of those ideas map surprisingly well to models: KV caches resemble derived
state that could be checkpointed and resumed; prompt history is effectively an
append-only log that could be synced incrementally instead of resent wholesale;
provider-side invisible context behaves like a replicated document with hidden
fields.

At the same time though, if the remote state gets wiped because the remote site
doesn't want to hold it for that long, we would want to be in a situation where
we can replay it entirely from scratch — which for instance the Responses API
today does not allow.

## Future Unified APIs

There's been plenty of talk about unifying message-based APIs, especially in
the wake of MCP (Model Context Protocol).  But if we ever standardize anything,
it should start from how these models actually behave, not from the surface
conventions we've inherited.  A good standard would acknowledge hidden state,
synchronization boundaries, replay semantics, and failure modes — because those
are real issues.  There is always the risk that we rush to formalize the
current abstractions and lock in their weaknesses and faults.  I don't know
what the right abstraction looks like, but I'm increasingly doubtful that the
status-quo solutions are the right fit.
