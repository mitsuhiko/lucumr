---
tags: ['ai', 'programming', 'thoughts']
summary: "People pick languages differently with LLMs."
---

# Fast and Hard Code

One of the memes on Twitter is that "programming is solved now."  I'm not sure
to what degree it is, but one thing is pretty clear: the act of familiarizing
yourself with a language no longer matters and some of the friction that
mattered for humans does not matter for agents.

As a result, LLMs make language choice much less consequential than it used to
be.  If you don't like the choice, you can seemingly rewrite it in another
language and you can make it pick a language that you, as a programmer, are
entirely unfamiliar with.

Which in turn means that people can, and do, choose based on the marketing of
languages much more.  As a long-term Rust programmer I found it quite
fascinating to see people now ship Rust code who previously might not have
chosen it.  I attribute at least one part of this to two recent vibe shifts:
there is a lot more talk about wanting fast software, and about LLMs being
exceptional at optimizing code without regressing behavior.

Folks like Mitchell Hashimoto, Charlie Marsh, Jarred Sumner, Daniel Lemire and
quite a few others always carried a certain level of obsession with fast and
performant software and they also all happen to be receptive to agents writing
code.  Maybe as a result, or unrelated others are now joining in.  That's
because with things like
[autoresearch](https://github.com/davebcn87/pi-autoresearch) you don't even
necessarily need to know all the tricks: you just need to put an agent on it —
though knowledge greatly helps!

If you look around, there are plenty of projects that want to be fast and small,
and they increasingly pick "hard languages".  And it's not just Rust that is
benefiting.  Even Zig — despite the fact that the creators and parts of the core
community are pretty negative on the whole AI thing — is too.  For instance
Cloudflare's new
[Artifacts](https://blog.cloudflare.com/artifacts-git-for-agents-beta/) service
uses a pure-Zig Git-protocol engine, compiled to a roughly 100 KB WebAssembly
module and Vercel released [fx](https://github.com/vercel-labs/fx), a Zig coding
agent advertised to be small and fast.  From what I can tell, all these projects
are largely LLM-assisted.

But it's not just people picking less common languages but also that they are
increasingly working with "much harder" technologies.  All of a sudden I have
seen people do some really impressive stuff with DWARF files, eBPF, custom
network drivers, custom crypto and really old computing hardware.  Many of these
things were previously off-limits for lots of developers.  In some cases (eg:
crypto) you were even pushed away because those things were intentionally
gatekept by the people in the know.

So maybe the world will have more slop, but it might also have more developers
in it, that want things to be fast and small.
