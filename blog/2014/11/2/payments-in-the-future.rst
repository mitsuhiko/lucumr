public: yes
tags: [thoughts, bitcoin]
summary: |
  Some thoughts about various payment systems on the internet and how
  viable they are for open source project support.

The Future of Payments and Open Source Support
==============================================

I kept my mouth shut about Bitcoin on my blog so far, but I do feel like I
need to bring it up now because of how many comments and mail I got about
a bug report I wrote two weeks ago for removing projects of mine `from a
bounty website called tip4commit
<https://github.com/tip4commit/tip4commit/issues/127>`_.

It feels like you are not allowed to say anything other than "bitcoin is
amazing" on the internet without getting loads of negative comments.  I
found that quite interesting because I did not actually have anything
against Bitcoin in this particular case.

However to have a place to point future hate mail against, this is why I'm
less than lukewarm about Bitcoin.

My Problem
----------

The actual problem I had was not that there was Bitcoin involved in and by
itself.  The problem was on one hand something I did not opt into (and
there not being a way to opt out of) this tipping system and that it's a
completely unregulated space that can cause me troubles I could have
avoided otherwise.  As of why that is the case I believe I need to provide
a bit of explanation because I feel like the base assumptions that people
have that wrote me mail are completely different from mine and no sensible
discussion can be had in that situation.

The World I Live in
-------------------

So let me explain you a bit in which world I grew up.  I was born and
raised in Austria, spent some time in London before going back to Austria.
Money in Austria (and many other European countries) works different than
in the United States where most comments on the internet come from.  How
big those differences are cannot be expressed because it affects
everything in your life.

Austrians pay a lot of taxes.  How much taxes we pay is very hard to
grasp, even as an Austrian because unless you are running a company you
often do not even see all the costs that are associated with your salary.
Taxes and other things are split into roughly three categories: social
security, employer costs and income taxes.  Those things are actually not
called that way in Austria but since this is an English blog post I will
stick with it.  Your employer pays you social security and other employer
costs which includes medical insurance and contributions to the pension
system and many other things.  These payments cover all kinds of things
that are related to human beings.  For instance if a woman gets pregnant
and stops working, those payments come of a pool of money that was
allocated through these measures.  Each child in Austria gets support
payments from the state and so forth.  There are a lot of things that are
paid out of the pool of things you do not see normally.  From the amount
that you get in the end, you also pay taxes.  Those taxes are used for
highways, kindergartens, schools, universities and lots of other things.

The reason I bring this up is because our taxes are very high, but I get
something for that money.  It might not be the perfect system and there
are lots of things about it that make me furious, but I do not see a
reason why I would want to stop paying taxes.

It's not just taxes that are different though, credit is different too.
Very different in fact.  Credit scores exist here, but the lack of one
does not deny you services.  That's also because it is very hard to get a
credit in the first place.  It is not very important though, because
credit cards are not nearly as relevant here as elsewhere.  You still
kinda need a credit card for online payments but they don't *really* give
you credit.  All Austrian credit cards I have ever seen (with the
exception of American Express) charge of a linked bank account on a
certain day.  If you use the card for more money than is available on your
account it puts your account into overdraft and you pay the overdraft
fees.  Secondly Austrian credit cards come with Chip and PIN, send you a
text message whenever they are charged and require two factor
authentication through a phone on 3D secure enabled sites.  Local services
also can charge you directly from your bank account through an API
provided by banks that require two factor authentication to confirm a
payment.  As of recently the use of NFC for payments is also going up
tremendously and readers for them pop up everywhere.  The advantage
obviously being that you cannot skim the credit card number and PIN from
them.

Most of my transactions are also in the SEPA region which means they are
free and clear within a business day.  The ones that leave SEPA I have
transferwise for, which is beating Bitcoin in costs and predictability
when going cross border (if you need to convert from and to real world
currency on both ends).

In my world, Bitcoin seems quite useless.

Why is this relevant?
---------------------

