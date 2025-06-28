public: yes
tags: [covid19, thoughts]
summary: |
  Why contract tracing will be our future and why it's a good idea.

App Assisted Contact Tracing
============================

I don't know how I thought the world would look like 10 years ago, but a
pandemic that prevents us from going outside was not what I was picturing.
It's about three weeks now that I and my family are spending at home in
Austria instead of going to work or having the kids at daycare, two of
those weeks were under mandatory social distancing because of SARS-CoV-2.

And as cute as `social distancing <https://en.wikipedia.org/wiki/Social_distancing>`__
and “flattening the curve” sounds at first, the consequences to our daily
lives are beyond anything I could have imagined would happen in my
lifetime.

What is still conveniently forgotten is that the curve really only stays
flat if we're doing this for a very, very long time.  And quite frankly,
I'm not sure for how long our society will be able to do this.  Even just
closing restaurants is costing tens of thousands of jobs and closing
schools is going to set back the lives of many children growing up.  Many
people are currently separated from their loved ones with no easy way to
get to them because international travel grinded to a halt.

Technology to the Rescue
------------------------

So to cut a very long story short: we can get away without social
distancing with the help of technology.  This is why: the most efficient
way to fight the outbreak of a pandemic is isolating cases.  If you can
catch them before they can infect others you can starve the virus.  Now
the issue with this is obviously that you have people running around with
the virus who can infect others but are not symptomatic.  So we can only
do the second next best thing: if we can find all the people they had
contact with when they finally become symptomatic, we can narrow down the
search radius for tests.

So a very successful approach could be:

1. find a covid-19 suspect
2. test the person
3. when they are positive, test all of their close contacts

So how do we find their cases?  The tool of choice in many countries
already are apps.  They send out a beacon signal and collect beacon
signals of other users around.  When someone tests positive, healthcare
services can notice contacts.

Avoiding Orwell
---------------

Now this is where it gets interesting.  Let's take Austria for instance
where I live.  We have around 9 million residents here.  Let's assume
we're aiming for 60% of resident using that app.  That sounds like a
surveillance state and scalability nightmare for a country known for
building scalable apps.

But let's think for a moment what is actually necessary to achieve our
goal: it turns out we could largely achieve what we want without a
centralized infrastructure.

Let's set the window of people we care about to something like 5 days.
This means that if someone tests positive, that person's contacts of the
last 5 days ideally get informed about a covid case they had contact with.
How do we design such a system that it's not a privacy invading behemoth?

The app upon installation would roll a random ID and store it.  Then it
encrypts the ID it just created with the public key of a central
governmental authority and broadcasts it to other people around via
bluetooth.  It then cycles this ID in regular intervals.

When another device (the infected person) sees this ID it measures signal
strength and time observed.  When enough time was spent with the other
person and that contact was “close enough” it records the broadcast
(encrypted ID) on the device.  The device also just deletes records older
than 5 days.

When person is identified as infected they need to export the contacts
from their app and send it to the health ministry.  They could use their
private key to decrypt the IDs and then get in contact with the
potential contacts.

How do they do that?  One option does involve a system like a push
notification service.  That would obviously require the device to register
their unique ID with a central server and a push notification channel but
this would not reveal much.

Another option could be to do the check in manually which would work for
non connected IoT type of solutions.  You could implement such a system as
a token you need to regularly bring to a place to check if you are now
considered a contact person.  For instance one could deploy check-in
stations at public transport hubs where you hold your token against and if
one of your contacts was infected it would beep.

Either way the central authority would not know who you are.  Your only
point of contact would be when you become a covid case.  Most importantly
this system could be created in a way where it's completely useless for
tracking people but still be useful for contact tracing.

The Phone in your Pocket
------------------------

I had conversations with a lot of people over the last few days about
contact tracing apps and I noticed — particularly from technically minded
people — an aversion against the idea of contact tracing via apps.  This
does not surprise me, because it's an emotional topic.  However it does
hammer home a point that people are very good at misjudging data privacy.

Almost every person I know uses Google maps on their phone with location
history enabled.  With that, they also participate in a large data
collection project where their location is constantly being transmitted to
Google.  They use this information to judge how fluid traffic is on the
road, how many people are at stores, how busy public transit is etc.  All
that data is highly valuable and people love to use this data.  I know I
do.  I'm also apparently entirely okay with that, even though I know there
is an associated risk.

The Future
----------

My point here is a simple one: contact tracing if done well is
significantly less privacy infringing than what many tech companies
already do where we're okay with.

I also believe that contact tracing via apps or hardware tokens is our
best chance to return to a largely normal life without giving up all our
civil liberties.  I really hope that we're going to have informed and
reasonable technical discussions about how to do contact tracing right and
give this a fair chance.
