public: yes
tags: [thoughts, opensource, licensing]
summary: More thoughts on Open Source licensing and companies.

The Life and Death of Open Source Companies
===========================================

You likely know that I've contributed `significantly to the Open Source community
</projects>`__, that I work `for an Open Source Company
<https://sentry.io/welcome/>`__, that we got `shit for calling ourselves
Open Source <https://news.ycombinator.com/item?id=36971490>`__ and that we
subsequently created `a new license <https://fsl.software/>`__ to address
at least some of these concerns.  I also shared `my personal thoughts
</2023/11/19/cathedral-and-bazaaar-licensing/>`__ on that license recently
which unfortunately promptly `attracted a bunch more negative comments
<https://news.ycombinator.com/item?id=38331173>`__ for that.  That
introduction might make me sound a tad bitter, so let's talk about
something else.

This Christmas I `received a 3D printer
<https://twitter.com/mitsuhiko/status/1738930820998369593>`__ and I love
it for two reasons.  Firstly, it was an unexpected gift from my wonderful
wife, who chose it.  She organized me a brand new `Bambu Lab A1
<https://bambulab.com/en/a1>`__ 3D printer.  It has been a few years since
I toyed around with 3D printing and it was mostly in the context of other
people assembling printers.  That's because even though I love toying
around with software, I cannot say the same for hardware.  This printer,
however, is remarkably easy to set up and use, significantly boosting my
enjoyment in this hobby.  For this purchase she had to balance my love for
Open Source with user friendly technology and I think given the good
experience, she chose well.

The printer comes with a brief guide for the initial setup.  In about 15
minutes of removing some screws and mounting some components we were off
to the races.  The cloud account appears optional but after scanning a QR
code I could operate it from my phone too.  It's quick, it's super plug and
play and it just feels like an incredibly well put together product.

Since I've had to leave the printer at home over the holidays, I've been
engaging in related activities like reading up, creating models, and
exploring the slicer software.  Emotions surrounding this printer are
*charged*.  If you step into the wrong parts of the internet you find a
lot of hate.  Some of it might be warranted, but others just feels
incredibly out of proportion.  I've noticed a fair amount of controversy
surrounding the printer online, largely centered on its Chinese origins,
its optional cloud service, and its impact on the Open Source 3D printing
community.  I won't talk much about the China part [1]_ here, but I do
want to talk about the cloud and license aspect.

The reason I even write about this printer is the licensing situation and
a bit of a rant about Open Source communities.  Here is what I believe is
currently happening, and I'm saying this as a person that knew next to
nothing until a few days ago about 3D printing: Bambu Labs is making some
other players in that space reconsider Open Source.

Bambu entered the industry in a very different way than anyone else
before.  They offer a user friendly experience at a very attractive price
point (lower than some of the competition).  They also added built-in
cloud service stuff and with a really good quality.  But it's a space
dominated by Open Source hardware and software.  And they don't really do
that.  Bambu seems to add new people into the 3D printing community who
don't care (or not as much) about Open Source.  Yet Bambu heavily
relied on Open Source software to put them on the map.

If you open their Bambu Studio, you can see that it's built on top of 
`PrusaSlicer <https://github.com/prusa3d/PrusaSlicer>`__ and
`SuperSlicer <https://github.com/supermerill/SuperSlicer>`__, both of
which are Open Source.  As both of those are licensed under AGPL (which is
a very viral license), `so is Bambu Studio
<https://github.com/bambulab/BambuStudio>`__.  But none of the firmware or
hardware designs of the Bambu printer are.  In fact, Bambu apparently is
also loading itself up with patents over in China, so they probably don't
care about Open Source much at all.  If I were Prusa (which in many ways
was the user friendly, dominant player before) I wouldn't be very happy.

So let's discuss Prusa: The Bambu A1 competes with Prusa's MK4 model
but is signficantly cheaper, faster and does more.  For the price of one
Prusa MK4 with shipping I could buy three Bambu A1 printers or two Bambu
A2 printers plus the AMS addon which adds multi-color printing.  There is
absolutely no reason to buy a Prusa MK4 today unless you want to support
Open Source or a European company (Prusa is from Czechia).

