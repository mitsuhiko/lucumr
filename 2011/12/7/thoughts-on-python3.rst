public: yes
tags: [python, thoughts]
summary: |
  My current thoughts on the state of Python 3 and where it's heading.

Thoughts on Python 3
====================

I spend the last couple of days thinking about Python 3's current state a
lot.  While it might not appear to be the case, I do love Python as a
language and especially the direction it's heading.  Python has been not
only part of my life for the last couple of five years, it has been the
largest part by far.

Let there be a warning upfront: this is a very personal post.  I counted a
hundred instances of a certain capital letter in this text.

That's because I am very grateful for all the opportunities I got over the
last few years to travel the world, to talk to people and to share the
spirit that an open source project like Python can drive innovation and
make people happy.  The whole Python community is amazing and I do not
express that nearly as often enough.

Quite the contrary actually.  I love Python, I love discussing ways and
implementations but I am not committing the project despite my commit bit.
I am a pain in the ass at language summits if I am attending them and can
see why my opinion would be unpopular.  “Always complaining, not doing
anything”.  There is just so much stuff I would love to see Python go but
at the end of the day, I'm a user of Python more than a developer.

When you read my comments about Python 3 since it was released as the
first version you get the impression that I hate it and don't want to move
to it.  I do, but not in the state it's currently.

Since I learned my lesson that people link to articles long after the
fact, let me first explain the situation in which Python 3 is as of
writing: the release version of 3.2, the next version is 3.3 and there is
no plan on ever having a Python 2.8.  In fact there is even a PEP that
specifies that a release will never happen.  PyPy is making amazing
progress but at the same time it continues to be a project that is so far
from the architecture of other stuff that it will probably fight with
acceptance problems for a longer time.  In many ways PyPy is currently
doing stuff that “you don't do”.  And I think it's amazing.

Why do we use Python?
---------------------

Why do we use Python?  I think this is a very valid question which we
don't ask ourselves often enough.  I don't use Python because it's a
language without faults.  This year's PyCodeConf I spend a lot of time
discussing stuff with Nick Coghlan at the last day's party.  We were drunk
but as a result of that the discussion was very honest to say the least.
We both pretty much agreed on the fact that the Python language is with
faults and that some of these faults are now being further worked on and
in some regards even exposed.  The “``yield from``” PEP was brought up as a
perfect example where a questionable design decision (coroutines as
generators) was further expanded to make it somewhat work.  Yet even with
the “``yield from``” changes they are still miles away from the user
friendliness of greenlets.

This discussion largely came from the talk “The Prejudgement of
Programming Languages” by Gary Bernhardt on the same day at the
conference.  And we both agreed that Ruby's blocks are amazing design but
for many reasons don't work that well in Python in its current design.

I personally don't think we're using Python because it's an entirely
beautiful and flawless language.  In fact if you go back in time and look
at some of the first versions of Python it's a very, very ugly language
and it does not come as a surprise that not too many people took notice of
Python in the early days.

I think it's largely a miracle that the language took off to that extend.
And here is why I think we use Python: because the language evolved ever
so slightly over the years and had the right ideas.  Early Python was
horrible, there was no concept of iterators, there was not even a way to
iterate over dictionaries without creating a intermediate list of all the
keys.  At one point exceptions were strings, the string methods were not
methods but functions in a string module.  The syntax for catching down
exceptions haunts us to the latest iteration of the Python 2 language and
unicode was added too late and partially never.

But it did so many things well.  Even if not executed flawlessly, the
whole idea of having modules with their own namespace was great.  The
multimethod based design of the language is still unmatched in many ways
the greatness of that design is not appreciated enough even though we
benefit from that design on a daily basis.  The language always did an
amazing job at exposing the internals of the interpreter (tracebacks,
stack frames, opcodes, code objects, the ast etc.) and in combination with
the dynamic design it allows developers to quickly solve or debug problems
in ways that are not working that well in other languages.

The indentation based syntax of the language was often criticized but
seeing how many languages now show up with exactly that as a feature
(think HAML, CoffeeScript and many more) shows that it's well received.

Even when I sometimes don't agree with how Raymond implements certain
stuff in the stdlib, his modules are state of the art and a huge part of
why I use Python.  I could not imagine having to use Python if I did not
have access to the collections module or itertools.

