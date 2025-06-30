---
tags:
  - thoughts
  - python
summary: "Some personal thoughts on the Python community and programming
communities in general."
---

# On Programming Communities

This post was a long time coming but Ian Bicking's recent post about
[Saying Goodbye to Python](http://www.ianbicking.org/blog/2014/02/saying-goodbye-to-python.html)
made me finally sit down and write it.  This is personal and probably not
all that interesting, but it's important for me to have it written down
somewhere.

It's very easy to forget about all the people that put you to the place
you are today and often they don't even know it.

In a few days Python will be with me for ten years now.  I don't exactly
remember which day I downloaded a Python interpreter for the first time,
but thanks to living parts of my life on the internet, there is a good
track record from a certain point onwards.

## Python, Tech Communities and Me

I owe a lot to online communities and people I met on the internet.  When
I was about thirteen or so I bought two books on programming.  A book on
Delphi and a book on Python.  The latter was a book by Gregor Lingl called
“Python für Kids” which was a programming booked aimed towards young
people.  Without his book I my life would have been very different and I
would have ended up as a Delphi programmer for a lot longer.

Through that book I found the German Python forum and through that forum I
first learned that people are actually using Linux for real things.  The
former administrator of that forum recommended me to have a look at the
new Ubuntu Linux distribution if I want to have something to play around
with, because it embraces Gnome.  That administrator was Fritz Cizmarov
aka Dookie who sadly passed away in 2005.

While I did not touch Python much initially through the programming book
and the recommendation of Fritz I became a Ubuntu user.  That was a
few months after the initial Ubuntu version shipped.  I found the German
ubuntuusers website which just appeared at that time.  Since I have done a
bit of PHP at that point, I volunteered to help out with the phpBB
installation there to make it look a bit nicer and to add a news section
to the website.  Sascha Morr trusted me enough to give me access to the
heart of the website and from 2004 to somewhere around 2007 or so I spent
ungodly amounts of time trying to improve it.

I learned a lot while maintaining ubuntuusers.  When I started out I
literally modified PHP scripts through uploading files with FTP.  Later I
would modify those files by SSHing into the server and changing them with
vim up there.  I learned about SQL injections and proper software
development by making all the mistakes there.  A lot of that knowledge I
owe to Matthias Urlichs who provided us with servers there.  I was very
lucky with timing there.  When I started out with playing around on
ubuntuusers there very only a few hundred people on there and me breaking
the forums was not a big deal.  Initially we were on a web hoster with our
PHP stuff, later on we got multiple servers and worked together with the
French Ubuntu team on the same servers.

Before I stopped working on ubuntuusers I rewrote with the other people of
the web team there the entirety of phpBB and MoinMoin and half a dozen
other tiny things in Python.  Pocoo started out as an attempt to write a
phpBB replacement in Python for this particular website but while doing
that I learned so much, that I started many times over.  At the end
ubuntuusers ended up with a custom forum, a custom wiki engine, blog
aggregator and more.  We added XMPP based notification support and other
fun things that taught me more about network programming and programming
altogether.

The vast majority of people I interacted with at ubuntuusers I only knew
over the internet.  Many of which for a while I did not even know the real
name of.

## Jumping Around

While I am in the Python community for longer than the Ubuntu community,
my experience with the Ubuntu community has taught me my most important
lesson in life: to not get attached to communities too much.

I adored everything about Ubuntu when it started out.  I loved
contributing in any way I could.  When a wallpaper I made shipped on the
pressed CD I was the happiest young man alive.

Over time though it became clear to me that this was not a community I
wanted to hang around with for too long.  The community behaved largely in
different ways than I was okay with.  There was a lot of internal politics
and the philosophy of Canonical changed in a way I could not support
personally.

I took a lot of my motivation to do something for the Ubuntu community and
tried to apply it to Python with various successes.  Initially I did not
do much, but through Alexander Schremmer from the German IRC channel for
Python I met Georg Brandl which at the time was already a core committer
to Python.  Even more than I learned about programming through hacking
around with ubuntuusers stuff, I learned programming from Georg.  He
showed me how to extend CPython's interpreter to have some new keywords
and how C works.

I stopped doing as much for Ubuntu and ubuntuusers and instead focused
more on writing things in Python.  Georg Brandl and me started Pygments
(originally Pykleur) to replace the PHP based syntax highlighters.

At one point we just declared in our own little `#pocoo` channel (which
back then was just for the attempt to write a Python based bulletin board)
that now that we're 10 people we should switch to English.

I have IRC logs going back many years now and it's fascinating to go back
and it's fascinating to see how much has changed.  How much I have changed
and how much everything around me has changed.

`#pocoo` is still around and it's now a few hundred people all around
the clock.

There were lots of other people too that left a lasting impact on me.
From the German Python forums there is Marek Kubica who I learned a whole
bunch from too.  He and some other people from the German Python community
were also the first people I ever met on the internet first and in person
later.  Things like that you don't forget.

## Growing up Online

I suppose when teenagers grow up they want to fit in somewhere but they
are not sure where.  For me it was this for a long time.  I always tried
to fit in somewhere.  First Python and Ubuntu, but also Ruby, PHP and
other things.  You sometimes see a person in a community and you try to
match them.

When I dabbled into Ruby I met Kornelius Kalnbach and Christian Neukirchen
on the German ruby forums or IRC channels.  Kornelius wrote CodeRay, the
first syntax highlighter I came about that almost correctly highlighted
Ruby code.  When Georg Brandle and I started working on Pygments we
competed with him about who could highlight Ruby code better.

When I got frustrated that WSGI was not getting any traction in Python I
got interested in Ruby again.  Why the lucky stiff was doing this own
little camping micro framework and Christian Neukirchen made a
specification of WSGI for Ruby (Rack) to which I gave some comments and
provided the terrible logo for (which is still in use!).

For a while I did some PHP and started a port of my Jinja programming
language to it that ultimately became Twig which people are still using.

But whereever I went, I always came back to Python in a month or two.
Something was just special about it.

## Python People

Which then points me to the main reason I am writing this blog post.  I
would not be in the place I am today if it was not for so many incredible
people in the Python community.  I already mentioned Georg Brandl who was
a mentor of mine, but there are so many more.

Ian Bicking was a huge motivation for me.  I read each and every of his
blog posts and I pestered it on IRC many times to learn more things.
Jacob Kaplan-Moss is the reason I am giving talks at conferences.  I went
to the EuroDjangoCon in Prague in 2009 and after one of the talks walked
up to him to ask some questions and talk him up.  Later that day he told
me to give a presentation about some of the things I'm doing at DjangoCon.
A few months later I was renewing my passport and leaving to the United
States for the first time to give a presentation about not using Django at
DjangoCon.

At the two DjangoCons in Portland I met Mike Malone (from Pounce back then
I think), Adam Lowry, and Michael Richardson from Urban Airship for the
first time.  Same with Jason Kirtland from Idealist.  I got a lot of
encouragement from meeting all of them and it was incredible to meet
people have have been using some of the things I did, even if just in
little bits.

I had many amazing discussions with Python developers about technology and
the world and it's almost impossible to imagine that all of this was
possible.

From 2009 until now I got so many opportunities through the Python
community to travel to other countries, share experiences and learn new
things.  I have good memories of sharing drunk nights with Jesse Noller
talking about Python 3 (before it was cool) at PyCon US or Honza Kral
about god and the world until early in the morning in a bar in Berlin at
djangocon.eu.

I met Maciej Fijałkowski for the first time at an almost exclusively
Polish conference somewhere on the border to the Czech Republic.  Even
though the conference was basically in the middle of nowhere from my point
of view, it was loads of fun.

In general I can't enumerate the amazing interactions I had with Python
people at various conferences.  I got to get to the Ukraine, Poland,
Japan, the United States, Italy, the Czech Republic, the United Kingdom,
and South Africa, the Netherlands, Israel and Russia just for Python
conferences or for Python people.

I celebrated my last three birthdays at a (not so tiny any more) Python
conference in Groningen with lots of awesome Python people.

There are so many people I forgot to mention that left a lasting impact on
me (in no particular order) that are either from the Python community or
closely associated with it:  Simon Willison, David Cramer, Adam Hitchcock,
Michelle Rowley, Carl Meyer, Leah Culver, Eric Holscher, Alex Gaynor,
Adrian Holovaty, Nick Coghlan, Graham Dumpleton, Łukasz Langa, Simon
Cross, Chris McDonough, Ned Batchelder (who unintentionally told me a very
important lesson in life), Guido van Rossum, Chad Whitacre, Mike Bayer,
Eric Florenzano, Michael Foord, Idan Gazit, Jannis Leidl, Steve Holden,
Michael Trier, Lynn Root, Tyler Šiprová, Hynek Schlawack, Daniel and
Audrey Roy Greenfeld, Kenneth Reitz, Glyph Lefkowitz, Amir Salihefendic,
Holger Krekel, Peter Baumgartner and probably a few others that
temporarily escaped my memory.

## Community vs. Technology

I will always feel a strong affection to the community around Python.
This is interesting for me because I feel a lot less of an attachment to
Python itself these days then I did a few years ago.

I still use Python on a daily basis and I will continue working on my
projects and go to Python conferences, but I can very much imagine that in
a few years from now I might be doing something else.  I will however be
always grateful for the Python community and I have a hard time believing
I will ever feel such a strong attachment to a programming community as
its.

Until recently the Python community steered free from controversy and it
has been (and continues to be) an amazing starting point into software
development and Open Source.  It welcomes everybody and it's a great place
to dive in.  I would not be the person I am without the support from a lot
of people in it.

I have heard from multiple people now that they still feel at home in the
Python community and associate themselves with it, even though they are
now doing Go or JavaScript development or just generally using Python to a
lesser extend or in different ways.

It became important for me to differentiate the community from the
technology however.

I love the community and everything it did for me, but as I did more and
more programming I started to discover that technologies are not perfect
and sometimes they go in different ways.  I still love lots and lots of
the ideas and concepts behind Python but I'm starting to appreciate more
and more the other programming concepts too.  Who knows what I will be
doing in ten years, but I always want to hold the Python community in high
regard, even if my technological choices might no longer involve it.

## Past and Future

Soon it will be 10 years of me being exposed to Python and through it, 10
years of getting to know many amazing people, many of which influenced me.
I hope the Python community does not change too much and stays the way it
was for others to get the same opportunity.

More important than that: I hope I can give back.  I probably won't have
much of a chance to give back to the people that had an impact on me, but
I can always try to be an influence for the next generation of
programmers.
