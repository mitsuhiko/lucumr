public: yes
tags: [thoughts, licensing]
summary: |
  Some thoughts about the absolute madness that is currently going on with
  licensing in the Open Source community and how github's license chooser
  is making it worse.

Licensing in a Post Copyright World
===================================

The GPL used to be the cornerstone of the Open Source movement.  At least
it always felt that way.  Clearly if you looked closer the situation has
always been a situation of many licenses and the GNU GPL was only a small
part of it.  In recent years however it has become painfully obvious that
a lot of developers have built up an open hatred for the licenses on
different levels.

What I found surprising however is how little the license is being
discussed nowadays.  If you Google for discussions on the GPLv3 the most
you are generally greeted with links to articles from 2006 and earlier
when the debate about the latest revision of the GNU GPL was at its
height.  However none of the concerns of the discussions back then were
ever addressed and you can see today that this has left a big impact on
how the GPL is seen today.

The whole topic got a lot of relevance for me again recently due to
GitHub.  GitHub is one of the pillars of Open Source development these
days and yet it's also a place where there is more improperly than
properly licensed software.  Their attempt to change that has been a
simple license selector and I believe that is a terrible idea, especially
because it brings up the whole GPL topic again.

This article is opening up a bit of the history of Open Source software
licensing, how it seems to change and what we could do to improve it.

What Changed in 2007
--------------------

