public: yes
tags: [python, thoughts]
summary: |
  The problems with timezones and Python's datetime object and how you
  would properly use them.

“Eppur si muove!”* – Dealing with Timezones in Python
=====================================================

As a result of our world not being a flat disc but a rotating geoid and
our solar system only having one sun, we have different time of days at
different parts at precisely the same time.  Everybody learns that in
school these days and is well aware of the effects on human life (“Call
your aunt over sea and she will pick up at an odd time”, jetlag etc.).
But unfortunately that whole timezone thing is only partially based on
constraints our world gave us and in computing we have to deal with these
oddities as well.

.. raw:: html
   
   <small>

\* “`and yet it moves <http://en.wikipedia.org/wiki/E_pur_si_muove!>`_” is
what people say Galileo Galilei uttered upon leaving the courtyard after
being forced to recant his belief that the Earth rotates around the Sun.
Which unfortunately is the case and gives us these wonderful timezone
problems.

What does this article have to do with Galileo?  Not really much I am
afraid because even if the world would be in the center of the universe
you would still have timezones.  Consider the title a mistake on my part
which I cannot correct now, can I :-)

.. raw:: html
   
   </small>

What's a Timezone?
------------------

What's your timezone?  If you respond with “UTC+X” that will be correct
for this very moment, but not necessarily true over time.  If you look at
the timezone info database you will find that Berlin and Vienna, even
though they are both in “UTC+1” will have a different timezone
(Europe/Berlin vs Europe/Vienna).  Why that?  The reason are differences
in daylight saving time and historical dates.  Even if those two countries
and cities nowadays have the same DST configurations, a hundred years ago
that was not the case.  Both Austria and Germany for instance used to not
have DST over periods of time.  Austria stopped in 1920, Germany did in
1918.  During WWII both countries unsurprisingly had the same DST
configuration, but afterwards there are a few unsynchronized years again.
Germany abolished DST in 1949 and reintroduced DST in 1979, Austria
abolished it in 1948 and reintroduced it in 1980.  What's worse is that
they did not even select the same date for the switch.

And this pattern is quite common all around the world.  For computing DST
is a huge problem.  The reason for that is that we're usually assuming
that time has a monotonic advancing.  With daylight saving time, during
that one hour of enabling/disabling each year we either get an hour twice
or we skip an entire hour.  Results are log entries that appear out of
order if you log with local time for instance.

To quote the pytz documentation:

    For example, 1:30am on 27th Oct 2002 happened twice in the US/Eastern
    timezone when the clocks where put back at the end of Daylight Savings
    Time, similarly, 2:30am on 7th April 2002 never happened at all in the
    US/Eastern timezone, as the clocks where put forward at 2:00am
    skipping the entire hour

But timezones have more than just DST settings.  Some countries are
switching the means of time measuring altogether, in some cases even
without entering or leaving DST.  For example, in 1915 Warsaw switched
from Warsaw time to Central European time. So at the stroke of midnight on
August 5th 1915 the clocks were wound back 24 minutes.  In neither case
was DST active.

Much fun can be had with timezones in general.  There was at least one
country that at one point had a timezone that differed per day because
they synchronized 0:00 with the time of the sunrise.

Where is the Sanity?
--------------------

The sanity right now is called UTC.  UTC is a timezone without daylight
saving time and still a timezone without configuration changes in the
past.  However because our world is again this rotating geoid and
something we don't really have under control, the problem of leap seconds
will at one point show up.  If UTC will then take leap seconds into
account (which are irregular and with that problem for computing) or not
(and each timezone will have sub-minute differences to UTC) is, as far as
I know, nothing that was decided for sure yet.

However right now, UTC is the safest bet.  From UTC you can convert into
any local time, however of course the reverse is not true due to what was
shown above.

So here the rule of thumb which never shall be broken:

    **Always measure and store time in UTC**.  If you need to record where
    the time was taken, store that separately.  Do not store the local
    time + timezone information!

Where is the Problem?
---------------------

Now in theory that blog post should end here and we all go on with our
lives.  Unfortunately in Python there are a couple of more things to keep
in mind due to some design decisions that were made a long ago that were
not thought well through.  The motivation was sound, the implications
however were not.

At one time the following decisions were apparently made for the datetime
module in the standard library:

1.  the datetime module should not ship timezone information because
    timeszones change too often.
