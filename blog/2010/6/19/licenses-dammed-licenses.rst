public: yes
tags: [licensing]
summary: |
  Adventures in License land.  We need more lawyers in the open source
  world.

Licenses dammed Licenses
========================

Just wanted to share a few mistakes I made regarding licensing of `Flask
<http://flask.pocoo.org/>`_ and some general suggestions of how to
handle it. Also I would like to explain a problem I have with open
source licenses in general and if you have some suggestions. Disclaimer:
IANAL and what I write down there might be completely wrong. If you know
better, please let me know. (And I mean it. Granted, I hate licensing,
but I also depend on them so I want to have a good understanding of what
the heck I'm actually doing by licensing my stuff) 

Closed Open
~~~~~~~~~~~

I love Open Source, I really do. All my code is licenses under the very
generous BSD license which comes with barely any strings attached: do
what you want, keep the copyright around, do not use my name to endorse
derived products. And I am totally fine with that. But that is my take
on code alone. When it comes to artwork and design I would love to use a
less open license. Why? Let's take the `Flask documentation
<http://flask.pocoo.org/docs/>`_ as an example. This documentation has a
nice and simple stylesheet and is still unique enough that one could
recognize Flask or Flask related projects from it. So I would love (but
can't) limit that license to something like: use this only for Flask
related projects or modify it enough to be visually different. Now of
course that is a fishy description, but this could be fixed. The problem
however is that this is no longer an open source license (which I would
not have any problems with). After all that also forces Linux
distributions like Debian to ship a modified version of my project with
a different style for the documentation because they have to reject such
packages or put it into the non-free section. 

Both things I would love to avoid, so I back-paddled on my licensing
plans and put the themes under the BSD license with friendly reminder
now. But when I was changing the license an interesting thing came up:
could it be that the old theme was partially unlicensed? Now one
stylesheet was already BSD licensed, that was not a problem, the
template files and everything else did not have a license header nor was
a LICENSE file in place. The way Flask used that style was with a git
submodule. Interestingly this was not present in the source distribution
of Flask. So unless Debian made any changes, the docs would not build
out of the box on a Debian system anyway which brought back my idea for
going the non-free path with docs. But that is now past in any case, so
let's move on. But the more interesting question here is what license
that thing is under now. I am pretty sure one could argue that the
original documentation was not licensed, thus closed source and all
Flask extensions I did not write were violating the license (which was
never the intention because the documentation strongly recommends the
Flask documentation themes). 

Licensing Documentation
~~~~~~~~~~~~~~~~~~~~~~~

Licenses from a source POV are already crazy, but when it comes to
documentation texts, images and everything else involved in a modern
application or even software library the whole thing becomes way more
complex. Like many others I so far licensed my code under the BSD
license and I did that by adding a quick licensing header to all files
and adding a LICENSE file with the license text. The license text was
more or less the original three-clause BSD license text with "University
of Berkley" replaced by "Copyright Holder" and a line that describes who
the copyright holder is/are so that copy/pasting that license gets
easier. With Flask I now made a change to that license so that it not
only mentions source and binaries, but also the documentation explicitly
(`read the new license
<http://flask.pocoo.org/docs/license/#flask-license>`_). From a legal
point of view it should still be the same as before, but now explicitly
mentions the documentation. That documentation should get their own
license is something I did not come up with, other people did that
before me. Which is why there exists a list of documentation licenses:
`GNU Free Documentation License
<http://www.gnu.org/licenses/fdl.html>`_, `FreeBSD Documentation License
<http://www.freebsd.org/copyright/freebsd-doc-license.html>`_, the
`Creative Commons Licenses
<http://en.wikipedia.org/wiki/Creative_Commons_licenses>`_ and many
more. 

Now my first plan was to adapt the FreeBSD Documentation License because
it is very close to the BSD license and should not cause any troubles
switching to without having to ask all the persons who provided patches.
Though a licensing change is a licensing change and even if just the
wording changed I would not pull this off without sending out mails
first. But before I even came to that, I noticed that this would not
work out at all. Because if that is assumed to be a different license
than the BSD license used previously the final built documentation would
be affected by both the BSD and now the FreeBSD documentation license.
Why that? Because the sourcecode itself is still under the BSD license
and with that the docstrings in there which are pulled directly into the
final documentation. While one could argue in many programming languages
that the comments are under a different license, this does not work out
well in Python where the docstrings are available at runtime. They are
clearly part of the program. 

My final change was to take the previous BSD license and explicitly add
"and documentation" to everything that previously just listed "source"
and "binary" form. 

I am quite confident that this is overkill but still serves the purpose.
To be honest I doubt anyone would ever want to sue anyone based on
ambiguous documentation licenses, but for me the whole point of a
license is to be something I can defend my project on. And as such I
want to have a clear understanding for myself what exactly is under
which license. If someone would have asked me a week ago under that
license my documentation was, I would have answered with BSD. If then
that person would have asked me where this was written down I would have
had a harder time explaining that "source" also means restructured text
and "binary" also means HTML. 

Logos and Design
~~~~~~~~~~~~~~~~

Now this is where I am totally lost. When I was asking on Twitter what
license to pick for a project logo, people answered with the creative
commons attribute non-derivative 3.0 license (hereby named CC-ND-3.0).
Now I actually did license that logo under that license and even shipped
it with the documentation and the Flask tarball, and it also ended up in
Debian. The interesting part is that the website clearly mentioned the
license as CC-ND-3.0. I just violated my own license and from my
understanding of the copyright law, what I released should be considered
CC-ND-3.0 for the logo because I would not be legally allowed to license
that as BSD. This is pretty weird because as a copyright holder I can
release that thing under anything but you could argue that because the
LICENSE file was not in the same folder as the logo and the logo was
just copied there, it not automatically becomes BSD licensed. That's
like if I would copy the Debian logo into my project it does not become
BSD licensed, I just made a license violation by not adding the license.
Again, in the Debian can I'm not the copyright holder, but I could
imagine that if that would have to be defended in court, the same logic
would apply. 

Either way, the interesting part here is that the CC-ND-3.0 license is
not accepted in Debian because it is not a free license. So in theory if
my package would be a license violation and I correct this license
violation by revoking all current releases, and re-release those
packages with a license text for CC-ND-3.0 Debian would have to update
all their tarballs to exclude the logo from it. It's fun to see how such
small differences can cause such an amount of troubles for all parties
involved. So I decided not to be a dick and adapt a very simple license
for the logo (`read license text
<http://flask.pocoo.org/docs/license/#flask-artwork-license>`_) that is
formed after the Debian free logo license. It also has a BSD-ish clause
regarding endorsements by Flask authors and recommends linking to the
Flask project website. From what I understand, old release are now okay
in compliance with the new license which also works retroactively so
Debian should be in the clear. However the source version of the logo
(the SVG file) still has to come with the license text which never was
part of the distribution tarballs. 

Logo and Design Protection
~~~~~~~~~~~~~~~~~~~~~~~~~~

At that point I'm totally convinced that there is no way, besides
registering a trademark, to protect your logos for an open source
project. Restrictive licenses are not accepted by Debian and many other
Linux distribution causing a lot of work for all parties involved.
Sounds pretty bad for small open source projects but in reality the
majority of people are reasonable and have no problems with accepting
"recommendations" or "kind requests" in licenses. 

Of course once your logo is BSD-ish licensed people actually could use
the logo for something completely different. I would love to hear about
a reasonable recommendation in that regard besides: just ignore it. The
point is: as long there is no license, it is closed source and Debian
cannot ship it. I am also not totally sure exactly what the Debian logo
license (and as such the Flask logo license) exactly allows. May you now
use this logo as a bullet point on a website not related to Flask? From
my understanding yes, because otherwise it would not be considered open
source, but what exactly is the legal interpretation of this sentence be
then? 

    This logo or a modified version may be used by anyone to refer to
    the Flask project, but does not indicate endorsement by the project.

At that point I am totally lost and just want to ignore that problem,
but it would be interesting how an open source project can get a bit of
control over the non-source parts. Logos are something I would love to
see sort-of protected. 

To come back to the copyright problem with the documentation style: I am
well aware of the fact that protecting visual appearances on copyright
is not possible. One could replicate a 1:1 version of the Flask
documentation design for instance by never looking at the original CSS
and template files and would be totally fine (clean room reverse
engineering). But to be honest, nobody does the work of reproducing the
documentation style 1:1, that would be far more complex and time
consuming than creating your own. I have no problems whatsoever with
people who take the design and add their personal touch to it. In that
case why not use my source files? 

**tl;dr:** licensing is hard, let's go shopping.