Until the GNU GPLv3 released, the number one Copyleft license was the GNU
GPLv2 [#gplstat]_.  Copyleft and GNU GPL were seen as the same thing.  GPL
is a very restrictive license in the sense that it whitelists rights
instead of just putting a handful of requirements into a license that
otherwise permits everything.  This made the whole topic of GPL
compatibility was always something that people discussed.  GPL
compatibility is generally just the idea that a license can downgrade to
the GPL.  Most licenses were able to do that, but some licenses had some
pieces of text that made this impossible.  Most famously the Apache
License 2.0 was seen as GPL incompatible due to extra restrictions on
patents and some versions of the Mozilla Public License.

Sun liked the whole concept of not being compatible with GPL and later
drafted a new license on basis of the Mozilla Public License version 1.1
which was deemed GPL incompatible and created the Common Development and
Distribution License (CDDL).  This allowed them to release software under
an Open Source license without allowing the Linux developers to take
advantage of their open contributions.

In 2007 the whole topic of GPL compatibility became a whole lot more
complicated as a new version of the GPL was written.  Due to how the GPL
licenses work different versions of the GPL are incompatible with each
other.  That's not terrible surprising but it's important to note, because
it has quite profound implications given how people license code under the
GPL and how the ecosystem was supposed to work.

There is a lot of code out there that depending on how you look at it,
it's either GPLv2 or GPLv3.  This is due to it being possible to license
code under GPL of a specific version or any later version.  What defines
what a later version of a GPL license looks like?  The GPL itself [#gplv3]_:

    If the Program specifies that a certain numbered version of the GNU
    General Public License “or any later version” applies to it, you have
    the option of following the terms and conditions either of that
    numbered version or of any later version published by the Free
    Software Foundation.

There are three camps currently: the camp that stuck to GPLv2, the camp
that upgraded to GPLv3 and the camp that's GPLv2 or later and depending on
the context is either GPLv2 or GPLv3.

The most vocal projects about their disagreement with the GPLv3 have
certainly been Linux [#linuxgplv2]_ and Busybox [#busyboxgpl]_ which both
decided the only applicable license is the version 2 of the GPL.  On the
other hand the vast majority of GNU code has been changed over to the
GPLv3 a couple of years ago.

The fun effect of this now is that it's absolutely clear that there are
two different worlds in which GNU and Linux are living.  There is a
certain irony that “GNU/Linux” is now a sort of license conflict.  Since
the vast majority of GNU projects are on GPLv3 only and Linux will always
be GPLv2 there is no more code sharing that can happen between these
projects as a result.

The GPLv3 switch of projects primarily shows up because these pieces of
software stop being updated in Apple products or get removed entirely.
The bash on my Mac is now seven years old because that was the last
version released under GPLv2 and Apple does not allow GPLv3 software on
their systems.  It's not just my bash that has not been updated, most
famously for developers GCC on OS X is stuck a few year in the past.  This
has also resulted in Apple backing clang and LLVM instead of the GNU
compiler collection.

But why is Apple so opposed to newer versions of the GPL?  The problem is
that it has become clear in 2007 the GPL has become more of a political
platform instead of a software license and started to put restrictions
into the code that make it much harder to deal with.  At one point the GPL
primarily ensured that someone who distributes a piece of software under
the GPL has to ensure that derived works are provided under compatible
license terms.  Now however the license does more than that.

The biggest issue for companies with the GPLv3 is most likely the
“anti-tivoization” part of the license that has a whole extra section on
how the license interacts when it's part of a consumer product.  The exact
definition of what a consumer product is a vague definition of “any
tangible personal property which is normally used for personal, family or
house hold purposes” or alternatively “anything designed or sold for
incorporation into a dwelling”.  It also says that in case of doubt a
product should be seen as consumer product.

What happens if the product is a consumer product?  In essence the license
requires that a modified version of the software must be guaranteed to run
on an unmodified device.  The license requires that signing keys are in
the open, that the manual must include information about how modified
software can be installed and that the device has to ensure that modified
software can generally be run.  Thankfully the license does not require
that the distributor is not allowed to void the warranty in that case.

Generally however the license terms are a huge problem for companies.  For
instance Apple sells devices with a secured bootloader that is a consumer
product (all iPads and iPhones).  It would be impossible for them to
comply with the GPLv3 license requirements unless they completely get rid
of the devices' security systems.  And it's not just Apple.  You won't be
able to get your GPLv3 software in any app store, no matter how hard you
try.  The license restrictions of the AppStore, Google's Play Store and
similar distribution systems and the GPLv3 are just not compatible.

.. [#gplstat] `the 451 group: On the continuing decline of the GPL
   <http://blogs.the451group.com/opensource/2011/12/15/on-the-continuing-decline-of-the-gpl/>`_
.. [#gplv3] `GNU General Public License Version 3
   <http://www.gnu.org/licenses/gpl-3.0-standalone.html>`_
.. [#linuxgplv2] `Linus Torvalds on the GPL Version being used (2007)
   <http://thread.gmane.org/gmane.linux.kernel/372812>`_
.. [#busyboxgpl] `LWN: Busy busy busybox <http://lwn.net/Articles/202106/>`_

The Stricter GPL
----------------

That's however not the only thing that happened in 2007.  Another license
was published: The GNU Affero GPLv3 [#agplv3]_.  In license text nearly
equivalent to the GPLv3 it has some extra restrictions in that the license
triggers in other ways than pure distribution.  The license was written to
make it possible to enforce the GPL in environments where no traditional
distribution takes place.  Primarily aim was taken at web services that
use GPL software but only provide functionality through a web interface or
API.

Since the GPL cannot be further restricted the solution to make GPLv3 and
AGPLv3 compatible are provisions added to both licenses that all them to
work together.

The AGPLv3 was a terrible success, especially among the startup community
that found the perfect base license to make dual licensing with a
commercial license feasible.  MongoDB, RethinkDB, OpenERP, SugarCRM as
well as WURFL all now utilize the AGPLv3 as a vehicle for dual commercial
licensing.  The AGPLv3 makes that generally easy to accomplish as the
original copyright author has the rights to make a commercial license
possible but nobody who receives the sourcecode itself through the APLv3
inherits that right.

I am not sure if that was the intended use of the license, but that's at
least what it's definitely being used for now.

.. [#agplv3] http://www.gnu.org/licenses/agpl-3.0-standalone.html

Anti GPL Movement
-----------------

In parallel to all the new developments in the GPL environment, outside of
it quite a few things developed.  Not all of them had the same impact
obviously, but they are countless and generally resulted in people looking
at the GPL in a new light.

Toybox for instance is a project that's prime existence is to not be GPL
licensed.  It's being developed by Rob Landley who was the previous
maintainer of the GPLv2 licensed Busybox project of similar scope.  What's
interesting about Rob Landley is that he's the person who pulled through
the license clarification of Busybox to mean “GPLv2 only” instead of
“GPLv2 or later” [#busyboxgplv2l]_.  Shortly after he did that, he left the
project due to being annoyed with the efforts required to clarify the
license and the license trolling shown by some contributors to the
project [#busyboxtroll]_.

Considering that Busybox is one of the projects that got infamous for
enforcing the GPL through the legal system it's very interesting the
former maintainer would start a new project under Toybox based on the BSD
license.  The change in thinking can be seen from some conversations on
mailinglists and notes on his website.  The most glaring one is most
likely his statement about the effectiveness of the GPL cases:

    From a purely pragmatic perspective: I spent over a year doing busybox
    license enforcement, and a dozen lawsuits later I'm still unaware of a
    SINGLE LINE OF CODE added to the busybox repository as a result...
    [#landleygpl]_

In the same blog post he mentions how the response to GPLv3 by Google and
other companies has largely been boycott.  In regards to why he now goes
against the whole GPL and not just the GPLv3 is that Android and other
projects are now trying to rid the whole system of the GPL.  And that's
something that can clearly be seen.

Android goes very far in providing a GPL free userspace.  The general
license information [#androidlicense]_ generally tells people to license
under the Apache License 2.0 with the exception of kernel modules which
have to be GPLv2 licenses.  Here again the whole irony of kernel and
userspace being incompatibly kicks in.  As to why Google likes the ASL:

    We are sometimes asked why Apache Software License 2.0 is the
    preferred license for Android. For userspace (that is, non-kernel)
    software, we do in fact prefer ASL2.0 (and similar licenses like BSD,
    MIT, etc.) over other licenses such as LGPL.

    Android is about freedom and choice. The purpose of Android is promote
    openness in the mobile world, but we don't believe it's possible to
    predict or dictate all the uses to which people will want to put our
    software. So, while we encourage everyone to make devices that are
    open and modifiable, we don't believe it is our place to force them to
    do so.  Using LGPL libraries would often force them to do so.

Why are people so afraid of the GPL all the sudden?  Partially because the
GPL has always been a radical license.  Especially in the absence of
copyright reassignment.  For instance the GPLv2 comes with a clause that
has been dubbed the “GPLv2 death penalty” [#gpldeath]_.  Essentially it
means that whoever violates the GPLv2 automatically gets the license
terminated and not reestablished until they explicitly obtain a new
license.  Without one authoritative copyright holder it would essentially
mean to ask each and every contributor for a new license.

Now in reality GPL violations have always silently reestablished the
license for the violator once the dispute has been resolved, but the
license does not actually state that.  It's unlikely that this will ever
matter as clearly enough court cases can act as an example of silently
establishing the license again, but it does leave an ugly aftertaste.

More than anything it has become clear however that some think the FSF
just cannot be trusted.  There are two camps now around the FSF: the ones
that believe into the general ideology pioneered by Richard Stallman and
the ones that think the GPLv2 license is okay but that they are not okay
with the direction the license is taking.  Linus Torvalds obviously being
a more prominent supporter of the latter camp.  That camp exists because
the Free Software Foundation is largely stuck in their own world
[#fslosing]_ where cloud computing is the devil, cell phones are
exclusively tracking devices and Android is something the GPL should
prevent from happening.  There are GPL supporters that don't support the
current view of the Free Software Foundation which is dangerous,
considering they are the only ones that are in the position to shape the
future versions of the GPL.  Even some GNU projects seem to be disagreeing
with the goals of the GNU project and the Free Software Foundation.  On
December 10th 2012 GnuTLS split off the GNU project [#gnusplit]_.

.. [#gnusplit] `Nikos Mavrogiannopoulos: gnutls is moving
   <http://article.gmane.org/gmane.network.gnutls.general/3026>`_

The New Licensing
-----------------

As I mentioned before the reason I got interested with licenses again was
GitHub.  Or more to the point, a presentation by Aaron Williamson
[#githublicenses]_ from the Software Freedom Law Center in combination
with GitHub's latest changes of adding a license selector.

Aaron Williamson's unscientific study of scraping 28% of the oldest GitHub
repositories yielded the disappointing statistic that only ~15% of all
repositories had license files, and ~25% of those have the license only
mentioned in the Readme file.  Out of those licensed repositories the vast
majority are either MIT/BSD or Apache 2 licensed.  Only about third of all
projects where under a Copyleft license.

This general trend with throwing random code into the internet without
license declarations is questionable and asks some questions.  However I
think it shows more that people think licensing is unimportant and only
needs a bit of attention more than that people are unaware of the
existence of licenses.  As such I see GitHub's newly added license
choosing helper dialog problematic.  When you make a new repository it
gives you a dialog to pick a license without any explanation of what the
licenses mean.  It even bolds some licenses for you.  The ones that it
deems more important than others are “Apache v2 License”, “GPLv2” and
“MIT”.  The irony is that two of the licenses that the dialog deems
important are actually incompatible with each other.  (Apache and GPLv2).

If people did not spend any time before adding a license to their
repository they will spend no time thinking about the consequences of
licensing.  And with all the different forms of the GPL now and all the
legal implications that come from it, I am afraid this license selector is
going to make things worse rather than better.

The License Compatibility Clusterfuck
-------------------------------------

When the GPL is involved the complexities of licensing becomes a non fun
version of a riddle.  So many things to consider and so many interactions
to consider.

And that GPL incompatibilities are still an issue that actively effects
people is something many appear to forget.

For instance one would think that the incompatibility of the GPLv2 with
the Apache Software License 2.0 should be a thing of the past now that
everything upgrades to GPLv3, but it turns out that enough people are
either stuck with GPLv2 only or do not agree with the GPLv3 that some
Apache Software licensed projects are required to migrate.  For instance
Twitter's Bootstrap is currently `migrating from ASL2.0 to MIT
<https://github.com/twitter/bootstrap/issues/2054>`_ precisely because
some people still need GPLv2 compatibility.  Among those projects that
were affected were Drupal, WordPress, Joomla, the MoinMoin Wiki and
others.  And even that case shows that people don't care that much about
licenses any more as Joomla 3 just bundled bootstrap even though they were
not licenses in a compatible way (GPLv2 vs ASL 2.0).

The other traditional case of things not being GPL compatible is the
OpenSSL project which has a license that does not go well with the GPL.
That license is also still incompatible with the GPLv3.

The whole ordeal is particularly interesting as some not so nice parties
have started doing license trolling through GPL licenses.  The most recent
case is Oracle that relicensed Berkeley DB from BSD to APGLv3 which
started a lengthy discussion on debian-legal [#bdbapgl]_.  Primarily
because due to that package becoming AGPLv3 it implicitly changes the
effective license for 106 other packages to AGPLv3 as well.  Considering
the license change happens on a Debian installation and not in the
original source software this showcases how complicated licenses can
become.  The original software that depends on the Berkeley DB can remain
under its own license just fine if it just always depends on the old
version of the library that was BSD licensed.  But if Debian would decide
to make that software depend on the new version that is AGPLv3 licensed
then the whole software would change license to AGPLv3 as well.

.. [#busyboxgplv2l] `Rob Landley: GPL version 2 only for BusyBox 1.3.0
   <http://article.gmane.org/gmane.linux.busybox/16880>`_
.. [#busyboxtroll] `Rob Landley: I'm going out now. I may be some time
   <http://thread.gmane.org/gmane.linux.busybox/17254>`_
.. [#landleygpl] `Rob Landley on Toybox being BSD
   <http://landley.net/notes-2011.html#13-11-2011>`_
.. [#androidlicense] `Android Licensing Information
   <http://source.android.com/source/licenses.html>`_
.. [#gpldeath] `LWN: Android and the GPLv2 death penalty
   <https://lwn.net/Articles/455013/>`_
.. [#fslosing] `7 Reasons Why Free Software Is Losing Influence
   <http://www.datamation.com/open-source/7-reasons-why-free-software-is-losing-influence.html>`_
.. [#githublicenses] `Licensing of Software on GitHub: A Quantitative
   Analysis by Aaron Williamson
   <http://www.softwarefreedom.org/resources/2013/lcs-slides-aaronw/>`_
.. [#bdbapgl] `Berkeley DB 6.0 license change to AGPLv3
   <http://lists.debian.org/debian-legal/2013/07/msg00000.html>`_

Licenses and Intentions
-----------------------

You get a headache quite quickly thinking about all these ramifications
and reading debian-legal is a weird experience.  This gets worse when you
think about how people might have different interpretations of the
license.

On one hand it's entertaining, on the other it shows you how many people
pick licenses with ulterior motives that might not have been written into
the original license text.  One of my favourite threads on that issue is
the one about `Nuitka and GPLv3
<http://lists.debian.org/debian-legal/2012/01/msg00012.html>`_ which at
it's core is a discussion if the GPLv3 can be used to make it impossible
for others to commercialize the software.

This is especially bad in the GPLv3 which picks specific usecases that
were relevant at the time the license was written.  The license might now
be absolutely useless for new devices that will come up in a few years.
At that point it might be absolutely impossible to relicense the software
because some contributors might disagree or are no longer available.  This
has been a problem for many years already.  MariaDB had to rewrite
libmysql because it as GPL licensed.  Xapian is trying for years to get
GPL code out of the codebase as the original copyright holders are no
longer interested in the project or unavailable.

What if it will become illegal to sell consumer devices without signature
checks for all software running on it.  What if certification will be
required for system software?  The GPLv3 is already pretty irrelevant in
many areas as software companies have figured out that rewriting is less
of an issue than license fulfilment.

It's not just GPL though that is a problem here.  The Apache Software
License is quite a mouthful as well and I am pretty sure that not
everybody that licensed code under it read all of the implications of the
license.

As you remove text from the license other parts might be coming in.  The
MIT license is barely two paragraphs and a warranty statement, but how it
interacts with local law is not something everybody is aware of.  The
implicit assumption for many people is that somehow American law applies
but that's not always the case.  Open Source is international and not
every country is the same.  Germany and Austria for instance have very
few provisions bound to the Copyright itself and don't even provide
mechanisms to transfer it.  More is bound to the Usage right which the
copyright holder can sublicense.  Considering that doesn't actually happen
in the license declarations I sometimes wonder if someone could hang my
software up on that formality.

The Mashup Generation
---------------------

I believe what's currently happening is something that's new with my
generation and that's probably the biggest reason of decline for the GPL
going forwards.  My generation sees copyrights has a concept that should
be much more restricted and have a smaller lifetime.  This is
interestingly enough exactly what Richard Stallman does not want.  He's
painfully aware that Copyleft is based on Copyright and as such can only
be enforced if there is a strong Copyright behind it.

People that license software under the BSD or MIT license probably would
not mind that much if copyrights would be abolished or greatly restricted.
Richard Stallman's world on the other hand would would fall apart.  He
even made a statement about how the Pirate Party will backfire on Free
Software [#pirates]_.

The new generation has a new view on sharing and money as it stands.  They
want to make it easy to share content and software and also make it easy
at the same time to enable independent monetization.  This generation is
the generation that goes on youtube and makes reinterpretations of other
people's music,  that create narrated play-throughs through interactive
entertainment media like computer games,  that provide lessons involved
other people's content etc.

.. [#pirates] `Richard Stallman: How the Swedish Pirate Party Platform
   Backfires on Free Software
   <http://www.gnu.org/philosophy/pirate-party.html>`_

Real Help with Licensing
------------------------

Will this general approach cause problems?  Probably.  The current state
of licensing and license ignoring on GitHub is probably a good indication
that there will be problems.  But I think we should start to seriously
consider simplifying our software licensing environment as we otherwise
will have no ideas what will happen in a few years from now.

I think at that point it would be interesting to think about how to make
the explain people in the clearest possible way way the implications of
software licenses are and how they can reach their goal.  And that would
include some flow graphs that point out the problems with cross license
compatibility, what the lack of a contributor statement could mean, what
happens if copyright holders die or become unavailable and similar things.

I am pretty sure some clever UX designer could make that into an engaging
experience that gives people a licensing 101 in 10 minutes that includes
all important details in an engaging way.  But it would have to be backed
by information that an actual lawyer checked together with members of the
community to come to some conclusions about what it means for the
ecosystem.

Right now I believe, the license choosing wizard of GitHub is a shitty
“solution” to the problem of people not adding licenses to their code.
And it's probably not just a bad solution, it's one that might actually be
hurtful if people are not aware of what the effects of the respective
license are.
