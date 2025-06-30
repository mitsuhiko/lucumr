---
tags: ['books']
summary: "A book review from a really terrible science fiction book by Dan Brown."
---

# Digital Fortress — Stranger Than Fiction

I don't rant that often about books. But when I read [that](http://www.danbrown.com/novels/digital_fortress/reviews.html) book I
nearly had to vomit. I seldom read such a piece of crap.

## Synopsis

"Digital Fortress" is a book by Dan Brown, written back in 1998.

Susan Fletcher, a brilliant, beautiful mathematician and head of the
National Security Agency's cryptography departement, finds herself faced
with an unbreakable code resistant to brute-force attacks by the NSA's 3
million processor supercomputer.

The code is written by Japanese cryptographer Ensei Tankado, a former
employee of her departement, who now uses his knowledge to work against
the NSA to avoid further intrusion into people's privacy. Tankado
publishes the algorithm on his website, encrypted with itself. He sells
the passphrase for encrypted data on an auction platform, threatening
that his accomplice, "North Dakota", will release the algorithm for free
if he dies.

This algorithm would be the end of the NSA and the TRANSLTR
supercomputer. Unfortunately Tankado is found dead in Seville, Spain.
Susan Fletcher, along with her boyfriend, David Becker, a skilled
linguist, must find a solution to stop the spread of the code.

## Sounds Interesting. What's the Problem?

Alright. Here comes the problem. But first a small information: I'm not
a cryptographer and thus not completely informed about that topic.
Nonetheless I did enough encryption/decryption for my IT lessons in the
past that I can accuse Dan Brown for not having the slightest knowledge
about cryptography, information technology, computer viruses, worms and
also not Spain. So let's start with non technology related bullshit in
that book.

## Seville — Spain

I personally was never in Seville itself but I'm darn sure that the
description of Spain in that book is terrible wrong. On my last visit to
Spain it was a country like Italy or any other southern European country
thus quite safe, friendly and modern.

There are two sentences in that book that would hurt every Spanish:

> "He'd forgotten: Getting an international connection from Spain was
like roulette, all a matter of timing and luck. He'd have to try
again in a few minutes."
>
> "A punctured lung was fatal, maybe not in more medically advanced
parts of the world, but in Spain, it was fatal."
>

I don't think I have to further comment that sentence.

## Technology

Before heading over to cryptography let's have a look at the dozens of
other flaws in that book. Let's start with the obvious ones.

### About Viruses And Worms

Half of the story is about a computer that overheats because it's
processing a virus instead of an encrypted file. Now this is not a
virus, it's not even a worm like mentioned later. It's just bullshit.
First of all in order to brute-force something you have to know how it
works, but that's covered later. However if you then brute force
something you don't execute it. Say that this file contains indeed
malicious code. Then nobody would have executed it with root rights. I
doubt NSA would break code in something that is not a sandboxed
environment.

Also that this program then heads over to the database in order to
bypass the security systems is not only unlikely, it's impossible. If it
was possible for the program (and TRANSLATR would execute the code
during the decoding process) to gain access to the database it would not
be able to shut down the security systems of that database. Not even in
the worst computer setup the database software would run in the same
security context as the security systems like the firewall.

Reading those parts of the book really hurts. Especially at the end when
he starts throwing buzzwords around. Then there is a countdown and the
security systems for X11 and FTP go down. Not before all systems are
down anyone can gain access. Well, and then the hackers try to break
into that system all day long. Thus as soon as the system is down the
first attacker would already have access to all data.

An attacker would still need credentials to log into an FTP system. And
I doubt that NSA would use FTP and X11 in their mainframe. FTP is a
insecure protocol and X11 is the system used by UNIX systems to display
graphical user interfaces over either the network or on the local
computer. I doubt they would make X11 listen on anything else than
localhost...

### Mutation Strings

Now what the hell are mutation strings? The only thing I know sounding
familiar are mutable strings. But I doubt Dan Brown thought about that,
especially since those are not virus specific. There is one thing
viruses do that has to do with mutation: Changing executables at
runtime, but that's not called mutation string.

### Passwords and Keyloggers

Greg Hale installed a keylogger in nearly every keyboard on the NSA
complex according to the book. While this is a realistic scenario there
is still something you should think about: We're talking about the NSA,
they should use more sophisticated logon mechanisms than 5 character
long passwords.

I know many people (including myself) who use passwords with more than
15 characters. I doubt someone working for the NSA would use a 5
character password.

### Tracers

According to the book it's possible to find out the real address of a
person by sending him a "tracer". A small programm forwarded via the
remailer to the destination address which then sends an invisible
message back to the NSA revealing the real mail address. This is
complete bullshit of course. Unless there is a security hole in the mail
client that executes the code, deletes the mail and sends a message back
this can never happen. And that the mail client is that buggy is
doubtable. This could be possible via social engineering but since the
target is neither stupid nor alive Susan won't have received a mail.

## Cryptography

Now things are getting worse. If you don't have a clue about what you're
writing regarding technology that's bad. But if your book is all about
cryptograhy and you don't know anything about it and mix up words that's
really bad.

### Brute Force

Dan Brown thinks you can break everything with brute force, out of the
box. That's wrong. In order to break something using Brute Force you
have to know how it works. Brute Force is a great method to recover
passwords to break into systems as long as nobody locks you out because
of those many login attempts, but you cannot break ciphers using brute
force if you don't know how they works.

And Dan Brown is looking for a method you cannot break: That's called
One-Time-Pad, is mathematically unbreakable and easily implemented. The
idea is that you use a polyalphabethic cipher where the key is
completely random and as long as the clear text and only used one time.

### Rotating Cleartext

Flaw 1: the rotating cleartext algorithm. There is no such thing. There
is an addition to the Vigenère cipher which is called "autokey" and uses
the cleartext to expand the key instead of repeating the key. As soon as
the key is exhausted it appends the cleartext. But it's breakable too.

### bit ≠ characters ≠ passphrase

A 64bit key does not mean that the passphrase is 64 characters long. And
breaking a 64bit key takes quite long. Today we're using more than 64bit
to encode messages. Wikipedia has a nice example calculation of a
bruteforcing 256bit key:

> AES permits the use of 256 bit keys. A 256 bit key requires not
merely twice as long to crack as a 128 bit key, but rather 2128
times as long. If a device could be built that could check a billion
billion (1018) AES keys per second, it would require
3,671,743,063,080,802,746,815,416,825,491,118,336,290,905,145,409,708
years to exhaust the 256 bit key space.
>

That in mind smashes the whole plot of the book.

### Bergofsky Principle

Something Dan Brown mentiones often in the book which says that "if a
computer tried enough keys, it was mathematically guaranteed to find the
right one.". As mentioned above that is wrong. (One-Time Pad)

### Public-Key Encryption

Dan thinks that you need the senders pass key to decrypt a message
encrypted using public-key cryptography. This is just wrong...

### Auctioning the Pass-Key

The "bad guy" sells the key on ebay. But the algorithm is encoded with
itself. So how should someone every unlock that algorithm if you need
the algorithm to unlock it which is locked by itself?

## Conclusion

Normally I don't mind if a book contains wrong facts. But this book uses
wrong facts in an inflationary way. It would be easy to add new items to
this rant since there are enough inconsistencies and other wrong things
in the book, but I'm out of time.

The book is boring and the plot childish. Not worth the money.
