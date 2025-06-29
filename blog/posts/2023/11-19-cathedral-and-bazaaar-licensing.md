---
tags:
  - thoughts
  - licensing
  - opensource
summary: My personal commentary on Sentry's new FSL license.
---

# FSL: A License For the Bazaar, Not the Cathedral

Sentry relicensed under a new license, called the [Functional Source
License (FSL)](https://fsl.software/).  Like the BUSL it replaces,
It's not an Open Source license by the OSI definition, but it comes with
an irrevocable grant: after two years it turns into an Apache 2.0 licensed
artifact (or MIT for the alternative form).  It's the response to a lot of
feedback we have received about our previous use of the [BUSL](https://spdx.org/licenses/BUSL-1.1.html).  You can read all about
the switch to FSL
in the [Announcement Blog Post](https://blog.sentry.io/introducing-the-functional-source-license-freedom-without-free-riding/).  (You can also find my original thoughts on [the use
of the BUSL here](/2019/11/4/open-source-and-saas/).)

I believe this license to be closer to Open Source than what we had
before.

When I started Open Source development, there was a very famous essay
by Eric S. Raymond called “The Cathedral and the Bazaar”.  It describes
the bazaar style development model that Linux propagated at the time.
Patches were passed around freely on a mailing list, source was always
available even between releases.  This is how Raymond described the
two development models:

> I believed that the most important software (operating systems and
really large tools like the Emacs programming editor) needed to be built
like cathedrals, carefully crafted by individual wizards or small bands
of mages working in splendid isolation, with no beta to be released
before its time.
>
> Linus Torvalds's style of development—release early and often, delegate
everything you can, be open to the point of promiscuity—came as a
surprise. No quiet, reverent cathedral-building here—rather, the Linux
community seemed to resemble a great babbling bazaar of differing agendas
and approaches (aptly symbolized by the Linux archive sites, who'd take
submissions from anyone) out of which a coherent and stable system could
seemingly emerge only by a succession of miracles.
>
Eric Steven Raymond, [The Cathedral and the Bazaar](http://www.catb.org/~esr/writings/cathedral-bazaar/cathedral-bazaar/index.html).

Today the Cathedral approach in Open Source is very uncommon.  The Linux
project has not only promoted building in the open, Linus himself has
doubled down on that development model by creating git.  Today we build in
the open.  Open Source projects are on GitHub, everything happens there.
That's the model I know, it's the model all my Open Source projects use,
it's the model Sentry uses.  We build in the open.

There is a second change that gradually happened over the last 20 years:
SaaS.  Software licenses really regulate the distribution of source code
and binaries, but they don't have a lever over what happens with the
software once you have it in your hands.  That causes a new challenge
which is commonly described as the [Free-rider problem](https://en.wikipedia.org/wiki/Free-rider_problem) in economics as an
example of a market failure:

> In the social sciences, the free-rider problem is a type of market
failure that occurs when those who benefit from resources, public
goods and common pool resources do not pay for them or under-pay.
Examples of such goods are public roads or public libraries or
services or other goods of a communal nature.
>

Open Source software is such a common good.  Historically, the licensing
focus was on redistribution.  There were not a lot of possibilities for
others to take it and monetize it.  With the advent of services, the
situation has changed.  Now anyone can take an Open Source project and
host it as a service and there is an appetite to pay for such services.
There is only one Open Source license that tried to address this part, and
that's the AGPL which comes with its own challenges.  This risk
disincentives further Open Source development of projects which could be
abused this way.

If you were to follow the Cathedral development model and you only release
software once every two years to the world under an OSI license, that
would technically be Open Source software.  But as a user you would need
to wait for two years and if someone were to change their mind, you have
no legal leverage to actually receive that code.

The FSL improves on this for the ones that subscribe to the idea of the
Bazaar development model: it's out there in the open, but it has an
exclusivity period for the original authors to enable them to
commercialize it for a limited but rolling period of two years.  You also
do not need to take our word for it, the license already gives you the
right, you just need to wait.  After that waiting period, it turns into
a 100% OSI approved licensed artifact.  It also enables contributions
by the community for the latest version and not old source code.

Personally I am obviously a strong advocate for that model.  I think it's
incredibly close to what Open Source is all about, with some modest
protections.  The FSL permits limitless forking after a two-year
exclusivity period, and also allows unrestricted internal use of the
product and contributions long before that.  For instance, if regulatory
constraints prevent using the SaaS version of a product like Sentry,
self-hosting is a viable and legal alternative under the FSL. This license
also ensures the availability of the product in any circumstance and
specifically mentions the use of FSL-licensed products alongside software
development services.

The FSL ensures that software can outlast the commercial entity that
enables its development.  It guarantees that the software will always stay
functional and available.  There cannot be a limbo where the rights holder
prevents the flourishing of a fork out of lack of interest or fear.

To me the FSL's unique characteristics raise questions about its nature.
Its intent, language, and practical impact arguably make it more robust
and exciting than any other source-available license today.  The two-year
exclusivity period is ambitious.  But one thing is clear: until its
expiration, the license does not qualify as Open Source.  While I
recognize the sensitivity around the term “Open Source”, I assert that the
FSL's approach is more closely aligned with Open Source ideals than mere
source availability.  I consider it an “Eventually Open Source” license,
though perhaps a more fitting term needs to be found.

I see how incredibly strong many feel about the BUSL and now the FSL.  In
the mind of many folks, this license is a betrayal of the Open Source
spirit.  I understand the historic context and efforts that went into
making Open Source and Free Software what it is today.  We're all standing
of the shoulders of the giants that created those licenses and defended
them in courts.  But take this parting thought: we regarded the Cathedral
development model as both Free Software and Open Source.  In that model in
between releases only selected people had access and control to the
source.  Where forks were limited to starting with the public tarballs of
some software that only appeared at irregular intervals.  Maybe if one
considers that development model, the FSL doesn't look quite as foreign
and restrictive.
