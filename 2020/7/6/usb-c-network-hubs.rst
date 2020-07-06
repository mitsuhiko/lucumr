public: yes
tags: [desktop, usbc, network]
summary: |
  A work of warnings on USB-C/Thunderbolt hubs with ethernet ports.

USB-C Hubs and Ethernet
=======================

USB-C continues to be an exciting mess.  And by exciting I mean
frustrating and by mess I mean omnishambles.  I already cycled through
many, many USB-C hubs with various different degrees of success but the
latest iteration of failure I think is pretty interesting that it's worth
sharing.

For the most part my USB-C hub pains have been isolated to them just
breaking eventually, overheating, not delivering the necessary power or
just plain not working.  The most recent breakage is that I have three hubs
where if I connect an ethernet cable to it and a USB-C charger but
*disconnect* my laptop, after about 30 seconds the network goes haywire
and eventually more and more devices in it become unavailable.

The curious bit here is debugging this mess and why it happens.  Initially
I thought it was a faulty switch because only devices behind a certain
switch (A Netgear one) cut out, so I got it replaced but that did nothing.
It's also weird that this behavior did not immediately surface.  I have
been using these USB-C hubs for an extended period of time but only lately
did it cause my network to completely go haywire.  My hunch is that it has
something to do with generally having an additional two switches on the
network and changed the overall topology slightly.

What I observed looked quite a bit like a broadcast storm so eventually I
ended up Googling for that in conjunction with different devices I have on
the network.  I was wondering if one of the devices I added to my network
lately would do this.  Eventually I ran out of ideas and just tried to
figure out if and how you can configure the spanning tree protocol on my
Orbi.  This surfaced `a thread from earlier in the year
<https://community.netgear.com/t5/Orbi/Spanning-Tree-problem-with-Orbi-RBR50/m-p/1941325/highlight/false>`__
where someone was explaining that their USB-C hub from AUKEY would cause
the network to drop out when the laptop was disconnected.

This eventually explained what was going on.  Previously the USB-C hubs
with the network adapter I used where powered off when the laptop was
disconnected, as of recently they stay on due to some changes I made in
how they are connected to the laptop.

The issue appears to be that if the USB-C hub with the embedded ethernet
port stays powered on and a cable is plugged in, but the laptop stays
disconnected eventually the network goes down.  I tried to Wireshark it
but I haven't see anything funky actually going on on the network.
Against earlier expectations it doesn't seem to cause a broadcast storm.

Here is what happens if I have a faulty USB-C hub connected (and I have
two which show the same issue):

- after about 20 seconds some wired ethernet devices "disconnect"
- each of the affected devices can no longer be pinged, but they still
  show up with an IP address and they think a cable is connected.
- wifi continues to function, so do two of the Orbi satellites I'm using
- if the USB-C hub is disconnected from power / table network cable is
  removed the network comes back.

The USB hubs where this happen for me is a “FLYLAND” hub as well as an
"AUKEY" one.  I also have a one here from a reputable brand that shows the
same thing, but I'm not sure if that is not actually a fake that Amazon
delivered.

In general though with all three hubs the same thing happens.  I haven't
had too much time exploring what they actually do but different comments
on the internet suggested different explanations.  One is that the
ethernet card in the hub starts sending “PAUSE” flow control frames when
the hub is powered but disconnected from the laptop at high intervals.

This frame apparently is not too common and there are other people
reporting that sending pause frames from any device on the network can
kill it (`Obscure Ethernet for $200 please
<http://jeffq.com/blog/the-ethernet-pause-frame/>`__).

To quote that particular blog post:

    nodes sending PAUSE message to the special multicast address
    ``01:80:C2:00:00:01`` are instructing the switch to not send them any more
    frames.  My switch seems to honor this, but also forwards the frames to the
    other nodes on the network, in effect telling THEM to pause in sending
    frames, which would explain the observed behavior.

So that to me makes a lot more sense than loops or broadcast storms,
especially since I can't really observe this.  Generally if you punch some
questions into your search engine of choice you find a surprising amount
of information on the internet about related issues.  There is all kinds
of consumer equipment which emits some funky PAUSE frames which wrecks
havoc in some networks in some setups.  You can find reports of people
having UniFi equipment that with certain setups `caused Netgear switches
to fall over <https://community.netgear.com/t5/Smart-Plus-and-Smart-Pro-Managed/STP-Leak-using-Broadcast-packet-01-80-c2-00-00-1c/m-p/1235031>`__
or reports of TVs causing `TP-Link routers to break <http://jeffq.com/blog/the-ethernet-pause-frame/>`__.

So where is the fault?  I'm not sure.  It sounds a lot like the issue is
probably shared between the router (a Netgear Orbi) or one of the switches
in the network (I'm using Netgear and TP-Link ones) and the USB-C hub.

So in any case I solved the issue for now by stopping to use any of these
hubs for networking and instead use an Apple USB-C network adapter which
does not seem to show this problem.  Not particularly satisfying but I
only have so much time dealing with this.  If anyone has better ideas,
please reach out to me.  Would be curious to learn more about it.