But the real reason why I loved and adored Python was the fact that I was
looking forward to each new release like a child to Christmas.  The small
things and improvements blew my mind.  Even benign things like the fact
that you can now specify a starting index for the enumerate function made
me appreciate a new release of Python.  And all that with a strong focus
of backwards compatibility.

While we sometimes hate the fact that we have to import from
``__future__`` it's that precise thing that made upgrades easy and
painless.  When I was using PHP I did not appreciate new releases at all.
PHP would start introducing new builtin functions and with the total
absence of namespaces in the old days, each release was hoping for no
namespace collisions to show up (and I know I could have avoided them with
prefixing, but that was before I learned basic things about software
development).

What changed?
-------------

What changed that I stopped looking forward to Python releases?  I cannot
speak for anyone but me, but I noticed that I was not the only person that
seemed to have changed the way they were thinking about releases.

With Python 2.x releases I never really questioned what the core team was
doing.  Surely, some things were not well thought out, such as the
implementation details of abstract base classes or their specific
semantics, but in general that was criticism on a very high level.

With Python 3 suddenly my general way of working with the language was
changed by an outside force though.  While I appreciated new features in
the past, I never really started using them for a while since a lot of
what I was doing was writing libraries.  Using the latest and greatest was
not an option.  Werkzeug's code is still riddled with hacks to make it
work on Python 2.3 even though the version requirement raised to 2.5 by
now.  I used to ship bugfixes for the standard library in my code since
certain companies (Apple is notorious for that) would never update their
interpreter unless there was a critical security issue.

None of that was possible with Python 3.  With Python 3 it's either
developing for 2.x or 3.x.  There is absolutely no middle ground in
practical terms.

When Python 3 was announced, Guido always talked about how amazing 2to3
was and how it would make porting easy.  Turns out 2to3 is one of the
worst things that could have happened to Python.

With Jinja2 I went through the pain of porting it with 2to3 and I deeply
regret doing that now.  In fact for my JSON Jinja spinoff project I
reverted the hacks I did to make it work with 2to3 and will no longer use
it.  In fact I am now (like many others) actively trying to have a
codebase that runs both on 2.x and 3.x.  Why?  Because 2to3 is so
incredible slow, integrates so badly into the whole process of testing and
changes behavior depending on which Python 3 version you're deploying
against and ultimately cannot be customized out of the box without
applying black magic.  It's a painful process that just takes the fun out
of writing libraries.  I loved hacking in Jinja2, but I totally stopped
doing that the moment I had my Python 3 port ready since I was too afraid
to break stuff.

But right the idea of a shared codebase clashes greatly with the fact that
I have to support Python down to 2.5.

Python 3 is in the spot where it changed just too much that it broke all
our code and not nearly enough that it would warrant upgrading
immediately.  And in my absolutely personal opinion Python 3.3/3.4 should
be more like Python 3 and Python 2.8 should happen and be a bit more like
Python 3.  Because as it stands, Python 3 is the XHTML of the programming
language world.  It's incompatible to what it tries to replace but does
not offer much besides being more “correct”.

The Thing with Unicode
----------------------

Obviously the big change in Python 3 is how Unicode is being handled.
While it appears that forcing Unicode on everybody is great, it's also a
very unrealistic view of the world.  It's unrealistic because in the real
world we do not only deal with bytes and unicode, we also deal with
strings of a known encoding.  What's worse is that Python 3 in many ways
started to become the Fisher Prize of programming languages.  Some
features were removed because the core team was afraid that people would
hurt themselves.  And that came at the cost of removing functionality that
was widely used.

To give a very concrete example codec operations in 3.x as of now are
limited to unicode <-> bytes but not bytes <-> bytes or unicode <->
unicode.  This appears to make sense but if you look closer it's removed
functionality that was badly needed.

One of the great features of the codec system in Python 2 was that it was
written with the idea in mind to allow dealing with countless different
encodings and algorithms in various different ways.  You could use a codec
to encode and decode a string, but you could also ask the codec for an
object that provided operations on streams and other partial data.  And
the coded system worked on both content encodings and transfer encodings.
You can write a new codec, register it and every part of the system would
automatically know about it.