I was able tell that Prusa is reconsidering their Open Source approach and
that with a few days as a member of this community because people are
`complaining
<https://www.reddit.com/r/prusa3d/comments/10g6fgv/prusa_giving_up_on_its_open_source_roots/>`__
(the MK4 design is no longer Open Source and the firmware apparently no
longer developed in the open [2]_).  Prusa is not hiding that they are
reconsidering their ways thanks to a blog post by their founder about how
they are `reconsidering their Open Source ways
<https://blog.prusa3d.com/the-state-of-open-source-in-3d-printing-in-2023_76659/>`__:

    […] things we’ve been doing at Prusa Research for over ten years were
    only possible thanks to the great **3D printing community** and
    **open-source philosophy**. However, the new printers and software
    releases have made me think again about the current state of open
    source in the 3D printing world. How sustainable it is, how our
    competitors deal with it, what it brings to the community, and what
    troubles us as developers.  Consider this article as a **call for
    discussion** – as a kick-off that will (hopefully) open up a new
    perspective on the connection between open-source licensing, consumer
    hardware, and software development.

    […]

    The open-source movement relies on the fact that **everyone involved
    plays by the same rules**.

    — Josef Průša in `The state of open-source in 3D printing in 2023
    <https://blog.prusa3d.com/the-state-of-open-source-in-3d-printing-in-2023_76659/>`__

I strongly recommend reading that entire post, because it captures quite
well the challenging situation that Open Source companies are in.  My take
on this is very much the same as for our own situation at Sentry: building
a true Open Source company is hard.  Under the OSI definition of Open
Source you are put at a massive disadvantage as you are prevented from
putting protections in place that shield you from other competitors in
that place that chose not to play by the same rules but can leverage your
source.

Historically the GPL has provided some protections here, but in all
reality in the modern world it doesn't.  That's because distribution is
really no longer the defining element.  Yes, Bambu Studio has to be AGPL
licensed because so is what it's built on, but in many ways that's just the
enabler for a proprietary system that they have in place.  They have
reaped years of benefits from this, benefiting from the work of others.
Some paid, but also from many who contributed for free.

Here is what I think would be a negative outcome: if this situation forces
companies like Prusa to abandon their Open Source practices.

However, I believe this situation reaffirms my belief that licenses like
our `FSL <https://fsl.software/>`__ (TL;DR: it includes a two-year
commercial non-compete period, after which it transitions to either MIT or
Apache 2, depending on the choice) are a viable alternative, even though
they are not considered Open Source by today's definition.  Because one
thing is absolutely clear to me: Bambu carries inherent risk for me as a
user.  They manufacture the parts and provide the firmware.

If they go out of business, owning their device becomes much riskier than
owning printers from the Open Source community.  For an end-user, having an
Open Source license is a far stronger proposition.  That's why I find the
comparison of the FSL to a “source available” or even “proprietary”
license somewhat insulting. A hypothetical FSL-inspired license for Open
Source hardware would grant a hardware company a limited-time non-compete
advantage over other players in the space, while giving users and the
community the assurance that they hold the keys after two years.

The world around us is changing, and so must we as the Open Source
community.  Software distribution is no longer the main focus, with much
emphasis now on services.  The situation also changes for successful Open
Source hardware communities.  Their innovations are slowly reaching more
users, many of whom do not value Open Source as much. In some ways, the
protections in Open Source that worked in a commercial context are no
longer effective.

What Bambu has done — and which I believe will be appreciated in the long
term — is to make their products more accessible to a broader audience.  They
introduced 3D printing to people who were previously unwilling to invest
the time.  This means there's more potential for profit for everyone
involved, but it also means that it will be harder for Open Source to
compete, especially if Open Source entities don't get a grip of their user
experience and business models.  As a user, I wish I could have the Bambu
experience with an Open Source-like model, where the risk is managed over
the long term, while allowing the companies that create these products to
pay their employees and continue innovating.

.. [1] If you do care about my opinion here: I have no business with China.
   In some ways if I were to have to worry about something from a
   government, I care the least about China.  The US and my own one can
   cause a lot more problems to me.  If I were to never be able to go to
   China again, very little in my life would change.

.. [2] An earlier version of this blog post stated that the Firmware is no
   longer Open Source.  That is actually incorrect and what is no longer
   open is the controller design.
