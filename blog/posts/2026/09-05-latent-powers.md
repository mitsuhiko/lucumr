---
tags: ['ai', 'thoughts']
summary: "Are we all discovering the same things at once?"
---

# Latent Powers

A few weeks ago I felt like it would be fun to see if I can make one of those
cheap Chinese CarPlay dongles run something other than the stock firmware.  The
idea was that rather than just forwarding CarPlay, why not do something more
interesting with them?  They all work quite similarly: they act as bridges
between your car and the phone.  From there they deal with video and audio
streams and pass some other data through.  Most of them also bring up a custom
UI for pairing and have a web interface that your phone can reach for updates.

Long story short: I had a conversation with Fable and Sol via Pi about what
could be done with such a dongle or whether I should use a Raspberry Pi instead
if I wanted to do my own thing there.  I figured it might be quite fun to run my
own code while still allowing regular CarPlay to pass through.

Through working with the LLM I learned about
[CatPlay](https://github.com/catplay-labs/catplay), which is a Rust
reimplementation of the CarPlay protocol that can run on Carlinkit devices.  In
particular, it can run on the Carlinkit Mini Ultra, which I figured would be
easy enough to buy.  I do have a few CarPlay adapters around, but I did not have
that particular model, so I bought one on Amazon.  Twenty-four hours later, I
had a device in my hand that was branded as a Carlinkit Mini Ultra, but instead
of being the Ingenic device that the original author used, it turned out to be
something else.

This is normally where the story would stop.  However, it's 2026.  Armed with a
bit of knowledge about how these systems work, I managed to have some fruitful
discussions with Kimi K3 and Sol and figure out how [flash the
device](https://github.com/catplay-labs/catplay-firmware/issues/4) and in turn,
how to make CatPlay compile for that SoC.

I guess that hacking these USB devices is not necessarily hard, but it's
laborious and you can easily end up bricking your devices.  It also just sucks
because sometimes you need to work with someone else's code that does not itself
run on your machine.  In the past, I would abandon many such projects for lack
of tenacity.  But my clanker is tenacious.

But so are *all of our clankers*.  Some of the projects we're now attempting are
happening because of conversations we have with them.  In this case I did not
find or decide on CatPlay, the model did.  It was not the only suggestion, but
it became the best starting point after discarding others.

And I discover this more and more.  Particularly when we have solitary
interactions with these models, some of us "independently" decide to work on
similar projects.  When I talked with an acquaintance about CarPlay he also
mentioned recently that he decided to try something similar because he too
wanted to see if he can get his own agent be hooked up with the car.  And guess
what: he too learned about the CarPlay hacking community, and that it's an
option, from the models and roughly around the same time.

It really got me thinking about how this could create situations in which
completely independent people end up building things they believe are their own
ideas.  Yet they were inspired or pushed towards doing something by a
conversation with an LLM — a conversation that someone else also had.  What if
we took paths, because those were the paths that were more likely with current
generation models?  There is a running joke in the AI builder community right
now that we're all working on the same things, and in many ways it feels like we
are.  That might be because those things are obvious, or it might be partly
because we all use the same models with the same capabilities.

A few months ago, I first saw [Lucas Meijer](https://x.com/lucasmeijer) share the
idea to make a model in Pi produce HTML reports rather than Markdown.  I thought
that was pretty unique.  Except, well turns out the models are probably trained
more and more for that (e.g. Claude Artifacts), and now it has become for many
the default choice for sharing reports.

How much of what we build comes from eliciting the same latent capabilities from
the same models?  Did the models make us prompt them that way?  Was it because
we shared ideas on Twitter and other communities that inspired us?  Or is it all
unrelated?

There is something powerful and strange about how LLMs diffuse knowledge and
capabilities, while perhaps also nudging us all simultaniously and independently
toward building the same things.