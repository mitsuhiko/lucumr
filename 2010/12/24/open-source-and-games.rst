public: yes
tags: [licensing, thoughts]
summary: |
  Are games without assets open source?  Why are there so few commercial
  games releasing with open source models, images and more?

Open Source and Games
=====================

A few days ago the `Humble Indie Bundle 2 <http://www.humblebundle.com/>`_
released.  It contains five independently developed games including the
universally acclaimed “Braid” puzzle and “Machinarium” adventure game.  As
with last year they upgraded the bundle after a certain amount of revenue
was made.  This year they included last year's bundle in its entirety for
all people that bought it before a certain time and for everyone that pays
more than the average.

Additionally yesterday they announced that “Revenge of the Titans” will
become open source.  This is similar to last year where “Gish”, “Aquaria”,
“Lugaru HD” and “Penumbra Overture” went Open Source.  However here the
important part is that all of these titles went Open Source for their
sourcecode only.  This does not include the assets.  I totally understand
the motivation behind that and I welcome any open sourcing of games as it
makes it a lot easier to dive into game development.  This is similar to
how Quake went Open Source after a while (under the restrictive GPL
license).  I have not checked each and every Open Source release from the
Humble Indie Bundle so far but I think all of them are GPL 2 or 3 and none
of them include any assets of the games.

Which I personally can totally understand but I find it a little bit sad.
Mainly I find it sad because I don't care too much about the sourcecode.

Motivations for Open Sourcing
-----------------------------

Why do people Open Source code in general?  Looking at a lot of Open
Source code I came in contact with I can probably assign each piece of
code into one of four categories:

*Working with Others*
    If you want to work together with other people, Open Sourcing code is
    a great idea.  If you want to connect different systems it makes a lot
    of sense to make the communication interface open source so that
    everybody can work on that.  I think the buzzword for that is probably
    “interoperability”.

*Community Maintenance*
    If a company went out of business or is no longer maintaining a
    particular piece of software, projects are often opened for everybody.

*Marketing*
    Some people open source code for marketing reasons.  These releases
    come often with ridiculous strings attached to the license or are
    missing essential bits.  At the very least, these projects are not
    noticed as Open Source projects, even if they are technically Open
    Source.

*Because it makes sense*
    Certain things only make sense to be distributed as open source.
    Either because people expect it to be open source (like libraries for
    Python or other dynamic programming languages) or because there is
    just no reason to keep it closed.  My stuff falls under this category
    for instance.  None of the Pocoo projects would work in any way if
    they would not be Open Source.

Users of Open Source Code
-------------------------

However, independently of that there are also motivations for using Open
Source code.  And that's actually the more tricky piece.  There are people
that use Open Source code for political reasons, for learning, because
they are the best solution available or because they like the fact that
they have access to the code and are more flexible that way.

*Political Reasons*
    The Free Software Foundation, the majority of the people working on
    the GNU projects and more are probably doing their development for
    political reasons.  They write the software for the sake of the
    software being free.  Those are noble reasons but quite irrelevant for
    the rest of the world unless those tools become the best tools
    available.

*Learning*
    Whenever I try to learn something new that relates to programming, I
    will try to either study similar Open Source code upfront of compare
    my own code with it.  That works quite well independently of whatever
    license the code is under, because things I do for the sake of
    learning are usually not released to other people.  And even if I
    would release that code, I have no troubles using a matching license.

*Best Solution Available*
    Apple for instance chose the GCC compiler toolkit because it was the
    best one available for the price.  Apple's motivation was that they
    can distribute the compiler to anyone as cheaply as possible.  At the
    same time however Apple was always terribly afraid of the “must remain
    open” part of the license.  They would much rather have a license
    without that clause attached.  That might also explain a lot why they
    invest a lot of time and money into the development of the LLVM
    infrastructure and the clang compiler that is based on it.

*Working with Others*
    This might actually be the only part where the reasons for open
    sourcing match perfectly up with the user's reasoning.  If you want to
    work together the lines between user and developer blur.  It's very
    likely that contributions will come from both sides with the intent to
    make the system better.  Unless of course one side wants to harm the
    other one, but then one can hardly speak about “working together” any
    more.

In An Ideal World …
-------------------

So as mentioned earlier the Humble Indie Bundle campaign managed to
convince developers to send a “Thank You” to the community by releasing
the code under open source licenses.  The motivation there is both a
marketing reason (might convince other people to spend more money) and
because it made sense for them.  They earned a lot of money with that and
they can strengthen the trust with the community by giving back.

Now in an ideal world they could open source everything, but that won't
work in practice.  From what I have seen it is very hard to make a living
just from independent game development.  If you would give away all your
assets you are basically removing any reason for people to still buy the
game.  Even with the income spike of the Humble Indie Bundle it's not very
likely that the developer will have enough money to create another game.
At least not with a reasonable buffer in case times become rough.  Giving
away everything under an open source license does not seem to be a wise
step.

