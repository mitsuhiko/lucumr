---
tags:
  - thoughts
  - games
summary: |
  Thoughts on Peter Molyneux' Curiosity game and why it's my biggest
  disappointment of the year.
---

# Death by Million Cubes

The year is not completely over yet but I already found my biggest
disappointment in games of 2012: Peter Molyneux' [Curiosity](http://en.wikipedia.org/wiki/Curiosity_%E2%80%93_What%27s_Inside_the_Cube%3F).
In the unlikely case that you missed what the game is about: it's
basically a huge cube floating in space that is made of millions of little
cubelets that disappear when tapped upon.  Everyone that downloaded the
game taps on the same cube and together the players make the cube
disappear and eventually the game self-destruct because there is nothing
more to do.  The person that taps on the last cube gets a reward.

## My Expectations

I was really looking forward to that game.  Not because I find it an
interesting game — far from it.  I was looking forward to it because there
are two things in life that I find more interesting than anything else:
technology and human behavior.  This game had the chance to showcase an
excellent implementation on the technical side and tell is something new
about how humans work.  Instead what I got was a failure of monumental
scale.  The technology behind it is not very clever and because it barely
works it won't be able to tell us anything about how humans work, at least
as far as the game is concerned.  In fact there is more to learn from
discussions outside the game than behavior that people show in the game
itself (if it even loads).

## Scaling Problems

So for the unlikely case that someone reads this blog who is not a
programmer at heart, here is why Curiosity is an interesting technical
challenge.  Let's ignore Curiosity the final product for a moment because
it actually does not at all behave like you think it should.  I will come
back to Curiosity a bit later.  Let's say we would like to build our own
Curiosity on the concept outlined previously.

Let's assume our cube is made out of millions of cubelets: how large is
it?  Let's say one face on the top of the cube is set to 8001 by 8001.
Since there are six sides and the cubes on the edge are shared with other
sides the easiest way to count the cubes on the outside is to calculate
the volume of the cube and subtract the volume of everything but the outer
layer which leaves us with 8001^3 - 7999^3 (383.904.008) individual cubes
on the outermost layer.  That's three hundred eighty-four million two
individual cubelets.  The good news is that the cube gets smaller as we're
going in.  In fact the number of cubelets per layer is growing
quadratically from the core outwards which also means that the time it
takes to chip away layer after layer from the outside to the inside is
quadratically.  The more we're chipping to the core of the cube the faster
it will get — quickly.  Why is that interesting?  It's interesting because
it means as the cube gets smaller there will be higher contention as the
same player count now operates on a much smaller surface.

There are two areas where Curiosity needs scaling: on one hand you have
the client which needs to render the cube.  That part is not too
complicated because of the restriction that you can always only operate on
one layer.  That makes drawing very simple.  On the other hand however you
have the server where you need to store and process the data.  Let's say
we go with the above dimensions for a cube.  Next we're assuming 10.000
concurrent players and each player taps exactly two times per second.  In
that case it would take the players 5.3 hours to tap away all the cubelets
on the top.  But imagine how quickly those players would tap away lower
layers.  These players would tap away the last 200 layers of the cube in
less than 15 minutes.  Worse, the last 20 layers would disappear in less
than a second.

The simplification in Curiosity's design that you can only ever tap on the
outermost layer does not only help with rendering.  Thanks to that our
storage requirements on both server and client will be predictable and
manageable.  The largest layer is the outermost one.  For the largest
version of the cube with a size of 8000 that would be a total of ~46MB of
storage for the individual cubes assuming one bit per cubelet.  On top of
that we need one measly integer that tells us on which layer we are.
That's definitely something the client could keep in memory on a modern
mobile phone but the initial synchronization time would be killer.  What
complicates things is that with the amount of tapping that is expected
from that game the whole thing would change rather dramatically until you
finished downloading everything.  The solution for this would be to have a
general level of detail system.

Here is where it gets annoying: our cube only have two states per cubelet:
present or not present.  It's just two extremes which is problematic to
deal with if you want to build a lower resolution representation of the
cube (LOD).  Regular nearest neighbor will not work since it will pick a
single pixel and that decides what to show.  With a cube of the size of
Curiosity you might want to zoom out quite far.  With 8000 by 8000 pixels
you will have to skip over more than 10 by 10 pixels if you zoom all the
way out.  The best result is probably achieved by counting the number of
black pixels within each N by N quad and then write the LOD level.  You
then would have to load the higher resolution picture as quickly as
possible on loading, definitely before the user can start issuing taps
because otherwise the user might modify areas that are already cleared.
The good news is that the game design does not allow to resurrect already
removed cubelets which would allow some optimizations.

The real issue however here is concurrency.  On the top layer everything
might be cool.  The game once zoomed close enough would subscribe to the
areas and all taps are immediately exchanged between the people
participating there.  Let's say the zoom level on which you tap is 20x20
cubelets.  We could optimize the system by dividing the topmost layer of
our cube into 20 by 20 large subscription areas.  Clients subscribe to
these areas to be informed about updates as they happen.  Assuming you
could always only fully zoom into the game the worst case would be
subscribing to four of these areas which covers a total of 40x40 blocks.
At the topmost level you would have approximately 240.000 such
subscription areas.  If you distribute 10.000 players among them each
group has on average 0.05 players on it.  As the cube grows smaller and
smaller more players would subscribe to the same groups driving up the
outgoing network traffic from the server.  Where at the start most traffic
on the server would be inbound only since barely anyone is in the same
subscription group you run into troubles with smaller groups.  If the cube
is approximately 500x500 in size you're expecting 10 players in the same
40x40 block.  At the end you would have every player in the same group
since the cube is no longer big enough to distribute the players around.

