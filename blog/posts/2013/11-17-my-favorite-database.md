---
tags:
  - thoughts
summary: "A reinforcement about how signed data is useful to create distributed
systems."
---

# My Favorite Database is the Network

Every once in a while I see discussions about how nice key value stores
like redis or memcache are for storing short lived things such as access
tokens and session data.  While it's true that redis and memcache are
perfect for this, you still need to actually connect to a database to
retrieve the data.  One on hand this means that you need to be actually
able to connect to that database, on the other hand it means that there
will be load added to that database.  It does not have to be this way.

## No Database?

Instead of storing the data in the database, you can just store small data
like this on the network.  What I mean by that is that instead of storing
it, you let the client transmit the data back to you when you need it
again.

This has two huge advantages: the biggest one is that your storage is
unbounded.  You're essentially allowed to store an unlimited amount of
data, because you actually don't store anything.  If data still needs to
be stored is up to the other side to decide.  For instance an application
that forgets about it's access token will just no longer remember it and
the data automatically expires.  The second big advantage is that because
there is no database, systems can be entirely decoupled from each other.

So what would you store?  The most trivial example is an access token.
Access tokens usually have a unique ID, they have an expiration date and
they store the ID of the client that created it.  To store this, you would
just put this data into a JSON object, base64 encode it and that's it.

Now in most cases because you now transmit this data over the network in
plain, you will need to make sure that nobody tampers with the data.  This
can be accomplished by putting a messages authentication code next to it.
This is commonly called a signature (though I understand that people don't
like that word much).