But who would be the users of such Open Source game?  The average gamer
does not have anything from available sourcecode.  Except for maybe a few
modifications more that wouldn't have been possible without access to the
source.  Maybe also a few bugfixes more for issues the original developers
could not reproduce.  People that want to earn money with a derived game
can't use it obviously.  These open source releases are all under the GPL
license.  No sane developer that wants to sell software would attempt to
base his game on a GPL software when there are no commercial licensing
terms available.  And if there are, there are better engines available
then the ones these developers wrote for themselves.  Not because they
wrote bad software — not at all — but because they wrote engines for their
specific games.  Those were never designed to be used for arbitrary games
unlike real commercial engines.  Even if you would accept the GPL
licensing terms you could never ever bring your game to a mobile console,
the XBOX 360 or something similar.  These systems are fundamentally
incompatible with the GPL's license terms.

So this pretty much leaves people that want to learn game development or
people that would write open source games for political reasons.  And on
top of that: people that profit from the available code for better mods
(the hardcore community of the game).

I personally would love to actually have the photoshop/gimp etc. source
files for the assets to see how those were created.  I don't care too much
about the actual license of those.  I wouldn't have any problems with a
non open source license like a creative commons noncommercial/attribution
one.  However if people would want to create a real Open Source version of
the game, they could do that step by step.  And seeing how much work went
into the assets of these games I doubt a true Open Source version would be
ready before the developer creates it's next game.  It's even questionable
if these derived games would even have the same quality as the original
one.

The most interesting part here however is piracy.  What are piracy rates
for indie games?  Something way above 80% last time I looked.  That's a
damn lot.  The fact that independent developers make any game seems to be
that they have a trustworthy community that honors their achievements in
game design and artstyle.  Independent developers don't have the money
(and don't want) to sue people downloading pirated copies from their
favorite bittorrent tracker.  From that point of view, it does not matter
if a gamer downloads the game for free on a website that uploaded a
compiled version of the open sourced game or from piratebay.

I am quite sure that with a carefully crafted license one could still sell
the game and also have it under an Open Source-ish license.

The Issue is a Cultural One
---------------------------

The core issue here however is not that the assets are special: the
assets are not more special than the code is.  But one needs both to do
something with it.  And people chose to open source the code and not the
assets for two simple reasons:

1.  Assets are visible to the player.  The player can't see the code, but
    the player can see the 3D models, textures.  The player can listen to
    the music, hear the sounds and more.
2.  Programmers love Open Source, Artists not so much.

I find that very interesting.  It's not hard to spot an engine by its
characteristics even if you don't have access to the code.  A lot of quake
engines don't even try to hide their origin and still provide the same
console commands and movement behavior.  The Unreal engine can be easily
noticed from looking at the file system and depending on the version of
the engine and the environment it's running in, you can tell it by the way
it loads textures.

And programmers always modify the engine to do something new with it.
Just using something unchanged is uninteresting.  I don't think this is
unique to programmers, that's how we work as humans.  I think if one would
release the assets instead of the source code under an open source license
we wouldn't suddenly see the same unmodified textures, sprites and models
appearing in every single open source game.  But what we might see are
more people opening those up in their 3D programs and playing around with
them.

We as programmers often grew up in Open Source environments.  Yet we do
understand that Open Source code does not necessarily mean we make money
from it.  Only if we're lucky and use the downsides of open code to our
advantage.  We have so many Open Source projects that we can't even count
them.

But what about artists?  Yes there is Jamendo and a few other places where
you can find Creative Commons licensed music, but the general consensus is
that once you're known, you move away from it.  The few people I know that
make music never every consider giving away music.  And from the well
known musicians only Trent Reznor comes to mind when talking about
Creative Commons licensed music.

The whole modding community for computer games to a large degree consists
of people doing 3D models, textures, mapping and more.  Very few of these
mods are actually released with sources.  They don't even have any kind of
license attached most of the time.  Yet they depend on the ability to
remix an existing game.

Independent developers often claim to make up for their smaller budget
with deeper game concepts and stories.  And looking at games like “Braid”
I can only agree with that.  However what about stepping into a new
direction the next time you open source something, and actually share the
assets too?  Maybe on a game where the financial hit wouldn't be too
terrible.  I don't think anyone actually attempted having an open source
game that at the same time still sells.

And if that does not work out, why not open source assets and music
instead of the code?  Especially if the assets require attribution, there
is no reason why it shouldn't drive traffic back to the original creators.

And with that: Happy Christmas everybody and a big “Thank You” to the
independent game community and all people behind the Humble Indie Bundle.
Indie games are what brought be back to graphic programming because they
show that even with a limited budged and simpler artstyle you can create
great games.  And without realization that I wouldn't have learned a whole
lot new things over the last few months.
