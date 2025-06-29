tags: [rant, linux]
summary: |
  Exploration into a human problem: the problem of simplifying complex
  matters.

.. role:: raw-html(raw)
   :format: html

Things are not as easy as they seem
===================================

Every year around Christmas there is one event that I am always looking
forward to: the chaos communication congress in Germany which is
broadcasted live over the internet.

This year that congress was called 27c3 and one of the talks there was
entitled “Desktop on the Linux… (and BSD, of course)” and delivered by a
raging man condemning everything about the desktop development in the last
few years.  It's not uncommon to see talks where people try to claim that
everybody but themselves are wrong and misguided.  The interesting thing
this time was that `Lennart Poettering <http://0pointer.de/blog>`_ was in
the audience and at a specific point started to domination the talk.  Now
it is seen as rude if the presenter does not get a chance to hold his
talk, but this time this was entirely justified.  Every single point made
by the talk was either partially or completely wrong and this actually
made the talk fun to watch because it showed greatly how our world is more
complex than some people want to acknowledge.

This talk for me was a prime example of what might be wrong with Open
Source development and an idea of how to improve it.  But before I want to
do that, I want to share a little story with you.

Primes and Circles
------------------

The story is about prime numbers.  Now I really suck at mathematics, so
bear with me when this story does not make too much sense or is not told
properly.  However even with the little bit of knowledge about mathematics
I can understand how prime numbers are defined:

    A prime number (or a prime) is a natural number that has exactly two
    distinct natural number divisors: 1 and itself.

It's a wonderful definition in that it is a single sentence of clearly
written English and everybody can interpret it.  And with that definition
you can easily probe the first few prime numbers.  1 is not a prime
because from that definition it does not have two natural number
divisors.  It only has one and that is the number one itself.  The first
prime is 2 because the only natural divisors are 2 and 1 and nothing else.
The next is 3, the following is 5 and so on.

Now unfortunately for our little minds, prime numbers don't have a clear
pattern.  It's not even that all prime numbers are odd because there is
one prime number (two) that is even.  Leonard Euler said this about the
pattern of prime numbers:

    Mathematicians have tried in vain to this day to discover some order
    in the sequence of prime numbers, and we have reason to believe that
    it is a mystery into which the mind will never penetrate.

Now with everything that the mind cannot fully understand there will
always be people that think to know better.  In case of the prime numbers
we have a person called Peter Plichta who thinks to know better.  He
“discovered” that if you put the prime numbers on rings of 24 items each,
that prime numbers will all be on certain positions on the ring.  However
that by itself is not very interesting.  That's because prime numbers in
the senary system (to the base 6) will always have 5 or 1 as last digit,
besides the first two.

Why is that the case?  That's a surprisingly simple proof.  Remember how
numbers are represented in a system of a specific base.  In senary a
number is of the following form:

.. raw:: html

    <math>
      <mi>x</mi> <mo>=</mo> 
      <msub><mi>a</mi><mn>0</mn></msub> <mo>⋅</mo> <msup><mn>6</mn><mn>0</mn></msup> <mo>+</mo>
      <msub><mi>a</mi><mn>1</mn></msub> <mo>⋅</mo> <msup><mn>6</mn><mn>1</mn></msup> <mo>+</mo>
      <msub><mi>a</mi><mn>2</mn></msub> <mo>⋅</mo> <msup><mn>6</mn><mn>2</mn></msup> <mo>+</mo>
      <mo>⋯</mo> <mo>+</mo>
      <msub><mi>a</mi><mi>n</mi></msub> <mo>⋅</mo> <msup><mn>6</mn><mi>n</mi></msup>
    </math>

With that it is easy to factorize this expression:

.. raw:: html

    <math>
      <mi>x</mi> <mo>=</mo> 
      <msub><mi>a</mi><mn>0</mn></msub> <mo>+</mo> <mn>6</mn> <mo>⋅</mo>
      <mo>(</mo>
      <msub><mi>a</mi><mn>1</mn></msub> <mo>+</mo> 
      <msub><mi>a</mi><mn>2</mn></msub> <mo>⋅</mo> <mn>6</mn> <mo>+</mo>
      <msub><mi>a</mi><mn>3</mn></msub> <mo>⋅</mo> <msup><mn>6</mn><mn>2</mn></msup> <mo>+</mo>
      <mo>⋯</mo>
      <mo>)</mo>
    </math>

And because what we have in the parentheses there will always be a
natural number we can simplify it to this (*k* is an integer):