## Latency Issues

Now obviously the whole game is self-terminating as designed.  Someone
will chip away the last block and then the experiment will be over.
However what this means in terms of network traffic is ridiculous.  Let's
assume the game would be really popular because you have something special
behind the last block which only one person in the world can get.  Once
the cube is smaller than the zoom level all players will have to get all
network traffic.  Let's assume 50.000 concurrent players which is not
completely impossible and these players tap away quickly at a rate of 5
taps per second.  That means that the server would have to process 250.000
requests per second and directly send back data to the clients.  That's a
lot!

This becomes a problem because information on the internet travels at a
certain speed.  With the assumption that the average player has a latency
of 150 milliseconds to the server (Which is already ludicrously
optimistic since most people will play on mobile connections or connect
from different parts of the world to the server) there is a high chance
that the cube already disappeared by some other user before you had the
chance.  With 25.000 players tapping on the same screen the last tap will
be absolutely random.  Multiple players would see themselves as the last
tapper and only a single one wins.  A way to counter that would be to make
it harder to tap on individual cubes as it goes on to rebalance the game
somewhat.

## Keeping the Secret

The other problem you have with the game is how to keep the secret secret.
Only one person can get it, how do you make the game not reveal its
secret?  This is actually not that hard.  You just need a way to load code
and assets on the fly from the central server for the one lucky guy.

## Keeping Cheaters Out

Now that's the hardest part: how do you keep cheaters out.  How do you
make sure people don't just use the network interface directly and bypass
the tapping.  This can't really be countered I think.  I think there is
really only one way to counter that problem: basic velocity testing on the
server.  That way you can ensure that a player doesn't tap faster than
humanly possible.  With that you can still bot the hell out of the game
but you won't be faster than the fastest human tapper.  That however gives
people that cheat the game still a higher chance to win it than a human
being.  You could potentially make it harder by changing the API every
couple of levels but at one point people will have that figured out as
well.  With a game that simple you will have a cheating problem on your
hand sooner or later.

## How Curiosity Does It

Alright.  Now that we know some of the problems, how does Curiosity solve
it?  The answer is: it does not.  It saddens me but the game does not even
appear to have realized what the problem with the design might be.  The
cleverness in the execution seems to stop after realizing that
transmitting all the blocks at one time is a bad idea.  Instead of looking
at this as a form of interesting engineering problem nobody thought
anything at any point as it seems:

- The server backend is a simplistic PHP application, I can only guess it
actually uses some form of database for it, why otherwise would you use
PHP …

- the gold rewards in the game that are generated for tapping is
apparently entirely client side — I did not even bother finding out
how purchases are handled.  I would not be surprised if that was not
very secure.

- the game only synchronizes with the server once per minute.  You can tap
in areas someone else is tapping without realizing it.

- the LODding is incredibly basic and often lies about areas.  You can
even start tapping in unloaded content without the game giving an
indication that this is happening.  It seems to also only use a single
pixel since some people managed to write a four letter swearword across
the cube which disappears after you zoom in.

- Not only does the game seem to LOD oddly, sometimes it seems like it
does not even remember the individual cubes.  If you zoom down even if
you wait for minutes you will still see 8 by 8 blocks that are either
present or completely chipped away.  Never have I seen individual blocks
sitting around except for my own ones in the same session.

- the game does not appear to handle the edges of the cube properly.  If
you tap away one block at the edge of the cube and then rotate the cube
you can't see the damage you did sideways.  Understandable but also very
boring.

For a game that has DLC worth many thousand US dollar in the game this is
a very disappointing execution.

I would have spent some time figuring out if it reveals its secret but in
all honesty I am already disappointed and considering how overloaded the
severs are at the moment, it's not at all interesting playing around with
the API to see how it works in detail and if it's exploitable.

## The Disappointment

The idea of “tap the cube until it's gone” is easy if only one player does
it.  If you have more than one it starts getting ridiculously complex and
I find it amazing that they did not realize the problem with their
execution before it went live.  I think the most interesting part about
all of this is how little players will appreciate the complexity in the
design because “it's just a large cube”.

I guess I should be expecting Molyneux to disappoint by now, but I did not
imagine him to fail on such a simplistic concept.  How could the
engineering team overlook the complexity of the design and then deliver
the current implementation before they went down six month with their
current design?  I guess what can be learned from that is that no matter
how simple the idea sounds: that does not mean it will actually work.

I would still be curious if someone can come up with a scalable
implementation of curiosity (with probably some design changes) that
actually lets one player chip away the final cubelet for a price that
works with thousands of players, even as the cube gets smaller and
smaller.  I would actually be curious if that is possible and how the
technology decisions would look like.

I think Molyneux does not fail so much with the idea but with the lack of
people that tell him “no, we can't do this (yet / at all)”.  The idea of a
cube where everybody taps on is interesting but the laws of nature make
this very hard to implement unless all tappers sit on zero latency network
and even then it would be hard to give the last tapper a satisfying
experience.

*Update 15/11/2012*: corrected the incorrect mention of exponential growth
when this is in fact quadratic.
