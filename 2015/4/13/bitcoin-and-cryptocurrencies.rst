public: yes
tags: [thoughts, bitcoin]
summary: |
  My thoughts on Bitcoin and some other cryptocurrencies and why many of
  us are probably better off just ignoring the whole thing.

Bitcoin is Not a Good Consumer Product
======================================

Writing critical essays about Bitcoin is probably not a very good idea,
judging by past feedback on tweets.  However the topic is burning on my
heart and I really want to share my thoughts about it once and for all
since I'm getting more and more the feeling I live in crazy land.  Bitcoin
brings out the worst in people.

I really do not believe that Bitcoin (or any other cryptocurrency for that
matter) is a viable consumer product.  Not now and not in 50 years.  More
than that it feels like we're all wasting a lot of time and money trying to
figure out what to do with Bitcoin.

This is really not a very technical post because there is not much that
should be said about Bitcoin on a technical level.  While it might be a
revolution in thinking, it's slow and wasteful and completely incapable of
handling transactions on the volume of our banking system by itself.

If Bitcoin wins as technology then because the actual use of the
technology works for large money transmitters (banks, credit card
companies) and not a typical end user.  I do however believe that for
those applications other systems are more appropriate than Bitcoin.

Bitcoin the What Exactly?
-------------------------

Bitcoin is many things at once, and that makes it hard to write about it.
It's an economic system, a currency, a distributed ledger and a community
and some bizarre investment vehicle with ponzi incentives.

The Need for Change
-------------------

I do want to point out that I definitely see the need for change in the
financial system and I have very little doubt that change is not coming.
The way current transactions clear is pretty ridiculous given how far we
have advanced with technology in other areas.  If Bitcoin was just that, I
would embrace it in a heartbeat.  Unfortunately Bitcoin is 10% technology
and `90% politics
<http://papers.ssrn.com/sol3/papers.cfm?abstract_id=2589890>`_.

I absolutely do not agree with the idea that in the process of improving
transaction infrastructure, we should do away with governments, banks and
pretty much everything else.  So while this criticism here applies to
Bitcoin, Dogecoin, Peercoin and god knows what other cryptocurrencies are
out there, it does not apply to `Ripple <https://ripple.com/>`_ or
`Stellar <https://www.stellar.org/>`_.  If you are interested in the
technical bits of Bitcoin, you might want to monitor those projects
instead.

But enough about that, let's look at Bitcoin and friends.

The Technical Bits
------------------

Bitcoin is hailed as the bit technological innovation.  It has been
compared with the invention of the internet.  At it's core it's a very
simple system but hidden behind a lot of finance-theory mumbojumbo that
makes things appear more complex than they are.

I liked `Graydon Hoare's description of Bitcoin
<http://graydon2.dreamwidth.org/201698.html>`_:

    […] the problem space that “bitcoin” launched itself into:

    The problem of acquiring — automatically — a system-wide
    consensus view of a data structure otherwise built using a totally
    open-ended membership, using content-addressed storage of “accounts”
    and a spine of linked hashes of the transactions causing them to
    change (the so-called “block chain”).
    
    You could call it the problem of automatically selecting, at any given
    moment, an “official” branch out of all the forks of a git repository
    in existence in the world, so that everyone knows “where to look” to
    get “the official” current state of it. Only this git repository
    contains financial account balances and you have to be the owner of an
    account to change it (this part is comparatively easy cryptography).

    Bitcoin throws a whole pile of obnoxious goldbug monetary theory and
    ponzi scheme incentives into the mix to spread itself, but at a
    protocol level that's all it's really trying to do.

    Moreover, in order to resist sybil attacks — it's built to have open
    membership — it also uses cryptographic puzzle-solving (based on
    compute-power) to distribute the authority for selecting the official
    consensus-state. This has set up a ridiculous hardware-manufacturing
    arms race in a very particular flavour of compute-power (colliding
    prefixes of SHA256), burned a small country worth of oil, and produced
    a “transaction processing” network with extremely confusing and
    non-obvious failure modes that can sustain about the same rate of
    account-updates as, say, a team of human slide-rule operators. […]
    A single cell phone runs circles around it in transaction processing
    capability, and I tend to think this matters.

Bitcoin as it exists today is slow and does not scale.  It also has a
fundamental problem that bigger protocol changes require centralized
agreement or the whole house of cards can collapses.  I believe this
inherently limits the total number of participants in the network and
makes it more interesting for an inter-bank clearing system than an end
user product.

