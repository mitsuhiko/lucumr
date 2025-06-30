---
tags:
  - covid19
  - thoughts
summary: A short introduction to TCN based contact tracing
---

# Temporary Contact Number based Contact Tracing

I have already talked here before about [privacy preserving contact
tracing](../../3/contact-tracing/) to fight Covid-19 but I figured I
give an update to this.  I have spent the last week now investigating
different approaches to this and my view has changed quite a bit.

I strongly believe that contact tracing through phone apps is one of our
best chances to return to normal and without losing our civil liberties.
If you want to understand why, have a look at [previous post about this
topic](../../3/contact-tracing/).

## Two Fundamental Approaches

In the previous post I talked in favour of a partially centralized
approach.  This was largely because I felt that one of the inherent
problems of any privacy preserving contact tracing system could be
somewhat mitigated.  That downside is that a person could always use any
such contact tracing system in a way where they could determine that
another person they met tested positive for covid-19 later.  With a
system that has support from a central authority this still cannot be
prevented, but such behavior could be detected as abusive.  However I am
not quite convinced that this would just be security by obscurity and that
the more correct way to deal with this is to just fundamentally
communicate to users that this is an inherent property of the system.

So the disclaimer to any app has to be: if you do not want that other
people discover when you will test positive for covid-19 you should not
use any contact tracing apps.  Which is also why I strongly believe that
any such system absolutely needs to be voluntary.

So if I no longer believe in favour of the centralized approach, what do I
prefer then?  Quite simply put an approach based on temporary contact
numbers, short [TCNs](https://tcn-coalition.org/).  These protocols are
fundamentally decentralized and give us some other benefits.

## Reality on the Ground

What makes application based contact tracing very interesting is that they
take advantage of working on top of a widely deployed piece of hardware:
smart phones.  Specifically smartphones which support Bluetooth low
energy (BLE).  If you hold an AirPods case close to your iPhone you will
notice that something happens on your screen.  BLE is what enables that.

The downside of this is that BLE comes with some restrictions.  The two
most relevant ones are the payload size.  BLE comes with different modes
and different platforms call this in different ways but the most
compatible and energy preserving modes restrict us to under 30 bytes of
payload.  That's not enough to make fancy public key cryptography work
which would be necessary for centralized approaches to play to their
advantages.  This is also why systems that currently follow the
centralized approach will typically exchange a short ID and the extra
payload is then actually exchanged through the cloud or [GATT](https://en.wikipedia.org/wiki/Bluetooth_Low_Energy#GATT_operations).
The former makes a system that could be somewhat decentralized much more
centralized.

TCN based protocols instead will exchange just random identifiers instead.
Most TCN based protocols currently suggest between 16 and 26 bytes of
effectively random data which is easier to work with.

Another complexity is that at present iOS devices in background cannot
discover each other.  This limitation might be solvable by Apple and it
appears various groups are currently in contact with Apple to see what can
be done.  Interestingly an iOS device with the app in background can be
discovered by an Android device so there might be a way to fix this.

## TCN Strawman Protocol

The TCN strawman protocol is the most basic of all these protocols.  It
was first written down by the [Co-Epi project](https://www.coepi.org/)
and is very easy to explain.

1. all mobile phones randomly generate TCNs and remember and broadcast
these.

1. all mobile phones check against a server which publishes TCNs that are
known to be covid-19 positive.

1. all mobile phones check their local contact list against the downloaded
list locally for an intersection.

Step 2 is the only one where a central system is necessary.  For instance
this could be the server of the Austrian Red Cross which publishes TCNs.
Since the TCNs of encounters are only stored on the devices they have to
get on contact with covid-19 tested positive individuals first.

The strawman protocol wouldn't work in practice at the peak of the
infection because of the sheer data requirements.  However there are
various cryptographic tricks which are floating around to reduce the size
of the data set.

## DP-3T

[DP-3T](https://github.com/DP-3T/documents/) is currently one of the
most promising protocols here.  It has a low cost variant which satisfies
most of the qualities of the strawman protocol while reducing the amount
of data greatly (to around 1.5MB of data per day for a peak infection rate
of 40.000 infections a day).  Additionally it comes with a protocol
extension (“Unlinkable decentralized proximity tracing”) which improves on
the simple protocol in a few important aspects.  Specifically it makes it
significantly harder for an adversary to track or identify infected users
at the cost of higher bandwidth requirements.

A simple version of the protocol is easily explained:

1. A device generates a secret key.  Each day the user derives a new
version of the secret key by feeding it into a ratchet like a SHA256
hash function.

1. Each day the device generates TCNs out of the day's secret key for
instance by using a AES in counter mode.  If for instance we want to
switch TCNs every 15 minutes we would need to generate 4 * 24 * 16 bytes
worth of TCNs to have enough for a day.

1. Devices now broadcast a random TCN for the day for 15 minutes each.

1. When a device encounters another person and they consider the contact
long enough, they record the approximate time of day and the TCN
encountered.

1. When a user tests covid-19 positive they upload the secret key of the
first day of infection and generate a new secret key.

1. Other devices now download the secret key for that user and generate
all possible TCNs locally and check for infection.  They only need to
generate 14 derivations of the secret key and the 96 TCNs for each day.

In the more complex version the device uploads seeds of the secret keys
for all time windows in the infection window.  On the backend server a
[cuckoo filter](https://en.wikipedia.org/wiki/Cuckoo_filter) is created
every 4 hours and the seeds are inserted.  Because Cuckoo filters have a
small probability of producing false positives parameters need to be
selected appropriately to reduce this risk.  The upside is that the sets
of identifiers used by the same user are hidden.

## PEPP-PT and Local Governments

So this leads us to [PEPP-PT](https://www.pepp-pt.org/).  It would
appear that PEPP-PT is evaluating DP-3T as the reference protocol and
they are going to open source the code with the idea to support local
authorities in implementing their own version.  Officially they have not
decided between centralized or TCN approaches yet, but there seems to be a
high chance it will be the latter.  The concept is also very simple.
Simple enough that if you want to explain this system to others, there is
also a nice little [comic strip available](https://ncase.me/contact-tracing/) that explains it.

If your local government is planning on implementing a covid tracing app
it might be worth directing them towards [Co-Epi](https://github.com/Co-Epi).  It already has an implementation
of many of the same ideas in their GitHub repository.  If they do want a
centralized approach the Singaporean government Open Sourced their
application under GPL3 under the name [BlueTrace](https://bluetrace.io/).  It avoids largely unnecessary cloud
infrastructure from what I can tell.
