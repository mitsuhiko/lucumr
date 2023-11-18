public: no
tags: [thoughts, licensing]
summary: My personal commentary on Sentry's new FSL license.

FSL: A License For the Bazaar, Not the Cathedral
================================================

Sentry relicensed under a new license, called the `Functional Source
License (FSL) <https://fsl.software/>`__.  It's not an Open Source license
by the OSI definition, but it comes with an irrevocable grant that after
two years it turns into an Apache 2.0 licensed artifact (or MIT for the
alternative form).  It's the response to a lot of feedback we have
received about our previous use of the `BUSL
<https://spdx.org/licenses/BUSL-1.1.html>`__.  You can read all about that
in the `Announcement Blog Post
<https://blog.sentry.io/introducing-the-functional-source-license-freedom-without-free-riding/>`__.
This is not a post about the license, it's my musing about development
model vs license.

When I started Open Source development, there was a very famous essay
by Eric S. Raymond called “The Cathedral and the Bazaar”.  It describes
the bazaar style development model that Linux propagaged at the time.
Patches were passed around freely on a mailing list, source was always
available even between releases.  This is how Raymond described the
two development models:

    I believed that the most important software (operating systems and
    really large tools like the Emacs programming editor) needed to be built
    like cathedrals, carefully crafted by individual wizards or small bands
    of mages working in splendid isolation, with no beta to be released
    before its time.

    Linus Torvalds's style of development—release early and often, delegate
    everything you can, be open to the point of promiscuity—came as a
    surprise. No quiet, reverent cathedral-building here—rather, the Linux
    community seemed to resemble a great babbling bazaar of differing agendas
    and approaches (aptly symbolized by the Linux archive sites, who'd take
    submissions from anyone) out of which a coherent and stable system could
    seemingly emerge only by a succession of miracles.

    — Eric Steven Raymond, `The Cathedral and the Bazaar
    <http://www.catb.org/~esr/writings/cathedral-bazaar/cathedral-bazaar/index.html>`__.

Today the Cathedral approach in Open Source is very uncommon.  The Linux
project has not only promoted building in the open, Linus himself has
doubled down on that development model by creating git.  Today we build in
the open.  Open Source projects are on GitHub, everything happens there.

There is a second change that gradually happened over the last 20 years:
SaaS.  Software licenses really regulate the distribution of source code
and binaries, but they don't have a lever over what happens with the
software once you have it in your hands.  That causes a new challenge
which is commonly described as the `Free-rider problem
<https://en.wikipedia.org/wiki/Free-rider_problem>`__ in economics as an
example of a market failure:

    In the social sciences, the free-rider problem is a type of market
    failure that occurs when those who benefit from resources, public
    goods and common pool resources do not pay for them or under-pay.
    Examples of such goods are public roads or public libraries or
    services or other goods of a communal nature.

Open Source software is such a common good.  In the past, when it was all
about redistribution there was not a lot of possibility for someone to
take it and monetize it.  With the advent of services, the situation has
changed.  Now anyone can take an Open Source project and host it as a
service.  There is only one license that tried to address this part, and
that's the AGPL which comes with it's own challenges.

If you were to follow the Cathedral development model and you only release
software once every two years to the world under an OSI license, that
would technically be Open Source software.  But you would need to wait for
two years and if someone were to change their mind, you have no legal
leverage to actually recieve that code.

The FSL improves on this for the ones that subscribe to the idea of the
Bazaar development model: it's out there in the open, but it has an
exclusivity period for the original authors to enable them to
commercialize it for a limited but rolling period of two years.  You also
do not need to take our word for it, the license already gives you the
right, you just need to wait.  After that waiting period, it turns into
a 100% OSI approved licensed artifact.

Personally I am obviously a strong advocate for that model.  I think it's
incredibly close to what Open Source is all about, with some limited
protections.  Also if you read the license you really see that the
protections are quite weak.  You can both fork the entire company with a
two year waiting period, but you can also fully use that product to your
hearths content internally.  If for regulatory reasons or else, you cannot
use the SaaS version of Sentry, you can self host it and you're well
within the rights of the license.  You can also rest well and know that no
matter what happens, there is a product for you to use.  We also
explicitly call out the possiblity to use FSL licensed products in
connection with software development services.

There is however the question of what this license is.  I think the
intentionality of the license, the wording of the text itself and the
practical implications of the license are stronger than any source
available license out there today.  Two years is an incredibly aggressive
target.  It's also not an Open Source license prior to the license change
date.  I understand that people feel incredibly strong about the use of
the term “Open Source” and it would be wrong for me to try to use that
term for that license.  But I will defend with every inch of my body that
what we are working for here is significantly closer to Open Source than
source available.  In my mind I consider it an “Eventually Open Source”
license.  But maybe we need to find better terms.
