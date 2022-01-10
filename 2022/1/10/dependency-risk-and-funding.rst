public: yes
tags: [thoughts, javascript, opensource]
summary: |
  Some more thoughts about dependencies.

Dependency Risk and Funding
===========================

I have a love/hate relationship with dependencies.  I wrote about this
extensively on this blog.  Once about the challenges with `scaling trust
in dependencies </2019/7/29/dependency-scaling/>`_ and earlier about `the
problem with micro dependencies </2016/3/24/open-source-trust-scaling/>`_.
Somehow very unsurprisingly nothing has actually improved in that regard
in the last 5 years.  In fact, I think the problem has become
significantly worse.  Where a few years back the main fear here was high
profile developers being targeted, the dependency discussion is now
overlapped and conflated with discussions about funding and
sustainability.

I'm sure everybody remembers the `XKCD on dependencies <https://xkcd.com/2347/>`_:

.. figure:: https://imgs.xkcd.com/comics/dependency.png
   :align: center

   Comic by XKCD, `#2347: Dependency <https://xkcd.com/2347/>`__.
   `CC BY-NC 2.5 <https://creativecommons.org/licenses/by-nc/2.5/>`__

What I like about this comic is that you can insert a whole bunch of
projects in your head into that comic.  I like to imagine that the
mentioned project is `Curl <https://curl.se/>`__.  It's maintained largely
by a single person — Daniel Stenberg — for more than 20 years.  Curl is a
good example of an actual crucial dependency.  It's *everywhere*.  I have
seen it on game consoles, in cars, on MP3 players, smart speakers, bluray
players, embedded devices, command line utilities, backend servers, …
It's not only an incredible useful software, it's also solving a hard
problem.  It's also not a small dependency either.  Curl is a whole
package of useful functionality.  If curl ceases to exist it would be
clearly bad for society.

However.  How can curl disappear?  Curl is not just one of the most
important dependencies, it's also one of the most resilient dependencies.
When you or me install curl, we rarely install it from the official
website.  Curl is more likely to come from a mirror, vendored into a
library we're using, there are a lot of forks in proprietary code bases
etc.  Curl is an unkillable dependency.  Not only can the website go down,
also the original developer could probably go away and someone would pick
up the work, it's that useful.

Let's contrast this for a second with the situation on npm.  One of the
most dependent on libraries is in fact `colors
<https://www.npmjs.com/package/colors>`__.  The library is effectively
emitting ANSI codes for colorization.  A useful feature for sure, but not
world shattering.  I would go out on a limb and say that this type of
functionality very often is implemented directly instead of depended on.
For instance when I wrote `click <https://click.palletsprojects.com/>`__ I
purposefully decided to implement ANSI coloring right in my own library
without depending on something.  My hunch is that it wouldn't take long to
rip out and replace
that library.

A few days ago the developer behind that library decided to release a new
version of the library that no longer does what it advertised on the tin.
Since it was a minor update quite a few people ended up with that version.
They didn't however even know that they were depending on “that one
package”, they probably pulled it in because something else in their
dependency chain needed it.

If you went to the GitHub repo of that developer you found two things:
some conspirational content in the readme of the repo, but also a
justification for why their library no longer did what it was supposed to
do: the developer was dissatisfied with “fortune 500” using their code for
free and asked for a six figure contract or for people to fork it.

What I wish people would actually start discussing when it comes to these
things is that npm (and other package managers) have developed into
incredible levers.  Someone who has a package with a lot of dependents one
can easily knock out that piece of all modern digital infrastructure.
Daniel Stenberg of curl doesn't wield that power (and probably also
doesn't want to).

The risk a dependency poses is high with small, more commonly used
dependencies, by a single unvetted developer, installed through a package
manager like npm, cargo, pypi or similar.  Yet when something goes wrong
there, everybody immediately notices and people quickly call for funding.
Yet those are not the dependencies that actually support our economy.
Many of those dependencies became that foundational, not because they are
solving a hard problem, but because we collectively started embracing
laziness over everything else.  When we then focus our funding discussions
around these types of dependencies, we're implicitly also putting the
focus away from the actually important packages.

I appreciate what GitHub does with sponsors and I think it's an awesome
idea.  I also appreciate that GitHub puts a finger at funding Open Source
being an issue, but unfortunately there is a dark side to this: it points
the finger to where it's easy.  GitHub like npm point the finger to what
computers can easily explain.  `My code flew to mars
<https://github.blog/2021-04-19-open-source-goes-to-mars/>`_.  That's
awesome.  But that Badge of honor I now carry on my GitHub profile I got
because they crawled the Python dependency list.  Together with my badge
the folks that created lxml got a badge.  However Daniel Veillard who
maintains the underling libxml2 library received no such badge.  In fact
many people probably forget that libxml2 even exists or that they might be
using it, because it's hidden behind a much more fancy high level facade
that hides it.  Unlike an npm package, you don't download libxml2 from
somewhere when you install lxml.  libxml2 like curl doesn't have the
lever or visibility.  Yet the amount of work and dedication that went into
the library is significant.  And he's just one of thousands of developers
who have created incredible libraries we all still use.

Clearly we need to solve funding of Open Source projects and I love that
GitHub sponsors is a thing.  But I think we need to find a better way to
assess impact of libraries than just how many people depend on this on
npm or other package managers.  Because that's by far not the whole
picture.
