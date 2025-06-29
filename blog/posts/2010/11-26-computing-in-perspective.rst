tags: [thoughts]
summary: |
  Visualizing numbers and thinking about dimensions in computing.

Computing in Perspective
========================

One of my professors at my university likes to “visualize” numbers by
comparing them to things people know.  That way you get a much better
estimation, even without having an actual picture in your hand.

I find this an especially interesting thought when it comes to comparing
things of computing with things you have a rough idea of.  A while ago I
saw a recording of an interview with `Grace Hopper
<http://en.wikipedia.org/wiki/Grace_Hopper>`_ where she compared a
nanosecond with a 30 centimeter strip of copper wire.  That would be the
distance light can travel in one nanosecond.  But keep in mind that this
was in 1990 when computers were a lot slower and generally less
interesting compared to the machines we are running nowadays where the
computing power of a small business from the early 90'ies is now embedded
into your mobile phone.

A computer from 30 years ago was already way faster than one could think,
but it was definitively simpler.  Now we often think of computers as being
these magical black boxes that just (sometimes) work.  It's very hard to
still imagine the speed of these things.

A Modern Processor
------------------

One of the top notch CPUs money can buy for the consumer market is at the
time of writing the Intel i7-940XM processor.  It's smallest feature is 45
nanometers in size and has four processing cores equipped.  Each of these
cores is ticking at the frequency of 2.13 GHz.  It's sitting on an LGA
1366 socket which connects it with the mainboard.  The socket carries that
name because of the 1,366 pins that act as connection between CPU and
mainboard.  That number is unrelated but amazing by itself when you think
abuot how small these things have to be as the size of the CPU is only
4.4 × 4.3 cm.

To get that particular part of the computer into perspective, we have to
compare it with the physical limits of data transmission.  The speed of
light in vacuum is 299,792,458 meters per second.  Inside a copper wire
however signals only travel at around 3/4 of that, but let's just go with
Grace Hopper's example and assume we're operating at the speed of light.
If a processor is ticking at 2.13 GHz it means that a single tick takes
around 0.39 nanoseconds.  In that time a signal can travel about 12
centimeters.

Imagine that in a bit more than a second light travels from earth to moon,
a speed we cannot even imagine.  Yet our modern computers (and I must add
that we slowed down frequencies already) tick at a rate where for
something we can measure light only moves a distance of about 10
centimeters.

The same processor also consists of 731 million transistors.  You could
take that one CPU, cut it into little pieces and give every person in
Europe one of them.  Just that they are so incredible small that you would
have a hard time doing so.

Your Average Computer Game
--------------------------

Computer games are one of the most amazing things when it comes to every
day use of heavy number crunching.  A HD screen has a resolution of
1920x1080 pixels.  This makes more than 2.1 million pixels that need to be
filled about 60 times a second.  Most modern games are applying 3D
rendering techniques that need more than one pass per pixel.  Even if each
pixel would be shaded exactly once, you still need around 126 million
calculations for each pixel.  And this is just the shading aspect.

Besides that, a modern graphics device is even more impressive than your
average CPU.  A modern graphics card is made of 3 billion transistors that
can fill 30 billion pixels per second.  The data bus is powerful enough to
shovel about 150 gigabytes through the wire.

But not only graphics are impressive.  The other important aspect of
computer games is often low latency network connectivity.  Video games
often are played over networks with other players in the world.  Modern
shooters allow 32 players and more to engage in cross-country sessions
where the latency between the players is less than 50 milliseconds.
Sophisticated algorithms are sending bullets, player movements, physics
and tons of other information over the internet and synchronizing the
information for each player involved.  While this of course does not
always work well due to our physical limits and the fact that millions of
people are sending data over these wires we are able to play together with
barely any noticeable latency.

Big O and Runtimes
------------------

While this is not so much related to computing but algorithms, it also
helped me a lot understanding dimensions in computing.  I think everybody
at one point has a fairly basic understanding what the Big O notation is.
Simplified it gives you an idea of the expected complexity of an algorithm
in time or memory usage.  Some of the most common forms are *O(1)* for
constant, *O(n)* for linear or *O(n²)* for quadratic complexity.

