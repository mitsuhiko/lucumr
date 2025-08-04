---
tags: ['typescript', 'ai']
summary: "A curious thing about types and agents"
---

# In Support Of Shitty Types

You probably know that I love Rust and TypeScript, and I'm a big proponent of
good typing systems.  One of the reasons I find them useful is that they enable
autocomplete, which is generally a good feature.  Having a well-integrated type
system that makes sense and gives you optimization potential for memory layouts
is generally a good idea.

From that, you'd naturally think this would also be great for agentic coding
tools.  There's clearly some benefit to it.  If you have an agent write
TypeScript and the agent adds types, it performs well.  I don't know if it
outperforms raw JavaScript, but at the very least it doesn't seem to do any
harm.

But most agentic tools don't have access to an LSP (language server protocol).
My experiments with agentic coding tools that do have LSP access (with type
information available) haven't meaningfully benefited from it.  The LSP
protocol slows things down and pollutes the context significantly.  Also, the
models haven't been trained sufficiently to understand how to work with this
information.  Just getting a type check failure from the compiler in text
form yields better results.

What you end up with is an agent coding loop that, without type checks enabled,
results in the agent making forward progress by writing code and putting types
somewhere.  As long as this compiles to some version of JavaScript (if you use
Bun, much of it ends up type-erased), it creates working code.  And from there
it continues.  But that's bad progress—it's the type of progress where it
needs to come back after and clean up the types.

It's curious because types are obviously being written but they're largely
being ignored.  If you do put the type check into the loop, my tests actually
showed worse performance.  That's because the agent manages to get the code
running, and only after it's done does it run the type check.  Only then, maybe
at a much later point, does it realize it made type errors.  Then it starts
fixing them, maybe goes in a loop, and wastes a ton of context.  If you make it
do the type checks after every single edit, you end up eating even more into the
context.

This gets really bad when the types themselves are incredibly complicated and
non-obvious.  TypeScript has arcane expression functionality, and some
libraries go overboard with complex constructs (e.g., [conditional
types](https://www.typescriptlang.org/docs/handbook/2/conditional-types.html)).
LLMs have little clue how to read any of this.  For instance, if you give it
access to the .d.ts files from TanStack Router and the forward declaration
stuff it uses for the router system to work properly, it doesn't understand any
of it.  It guesses, and sometimes guesses badly.  It's utterly confused.  When
it runs into type errors, it performs all kinds of manipulations, none of which
are helpful.

Python typing has an even worse problem, because there we have to work with a
very complicated ecosystem where different type checkers cannot even agree on
how type checking should work.  That means that the LLM, at least from my
testing, is not even fully capable of understanding how to resolve type check
errors from tools which are not from mypy.  It's not universally bad, but if
you actually end up with a complex type checking error that you cannot resolve
yourself, it is shocking how the LLM is also often not able to fully figure out
what's going on, or at least needs multiple attempts.

As a shining example of types adding a lot of value we have Go.  Go's types are
much less expressive and very structural.  Things conform to interfaces purely
by having certain methods.  The LLM does not need to understand much to
comprehend that.  Also, the types that Go has are rather strictly enforced.  If
they are wrong, it won't compile.  Because Go has a much simpler type system
that doesn't support complicated constructs, it works much better—both for LLMs
to understand the code they produce and for the LLM to understand real-world
libraries you might give to an LLM. 

I don't really know what to do with this, but these behaviors suggest there's
a lot more value in best-effort type systems or type hints like JSDoc.  Because
at least as far as the LLM is concerned, it doesn't need to fully understand
the types, it just needs to have a rough understanding of what type some object
probably is.  For the LLM it's more important that the type name in the error
message aligns with the type name in source.

I think it's an interesting question whether this behavior of LLMs today will
influence future language design.  I don't know if it will, but I think it
gives a lot of credence to some of the decisions that led to languages like Go
and Java.  As critical as I have been in the past about their rather simple
approaches to problems and having a design that maybe doesn't hold developers
in a particularly high regard, I now think that they actually are measurably in
a very good spot.  There is more elegance to their design than I gave it
credit for.