A Look at the Target Audiences
------------------------------

But oddly enough, it seems like not many people are worried about that.
And in fact, Bitcoin gets a lot of support by non banking institutions.
So why might that be?  Who are those people?  And why are they interested
in the Bitcoin so much?

Bitcoin for the Concerned Citizen
`````````````````````````````````

There is a certain demographic which see ill will and conspiracies around
every corner.  A second demographic sees governments as a beast from hell
and taxes are what supports that monster.  The intersections of those two
groups seems to overlap scarily close with a sizable chunk of the “Bitcoin
community”.  If your base assumptions are that this world works like this,
then I assume that many of the perceived benefits of Bitcoin (distributed,
somewhat anonymous, non government controlled etc.) might make a lot of
sense.

Let's assume for a moment that the world would work like this; wouldn't
Bitcoin be the worst economic base in such a world?  Without Internet
there is no Bitcoin.  This might not seem like a big problem, but when we
go by recent examples of where people were faced with governments that
clearly had bad intents, the availability of internet was very quickly
“spotty” or gone entirely.  When the Arab Spring took place the people in
the countries most affected by violent revolutions either lost their
internet access quickly through government control or because the
infrastructure ended up destroyed.  In either case using Bitcoin for
everyday transactions would have been impossible.

Bitcoin is often called “digital gold” by supporters, but I'm not sure how
much of Gold's properties actually apply to Bitcoin.  It's not that I have
a great understanding of assets (or economics in general) but I can
understand the appeal of gold a lot.  It's rare and the artificial
creation of Gold is many times more expensive than the market price (let
alone that it's much more likely that you produce a radioactive isotope).
It's also easy to verify if what you're dealing with is really gold.  It's
also very physical: you will notice if someone tries to steal your gold
and you can easily check if it's still there.  Aside from all of those
nice properties, it's also useful for humans for other things than keeping
locked up as an asset as one can also make `pretty things
<http://en.wikipedia.org/wiki/Jewellery>`_ and `useful things
<http://en.wikipedia.org/wiki/Electrical_connector>`_ out of it.

Bitcoin on the other hand is none of that.  You can't even tell if you own
a Bitcoin or not.  You might hold the private key to a Bitcoin wallet
which might hold some amount of Bitcoin or not, but that's about the
closest you will ever come to owning it.  Even if you would be 100% sure
that nobody ever figured out your private key, you might still not be sure
if you actually have control over anything.  The reason for this is that
your Bitcoin is really only yours if the health of the network is
guaranteed.  If (for whatever reason) the world conspired against you the
network can just take away your wealth or decide to no longer accept it.

While that might not sound very likely to right now, things along this
could very well happen.  There are already websites that `blacklist
Bitcoin addresses <http://www.blacklistedbitcoins.com/>`_.  Truth be told:
I actually think that it would be good if Bitcoin would develop in a way
that you can lock away currency.  Freezing of accounts is a very important
feature in a well functioning state, and currency systems like Ripple are
working on `freeze functionality <https://wiki.ripple.com/Freeze>`_.  But
even in the Bitcoin world, because movement of money can be tracked, there
is really nothing that would stop this from happening and in fact, there
are already exchanges which try to `prevent the sale of stolen Bitcoin
<http://coinfire.io/2015/03/21/btc-e-suspends-withdraws-to-stop-stolen-coin-dump/>`_.

I'm pretty sure that for concerned citizens, gold is still the better
idea.  Probably until `the government decides to outlaw it
<http://en.wikipedia.org/wiki/Gold_Reserve_Act>`_.

Bitcoin for Criminals
`````````````````````

This is without a doubt, the most promising area for Bitcoin: the criminal
element.  There is not a day where a Bitcoin exchange gets hacked, or
someone uses Bitcoin as a way to extort money out of people.  Not exactly
surprising because Bitcoin's biggest “strength” is it's inability to link
Bitcoin transactions to individuals and the irreversibility of them.

However independently of if Bitcoin was created as a ponzi scheme or not,
the non legitimate uses for it are uncountable.  Bitcoin has been
successfully used to fund illegal online markets, to extort money out of
victims, to take over stolen cloud infrastructure to mint coins, to
washing money gained from stolen credit cards and much more.  Bitcoin can
not just just be used to attack people willingly engaging in the Bitcoin
ecosystem, but also by harming people that have nothing to do with
Bitcoin.  A good example for that is the `CryptoLocker
<http://en.wikipedia.org/wiki/CryptoLocker>`_ ransomware which encrypts
people's harddrives and asks them to pay in Bitcoin to unlock it.  Before
Bitcoin this sort of “business model” was too risky to pull off, but now
it's easy and safe.