.. raw:: html

    <math>
      <mi>x</mi> <mo>=</mo> 
      <msub><mi>a</mi><mn>0</mn></msub> <mo>+</mo> <mn>6</mn><mi>k</mi>
    </math>

And because of that if :raw-html:`<math><msub><mi>a</mi><mn>0</mn></msub></math>` is divisible by 2 or 3, then
:raw-html:`<math><msub><mi>a</mi><mn>0</mn></msub> <mo>+</mo> <mn>6</mn><mi>k</mi></math>` is divisble by 2 or 3 (because 6 is).  Now obviously
that does not work for 2 and 3 and if you want to plot them on a ring of
24 numbers and then another ring of another 24 rings and so on.

Now that imperfection is not helpful for Plichta and he tries to solve the
problem by declaring 1 a prime and to declare 2 and 3 as not being prime.
On top of that, he needs another prime to close the circle and declares -1
a prime number.

This does not solve any problems at all.  The main problem with primes is
not that 2 or 3 would not fit nice into a plot in the senary system but
that we cannot predict the holes between prime numbers.  Maybe Plichta has
some more behind his sleeves but when you try to read his book it's more a
story of a wicked mind than a scientific book.  And it appears that he has
the idea that nobody takes him serious because of a big conspiracy.

And this is totally where the simple rules of prime numbers end.
Everything else about them is complex and why past anything I could
understand in my little mind.  A lot of things around prime numbers are
unsolved and if you want to make yourself a name, that's a place where
things are yet to be discovered.

However it looks a lot like people want really simple solutions,
independently of how clever they are.  Plichta is probably an intelligent
man, at least he got a couple of patents registered on his name.  However
he seems to be that he's obsessed with the idea that simple solutions
exist.  They certainly exist in a couple of fields — that however does not
mean that every solution is simple or might even exist.  There are still
people out there that are looking for the possibility of the mathematical
problem of `squaring the circle`_.

If things are easy to understand (the concept of prime numbers,
constructing a square with the same area as a circle) everybody has an
opinion on that — independently of if they know what the hell they are
doing.  This went as far as one mathematician trying to pass a bill in the
state of Indiana to declare π = 4.

Simple Solutions versus the Complex World
-----------------------------------------

Unfortunately our world is not nearly as simple as people think it is, and
this brings me back to the problem of Open Source.

If you look at the development of Linux on the desktop there are a couple
of new developments in recent years that attempted to solve a whole bunch
of problems.  Pulse Audio was developed to solve the problem of multiple
independent audio sources, D-Bus was developed to provide a standard
inter-process communication tool, HAL was an attempt to hide the ugly
hardware layer from higher level applications, Wayland is in the process
of replacing the X11 infrastructure which is just not up to date for
todays tasks.

Now whenever someone attempted to replace an existing piece of technology
there will be a lot of people instantly complaining that it worked better
before.  But only in the open source community this might become an actual
problem.  And here is why:

If Apple decides to deprecate Carbon, a whole bunch of developers will
complain.  However Apple will not step back from that plan and after a few
painful months for developers, Apple will end up with an ultimately better
system.  In the Open Source world, this does not work.  If people
complain, the developer motivation will vanish and the system will stay in
a semi broken state where the new technology is not yet at the point where
it could replace the old one and the old one will continue to not solve
the specific use case the developer of the new solution had in mind.

And because everybody can easily complain that the old solution worked for
them and the new one does not, because they only have their specific use
case in mind.  Let's take GDM as example, because this is what the talk at
27c3 was complaining about initially.  GDM since a few versions will use a
small gnome session and start a few applications for you that might seem
unnecessary (it will load your audio stack, the network manager daemon,
console kit, bluetooth and more).  However there are good reasons people
are doing that.  And if you plan on starting a Gnome session later on
there is not even a downside in doing that.  Of course at the talk the
presenter got applauded for hating Gnome in general which is just sad.

The reasons for starting all these services is that GDM is much more than
just an application responsible for starting an X session for you after it
authenticates you.  If you are a handicapped person you might need a
screen reader, the audio stack for audio output of the labels and input
fields.  The Bluetooth stack might be necessary to enable Bluetooth audio
devices for that exact purpose and much more.  The power manager applet is
necessary because you might want to properly suspend your notebook when
it's idle on the login screen or running low on battery.

