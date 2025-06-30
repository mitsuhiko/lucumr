---
tags:
  - hg
  - bitbucket
summary: Old article about why I love bitbucket.
---

# Bitbucket is no Bit bucket

When [github](http://github.com/) appeared on the internets for the
first time, there was a short period of time when I saw the admins of
that sitehappy github users [See [the follow up to this post](/2008/9/20/apologies-to-github/)
for an explanation] jump into many IRC channels of projects that were
using git already to switch to github for hosting. Personally for me
that was alarming because after a while it appered that git without the
hub was no accepted option any more for open source projects.

Ever since [we](http://pocoo.org/)'re running our own server I think
nobody of us ever regretted to host our personal development tools such
as subversion (or now mercurial), trac, irc bots and a lot more. Root
servers have become pretty cheap (especially in Germany) and
debian/ubuntu make server administration a charm.

It really hit me hard when I noticed that people are sacrificing the
distributed nature of git and switch to a central hosting location, even
though they have their own server infrastructure (I'm looking at you,
rails team). Git was designed to not be dependent on a central server
and it just doesn't feel right in my eye to force people to switch to a
cental hosting platform because it provides things you would be missing
otherwise (branchviewers, fork overviews or something).

This was pretty much the reason why I wasn't interested that much in
[bitbucket](http://bitbucket.org/) either. I found it a well done
version of hgweb with very fair hosting plans with builtin wiki and bug
tracker. Basically the thing I would prefer over Google's code hosting
(I'm not a big fan of subversion any more you know).

A few days ago however I signed up on bitbucket so that I could push to
the [dozer](http://www.bitbucket.org/bbangert/dozer/) repository. A
few hours later jespern queried me on freenode and welcomed me to
bitbucket. First I was afraid the conversion that started would evolve
into a github like "switch to our service, you won't regret it"
conversion but it was actually nothing of that sort. That fear out of
the way I decided to try mirroring some of the pocoo repositories to
bitbucket (because well, you know: we do have some server outages from
time to time and a mirror is never a bad idea). And what should I say?
It's a really, really nice way to host open source project. I won't
compare it to github here which is very similar except that it uses git
rather than mercurial and doesn't offer a bug tracker and different
plans, but to google code which is a very popular project hosting
platform these days.

The big advantage over Google code is obviously that you are using
mercurial rather than Subversion. While a closed source project usually
has a known number of developers that all have access to the code an
open source project usually deals with code from constributors that
don't have access to the code. So I personally think that this alone
makes Google code look bad for open source projects.

Both Google code and bitbucket are providing a wiki and a bug tracker.
The wiki in Google code is implemented on top of Subversion which is not
really that interesting to know but it of course gives you the
possibility to access the data locally too. Bitbucket does something
very similar and stores the wiki pages in a separate mercurial
repository. Especially nice is that the wiki syntax is the well
established creole syntax which makes processing of the wiki pages
locally very easy. You can pull your complete wiki history as mercurial
repository and do whatever you want with it.

The bug tracker in bitbucket is probably the weakest part of the system.
While it provides a simple ticket system it is missing a good mercurial
integration (eg: that it listens for "this commit fixes #42") and
automatically closes / reopens tickets based on that information. There
is also no way to import or export the tickets as far as I can see but I
guess that this is a feature that could come in the future.

What's missing compared to Google code is a file hosting facilty. I
don't think that this is something bitbucket should provide in the
future, but that's definitively something a separate project shold try
to fix. Now that sourceforge is starting to look more and more like a
domain parking site and being less useful than ever, it's time for
someone to stand up and provide file and website serving :)

There are some things I'm missing on bitbucket currently that would be
nice to have. For example it would help mirroring a lot if it was
possible to add ssh keys directly to a project instead to a user so that
I can grant write access to an ssh key that is only used for mirroring.
Integration with CIA (the announcer bot) would be kick-ass too. Maybe it
would even possible to specify incoming hooks in form of urls. Every
time a changegroup comes in bitbucket would traverse the list of URLs
and send them a summary of the changesets as JSON dump. As noticed above
tracker <-> mercurial integration would be a nice to have as well as
export / import support for it.

I'm really impressed by bitbucket by now and can only recommend it for
project hosting. Most important: you are not selling your soul to
anyone. If you are unhappy with what you get, you can grab *all your
data* and go somewhere else thanks to mercurial. And that this is
possible should also give you a good feeling because it means that the
people behind bitbucket will care about you to not loose you. Because
the success of a website always depends on the number of happy users :-)

The (by now inofficial) pocoo mirrors are [listed on my bitbucket
account](http://www.bitbucket.org/mitsuhiko/). Don't get the headline?
[Read up bit bucket](http://en.wikipedia.org/wiki/Bit_bucket).
