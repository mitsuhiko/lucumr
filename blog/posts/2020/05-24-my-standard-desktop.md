---
tags:
  - covid19
  - desktop
summary: "How my work from home situation looks like at the moment."
---

# My Standard Desktop

Like many others I'm spending a lot more time working from home now.  This
in no way is a new situation for me, but I figured I might as well write a
bit about how I work from home given the increased interest.  Mostly
because after seeing so many complex dev setups recently I wanted to share
something that's *largely* bland.

![](/static/desktop-2020.jpg)## What's There

Most of what I have here is from IKEA, like pretty much everything we own
in this flat.  This is for a handful of reasons.  The first one is — and
that's quite consistent with my general approach to most things — that
it's standardized, mass produced and if something breaks you can get it
repaired easily.

The most important items are the [IDÅSEN](https://www.ikea.com/at/de/p/idasen-schreibtisch-sitz-steh-braun-dunkelgrau-s79280955/)
standing desk and the [MARKUS](https://www.ikea.com/at/de/p/markus-drehstuhl-vissle-dunkelgrau-70261150/)
swivel chair.  Since it's a standing desk that is moving up and down close
to the wall I attached a [SKÅDIS](https://www.ikea.com/at/de/p/skadis-lochplatte-weiss-10321618/)
pegboard behind it.  It use it partially for cable management, partially
to make sure stuff does not roll down and can lean against.  There is also
a [GALANT](https://www.ikea.com/at/de/p/galant-schubladenelement-auf-rollen-schwarz-gebeiztes-eschenfurnier-60365153/)
drawer unit for storing some things.

The monitor is on top of a [SIGFINN](https://www.ikea.com/at/de/p/sigfinn-monitorerhoehung-weiss-60467689/)
monitor stand which I painted black.  Below I store my [Filco Tenkeyless](https://www.diatec.co.jp/en/det.php?prod_c=763) mechanical keyboard.
I have both it and a normal Apple Magic Keyboard connected to it.  Like
all other things I use a US keyboard layout there.

In total desk, drawer and chair and all the other stuff on it was under
1000 Euro.

## Docking the Macbook

I have a desktop PC too but I basically never use it.  Since I carry my
Macbook Pro around most of the time I just hook it up at home with a
monitor.  I'm trying to ensure that I can unplug it and continue working
with very little interruption.  This turns out to be a shockingly complex
endeavour still.

It turns out when it comes to USB-C hubs you either have "gives stable
power" or "has lots of ports".  So I ended up with a pretty
straightforward Anker USB-C hub I use for power, and into it I plugged
some Chinese off-brand multiport which I use for network, audio out, HDMI
and various other things.  I intentionally do not link to the adapters I'm
using because I'm in no way confident that others will have the same good
experience with the same hubs.

It turns out in my case chaining multiple adapters is more stable than the
alternatives.  Despite this I quite often end up plugging in the power
into the laptop directly instead of the multiport.  While the power draw
itself works pretty well now and I get enough watts from the plug, I'm
running into issues with everything freaking out for a bit when I plug the
laptop in and out.  I noticed things stabilize much quicker when the power
is plugged in separately.

In the spirit of keeping as much as possible standardized and simple I am
using a touchpad at home as well.  I also type pretty evenly split between
my Apple magic keyboard and my mechanical one.  While I really like my
mechanical keyboard, I'm for whatever reason feeling more comfortable on
the Apple one for prolonged typing sessions.

## Keeping it Boring

Over the last few years my development setup has become more and more
boring.  This has manifested itself in a few ways: the first one is that I
no longer use more than one monitor.  I'm basically now largely working
of either my Macbook Pro's builtin monitor or my external one.  In the
latter case the Macbook's monitor is almost exclusively used for keeping
Spotify open on it or something else I don't need to use much.

Another change is that I got rid of most of my more complex modifications.
I used to have custom keyboard layouts and a ergonomic keyboard, but got
rid of all that a while back.  This largely comes down to me not wanting
to spend so much time on that any more.  First of all when you get used to
that quite a bit, it annoys you when you no longer have that.  The second
part is that I felt the need to have this with me on the go as well.

So I optimized towards getting the most out of the most widely available
devices.  When my Mac breaks I can buy a new one quickly and get it
recovered within a few hours from backups.  The keyboard I use the most
(Apple keyboard) can be bought also anywhere quickly in the US keyboard
layout I want.  Likewise when I work from the go it's all still the same,
and I don't miss much.

## Internet and Wifi

When we moved into this flat we wanted to have most of our stuff connected
to Wifi. Having had issues with Wifi before, we settled for an [Orbi](https://www.netgear.com/orbi/rbr20.aspx) mesh setup.  This turns out
to be good enough for all of our rooms in the flat and the balcony and I
don't have to fiddle too much around with it to make it work.

That said, I spent more time than I wish I had to on ensuring internet and
Wifi work as well as they possibly can.  For almost two years I was
exclusively working over Wifi and most of the stuff in the flat is
connected by it.  I did however end up using wired Ethernet for my Macbook
recently because it felt odd paying for more bandwidth than my Wifi
supports.

## Small Improvements

On the other hand I'm obsessed with small improvements.  I already
mentioned that I spent a lot of time making the docking/undocking
experience work well.  This has manifested itself largely by trying out a
ton of different USB-C adapters and devices sadly.  It seems like there is
no magic solution that works for everybody.  When I plug my Macbook in the
speakers, microphone and webcam switch automatically from built-in to the
stuff standing on my desk.

There is also a lot of cable management going on.  Quite a few cables are
fixed against the board in the back of the desk, some cables are in the
net underneath, others are in a custom cable duct I added.  In the ideal
world there would be less cables but unfortunately there is quite a bit.
The trickiest bit is that some cables need to extend in length when the
desk is moving up.

Lastly, the IKEA IDÅSEN desk has the disadvantage of neither remembering
any positions nor does it have the ability to continue moving until you
press a button again.  Considering how long it takes to move up and down
this got old, so I wrote a script to automate this.  If I write `sit-down`
in the terminal it moves my desk to my preferred seating position and
`stand-up` brings it to standing position.  This is accomplished by a
[small node script](https://github.com/mitsuhiko/idasen-control) which
sends the necessary commands to the desk via bluetooth.  I also show the
status of the desk in my shell prompt which will alert me gently if I have
been sitting actively for more than 30 minutes.  This timer resets either
when I take a break for 2 minutes or when I move the desk to standing.
[This is what it looks like](https://twitter.com/mitsuhiko/status/1264548621606965248)
when the desk is moving up and down controlled by the shell.
