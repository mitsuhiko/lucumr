---
tags:
  - opensource
  - thoughts
  - licensing
summary: "My thoughts on monetizing open source SaaS businesses from my experience
at Sentry."
---

# Open Source, SaaS and Monetization

When you're reading this blog post [Sentry](https://sentry.io/) which I
have been working on for the last few years has undergone a license
change.  Making money with Open Source has always been a complex topic and
over the years my own ideas of how this should be done have become less and
less clear.  The following text is an attempt to summarize my thoughts on
it an to put some more clarification on how we ended up picking the [BSL
license](https://mariadb.com/bsl11/) for Sentry.

## Making Money with Open Source

My personal relationship with Open Source and monetization is pretty
clear cut: I never wanted money to be involved in libraries but I always
encouraged people to monetize applications.  This is also why I was always
very liberal with my own choice of license (BSD, MIT, Apache) and
encouraged others to do the same.  Open Source libraries under permissive
licenses helps us all as developers.

I understand that there are many developers out there who are trying to
monetize libraries but I have no answer to that.  Money and Open Source
libraries is a tricky territory to which I have nothing to add.

However when it comes to monetizing Open Source applications I see many
different approaches.  One of them is what we did at Sentry: we Open
Sourced our server and client libraries and monetized our SaaS
installation.  This from where I stand is a pretty optimal solution
because it allows developers to use the software on their own and
contribute to it, but also allows you to monetize the value you provide
through the SaaS installation.  In the case of Sentry it has worked out
very well for us and there is very little I would change about that.

But there is a catch …

## The SaaS Problem

Obviously there is an issue with this which is why we're playing around
with changing the license.  We love Open Source and continue to do so, but
at one point someone has to make money somewhere and that better be done
in the most clear way possible.  I don't want a company that runs on
donations or has a business model that just happens to run by accident.
For SaaS businesses there is always the risk that it could turn into a
margin business.  What stops someone from taking the Sentry code and
compete with the sentry.io installation not investing any development
efforts into it?

This is not a new problem and many companies have faced it before.  This
is where a pragmatic solution is necessary.

The goal is to ensure that companies like Sentry can exist, can produce
Open Source code but prevent competition on it's core business from its
own forks.

## Open Source — Eventually

Open Source is pretty clear cut: it does not discriminate.  If you get the
source, you can do with it what you want (within the terms of the
license) and no matter who you are (within the terms of the license).
However as Open Source is defined — and also how I see it — Open Source
comes with no strings attached.  The moment we restrict what you can do
with it — like not compete — it becomes something else.

[The license of choice is the BSL](https://blog.sentry.io/2019/11/06/relicensing-sentry).  We looked at
many opens and the idea of putting a form of natural delay into our
releases looked the most appealing.  The BSL does that.  We make sure that
if time passes all we have, becomes Open Source again but until that point
it's almost Open Source but with strings attached.  This means for as long
as we innovate there is some natural disadvantage for someone competing
with the core product while still ensuring that our product stays around
and healthy in the Open Source space.

If enough time passes everything becomes available again under the Apache
2 license.

This ensures that no matter what happens to Sentry the company or product,
it will always be there for the Open Source community.  Worst case, it
just requires some time.

I'm personally really happy with the BSL.  I cannot guarantee that after
years no better ideas came around but this is the closest I have seen that
I feel very satisfied with where I can say that I stand behind it.

## Money and Libraries

The situation is much more complex however with libraries, frameworks and
everything like this.  The BSL would not solve anything here, it would
cause a lot of friction with reusing code.  For instance if someone wants
to pull reusable code out of Sentry they would have to wait for the
license conversion to kick in, find an older version that is already open
source or reach out to us to get a snippet converted earlier.  All of this
would be a problem for libraries.

At Sentry we very purposefully selected what falls under the license.
For instance we chose not to BSL license for components where we believe
that pulling efforts together is particularly important.  For instance our
native symbolication libraries and underlying service ([symbolicator](https://blog.sentry.io/2019/11/06/relicensing-sentry)) will not get
the BSL because we want to encourage others to contribute to it and bundle
efforts.  Symbolicator like symbolic are components that are very similar
to libraries.  They are not products by themselves.  I could not monetize
Flask, Jinja or anything like this this way and I have absolutely no
desire to do so.

At the same time I cannot count how many mails I got over the years from
people asking why I don't monetize my stuff, questions from people about
how they should go about monetizing their code.

I do not have an answer.

I feel like there is no answer to this.  I remember too many cases of
people that tried to do dual licensing with code and ended up regretting
it after ownership was transferred or they had a fall out with other
partners.

I however want to continue evaluating if there are ways libraries can be
monetized.  For now the best I have is the suggestion for people to build
more Open Source companies with an Open Source (maybe BSL licensed)
product and encourage true open source contributions to underlying
libraries that become popular.  Open Source companies dedicating some of
their revenue to help libraries is a good thing from where I stand.  We
should do more of that.

I would however love to hear how others feel about money and Open Source.
Reach out to me in person, by mail, twitter or whatever else.
