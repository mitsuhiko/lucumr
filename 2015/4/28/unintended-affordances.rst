public: yes
tags: [thoughts, ssl]
summary: |
  Some thoughts about the different effects of security and why sometimes
  less security and less enforcing has unintended positive aspects.

Unintended Affordances *(or why I believe encrypting everything is a bad idea)*
===============================================================================

In psychology there is the term of affordances.  It's the concept that an
object affords different actions for someone interacting with it.  Most
objects in this world have a plethora of things you can do with them, many
are not even intended by the designer of that object.  As a crude example:
a chair does not just afford sitting on it, it could also be used as a
table if you sit on the floor.  What I find interesting about that concept
is that most of the time the actions that you can perform on an object are
heavily shaped by your state of mind and environment.

An extreme example of this would be the use of bank notes.  For you and
me, the use of bank notes is to pay for goods and services.  If you would
have asked a person from the Weimar Republic however a not unlikely use
of banknotes was to throw them into an oven and burn them for heat.
Clearly never intended by the creator of the currency, but a very
reasonable decision given that it was more expensive to buy wood than to
burn the currency directly.

Enforcement
-----------

A similar thing applies to the enforcement of rules.  For instance in
order to ride a subway you need a ticket.  There are two ways in which
this can be policed: you have gates that prevent people without a ticket
from passing onto the platform or you instead make spot checks.  The
engineer in me would obviously argue for the gates as it's a technical
solution to a problem but upon closer inspection the gates might actually
have a bunch of unintended downsides.  The gate is a very binary access
method: you either get through or you don't based on if you have a valid
ticket.  It however leaves out a perfectly reasonable affordance which is
the idea of riding the train without paying for it.  Now obviously one
could argue that the whole point of the gate is to prevent this from
happening but there are plenty of situations in which it would be entirely
legitimate to ride the train without a ticket.  A good example for that
are emergencies.  You cannot really talk to a ticket gate and make your
point, it's a soul-less thing.

This is less of an issue for public transportation but it would become a
bigger one for cars but cars do not (yet?) enforce laws themselves.  There
are plenty of people that are not legally allowed to drive a car under
normal circumstances but should not be prevented from driving a car in
emergency situations.

I'm not going to discuss whether digital enforcement is a good thing or
not, more that when you take such a strong stance on an issue it's
important to not just consider the situations in which everything goes by
design.

Which leads me to the concept of encrypting everything.  There is the idea
that “there is no such thing as insensitive web traffic” and that the
privacy of communication is absolute.  For a long time this was not a very
contested idea because the total number of encrypted traffic was quite a
small percentage of the overall communications.  Now however pretty much
everyone wants to have their website encrypted which starts to alarm many
actors including governments and system administrators.

Traditionally many institutions and professions and their customers had
legitimate reasons for why they want encryption.  That includes banks and
lawyers for instance.  But not everybody is entitled to privacy in all
situations.  For instance convicted criminals are not.  Likewise many
lawful professions need to be heavily surveyed for security.  That privacy
and safety stand in a big conflict was recently quite dramatically
demonstrated when a pilot hid his psychological problems from his employer
and intentionally caused a plane to crash.

However encryption is like a ticket gate in the sense, that there is no
way around it.  For nobody (if it works).  This has a lot consequences I
think we did not yet discuss as a society.

The Cost of Encryption
----------------------

When implemented properly, encryption is a very binary enforcement: there
is no way around it.  It's something that we as developers like very much
because it just “makes sense” to us.  But it does not come for free.

First of all encryption cannot stand on its own, it needs the concept of
trust.  The most common form of encryption these days is SSL where the
user does not really have much of a choice in defining trust.  The trust
there is acquired by giving someone at a specific (private!) institution
money and a copy of a passport.  This system does not scale, and the
number of SSL hosts is exploding.  Now that everybody and their dog uses
SSL on their blogs the total stress put on this system is even larger than
in the past and as such slip-ups are only going to increase.  It was bad
enough to secure the CA system for a few hundred hosts that needed SSL,
but now I have no idea how any CA in the world is supposed to verify
people's identities.  It's also making the encryption icon more and more
meaningless and puts more and more emphasis on who and for whom things are
signed.

There is another cost and that's the actual cost in CPU cycles.  SSL is
bloody expensive compared to not doing it.  First of all there are still
services which do not support SNI, so SSL is a big factor in exhausting
the IPv4 address space faster than we would otherwise need.  As an
alternative you can fall back to many subject alternative names on your
certificate.  This is being executed to ludicrous degrees due to our
instance on the use of SSL.  The frontend that does SSL offloading for
firebase.com for instance currently lists more than 580 subject
alternative names.  Not only does that mean that you are downloading a
really big certificate, but also that the SSL encryption is a bit of a lie
for you as a user.  The certificate in front of “firebase” is also good
for “tappinass”.  Sure enough, neither firebase nor that other website are
holding the private keys to the cert, so they cannot impersonate each
other, but their CDN provider can.  Don't get me wrong, there is nothing
wrong with that because they chose to outsource this to their CDN, but
from a user's perspective this sort of SSL deployment does not actually
guarantee that the communication is secure from their side until they hit
the intended server.