This topic is relevant because smaller scale Open Source projects
definitely could benefit from financial support.  I am a huge fan of
gittip aka gratipay and bountysource.  The reason for this is that they
make it easy to contribute money for Open Source projects and the
companies behind them are very nice and straightforward to work with.
They will make sure that the model is watertight and legal.  I can make
sure that all paperwork is in order so that it causes no problem for
either the supporters, gratipay/bountysource or me.  I don't mind if
people use Bitcoin for supporting me, but I do not want to touch this
thing because it just makes it more complicated than dealing with a real
currency.

For me sleeping well is an important part of my life and sleeping well
works better if I do not have to worry about such things.

Bitcoin is the Wild West
------------------------

Bitcoin by itself if it's not going through a system like coinbase is wild
west and I don't mean that in a good way.  A perfect example for this is
the already mentioned tip4commit project which is my favorite example of a
terrible service lately.  It collects money (unasked!) on behalf of other
projects, collects 1% of the amount donated and spams people with mails to
redeem their collected tips.  If anyone would run this service with real
money they would instantly run into regulatory problems (rightfully so!).
First of all there is the problem of what happens with unredeemed
currency.  There are strict laws in place in all western countries for
this sort of thing.  Because this service is using Bitcoin however, it
will manage to fly under the radar for a long time however.  I don't have
enough time on my hand to deal with them and I don't want to spend money
on getting rid of them either, but if they would be doing this with real
currency I would not have to, because they would need to use a payment
system which is pressured by banks to prevent this sort of thing from
happening.

If you start handling real money and you have large sums going in and out
of accounts there will be signals firing that will ask you about the
nature of your business and if you have a license for it.  If it however
is Bitcoin or any other crypto currency it can avoid this entirely.

In my fancy world where I live in, this is not a good thing.  If you have
a completely broken piece of country then I can imagine that you are
suspicious of regulation and this sort of thing, but for me regulation is
what keeps my world running and working.

Personally I believe that Bitcoin is a terrible currency (or not a
currency at all) but I can see how it might be useful for inter-bank asset
exchange and transaction clearing.  I would believe that in this space
innovation will happen and that Bitcoin will have quite a bit of impact.
Something like the blockchain might be nice to see in the future.

You Can't Ignore Bitcoin
------------------------

I do not care about Bitcoin and until recently I have been able to avoid
it entirely.  Through this tip4commit madness however all the sudden I was
forced to deal with it and I did not enjoy the experience.  In my books
Bitcoin is an incredible overvalued first generation "thing" that I just
don't care about.  But please don't make me care about it.

Bitcoin for me feels like a cult.  The vocal people in the community seem
like they don't actually care about Bitcoin, but they want to see it
succeed so that their "investment" makes a profit.

I did not even care about the tip4commit thing any more by the time it was
submitted to reddit (the issue was already closed as far as I was
concerned because I did not want to waste more time with it) but all the
sudden I got email and comments.  The reddit post had the awesome title
“This guy is complaining about tip4commit, please help educate about
Bitcoin”.  I do not want to be educated about Bitcoin.  I have been
following the Bitcoin project since before ASIC mining, by now I have read
all the arguments …

What I Actually Want
--------------------

If you want to make a truly useful service for Open Source, make
something like bountysource but improve upon it.  Make a service which
allows developers to register their Open Source projects with a support
platform.  Then allow those developers to setup a split between the
project itself and contributors (for instance 20%/80%).  Then allow users
to put bounties on items in the bug tracker.  When a bug is fixed and
accepted the patch author gets the 80% and the project gets the 20% for
merging the fix/patch and for maintaining it in the future.

This keeps the gamification out and makes the process very transparent for
everybody.  Right now my problem with bountysource is that I am afraid it
would bring up the topic of money too much and complicate things (why did
you not merge my fix / patch.  Why did you do it yourself?  Where is my
money?) etc.

But whatever you do, do not make Bitcoin your feature, solve an actual
problem.  And solve it in a way that I can declare my taxes and sleep well
over it.  Open Source is already stressful enough.  Fantasy coins on my
tax declaration are not making my life easier.
