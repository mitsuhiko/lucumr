---
tags:
  - thoughts
summary: A discussion on purchase decisions and sustainable Open Source.
---

# Accidental Spending: A Case For an Open Source Tax?

Both last week at London tech leaders and this week at the Open Source
Summit in Vienna I engaged in various discussions about pledging
money to Open Source.  At Sentry we have been [funding our Open Source
dependencies](https://blog.sentry.io/we-just-gave-500-000-dollars-to-open-source-maintainers/)
for a few years now and we're trying to encourage others to do the same.

It’s not an easy ask, of course.  One quite memorable point raised
was what I would call “accidental spending”.  The story goes like this:
an engineering team spins up a bunch of Kubernetes machines.
As the fleet grows in scale some inefficiencies creep in.  To troubleshoot
or optimize, additional services such as load balancers, firewalls, cloud
provider log services, etc. are provisioned with minimal discussion.
Initially none of that was part of the plan, but ever so slightly for
every computing resource, some extra stuff is paid on top creating largely
hidden costs.  Ideally all of that pays off (after all, hopefully by
debugging quicker you reduce that downtime, by having that load balancer
you can auto scale and save on unused computing resources etc.).
But often, the payoff feels abstract and are hard to quantify.

I call those purchases “accidental” because they are proportional to the
deployed infrastructure and largely acting like a tax on top of
everything.  Only after a while does the scale of that line item become
apparent.  On the other hand intentionally purchasing a third party system
is a very intentional act.  It's very deliberate, requiring conversations
and more scrutiny is placed for putting a credit card into a new service.
Companies providing services understand this and are positioning
themselves accordingly.  Their play could be to make the case that that
their third party solution is better, cheaper etc.

Open Source funding could be seen through both of these lenses.  Today, in
many ways, pledging money to Open Source is a very intentional decision.  It
requires discussions, persuasion and justification.  The purpose and the
pay-off is not entirely clear.  Companies are not used to the idea of
funding Open Source and they don't have a strong model to reason about
these investments.  Likewise many Open Source projects themselves also
don't have a good way of dealing with money and might lack the governance
to handle funds effectively.  After all many of these projects are run by
individuals and not formal organizations.

Companies are unlikely to fund something without understanding the return
on investment.  One better understood idea is to turn that one “random
person in Nebraska” maintaining a critical dependency into a
well-organized team with good op-sec.  But for that to happen, funding
needs to scale from pennies to dollars, making it really worthwhile.

My colleague Chad Whitacre floated an idea: what if platforms like AWS or
GitHub started [splitting the check](https://openpath.chadwhitacre.com/2024/a-vision-for-software-commons/)?
By adding a line-item to the invoices of their customers to support Open
Source finding.  It would turn giving to Open Source into more of a tax
like thing.  That might leverage the general willingness to just pile up
on things to do good things.  If we all pay 3% on top of our Cloud or SaaS
bills to give to Open Source this would quickly add up.

While I’m intrigued by the idea, I also have my doubts that this would
work.  It goes back to the problem mentioned earlier that some
Open Source projects just have no governance or are not even ready to
receive money.  How much value you put on a dependency is also very
individual.  Just because an NPM package has a lot of downloads does not
necessarily mean it's critical to the mission of the company.  [rrweb](https://www.rrweb.io/) is a good example for us at Sentry.  It sits at
the core of our session replay product but since we we vendor a pinned
fork, you would not see rrweb in your dependency tree.  We also value that
package more than some algorithm would be able to determine about how
important that package is to us.

So the challenge with the tax — as appealing as it is — is that it might
make the “purchase decision” of funding Open Source easier, but it would
probably make the distribution problem much worse.  Deliberate,
intentional funding is key.  At least for the moment.

Still, it’s worth considering.  The “what if” is a powerful idea.  Using a
restaurant analogy, the “open-source tax” is like the mandatory VAT or
health surcharge on your bill: no choice is involved.  Another model could
be more like the tip suggestions on a receipt offering a choice but also
guidance on what’s appropriate to contribute.

The current model we propose with our upcoming [Open Source Pledge](https://osspledge.com/about/) is to suggest like a tip what you
should give in relation to your developer work force.  Take the average
number of full time engineers you have over a year, multiply this by 2000.
That is the amount in US dollars you should give to your Open Source
dependencies.

That sounds like a significant amount!  But let's put this in relation for
a typical developer you employ: that's less than a fifth of what you would
pay for FICA (Federal Insurance Contributions Act in the US) in the US.
That's less than the communal tax you would pay in Austria.  I'm sure you
can think of similar payroll taxes in your country.

I believe that after step one of recognizing there is a funding problem
follows an obvious step two: having a baseline funding amount that stands
in relation to your business (you own or are a part of) of what the amount
should be.  Using the size of the development team as a metric offers an
objective and quantifiable starting point.  The beauty in my mind of the
developer count in particular is that it's somewhat independently
observable from both the outside and inside 1.  The latter is important!  It
creates a baseline for people within a company to start a conversation
about Open Source funding.

---

If you have feedback on this, particular the pledge I invite you mail me
or to leave a comment on the Pledge's [issue tracker](https://github.com/opensourcepledge/osspledge.com/issues).

1There is an analogy to historical taxation here.  For instance the
[Window Tax](https://en.wikipedia.org/wiki/Window_tax) was taxation
based on the number of Windows in a building.  That made enforcement
easy because you could count them from street level.  The downside of
taht was obviously the unintended consequences that this caused.
Something to always keep in mind!