SSL scales really badly *intentionally*.  Until fairly recently there was
no real way to scale SSL without handing over your private keys to a your
frontend SSL machines.  (Cloudflare outline their `Keyless SSL method
here <https://blog.cloudflare.com/keyless-ssl-the-nitty-gritty-technical-details/>`_).
The cost of deploying SSL should not be underestimated, and forcing SSL on
people out of principle should consider that.  Not everything needs
encryption.  Especially in cases of big emergencies, being able to access
information is crucial.  The first thing Germanwings did after their
horrific crash when their website was down was to replace it with a static
HTML page (unencrypted) with a phone number you could call if you were
affected.

Government Interception
-----------------------

A big cost of encryption however is lawful interception.  This is not the
place to discuss if governments should have the ability to intercept your
internet traffic or not but in many cases they have that right.  So given
a government that is allowed to rule a website illegal there are two ways
to get the website offline.  One involves going to the hosting provider of
that website and tell them to shut it down.  This can be very tricky
because the website is typically hosted in another country.  The second
method is to go to the local ISP and tell them to disable access to it.
The rather is the better option in the sense that it only affects the
citizens of that country and it isolates the problem.

Unfortunately, SSL prevents this.  Unfortunately because it means that if
a website hosts partially illegal shared content, then the whole website
is down and not just the subsets of it which are legally problematic.  For
Russians for instance github was down for more than a day because ISPs had
no other change than taking the whole website down until github changed
their servers to blacklist the content in question for Russian IPs.

These problems will not become less but more and it will require a proper
discussion within the legal bodies of our countries.  We as the tech
community should not make this decision on our countries' behalf.  It
should be a technical reason and not a political one.

Forcing The Man in the Middle
-----------------------------

The more we put our money behind encryption the more will we put the
problem of active man in the middling on our radar.  When a couple of
years ago you could get away with pinning SSL certificates in your Windows
desktop apps, we are now far away from that.  A shocking amount of Windows
users run software that MITMs SSL connections to scan for viruses, malware
etc.  Even Ad providers (Superfish *cough*) started to destroy SSL traffic
because it became so widespread that it was necessary.

I'm firmly of the opinion that none of that would have happened if SSL
traffic was less common.  From an economical perspective a few years ago
nobody would have thought about building a SSL MITM proxy for these
purposes.  Now however you will find them everywhere.  Even reputable
companies like Nokia have been found intercepting SSL traffic on their
mobile phones.

Worst of all is that “SSL everywhere” goes against what it should actually
protect as a side effect.  There are probably more misconfigured SSL
systems that give users the illusion of safety than correctly set up ones.
There will be the point in a year or two when the first websites that got
forgotten and had SSL configured, will have their certificates expire.
And then users will start to get used to clicking certificate warnings
away because it's the only way to get to the website they needed.

The Complexity
--------------

The greatest impact on user's safety would have been the development of
per user encryption for public Wifi access points.  Instead what happened
is that now every larger website has to implement SSL to protect against
the only realistic attack vector which is someone surfing at Starbucks.

But instead we fixed the problem on every single website out there instead
of one Wifi standard [1]_.  But administrators largely don't understand SSL.
And I can't blame them.  Right now the total number of people in the world
that probably understand the entirety of SSL are most likely in the low
hundreds.  I have been dealing with SSL for years now and the more I use
it, the more I have to surrender to the complexities in it.  When a few
years ago I would have said “I understand SSL” I now no longer claim I
have any understanding of SSL at all.

This is a problem.  Because SSL at this point is becoming more and more of
a requirement it means there is a crucial part of my stack which I have to
fully trust.  And it's written in a way where it's impossible for a normal
human being to understand the internals of it.  Cryptography is black
magic.  One can argue that for as long as SSL engines are Open Source
there should be plenty of eyes that ensure that our crypto code is
secure, but the truth is that the most popular cryptography library
(OpenSSL) is an old and complex mess.  Even if the library itself would be
okay, there are so many ways to misuse it and it's really badly
documented.

As HTTP 2 now basically is TLS only as that's the only transport that
modern browsers implement.  Gone are the days where you could fully
understand how a web application works.  We're now deep in the territory
where a relatively simple text based protocol has been replaced with a
multiplexed stream of octets wrapped in a TLS connection.  The future is
now.

.. [1] It was brought up that even if you can trust other Wifi users you
   cannot trust the provider of the Wifi connection.  That is definitely
   true and defeats my point somewhat given how many Wifi access points
   are provided directly by unknown entities (bars themselves etc.).

   At this point there is definitely no way back anymore, but the rollout
   of Wifi could have worked similar to the rollout of home internet.  At
   the end of the day you need to trust your ISP as well.  The same rules
   could have been applied to Wifi providers originally.

Can We have Less Encryption?
----------------------------

I don't think everyone should be forced to understand SSL and I don't
think everybody should be forced to implement encryption.

To give you an example of how ridiculous our love for SSL has become:
PyPI.  It's the Python package service.  As of recently the Python package
installer downloads *every* package via SSL.  Why?  There is no technical
reason for this unless you want to hide from someone that you are
downloading a specific Python package which seems pointless.  It's plenty
to download the package over an untrusted connection and to then verify
the checksum with one you downloaded from a secure place.  As there is no
need to operate on a partial file there is no technical reason why the
entire transfer would have to be SSL encrypted.

Encryption is a good thing, but I believe it needs to be applied
carefully.  At the same time I think we as people need to start having a
serious discussion what effects the widespread deployment of cryptography
can have and how we deal with it.  Working encryption is pretty much an
absolute: there is no way around it.  This is something that our countries
previously did not have to deal with.
