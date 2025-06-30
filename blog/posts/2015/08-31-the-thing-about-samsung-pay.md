---
tags:
  - thoughts
  - payments
  - security
summary: |
  Some interesting notes about how the MST feature of Samsung Pay (and
  credit card transactions in general).
---

# Samsung Pay's MST Transactions and Merchant's Ability to Detect “Cloned” Magstripe Tracks

I have a weird obsession with payment systems.  They fascinate me.  I find
it very satisfying to make a credit card transaction and to get a text
message confirming the purchase on my phone a second afterwards.  As
someone obsessed with networks, scalability and user experience I find
this a very interesting field even though it's embedded in probably the
least agile and most regulated industry.  But not just the technology is
interesting, also the fraud aspect is.  Fraud prevention is an equally
interesting topic to ponder about.

What makes frauds in payments so interesting is that there are many
different payment protocols that exist throughout the world and your
credit card is valid with almost all of them.  The fraud vectors are huge
and very often the only thing that keeps fraud rates down is a random spot
checks and common sense.

The reason my interest got piqued again recently was Samsung Pay,
particularly the MST part.  MST, if you are not familiar with it, stands
for magnetic secure transmission.  The idea is that the phone emits
a magnetic field that carries the information of track 2 on a credit card
(at least in principle).  What this means is that you can go to a lot of
magstrip readers, hold your phone to it, and the reader thinks the card
was swiped.  (Assuming there are no other checks that a card is in a
slot)

From a fraud perspective this seems crazy.  You scan someone's credit
card, duplicate it onto your phone and off you go.  Here are the results
of my investigation about how this is supposed to be used securely.

But for this we need to cover some ground.

## A Bit of History

If we don't go too far back, the earliest forms of standardized credit
card processing were based on a credit card number.  The credit card
number in itself is split into two parts.  The first six digits are the
IIN or Issuer Identification Number.  It identifies the network of the
card (MasterCard, AMEX, Visa, etc.) and might identify the bank within
that network.  The rest (the remaining 10-13 digits) are the PAN or
Primary Account Number.  IIN + PAN + expiration date + name of cardholder
are the basic requirements for making a credit card transaction.

However as you can guess, since all that information is on the card there
is very little that actually protects a payment.  That's why on most of
those transactions done that way they will also ask for the signature of
the cardholder.  That signature really only plays a role if the
transaction gets disputed.

## The Magstripe

What makes credit cards convenient for in-store purchases is that you do
not need to write down numbers, instead you can "swipe" the card.  At
least you do that in the US ;)  When you swipe the card, the reader reads
the two tracks on the magstripe.  They are almost the same with a
different data density.  Both tracks contain: IIN + PAN, country code,
expiration date and a field for discretionary data.  It also contains the
service code.  The service code tells the terminal how the card wants to
be confirmed (does it work internationally, does it need online
verification, does it need a pin, AM only etc.)

Track 1 which has higher density also contains the card holder name and
has a bit of extra space for the discretionary data.  So if you swipe the
card, you have pretty much all the info that's written on it.  What's in
the discretionary data we will cover later.

## Transaction Types and Security Codes

An important tool for understanding fraud and to combat it is to split the
one huge problem of credit card fraud into smaller sub-problems.  In
particular the most important split is "card present" or "card not
present" (CNP) which should indicate if the physical card was present at
the origin of the transaction or not.  So how do you do that if the data
is the same?  The earliest form of trying to combat this was the addition
of two security codes.  They have various different names (CVC, CVV, CID)
and on most cards it comes in two flavors: code 1 and code 2.  One is
stored in the magstripe in the discretionary data field, the other is
printed on the back of the card.  The idea is that you can differentiate
between transactions carrying no security code, or CVC1 or CVC2.  If
someone skimmed your card through a magstripe reader, they can get to all
data with the exception of CVC2.  If someone takes your card number via
phone they won't get your CVC1.

At this point you can already see that there are different types of
transactions with different fraud parameters.  If someone does not use a
CVC code it does not mean that the transaction will be declined outright,
but it indicates that something is fishy.

## EMV

EMV is the answer for all problems and has been for a long time.  The
reason it plays little role here is because EMV in itself is secure (bad
chip implementations notwithstanding).  However EMV is still not rolled
out in the US and as such, there is a huge market where magstripe is still
something people need to deal with.  Also EMV without NFC support cannot
support MST which is the topic of discussion here.  We will come back to
that later however.

## Modern Transaction Types

What should be clear now is that there are many different ways to make a
credit card transaction.  But what is that actual transaction?  At one
point you want your money.  If you get your money or not as a merchant
depends on if the transaction was fraudulent or not, and if it was, if you
had a chance to detect the fraud yourself.

At one point you need to actually try to charge the issuer of the card as
a merchant.  Ideally you do it as quickly as possible.  If you do it at
the time you swipe the card, you might directly go online and check with
the card issuer if everything is in order.  This happens in most terminals
now where the terminal directly talks to the bank to record the
transaction.

A more evolved version of this method is to replace the magstripe with a
EMV chip.  That chip can a challenge/response game with the payment
terminal which means that each purchase is unique and skimming the data
off the chip will not be any good for future transactions.  That again
will only work for transactions that actually use the EMV chip.  If you
just steal the magstripe and go to the US where all readers are magstripe,
this will do absolutely nothing to you.

Likewise for online payments many issuing banks will use 3D Secure for
payment verification.  The idea is that the online form for your credit
card number also presents you an iframe with an extra input form by the
bank.  This allows a second factor to confirm the payment.  For instance
on my Austrian Erste Mastercard the second factor is a confirmation with a
transaction code.  The transaction will be declined unless I confirm the
payment in the iframe with a unique token sent to my phone via SMS.