The idea is that if *n* becomes very, very large (indefinite) the
complexity greatly varies.  If getting an item from a collection would be
*O(1)* you would get back any item from the collection in the same time,
no matter if it's the first or the last.  One could think of it that way:
If the complexity was *O(n²)* and you would get the first item in 1
second, the 10th would take a minute and 40 seconds.  That's not entirely
correct, but not totally wrong either.

Constant runtime is easy to understand, so is linear runtime.  But if I
give you an *O(log n)* — what's closer: constant or linear runtime?

If you are like me and not very bright at mathematics and you don't have a
good idea of the logarithmic scale besides it growing slowly, you could
compare it to the “width of a number”.  This great comparison comes from
the professor I mentioned before.  *log10(10)* is 1, *log10(100)* is 2,
*log10(1000)* is 3 etc.  In fact you could use the logarithm to implement
a function that returns the number of digits in an integer:

.. sourcecode:: python

    def digits(num):
        return int(floor(log10(num)) + 1)

If you keep in mind that numbers in computing are also very often limited
in size you could think of the complexity of *O(log n)* as being nearly
the same as *O(1)*.  For example if the memory consumption of something
would be *O(log n)* and we are running on a 32bit system, chances are your
maximum memory consumption would be *O(10)*.  10 because of the rounded up
logarithm to the base 10 of 4 billion which is the largest unsigned
integer that fits into 32 bit.  Because 10 is a constant it would mean we
can shorten it and end up with *O(1)*.  So yes, much, much closer to
constant complexity than linear one.

Sharing Comparisons
-------------------

Unfortunately I am really bad at sharing these “comparison objects”.
Mainly because what makes sense to me does not necessarily make sense to
other people.  I can imagine a liter of water, a meter or centimeter quite
well, but if you are American, chances are neither of these things have
expressions you feel comfortable comparing too.  When it comes to monetary
values I often compare things to local prices, GDP of Austria and other
things that absolutely have no meaning to you.

What would really be interesting is some kind of book, website or manual
that collects some popular comparisons of various things.  I remember my
lectures by said professor really well because some of the comparisons he
came up with were really great and general enough that everybody had a
basic understanding of the dimensions he was talking about.

Why do we Compare?
------------------

I think one of the most useful skills I personally ever acquired was the
ability to judge and compare various things.  People love to confuse other
people by throwing numbers around but numbers are quite meaningless unless
you can compare them to something else you already know.  A million Euros
/ Dollars can be nothing, but it could also mean a lot.  It depends on the
scale of known things you are comparing it with.  It also is a kind of
security measure.  If you know what's the common price for a hamburger is
you can save yourself from paying too much for it when you go to a
restaurant you don't know yet.  But besides getting a better feel for what
to pay (or what data structure to use in what situation) it also gives you
a good idea of the complexity of certain things in general.

`Jeff Dean <http://research.google.com/people/jeff/index.html>`_ added a
slide to one of his presentations which `did the rounds afterwards
<http://axisofeval.blogspot.com/2010/11/numbers-everybody-should-know.html>`_.
It shows the “numbers everybody should know”.  I guess there is no point
in learning the exat numbers but some of these stem from a basic
understanding of how computers and our world works:

======================================= =================
L1 cache reference                      0.5 ns
Branch mispredict                       5 ns
L2 cache reference                      7 ns
Mutex lock/unlock                       25 ns
Main memory reference                   100 ns
Compress 1K bytes w/ cheap algorithm    3,000 ns
Send 2K bytes over 1 Gbps network       20,000 ns
Read 1 MB sequentially from memory      250,000 ns
Round trip within same datacenter       500,000 ns
Disk seek                               10,000,000 ns
Read 1 MB sequentially from disk        20,000,000 ns
Send packet CA->Netherlands->CA         150,000,000 ns
======================================= =================

Having a basic idea of dimensions in computing makes it possible to
brainstorm, accept and reject ideas without having to consult Wikipedia
every few seconds.  This makes you more efficient when trying to do
something you didn't do so far.  It might not be that you are completely
right the first time, but it speeds up your thought process a lot.

At the same time one has to build up some certain confidence with these
numbers to be efficient on discussing such things with other developers.
Nothing feels more embarrassing than to suggest something completely out
of proportions or to be anxious and not sharing an idea because one does
not have the confidence to propose something.

I come back to that every once in a while now with my recent adventures
into the world of voxels and blocks for my Minecraft inspired engine where
naive approaches for infinite or at least very large worlds will instantly
hit all kinds of technology and physical problems.
