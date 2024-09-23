public: yes
tags: [thoughts]
summary: My thoughts on license choices for balancing business interests and
  Open Source software and why the FSL is a better choice than the AGPL.

FSL: A Better Business/Open Source Balance Than AGPL
====================================================

*subtext: in my opinion, and for companies (and their users) that want a
good balance between protecting their core business with Open Source
ideals.*

Following up to my thoughts on the `case for funding Open Source
</2024/9/19/open-source-tax/>`__, there is a second topic I want to
discuss in more detail: Open Source and commercialization.  As our
founder likes to say: `Open Source is not a business model
<https://cra.mr/open-source-is-not-a-business-model/>`__.  And indeed it
really isn't.  However, this does not mean that Open Source and Open
Source licenses aren't a critical consideration for a technology company
and a fascinating interconnection between the business model and license
texts.

As some of you might know I'm a strong proponent of the concept now
branded as “`Fair Source <https://fair.io/about/>`__” which we support at
Sentry.  Fair Source is defined by a family of springing licenses that
give you the right to read and modify code, while also providing an
exclusivity period for the original creator to protect their core
business.  After a designated time frame, the code transitions into Open
Source via a process called DOSP: `Delayed Open Source Publication
<https://opensource.org/delayed-open-source-publication>`__.  This is not
an entirely new idea, and I have been writing about it a few times before
[1]_ [2]_.

A recurring conversation I have in this context is the AGPL (Affero
General Public License) as an alternative vehicle for balancing business
goals and Open Source ideals.  This topic also has resurfaced recently
because of Elasticsearch'es `Open Source, Again
<https://www.elastic.co/blog/elasticsearch-is-open-source-again>`__ post
where they announced that they will license Elasticsearch under the AGPL.

In my view, while AGPL is a true Open Source license, it is an inferior
choice compared to the `FSL <https://fsl.software/>`__ (the Functional
Source License, a Fair Source license) for many projects.  Let me explain
my reasoning.

The Single Vendor Model
-----------------------

When you take a project like Sentry, which started as an Open Source
project and later turned into a VC funded company, its model revolves
around a commercial entity being in charge.  That model is often referred
to as “single vendor.”  This is also the case with companies like
Clickhouse Inc. or Elastic and their respective projects.

Sentry today is no longer Open Source, it's Fair Source (FSL licensed).
Elastic on the other hand is indeed unquestionable Open Source (AGPL among
others).  What both projects have in common is that they value brand
(including trademarks), that they have strong opinions on how that project
should be run, and they use a `CLA
<https://en.wikipedia.org/wiki/Contributor_License_Agreement>`__ to give
themselves the right to re-licenses it under other terms.

In a "single vendor" setup, the company behind the project holds
significant power (`for ~150 years
<https://en.wikipedia.org/wiki/List_of_copyright_terms_of_countries>`__
give or take).

The Illusion of Equality
------------------------

When you look at the AGPL as a license it's easy to imagine that everybody
is equal.  Every contributor to a project agrees with the underlying
license assumptions of the AGPL and acts accordingly.  However, in
practice, things are more complicated — especially when it comes to
commercial usage.  Many legal departments are wary of the AGPL and the
broader GPL family of licenses.  Some challenges are also inherent to the
licenses such as not being able to `publish *GPL code to the app store
<https://www.fsf.org/blogs/licensing/more-about-the-app-store-gpl-enforcement>`__.

You can see this also with Elasticsearch.  The code is not just AGPL
licensed, you can also retrieve it under the ELv2 and SSPL licensing
terms.  Something that Elastic can do due to the CLAs in place.

Compare this to Linux, which is licensed under GPLv2 with a syscall
exception.  This very specific license was chosen by Linus Torvalds to
ensure the project's continued success while keeping it truly open.  In
Linux' case, no single entity has more rights than anyone else.  There is
not even a realistic option to relicense to a newer version of the GPL.

The FSL explicitly recognizes the reality that the single vendor holds
significant power but balances it by ensuring that this power diminishes
over time.  This idea can also be found in copyright law, where a
creator's work eventually enters the public domain.  A key difference with
software though is that it continuously evolves, making it hard to
pinpoint when it might eventually become public domain as thousands of
people contribute to it.

The FSL is much more aggressive in that aspect.  If we run Sentry into the
ground and the business fails, within two years, anyone can pick up the
pieces and revive it like a Phoenix from the ashes.  This isn't just
hypothetical.  Bryan Cantrill recently mentioned the desire of `Oxide
forking CockroachDB <https://news.ycombinator.com/item?id=41258843>`__
once its BUSL change date kicks in.  While that day hasn't come yet, it's
a real possibility.

Dying Companies
---------------

Let's face it: companies fail.  I have no intentions for Sentry to be one
of them, but you never know.  Companies also don't just die just once,
they can do so repeatedly.  `Xapian <https://xapian.org/>`__ is an example
I like to quote here.  It started out as a GPL v2+ licensed search project
called Muscat which was built at Cambridge.  After several commercial
acquisitions and transitions, the project eventually became closed source
(which was possible because the creators held the copyright).  Some of the
original creators together with the community forked the last GPLv2
version into a project that eventually `became known as Xapian
<https://xapian.org/history>`__.

What's the catch?  The catch is that the only people who could license it
more liberally than GPLv2 are long gone from the project.  Xapian
refers to its current license “`a historical accident
<https://trac.xapian.org/wiki/Licensing>`__”.  The license choice causes
some challenges specifically to how Xapian is embedded.  There are three
remaining entities that would need to agree to the relicensing.  From my
understanding none of those entities commercially use Xapian's original
code today but also have no interest in actually supporting a potential
relicensing.

Unlike trademark law which has `a concept of abandonment
<https://www.law.cornell.edu/uscode/text/15/1127>`__, the copyright
situation is stricter.  It would take two lifetimes for Xapian to enter the
public domain and at that point it will be probably be mostly for archival
purposes.

Equal Grounds Now or Later
--------------------------

If Xapian's original code would have been FSL licensed, it would have been
Apache 2.0 (or MIT with the alternative model) many times over.  You don't
need to hope that the original license holder still cares, by the time you
get hold of the source code, you already have an irrevocable promise that
it will eventually turn into Apache 2.0 (or MIT with the alternative license
choice) which is about as non-strings attached as it can get.

So in some ways a comparison is “AGPL now and forever” vs “FSL now, Apache
2.0/MIT in two years”.

That's not to say that AGPL (or SSPL) don't have their merits.  Xapian as
much as it might suffer from their accidental license choice also *is* a
successful Open Source project that helped a lot of developers out there.
Maybe the license did in fact work out well for them, and because
everybody is in the same boat it also has created a community of equals.

I do believe however it's important to recognize that “single-vendor AGPL
with a CLA” is absolutely not the same as “community driven AGPL project
without the CLA”.

The title claims that FSL balances Open Source better than AGPL, and it's
fair to question how a license that isn't fully Open Source can achieve
that.   The key lies in understanding that Fair Source is built on the
concept of *delayed* Open Source.  Yes, there's a waiting period, but it’s
a relatively short one: just two years.  Count to two and the code
transitions to full, unshackled openness.  And that transition to Open
Source is a promise that can't be taken from you.

.. [1] Originally about the BUSL license which introduced the idea
   (`Open Source, SaaS and Monetization </2019/11/4/open-source-and-saas/>`__)

.. [2] Later about our own DOSP based license, the `FSL <https://fsl.software/>`__
   (`FSL: A License For the Bazaar, Not the Cathedral
   <https://lucumr.pocoo.org/2023/11/19/cathedral-and-bazaaar-licensing/>`__).
