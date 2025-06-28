public: yes
tags: [design, thoughts]
summary: |
  A few thoughts about how design on different levels and how users
  respond to it.

Appreciating Design
===================

I think no piece of software had a bigger impact on my work than
`Trac <http://trac.edgewall.org/>`_.  Nowadays people often look down on
Trac for various different reasons but if you keep in mind how bug
management and revision control web interfaces in the open source world
looked before Trac you can see why it initially had that much hype around
it.

Learning from Trac
------------------

When Trac was released tons of Open Source projects used it.  It had a
slick design and did the few things it provided quite well.  The wiki was
not great but useable, the integrated subversion support was very well
implemented and the bug Tracker was simple but friendly.  It was the first
bug Tracker that I had used that by default could have been presented to a
non technical user without having to tweak it.

Trac had a reasonable user interface design compared to the competition.
But the beauty of Trac has always been the code that runs it.  For the
German ubuntu community I deployed a phpBB installation a few years prior
to when I used Trac first.  One of the great features of phpBB was that
people wrote extensions for it that provided extra functionality to the
base bulletin board system.  The way these plugins worked however was by
actually modifying the code.  Called “mods” they came with long
installation instructions that showed the specific places where you had to
copy/paste code in.  Not even diff files were provided in those days but
it still sortof worked because people took the time to hand patch their
installations.

Trac on the other hand always had a real plugin system.  The base system
was littered with interfaces and hook points that plugins could utilize to
add extra functionality.  Trac's code taught me proper software and API
design.  Now it seems obvious that this is how you create libraries and
applications but the perfection that Trac had in that regard is still
largely unmatched.  At least in the Python world.

For instance Trac always supported running more than one Trac instance per
Python interpreter.  It was from the ground up designed for that.  Django
as a framework still does not do that.  Which is especially sad
considering that Django is a framework and not an application.  You could
not reimplement Trac in Django without losing this functionality.  Trac
also had the concept of an instance folder where the instance specific
files are dropped (design, static files, uploads, configuration, the
sqlite db if used, per instance plugins etc.) which more people should
consider.

Trac also explicitly did not adopt hyped technologies if they went against
their design principles.  They wanted to use a template engine that was
extensible and built on XML to properly support XHTML (which was hip and
cool at the time) but Kid did not serve that purpose.  It did not scale
properly to the large pages that were generated and it did some funky
things with the Python import systems.  Christopher Lenz wrote Genshi
as a result of that which was a reimplementation of the Kid principles but
with a largely improved implementation.  Genshi is still (from the design
perspective) the coolest piece of template engine you can get in Python
land.  It's also the reason why I no longer hate XML all that much because
properly used it's actually very clever.

However all of that is completely irrelevant because Trac and Genshi
failed in other areas.  They were amazingly well written but all that came
at huge costs.  Trac was a memory hog and some early design mistakes that
everybody relied on were only slowly phased out.  For instance before Trac
had Genshi they used a template engine called quicksilver.  It was
implemented in C and used a special syntax similar to JSON to specify the
template context.  When that was replaced with Genshi it broke existing
plugins and provided users with a good excuse to switch from Trac to
alternatives that had the functionality they required built in.  Trac was
also built around the subversion idea of having one huge repository for
everything.  This became a problem when decentralized version control
systems popularized the concept of having more than one repository.

Users don't care, or do they?
-----------------------------

Ultimately all of that would have been great however if the users would
have appreciated the elegance of the design.  But that's not how it seems
to work.  A user expects his software to work and the internals don't
matter at all.  And this is not just true for Trac.  Battlefield 3, which
I `wrote about last year
</2011/11/15/modern-web-applications-are-here/>`_, moved the main
menu into a browser.  There are a bunch of reasons why the whole concept
in generally is technically amazing, but for the user it was not
understandable why it was cool or useful.

It's not that users are dumb and would not understand it, but it was never
communicated in the first place.  I don't know if it's because the
developers did not take their pride far enough in showing everybody how
cool it actually is or if they think users would not understand it.

Let's compare this to cars for a moment.  If I look around for a car, the
design is only half the reason.  I look for the technical details when I
shell out that much money.  I want to know why it's cool, I was to see
images of the engine and internals.  I want to read about the design ideas
that went into every part of the product.  True, there will be some people
that just want a car, but those are not selling your car anyways.  If a
friend of mine shows up with a brand new BMW I can promise you he will
start telling me about the cool details, he wants me to actually try it
and ultimately he wants me to get this car.

Apple seems to be doing very much the same.  Many Apple computer users
are as loyal to their product as buyers of cars.  They will point how
cool the case design is, how nicely the lid closes, how cute the machine
looks when the sleep light is “breathing” or how few problems they have
with it.  I know many flaws in my Macs but that does not stop me from
continue supporting the company and getting their products.  That's
because I appreciate the work that went into every part of it.

Head over to the Apple website and you see the product in the center like
you see a car.  Apple not only sells you the product there, they also
provide videos of the assembling process.  They let designers share their
thoughts that went into every aspect of the product and they show you that
they love what they created.

Why don't we do that about software products?  Trac probably would not
have become better by itself just because users would know what goes on
behind the scenes, but I can almost promise you that more developers would
have had a look at the internals if they were communicated properly and
that might have helped improving it.  As it stands right now, only a small
community remains around Trac and only one active developer remains.

With Battlefield 3 it's very similar.  The advert said “the easiest way to
play with friends” but it did not say why Battlelog (their online
community and also main menu) was cool.  Why it's better for the user than
the main menu being in the game.  Combined with the fact that the game did
not deliver in some other parts (such as missing VOIP support) people
suddenly start blaming battlelog for parts it does not have anything to do
with it.  And an unhappy fanbase is the very last you want to have when it
comes to multiplayer games because those games are sold in a very similar
way: if my friends play I want to play it too.  Selling technical
excellence to computer gamers would not have been hard either because they
take pride in “knowing more” about computers and game then their console
playing friends.

Make them appreciate it
-----------------------

I guess to a large degree the idea of “the best design is the one you
don't notice” plays into that but that does not mean it wouldn't be great
to point it out nonetheless.  And by that I don't mean putting a red arrow
on the product saying “this is a cool design element” but by providing a
nicely designed website or folder that shows the thought process that went
into it.

I know nothing about cars but damn do I love looking at brochures and
reading about them.