Whoever implemented an HTTP library in Python will have delightedly
noticed that you were able use the codecs both to decode utf-8 (an actual
character encoding) as well as gzip (a compression algorithm).  And not
only on strings, but also on generators or file objects if you knew how.

In Python 3 that just does not work at the moment.  They not only removed
the functions from the string object, the byte -> byte codecs themselves
were removed as well without replacement.  And it took for close to three
years if I am not mistaken to even acknowledge the problem as the
reintroduction is now being discussed for 3.3.

Then unicode was introduced in places where it did not belong.  Case in
point there are the filesystem layer and the URLs module.  And then a
bunch of unicode support was written with the mindset of a programmer from
the 70ies.

The filesystem on UNIX systems is byte based.  That's currently how it
works and this is what we have to deal with.  Now obviously it would be
great to change this, but without breaking everybody's code there is no way
to do that.  Because specifying an encoding is not nearly enough to make a
filesystem unicode aware.  There is still the issue of normalization forms
and the general question about how much case sensitivity should be
perserved if normalization is already in place.  Now this all would not be
a problem if the bytestring type would still exist on Python 3, but it
does not.  It was replaced by the byte type which does not behave like a
string.  It behaves like a datatype that was written to punish people that
deal with byte data that also is in text form.  It does not appear to be
designed to provide developers with tools to solve these problems.  And
these problems are very real.

So if you now operate on the filesystem in Python 3, even with the new
surrogate escape encoding it feels weird at times.  It's a painful
procedure and it's painful because the tools are missing to deal with the
mess.  Python 3 basically tells you “Buddy, your filesystem is now
unicode”, but it does not provide you with ways to deal with the mess.  It
does not even tell you out of the box if Python fakes the filesystem
unicode support or not, it does not tell you if normalization happens, it
does not tell you how you are supposed to compare filenames.

It works in clinical testing conditions, but it falls flat in the real
world.  Traditionally my mac has a American keyboard layout, American
locale, American everything basically — with the exception of how numbers
and dates are formatted.  The result of that (and I suppose the fact that
I upgraded my mac since Tiger) I had the situation that when I logged into
my remote server the locale was set to the string “POSIX”.  What is
“POSIX” you are asking?  I have no freaking idea.  But the end result of
that was that Python was about as clueless as me and decided to go with
“ANSI_X3.4_1968”.  This also marked the day that I learned that ASCII goes
by many names.  Turns out that's indeed just another name for ASCII.  And
lo and behold my remote Python interpreter did not show the entries
properly from a folder which internationalized filenames.  Why did they
exist there in the first place?  Because I dumped wikipedia articles in
there with their original names.  And when I was running that I was using
Python 3.1 which was silently hiding files instead of giving exceptions or
hacking around it.

But it did not end with the filesystem not working.  Python also uses the
environment variables (which as you know where garbage) to decide on the
default encoding of files.  I was asking that question at a conference to
a couple of attendees if they would want to guess the default encoding for
textfiles on Python 3.  Out of my incredible small sample size, more than
90% were sure that it would be UTF-8.  No it's not, it's platform
dependent on the locale.  Straight from the 70ties I'm telling you.

I logged on two of the servers under my control for the fun of it and it
turns out that one of them has a latin1 encoding when logged in from the
console itself, which switches to a latin15 encoding when logged in via
ssh as root and utf-8 if logged in as myself.  Bloody amazing and totally
my fault.  But I am pretty sure I am not the only person that has a server
with magic encoding switching since SSH by default forwards the locale
settings on login.

And why am I writing this here?  Because all in all I have to argue that
the unicode support in Python 3 is causing me tons more problems than it
ever did in Python 2.

If one sticks to the Python 2 Zen of “explicit is better than implicit”
then unicode becomes a non issue in terms of decoding and encoding.  Here
is how the part of every application looks like that talks to other
services:  Bytes come in, unicode goes out.  You can explain that.  You
can explain that because you document it.  You document that working with
text data internally as unicode makes sense.  You tell the user that the
world out there is harsh and based on bytes, so you need to encode and
decode when talking to it.  It's for a moment a novel concept to new users
but if documented properly it's also one that does not cause too many
issues.

