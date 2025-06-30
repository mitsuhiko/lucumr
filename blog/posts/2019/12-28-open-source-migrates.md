---
tags:
  - opensource
  - thoughts
summary: "How the Open Source community gets away with large, backwards
incompatible migrations by cheating and a lot of emotional distress."
---

# Open Source Migrates With Emotional Distress

Legacy code is bad and if you keep using it, it's really your own fault.
There are many variations of the same thing floating around in Open Source
communities and it always comes down to the same thing: at one point
something is being declared old and it has to be replaced by something
newer which is better.  That better typically has some really good
arguments on its side: we learned from our mistakes, it was wrong to begin
with or something along the lines of it being impure or that it propagated
bad ideas.  Maybe that new thing only supports the newest TLS/SSL and you
really should not longer be using the old versions because they are
insecure.

Some communities as a whole for instance are suffering from this a whole
lot.  Every few years a library or the entire ecosystem of that community
is thrown away and replaced by something new and support for the old one
ends abruptly and arbitrarily.  This has happened to the packaging
ecosystem, the interpreter itself, modules in the standard library etc.
How well this works out depends.  Zope for instance never really recovered
from it's Zope 2 / Zope 3 split.  Perl didn't manage it's 5 / 6 split
either.  Both of those projects ended up with two communities as a result.

Many open source communities behave exactly the same way: they are
replacing something with something else without a clear migration path.
However some communities manage to survive some transitions like this.

This largely works because the way open source communities are managing
migrations is by cheating and the currency of payment is emotional
distress.  Since typically money is not involved (at least not in the
sense that a user would pay for the product directly) there is no obvious
monetary impact of people not migrating.  So if you cause friction in the
migration process it won't hurt you as a library maintainer.  If anything
the churn of some users might actually be better in the long run because
the ones that don't migrate are likely also some of the ones that are the
most annoying in the issue tracker.  In fact Open Source ecosystems manage
these migrations largely by trading their general clout for support of a
large part of their user base to become proponents for a migration to the
updated ecosystems.  Open Source projects nowadays often measure their
popularity through some package download counts, Github stars or other
indicators.  All of these are trending upwards generally and it takes a
really long time for projects to lose traction because all the users count
against it, even the ones that are migrating off frustratedly.

The cheat is to convince the community as a whole that the migration is
very much worth it.  However the under-delivery to what is promised then
sets up the community for another one of these experiences later.  I have
seen how GTK migrated from 1, to 2 and then later to 3.  At any point it
was painful and when most apps finally were on the same version, the next
big breaking change was coming up.

Since the migration causes a lot of emotional distress, the cheat is
carried happily by the entire community.  The big Python 3 migration is a
good example of this: A lot of users of the language started a community
effort to force participants in the ecosystem to migrate.  Suffering
together does not feel as bad, and putting yourself on the moral right
side (the one that migrates vs the ones that are holding off) helps even
more.  That Python 3 effort was less based on reasonable arguments but on
emotions.  While the core of the argument was correct and a lot of stuff
was better on Python 3, it took many iterations not to regress in many
other aspects. Yet websites were started like a big "wall of shame" for
libraries that did not undergo the migration yet.  The community is very
good at pushing through even the most controversial of changes.  This tour
de force then became something of a defining characteristic of the
community.

A big reason why this all happens in the first place is because as an Open
Source maintainer the standard response which works against almost all
forms of criticism is “I'm not paid for this and I no longer want to
maintain the old version of X”.  And in fact this is a pretty good
argument because it's both true, and very few projects actually are large
enough that a fork by some third party would actually survive.  Python for
instance currently has a fork of 2.7 called [Tauthon](https://github.com/naftaliharris/tauthon) which got very little
traction.

There are projects which are clearly managing such forceful transitions,
but I think what is often forgotten is that with that transition many
people love the community who do not want to participate in it or can't.
Very often a backwards incompatible replacement without clear migration
might be able to guide the majority of people but they will lose out on
many on the fringes and those people might be worthwhile investment into
the future.  For a start such a reckless deprecation path will likely
alienate commercial users.  That might be fine for a project (since many
are non profit efforts in the first place) and very successful projects
will likely still retain a lot of commercial users but with that user base
reduced there will be reduced investments by those too.

I honestly believe a lot of Open Source projects would have an easier time
existing if they would acknowledge that these painful migrations are
painful for everybody involved.  Writing a new version that fixes all
known issues might be fun for a developer in the first place, but if they
then need to spend their mental and emotional capacity to convince their
user base that migrating is worth the effort it takes out all the
enjoyment in the process.  I have been a part of the Python 3 migration
and I can tell you that it sucked out all my enjoyment of being a part of
that community.  No matter on which side you were during that migration I
heard very little positive about that experience.

Setting good migration paths rewards you and there are many projects to
learn from for how to manage this.  It's lovely as a user to be able to
upgrade to a new version of a project and the upgrade is smooth.  Not only
that, it also encourages me as a user to give back valuable contributions
because there is a high chance that I can use it without having to be
afraid that upgrading is going to break all my stuff.

It's also important to realize that many projects outside the Open Source
world just do not have the luxury to break backwards compatibility this
easily.  Especially when you work in an environment where hundreds of
systems have to be interoperable migrations are really hard and you
sometimes have to make decisions which seem bad.  The open source
community was much quicker in dropping support for older TLS standards
than many others because they did not have to live with the consequences
of that change really as they force everybody to upgrade.  That's just not
always possible for everybody else at the speeds envisioned.

I'm writing this because we're a few days away from the end of life of
Python 2 at which point the community is also going to stop maintaining a
lot of valuable tools like pytest, pip [^1] and others for Python 2.
Yet the user base of the language has only migrated to ~50%.  My own
libraries which are now maintained by the [pallets](https://palletsprojects.com/) community are joining in on this
something I can understand but don't agree with.  I really wish the Python
community all the best but I hope that someone does a post-mortem on all
of this, because there are lots of things to be learned from all of this.

[^1]: it has correctly been pointed out that pip is not deprecating
Python 2 support [any time soon](https://pip.pypa.io/en/stable/development/release-process/#python-2-support).