Bitcoin will always be valuable for criminals because Bitcoin is written
with the idea in mind that oversight would be automatic and controlled by
Bitcoin users, and not financial institutions or governments.  As such it
fundamentally lacks the necessary tools to deal with theft and money
laundering.  I'm pretty sure if Bitcoin wants to take off as a accepted
financial product, it will eventually have to gain support for for binding
payments to individuals.

Bitcoin for Investors
`````````````````````

Bitcoin in itself is already of quite questionable nature.  The incentives
for investing are not too different from those of a pyramid scheme.
Bitcoin at the end of the day is without value.  The value of Bitcoin is
entirely made up by the consensus of Bitcoin traders.  However the initial
developer decided that inflation is the root of all evil and as such (once
all Bitcoins are minted) is inherently deflationary.  Crazily deflationary
in fact.  Not just because the supply is fixed (and economies are expected
to grow), but also because people lose coins.

While Bitcoin's monetary base inflates like crazy until 20 years or so
from now, there is a natural tendency to hoard coins (colloquially
apparently called to “hodl”) for as long as possible.

This is interesting for traders because it means that their coins will
lose value on the short term, but if they keep the dream alive for long
enough, they probably gain in value.  As such communities of early
adopters form who try to advocate for the currency for more people to join
and for the demand of the currency to go up.  This will increase the value
of the coin (and as the minting of new coins becomes more and more
expensive) will reward the early adopters much more than the ones that
join late.  I assume the ones who make money of Bitcoin currently (other
than early investors) are miners that manage to get away with burning CPU
cycles on cheap electrical energy that they get from somewhere.

Bitcoin for the Deceased
````````````````````````

While dead people are clearly not a customer base for Bitcoin, dead people
are a fact of live.  People die, and usually in the worst possible moment.
One thing that many dead people have are assets and a significant number
of dead people also have next of kins that would like to inherit
something.  When one of my childhood friends unexpectedly passed away I
was able to witness what this can mean to friends and families.  It's not
enough that everyone is in grief, dying is a lot of work.  There are bills
to pay, there are property to return or split up, there are contracts to
terminate, Facebook profiles to close and many other things to consider.

Passing away is a very regulated process.  Most things in life are
specifically designed so that death is considered.

Bitcoin does not consider death.  When you die and nobody but you knows
your private key, your assets are gone.

So you need to protect against this somehow by … what exactly?  Maybe you
are supposed to share your private key, maybe put it in a bank?  Under
your mattress?  But hey, when you die and lose your coins, everybody else
gets a bit richer anyways.

Bitcoin for Everyday People
```````````````````````````

This is the place where I will do a pitch about how I do banking in
Austria.  `My bank of choice <https://www.sparkasse.at/>`_ provides me
with an overall banking experience that is pretty close to perfect.
Because it's in the SEPA region, any transactions I do in the Eurozone
settle for free (and typically same or next day), my credit and debit
cards support NFC, my phone receives a text why my credit card is charged, 
for online banking the 3D secure enabled stores ask me for 2FA when doing
new transactions.  Lastly the `Online Banking Experience
<https://mygeorge.at/>`_ is beautifully designed and just fun to use.

Sure, not all banks are the same, but I have never been so happy to send
people money.  It's fun, and it's magical and when compared to a few years
ago it's just very impressive to see how times change.  It also shows you
how ridiculously fast the credit card network is.  I bought a ticket via
my Mastercard for the train to the airport once, but the machine was out
of paper after charging my card.  It managed to print the receipt but not
the ticket.  Before the machine even managed to start printing the first
thing I already received a text that my card was charged.  Before the
error occurred on the device, I got a refund confirmation on my phone.
The whole operation took less than 5 seconds but the Mastercard network
already processed two transactions and did that through systems
interconnected to my bank.  Say what you want, but banks modernize.