This concept has been used for many, many years and is the basis
of session storage in many web frameworks.  For instance [Flask](http://flask.pocoo.org/) uses the Python [itsdangerous](http://pythonhosted.org/itsdangerous/) library to store signed data in
Cookies.  When further requests come in, the browser will send the data
back to the server through a cookie.  To prevent a client from tampering
with the data, a HMAC based signature is added around the payload.

A system very similar to that is specified in the [JSON Web Signature
(JSW)](http://tools.ietf.org/html/draft-jones-json-web-signature-04)
specification.  It's a little bit more involved than what itsdangerous
out of the box but it does have higher flexibility.  The basic concept
however remains the same.

None of that is new development, but it has become increasingly popular in
recent times because it allows decoupling of systems really well.

## Basic Concept

The basic concept of signing data with a MAC is a shared secret and a
cryptographic hash function.  The most trivial case is to take a string
that needs signing and to append a secret key at the end and then to feed
the whole string into a hash function:

```javascript
message = payload + "." + MD5(payload + secret_key)
```

The message is then the payload with the signature appended at the end.
Because the secret key is not part of the payload, it will not be possible
for anyone to tamper with the data.  The code that receives the data
again, then takes the payload part of the message, calculates the
signature again and then verifies that the signature did not change.

Now the pseudocode above should not be used.  The reason for this is that
appending a secret key to a payload and then taking the hash is not the
most secure way to implement this.  There are clever cryptographers that
came up with better ways to accomplish that, which are hard (essentially
impossible) to tamper with.  The algorithm for this is called [Hash-based
message authentication code (HMAC)](http://en.wikipedia.org/wiki/HMAC)
and implementations for this are available for most programming languages.

HMAC is available for various hash functions, not just MD5 like above.
Nowadays the most common version of HMAC is HMAC-SHA1 because of
weaknesses in MD5.  It should however be added that while MD5 is known to
be broken, this does not mean that HMAC-MD5 is.  The attacks against MD5
do not work against HMAC-MD5 [^1].

[^1]: [Updated Security Considerations for the MD5 Message-Digest
and the HMAC-MD5 Algorithms](http://tools.ietf.org/html/rfc6151)

## Signature Anchoring

All that is required to verify the signature is the secret key.  When the
secret key is changed, all previously issued messages will no longer
validate.  That's fine and everything in case you lose your secret key,
but what if one of the messages falls into the wrong hands?  Because the
message is properly authenticated it means that you cannot delete records.
The message flies back to your server and you have now way to revoke it.

The solution for this is to put information into the payload that can
be changed or revoked.  I don't know what this concept is called, but I
generally refer to it as "signature anchoring".

### Time Based Anchors

The most trivial way to destroy messages is to anchor them to your server
time.  You can store the time the message was issued in the payload and
then verify that the message is not older than a certain age.

Here the trivial example of a message for a specific user, that also has
the issue time stored:

```json
{
  "issued_at": 1384121560,
  "user_id": "9e90735b-ed1e-42ea-853c-59bd3758675e",
}
```

There are two approaches to time based anchoring:

- storing the expiration time: in this case the payload includes the
time of when the signature should expire.  The upside of this is that
if there are multiple pieces of code that need to accept this message,
they do not need to remember when the signature expires.  The downside
is that you need to agree on the expiration time when you create the
message and you cannot change it for already issued messages.

- storing the issue time: in this case the payload includes the time of
when the message was created.  The obvious upside is that you can
decide on when to expire it at a later point in time and change the
signature expiration date for already issued messages.

### Related Data Anchors

There are better ways to anchor signatures though.  A very common case for
signed messages are reset codes.  For instance a user lost his password
and requests a URL to reset the password.  This can be implemented by
issuing a URL that has a token in it, and that token's payload is the
signed email address.  Now however if someone manages to keep the link for
a prolonged amount of time, they might be able to change the password at a
later point in time.  For instance an attacker might steal your account
and the store that password reset token.  Even if you manage to get your
account back, the attacker just needs to reuse that password reset link
and he's back in your account.

This can be trivially solved by putting a truncated version of the hashed
password hash into the payload.  Now when the password is changed, the
password reset link expires.

```json
{
  "email_address": "user@example.com",
  "old_hash": "b5d5446e2a7a"
}
```

Data anchors are also useful to restrict messages to users.  This way you
can prevent that a message created for one user might have also an affect
other users.  Just put the ID of the user into the message!

## System Decoupling

For most web applications the most annoying resource to deal with is the
user database because most things need access control.  This is exactly
the kind of thing for which signed messages are the perfect solution.  One
of the examples where we're doing that in the [Fireteam](http://fireteam.net/) online services codebase is the matchmaking
system.  For efficiency reasons all our matchmaking operates very
differently than the rest of the system.  We structured it in a way that
nothing in it needs to connect to any database.  It operates entirely out
of memory.

When a user starts the matchmaking process they hit the main system which
verifies the authentication and fetches all the required configuration
from the database.  It verifies that the information the user provided
about the matchmaking requirements are correct and once it's satisfied
with the data, it creates a signed payload that contains all the
information the matchmaker requires for operation.  The user then submits
this ticket at fixed intervals to the matchmaker to keep the matchmaking
query active.

It's the perfect decoupling because the matchmaker itself does not need to
know anything else (in theory) of the system.  In our case the matchmaker
still knows a lot about the rest of the system because it uses an event
system to notify the user as the matchmaking query finishes.

Best of all: even though the matchmaker operates entirely out of memory
it's still fully functional if it crashes and restarts because the clients
will resubmit their tickets every couple of seconds.  Eventually the
matchmaker will have rebuild its state.  The worst that happens it that
users need to wait a little longer to get their matches.

## Freezing State

Another very good example of where signed messages come in handy is
freezing state.  In many cases web APIs can run into race conditions and
similar problems quite easily because of how slow the network is.  A
traditionally very annoying situation is anything that is time limited.
Imagine for instance the situation of flash sales.  Users should be able
to purchase items for a vast discount of -90% for 15 minutes.  But what
happens to the poor users that just loaded the page during the last few
seconds of the flash sale?

Here signatures come in very handy because they allow freezing state.
Anytime within the 15 minute window, the page with the offers would create
a signed offer that has all the information for purchasing this item.  For
as long as the signature does not expire and the user does not reload the
page, he will be able to finish the purchase, even if it takes him a long
time to finish the process (for instance because he needs to find his
credit card number etc.).

Google Wallet for instance is based on this idea.

## Summary

In my mind a signed messages are an awesome way to avoid using databases
altogether in many situations.  For as long as the message is small enough
and self contained there is very often no reason to store it.  It allows
decoupling and even allows you to write different parts of your software
in different languages.

It's nothing new, people have been doing this for ages, but I think not
enough developers are doing it.  Even though I have been using signed
messages for quite a few years now there are still situations where it
took me a while to realize that I can avoid having a database in place.