## Tokenization: Apple Pay / Samsung Pay

In an ideal world the magstripe would no longer exist and all terminals
would use the EMV chip and online transactions would require 3D secure.
However that's clearly not happening because the US seem to take bloody
ages to replace their infrastructure.  And not just the US.  The idea to
force everybody to newer and in this case kinda incompatible technologies
did not work for many years, so an alternative has to appear.

One alternative is what's often called "Tokenization" and oddly enough, it
works by replacing the customer equipment rather then the merchant one.
Instead of making all merchants upgrade their terminals to support EMV,
you instead upgrade the customer's credit card to a phone.

To understand why that's necessary you need to understand that NFC is not
always NFC and in case of Samsung it might not even involve an actual RFID
chip at all.  In Europe when you use NFC for a payment the card transmits
a response to a challenge like an EMV chip is.  The transaction gets
confirmed safely either directly by the card or in combination with the
user's PIN.  In either case the transaction gets confirmed through the
issuer.  In the United States however EMV often does not exist, so NFC has
an alternative method where it transmits the MSD (magnet stripe data)
instead.  Apple Pay can do that similar to how Samsung Pay can transmit
the very same data via magnetic pulses or NFC.

So how does that make anything any more secure?  Because of tokenization.
Remember how the credit card number is split into IIN and PAN and how the
magstripe contains this extra discretionary data.  The idea is that
assuming the terminal is connected to the internet and verifies
transactions with the issuing bank the phone can play a little trick.  The
bank provides the phone with a method to "clone" the card securely onto
the phone.  At this point the phone acts as a hardware token generator.
Whenever it confirms a transaction it replaces the PAN with a uniquely
generated one and places some extra data in the discretionary data part.
Both of that information gets transmitted to the issuing bank or TSP
(token service provider, so MasterCard or Visa) where the token PAN (DPAN)
gets replaced for the real PAN.  The actual flow is a bit more complex
than that, but in the end the transaction goes through like before.

## The Merchant and Tokenization

The important part here however is the merchant and this is where things
get tricky.  With Apple Pay the transaction is always done through a form
of NFC.  Either NFC with MSD or proper EMV NFC.  It means that the
merchant explicitly agrees with this form of payment and will introduce
the system to the employees that accept the transactions.   To confirm
such a payment as a merchant you just make sure that the transaction is
made from an iphone and everything else "should be secure".  The only
case of fraud is if someone managed to get a card on their phone which
they were not entitled too, but that's the bank's problem because they
should make that flow secure.

The situation however is different with Samsung Pay and the reason for
that is MST.  As Samsung Pay works with non NFC POS terminals the question
is how a merchant can differ a phone that uses Tokenization properly or
a fraudulent phone that just relays the magstripe tracks from a stolen
card.  In fact, the merchant can't really do anything there because the
transaction is as far as I know indistinguishable from what is shown on
the terminal.  The only party that could reliably block the transaction is
the issuer or TSP.  This interestingly enough can be solved by supporting
EMV :)

A modern card (one that would be used with Samsung Pay) could come with
magstripe and EMV and the magstripe could indicate that the card prefers
the chip over swiping.  In this case you could still clone the magstripe
into your phone, but the transaction would be declined if it used neither
tokenization nor the chip.  For this to work however, all merchants need
to support EMV which currently is not the case in the US.

## The Non EMV Apocalypse of 2015

Something interesting is going to happen end of October 2015.  The US will
finally start to force merchants to upgrade to terminals that support EMV.
From that point onwards any card that has an EMV chip, but the chip was
not used for the transaction and that transaction was fraudulent will
become the merchant's problem.  Assuming Samsung Pay becomes widespread
it could make this liability shift a bit more painful because as a
merchant you can not tell a good Samsung phone from a bad Samsung phone,
whereas you could probably tell an original credit card with embossed
numbers from a fake card with mismatching numbers and making your own
embossed cards with all the cards you skimmed is a lot more work than to
clone a card into a phone.

So maybe EMV will become a bigger thing as a result of Samsung Pay even if
the technology in itself has some potential for magstripe abuse.

## Death of MSD

Interestingly enough the roll-out of EMV in the US might have some bad
aspects for European travellers and others.  Our cards have a very
different fraud profile than American ones because domestic transactions
are done via EMV for nearly thirty nears now, with the liability shift
having happened more than 10 years ago.  In Europe cards prefer chip and
pin for terminals and NFC is only supported for EMV transactions.

The US terminals might use the MSD data for NFC however.  So as a European
customer you might see an NFC logo somewhere, but because it uses NFC MSD
your European bank will decline the transaction because they only allow
EMV based NFC.  This is to be seen however, right now NFC terminals in the
US are still not very widespread and the liability shift did not happen
yet.

## Safety of Samsung Pay

So is it safe?  Implemented correctly with tokenization Samsung Pay seems
pretty safe.

Will merchants like it?  If they have EMV terminals, they will not have a
problem with it.  If they only have legacy terminals without chip support,
they might become fraud magnets and they have little method to defend
themselves against it.

Will the magstripe finally die?  Seems like magstripe found a second
coming in the US thanks to tokenization, MSD NFC and maybe even Samsung
Pay but most likely only as a transitional technology for EMV.

I'm actually quite interested in if there are means of detecting a relayed
magstripe track for a merchant.  If someone knows, please let me know and
I will amend the article to reflect that.