Why can I say that?  Because all my software force unicode on users since
at least 2006.  And the amount of support requests I got about unicode are
not even close to the amount of support requests I got about dealing with
Python packages or the import system.  And even with distutils2 this is
still a much bigger problem in the Python land than unicode is.

Quite the contrary.  Hiding unicode away from the user in Python 3 might
seem like the natural thing to do, but now people are even less exposed to
how unicode works and I am not so sure if the implicit defaults are a good
thing.

Python 3 is certainly going in the right direction *now*.  I observed that
discussions are going on to reintroduce some byte based APIs.  Naively my
idea was always to have a third string type in Python 3 which would just
be called ``estr`` or something like that.  It would behave just like the
Python 2 string type.  It would store bytes and it would have the familar
string API.  But it also has an encoding attached and uses that encoding
to transparently and implicitly decode into a unicode string and coerce
into a bytes object.  It would be the awesomeness that could make porting
easy.

But it does not exist and Python's interpreter internals are not designed
to make a new string type a possibility.

“We broke their World”
----------------------

`Nick talked about
<http://readthedocs.org/docs/ncoghlan_devs-python-notes/en/latest/py3k_binary_protocols.html>`_
how the Python core team broke the web developer's world.  The core team
broke the world in so far as they broke Python's backwards compatibility.
But they did not break our world any more than the other developer's world
was broken.  It's the same world.  The web is based on bytes with
encodings but that's true for low level protocols in general.  Talking to
a lot of low level stuff happens in bytes with encoding.

However what was changed was the mentality which we should follow when
dealing with these layers.  In Python 2 it was very common to allow
unicode objects when talking on these layers and encode them on demand to
bytes or the other way round.  This had the nice effect which enabled us
to speed certain operations up by encoding or decoding early and pass it
to an otherwise already unicode aware pipeline.  It enabled in many ways
the functionality of the Python core serializer modules.  Pickle for
instance talks to streams that support both bytes and unicode.  So does
simplejson to some degree.  All that changes in Python 3 where you
suddenly have separate unicode streams and byte streams.  Many APIs can't
survive on the way to Python 3 without major changes to their interface.

True, it's a more correct way to work, but it makes everything more
complex and does not achieve much besides making it more correct.  Having
worked with the IO layer in Python 3 I am convinced it's awesome but does
not work in the real world nearly as well as the Python 2 one did.  It
might be biased of course because I worked so much with Python 2 and so
little with Python 3 but having to write more code for the same
functionality is generally a bad sign.  And in Python 3 I currently have
to all things considered.

But Porting Works!
------------------

Of course porting to Python 3 works.  It has been proven again and again.
But just because something is possible and passes the tests does not mean
it's well executed.  I am a person with faults and I make tons of
mistakes.  But what I do is taking pride in trying to work out APIs that I
love using.  I sometimes catch myself rewriting the same code over and
over again to make it more user friendly.  With Flask I spend an
incredible amount of time fine tuning certain core features to a degree
where some would talk about obsession.

I want it to work perfectly.  When I use an API for a common task I want
it to have the same level of perfection that goes into the design of a
Porsche.  Yes.  It's developer facing stuff, but a product must be
designed well from top to bottom.

I can make my stuff “work” on Python 3, and I would still hate it.  I want
to make it **work**.  I want to feel the same level of enjoyment in using
my libraries or other people's libraries on Python 3 I had in Python 2.

Jinja2 for instance on Python 3 for instance does not use the IO layer
properly since that would be impossible to do on both 2.x and 3.x with the
same codebase without switching out implementations at runtime.  Now
templates are opened in binary mode on both 2.x and 3.x since that's the
only reliable thing to do and then Jinja2 decodes from that binary stream
itself.  It kinda works since we normalize newlines anyways but I am
pretty sure that if people would be doing that on Windows without
normalizing newlines themselves they might end up creating files with
mixed newlines without realizing.

Embracing Python 3
------------------

Python 3 changed stuff.  This is a fact and likewise is that Python 3 is
without the doubt the future in which we have to walk.  A lot of stuff in
Python 3 is promising.  The greatly improved import system, the
introduction of ``__qualname__``, the new way to distribute Python
packages, the unified representation of strings in memory.