Clearly it went a lot of work into the design of GDM and how it operates.
The same is true for Pulse Audio.  Of course such a complex system will
not work instantly, but unfortunately that's how Open Source software
development works.  We tend to share our improvements much earlier with
other people than competing proprietary software vendors.  The advantage
is that we can share that much earlier with other people, the downside is
that many developers will be exposed to not working software and start
complaining instantly.

If your horizon is not very large you will of course miss out
understanding why certain changes are necessary.  The sad part is that
it's so incredible easy to become a part of the hating crowd.

X11 is the prime example of how requirements changed over time.  Back in
the days it made a lot of sense to have network connectivity in the
protocol.  However it turns out, this was not such a clever idea all along
because you don't just need the graphics system and input devices over the
network, but also audio, clipboard and more.  And the design of the past
days no longer works well for today's standards.  Also X11 restricts the
application in how it renders parts of the window in that window
decorations were meant to be controlled by the window decorator and not
the actual applications.  This makes it impossible to make more radical
changes to the way applications are designed on the desktop.  Fortunately
GTK nowadays can draw window decorations itself without the help of the
window decorator.  But I am pretty sure this change did not go without a
lot of discussions and flamewars either (“Applications are not mean to
draw the window decorations”).

The presenter also pointed out that Gnome's applets were a bad idea and
the old method worked so much better.  However what he was missing was
that while the old system was easier, it was completely opaque from the
rest of the user experience making it impossible to let the applet respond
to key commands, focus, or many other aspects of the user experience.

From Simple to Complex
----------------------

Whenever you look at something that seems unnecessarily complex it's an
interesting experience reimplementing it the easiest way possible.  Over
time you will realize why things are often more complex than you thought
they would be.  I certainly made that experience more than once and I
always feel a little bad afterwards because I was dismissing the original
developer's implementation as too complex.  Of course, sometimes things
*are* much more complex then they have to be.  But finding out when things
are too complex or not is not a straightforward process and cannot be
answered easily.

The point here is that what holds back Linux on the desktop is (besides
the incredible stupid hatred over Mono and other technologies with a
corporate background) that people will dismiss new and bold advances as
unnecessary and stupid.

Prime numbers are not straightforward; so isn't audio processing,
internationalization, font rendering, window managing, networking and
pretty much everything else.  Before we had Pulse Audio, sound on the
Linux desktop was not unsolved.  It did work for a couple of setups in one
way, but it was neither a clear nor consistent experience.  When it comes
to drawing desktops it is certainly true that Linux was the first
operating system that had rotating cubes, but it is currently far from the
window drawing experience of OS X and Windows and its drawing system as a
large hack instead of nice design.

Plichta's concept of prime numbers works well for small prime numbers and
when you make a few modifications to make them suit your limited horizon.
But it falls flat on the floor when presented with data from the real
world.

We need more Dialog
-------------------

I think what the Open Source community really needs (especially the Linux
Desktop community) would be an open dialog.  The presenter of the talk
would probably have done good when starting a discussion with the people
behind the projects he dismissed instead of raging about how bad
everything is and how much better it used to be.  Maybe he would have been
right at times, but if you start out like that, nobody will listen to you
which is a terrible loss for everybody.

I love getting feedback and I love healthy discussions.  And even more
than that: I love sharing why things work in a certain way.  I love it so
much that I added a chapter to the Flask documentation that explains
things in the code base that might appear surprising to an outsider.  But
that does not mean the design is flawless or could not be improved.
Unfortunately I made that mistake myself often enough that instead of
discussing things with other developers I went ahead and just hated them
for designing their libraries in certain ways without asking them why they
did it that way.  And if it would have turned out that they were wrong
there is often still time to improve on that.

I love how the Python web community partially gets this right.  Pylons,
TurboGears and BFG for instance merged into a new superproject called
Pyramid which took some unpopular decisions to design an ultimately better
system.  Not only did it base itself on one of the most controversial
components (Zope) but it also went into the direction of complete
backwards incompatibility to clean up with the past.  And I applaud them
for that courageous step.

I don't think we will have many more frameworks merging in the same way
due to changes in philosophy I'm afraid, but of course who knows what
might happen.  Either way it's an amazing example of how dialog can result
in better systems.

We all make mistakes and that's what makes us human.  But why not try to
improve in the new year?  Next time you are about to start telling other
people how overcomplicated things are and that there absolutely must be an
easier solution and that you have it, think about if you aren't missing
something.

And with that I wish you a wonderful, successful and healthy 2011.


.. _squaring the circle: http://en.wikipedia.org/wiki/Squaring_the_circle