Not that most non technical people care about this stuff anyways.  But
they care about being able to pay conveniently and to send money around
quickly.  The vast number of transactions that people do via their online
banking is to local services (electricity, flat rent, mortgage payments,
etc.).  For internet purchases pretty much everybody uses a creditcard.
I know the Bitcoin community likes to point out how 16 digit numbers are a
ridiculous security concept and right they are.  Except modern creditcard
transactions rarely use that information.  NFC terminals make it very
impossible to skim data and for small transactions no PIN is required.  In
the future we will probably see a more widespread adoption of other
confirmation methods that no longer require a PIN input (see apple pay).
This evolution is already happening and you can see more and more NFC
terminals popping up.  Internet payments have been equipped with 3D secure
for ages and it won't take long until it will become pretty much
mandatory.

The end result of all of this is that it becomes a lot safer for your
average consumer to do online shopping and banking.  It might not be the
same everywhere yet (and it's certainly underdeveloped in many countries;
including the US), but there is progress.  And that progress is backwards
compatible which is a huge thing.

Bitcoin?  What would my parents get from that?  Credit card transaction
fees are lower than the cost (and risk) of conversion of currency from and
to bitcoin and are factored into the price.  All the other points of
bitcoin are working against the consumer: they are harder to handle or
secure, there is no bank provided escrow or insurance system, there is no
well documented flow of how to do transactions, refunds etc.

Bitcoin for Merchants
`````````````````````

Right now, you can milk money off Bitcoin users.  Overstock is
successfully doing that.  But other than that I don't see why a Merchant
would try to add Bitcoin.  It's more work, it makes accounting
unnecessarily hard and there really is no user reason for it.  Maybe you
can that way accept payments from countries that you are not allowed to do
financial transactions with, but then, you're probably already quite in a
tricky legal situation.

So What To Do With It?
----------------------

All of the above would make it sound like Bitcoin is for nobody.  While I
really don't think that given the available technologies, Bitcoin is the
one to be looking out for, it might be the one that wins.  But it would
probably only be used for settle transactions between Banks and not by end
users.  For that the network is neither strong enough nor user friendly.
I fully expect that the “currency” aspect of Bitcoin will be dead in less
than five to ten years.

I believe that ultimately Bitcoin gets too much wrong, and the biggest
problem with it is that it's based on a wrong idea.

Bitcoin is based on the idea that you can replace trust with computation.
I'm pretty sure there are fancy papers that explore the topic of trust in
detail, but the crux of it is, that trust is more of a chain.

While the mantra of the Bitcoin community appears to be “vires in numeris”
when it should rather be “omnis fides in alia fide iacet”.  It's trust all
the way down.  You can't do away with trusting people.  You need to trust
the Bitcoin developer, the server that provides the Bitcoin client, the
integrity of the SSL connection by trusting the CA.  You trust your
computer to work the way you think it does and you have to trust the
largest miners.

That Bitcoin's greatest fear, the 51% attack is unlikely to happen is not
so much a law of nature, it's the Bitcoin user's trust in that a group of
miners would not try to harm their investment.  At the end of the day
however Bitcoin users trade the trust in their banks for trust in
something else.  I would be a lot more worried about an anonymous and
unregulated network like Bitcoin being gamed by a criminal who has too
much money and attempts a 51% attack and getting away with it, than banks
colluding.  As terrible as abuse in the financial system is, it very
rarely results in individual loss.  Typically it's a shared loss we all
have to pay with our taxes.

Bitcoin thinks that by replacing trust with `a game of who has the bigger
miner
<http://gizmodo.com/5994626/bitcoin-mining-has-an-absurd-environmental-impact>`_
it has found some sort of solution to human misbehavior.  I really don't
believe that.

There are Other Things out There
--------------------------------

The reason I finally decided to write about some of my problems with
Bitcoin is not that I inherently hate the idea, but because there are so
many better solutions for the problem of international money transmission
out there.

On the one hand there are already established systems like `Transferwise
<http://transferwise.com/>`_ for making international payments cheaper
already now, there is `Western Union <http://www.westernunion.com/>`_
which despite all the bad reputation it has, is a life saver for many
people out there.  One should not discredit old financial institutions
that innovate.  There are many banks who are doing great work in revamping
their offerings.

On the other hand there are really interesting newcomers such as `Ripple
<https://ripple.com/>`_ and `Stellar <https://www.stellar.org/>`_ which
try to build decentralized payment systems that do not come with their own
world-view but try to integrate into our modern banking world.  I think
they deserve much more attention than they currently get.