But right now porting a library to Python 3 currently feels like
developing the Python 2 library and making a shitty version for Python 3
to prove that it works there.  Jinja2 on Python 3 is by all means (pardon
my French) “fucking awful”.  It's horrible and I should be ashamed to use
it.  For example Jinja2 loads two one megabyte regular expressions into
memory in the Python 3 version and I did not care when I released it.  I
just wanted it to kinda work there.

Why do I have a one megabyte regular expression in Jinja2?  Because the
Python regular expression engine is unable to match on unicode categories.
And without that essential feature I am left with two choices: limit
myself to ASCII identifiers and not support Python 3's new unicode
identifiers or generate a huge regular expression with all the character
definitions by hand.

And this is the prime example of why Python 3 for me right now is just not
there yet.  It does not provide to tools to deal with the new stuff it
provides.  Python 3 badly needs unicode aware regular expressions, it
needs APIs to deal with locales now that we embrace unicode.  It needs an
improved path module that exposes more behavior of the underlying file
system.  It has to be bolder and force a default encoding on text files
that is not depending on the execution environment.  It has to provide
more tools to explicitly deal with encoded strings.  It needs support for
IRIs and not just URLs.  It needs that more than “``yield from``”.  There
need to be helpers to deal with the transcoding that is necessary to map
URLs to the filesystem.

But it might also need a Python 2.8 release that brings it a bit closer to
Python 3.  In my mind there is only one realistic upgrade path:  the one
where the libraries and applications on Python 3 are perfectly unicode
aware and integrated into the new ecosystem that Python 3 provides.

Don't let the Inexperienced lead the Way
----------------------------------------

Python 3's biggest fault is that it's binary incompatible with Python 2.
And by that I mean that you cannot have a Python 2 and a Python 3
interpreter in the same process space.  And the result of that is that you
cannot have a Gimp with a Python 2 scripting interface as well as a Python
3.  Same goes with vim, same goes with Blender.  We just can't.  There
might be half baked hacks with having a separate process and doing fancy
IPC, but nobody does that.

The result of that is that the kind of developer will lead the Python 3
adoption that was forced to use Python 3.  And that developer is not
necessarily the person that know Python well.  Because let's be honest:
Python 2 is currently where the money is at.  Even if we would be hacking
on Python 3 code at night, the day job would be Python 2.  For the time
being.  If however a bunch of graphic designers start scripting Blender in
Python 3 there is your adoption.

I really do not want to see the cheeseshop being tortured with bad ports
of libraries to Python 3.  I really do not want to see another Jinja2 on
there and a lot of the code that is currently being ported to work on both
2.x and 3.x is just horrible to look at.  Hacks like ``sys.exc_info()[1]``
to get around syntax differences, hacks to convert literals at runtime to
work on 2.x and 3.x and a lot more.  It's not only bad for runtime
performance, it ruins what Python stands for: readable code, beautiful
code, no hacks.

Accept Failure, Learn, Adjust
-----------------------------

I think at this point we should at least consider sitting together looking
at what people are doing to make their code work on both 2.x and 3.x.
Technologies are evolving fast and it would break my heart to see that
Python ruins itself by just ignoring possible dark clouds in the sky.

Python is not “too big to fail”.  Python can become unpopular very
quickly.  Pascal and Delphi became niece languages even though they were
amazing even after the introduction of the .NET framework and C#.  They
were ruined by mismanagement more than anything else.  People still
develop in Pascal, but how many are starting new projects in it?  Delphi
does not work on the iPhone, it does not run on Android.  It's not well
integrated into the UNIX market.  And if we're honest, in some areas
Python is already losing track.  Python used to be sufficiently popular in
computer games but that ship has sailed a long time ago.  In the web
community new competitors arrive on a daily basis and if we like it or
not, JavaScript is becoming more and more an ubiquitous scripting
language that challenges Python.

Delphi did not adjust quick enough and people just jumped on the next
technology.  If 2to3 is our upgrade path to Python 3, then py2js is the
upgrade path to JavaScript.

So here is my proposal: can we collect a checklist with things that make
upgrades to Python 3 hard and possible ways to improve on that?  Can we
reopen the option of doing a Python 2.8 if it makes porting easier?  Can
we accept PyPy as a valid Python implementation that is worth considering
as having an effect on how we write code?
