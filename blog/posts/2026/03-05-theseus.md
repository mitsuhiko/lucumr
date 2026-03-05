---
tags: ['ai', 'python', 'licensing']
summary: "Slopforks: what happens when a library gets rewritten with AI?"
---

# AI And The Ship of Theseus

Because code gets cheaper and cheaper to write, this includes
re-implementations.  I mentioned recently that I had an AI port one of my
libraries to another language and it ended up choosing a different
design for that implementation.  In many ways, the functionality was the same,
but the path it took to get there was different.  The way that port worked was
by going via the test suite.

Something related, but different, [happened with
chardet](https://github.com/chardet/chardet/issues/327#issuecomment-4005195078).
The current maintainer reimplemented it from scratch by only pointing it to the
API and the test suite.  The motivation: enabling relicensing from LGPL to MIT.
I personally have a horse in the race here because I too wanted chardet to be
under a non-GPL license for many years.  So consider me a very biased person in
that regard.

Unsurprisingly, that new implementation caused a stir.  In particular, Mark
Pilgrim, the original author of the library, objects to the new implementation
and considers it a derived work.  The new maintainer, who has maintained it for
the last 12 years, considers it a new work and instructs his coding agent to do
precisely that.  According to author, validating with JPlag, the new
implementation is distinct.  If you actually consider how it works, that's not
too surprising.  It's significantly faster than the original implementation,
supports multiple cores and uses a fundamentally different design.

What I think is more interesting about this question is the consequences of
where we are.  Copyleft code like the GPL heavily depends on copyrights and
friction to enforce it.  But because it's fundamentally in the open, with or
without tests, you can trivially rewrite it these days.  I myself have been
intending to do this for a little while now with some other GPL libraries.  In
particular I started a re-implementation of readline a while ago for similar
reasons, because of its GPL license.  There is an obvious moral question here,
but that isn't necessarily what I'm interested in.  For all the GPL software
that might re-emerge as MIT software, so might be proprietary abandonware.

For me personally, what is more interesting is that we might not even be able
to copyright these creations at all.  A court still might rule that all
AI-generated code is in the public domain, because there was not enough human
input in it.  That's quite possible, though probably not very likely.

But this all causes some interesting new developments we are not necessarily
ready for.  Vercel, for instance, happily [re-implemented
bash](https://just-bash.dev/) with Clankers but [got visibly
upset](https://x.com/cramforce/status/2027155457597669785) when someone
re-implemented Next.js in the same way.

There are huge consequences to this.  When the cost of generating code goes down
that much, and we can re-implement it from test suites alone, what does that
mean for the future of software?  Will we see a lot of software re-emerging
under more permissive licenses?  Will we see a lot of proprietary software
re-emerging as open source?  Will we see a lot of software re-emerging as
proprietary?

It's a new world and we have very little idea of how to navigate it.  In the
interim we will have some fights about copyrights but I have the feeling very
few of those will go to court, because everyone involved will actually be
somewhat scared of setting a precedent.

In the GPL case, though, I think it warms up some old fights about copyleft vs
permissive licenses that we have not seen in a long time.  It probably does not
feel great to have one's work rewritten with a Clanker and one's authorship
eradicated.  Unlike the [Ship of
Theseus](https://en.wikipedia.org/wiki/Ship_of_Theseus), though, this seems more
clear-cut: if you throw away all code and start from scratch, even if the end
result behaves the same, it's a new ship.  It only continues to carry the name.
Which may be another argument for why authors should hold on to trademarks
rather than rely on licenses and contract law.

I personally think all of this is exciting.  I'm a strong supporter of putting
things in the open with as little license enforcement as possible.  I think
society is better off when we share, and I consider the GPL to run against that
spirit by restricting what can be done with it.  This development plays into my
worldview.  I understand, though, that not everyone shares that view, and I
expect more fights over the emergence of slopforks as a result.  After all, it
combines two very heated topics, licensing and AI, in the worst possible way.