2.  the datetime module however should provide an API to attach timezone
    information to a datetime object.
3.  It should provide these objects: date, time, date+time, timedelta

Unfortunately a few things went wrong.  The biggest problem is that a
datetime object with timezone information attached and a datetime object
without that timezone information don't work at all together:

.. sourcecode:: pycon

    >>> import pytz, datetime
    >>> a = datetime.datetime.utcnow()
    >>> b = datetime.datetime.utcnow().replace(tzinfo=pytz.utc)
    >>> a < b
    Traceback (most recent call last):
      File "<stdin>", line 1, in <module>
    TypeError: can't compare offset-naive and offset-aware datetimes

Ignoring the horrible API you have to use to attach a timezone information
to a datetime object this leads to quite a few problems.  If you are
dealing with datetime objects in Python you will sooner or later start
attaching and removing tzinfo objects all over the place.

Another problem is that there are two ways to create a datetime object for
the current time in Python:

.. sourcecode:: pycon

    >>> datetime.datetime.utcnow()
    datetime.datetime(2011, 7, 15, 8, 30, 55, 375010)
    >>> datetime.datetime.now()
    datetime.datetime(2011, 7, 15, 10, 30, 57, 70767)

One gives the time in UTC, the other in local time.  However it will not
tell you what local time is (because it does not have a timezone
information object, at least before 3.3), and it does not give you way to
know which one was UTC.

If you convert from a UNIX timestamp into a datetime object you also have
to be very careful to use the `datetime.datetime.utcfromtimestamp` method
because the normal one will assume the timestamp is in local time.

On top of that, the library provides a `time` object and a `date` object,
both of which are close to being useless when timezones are involved.  The
former cannot be shifted to other timezones because that would require the
date component.  The date itself also only makes any sense local to a
timezone because what's today for me, could be tomorrow or yesterday for
you thanks to the wonderful world of timezones.

What's the Best Practice?
-------------------------

Now we know where the culprits are.  What should we do?  If we ignore
theoretical problems that won't show up anyways unless we deal with
history times there are a few best practices that make your life easier.
If you ever have the problem with historic dates, there is an alternative
module called `mxDateTime
<http://www.egenix.com/products/python/mxBase/mxDateTime/>`_ which
generally follows a better design and supports multiple calendars as well
(Gregorian and Julian).

Internally use UTC
``````````````````

This should be a given.  When you take the current time, always use
`datetime.datetime.utcnow()`.  If you are taking in user input that is in
local time, immediately convert it to UTC.  If that conversion would be
ambiguous let the user know.  Do not blindly guess.  I know every time the
DST switch comes up I am setting a second analog clock and not just my
phone because my iPhone failed with that conversion twice now.

Do not use offset aware datetimes
`````````````````````````````````

It might sound like a good idea to always attach a tzinfo object, but it's
actually a much better idea to not do that.  If you assume that every
datetime object without a tzinfo object is in UTC, that's the better
solution.  You can actually take advantage of the fact that you cannot
compare these two, similar to how you cannot mix bytes and unicode in
Python 3.  Use that “API weakness” to your advantage.

1.  internally always use offset naive datetime objects and consider them
    UTC.
2.  When interfacing with the user, convert to and from local time.

Why would you not want to attach an UTC tzinfo object?  First of all
because the majority of libraries are written with the assumption of
`tzinfo` == None in mind.  Secondly because it was a horrible idea to have
this tzinfo object in the first place as the API is broken.  If you look
into the pytz library it has to provide alternative functions for the
conversion because the intended API for timezone conversions is not
flexible enough to represent the majority of timezones.  By not using
tzinfo objects there is a chance that we can one time change to something
better.

Another reason for not using offset aware datetimes is that the tzinfo
object is implementation defined.  There is no standard way to transport
that timezone information (with the exception of the UTC offset in that
very moment) to other languages or over HTTP etc.  Also datetime objects
with timezone often cause much larger pickles or broken pickles altogether
depending on the implementation of that timezone object.

Rebase for Formatting
`````````````````````

If you then want to show the time in the user's local timezone take that
UTC datetime object, attach the `UTC` timezone information, look up the
user's timezone, rebase to local time and format.  Do not do the
conversion of the timezone with the tzinfo method which is known to be
broken, but use the pytz one.  Then throw away that filthy offset aware
datetime object you've created for formatting and go on with your life.
