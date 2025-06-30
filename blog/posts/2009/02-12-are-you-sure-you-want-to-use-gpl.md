---
tags:
  - licensing
  - rant
summary: "My point of view on one of the most controversial topics in the
open source world: licensing"
---

# Are you sure you want to use GPL?

When I started using Linux I was totally sold to the concept of Open
Source. I still am, but my view changed. The first code I released under
an Open Source license was GPL licensed and I continued to do so for
some time. The last code under the GPL license I actively developed was
[Zine](http://zine.pocoo.org/) until a few days before the release
when I relicensed it under the modified BSD license.

The reason why I changed the license is a rather complex one and I want
to share my experiences with the GPL and other Open Source licenses here
for a moment. I suppose many people acted like me and chose the GPL
because everyone else did but didn't know about all the implications it
has.

## Left versus Right

The GPL and BSD (and friends) licenses couldn't be more different. It
starts with the length of the paper. The BSD license is two or three
clauses of text plus a copyright information and no-warranty clause. The
GPLv3 on the other hand has 600 lines of text. BSD restricts the rights,
GPL permits. Restricting rights sounds bad, but it just means that you
can do everything with it, except the stuff listed in the license. The
GPL starts by explaining what you can do with it. The GPL is following
the [Copyleft](http://en.wikipedia.org/wiki/Copyleft) principle,
something the BSD license is not doing.

This has some very complex implications many GPL / BSD users don't know
about but should.

## What BSD means

Let's start with the BSD license, the license of my choice. The three
clause version is very similar to the MIT license and the two clause
version is basically the MIT license. What does it say?

> Copyright (c) <year>, <copyright holder> All rights reserved.
>
> Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions
are met:
>
> - Redistributions of source code must retain the above copyright
notice, this list of conditions and the following disclaimer.

> - Redistributions in binary form must reproduce the above
copyright notice, this list of conditions and the following
disclaimer in the documentation and/or other materials provided
with the distribution.

> - Neither the name of the <organization> nor the names of its
contributors may be used to endorse or promote products derived
from this software without specific prior written permission.

Pretty simple. It allows the user to do everything with the application
but removing the Copyright. The third clause means that derived works
may not use the author's names for advertising. This clause is not in
the 2 clause BSD and MIT licenses.

Now this of course means that someone can take your software, change the
branding and sell it. The world is bad and you can be sure that this
will happen if your application is worth it. We'll cover that part of
the license a little bit later.

Let's see how the GPL works there.

## What GPL means

The GPL license is too long to be quoted here, but I'll try to sum up
the most important aspects of it:

- Copies may be distributed free of charge or for money, but the
source code has to be shipped or provided free of charge (or at cost
price) on demand. The receiver of the source code has the same rights
meaning he can share copies free of charge or resell.

- The licensed material may be analysed or modified.

- Modified material may be distributed under the same licensing terms
but don't have to be distributed.

There is a lot more in the license, like how long source code has to be
available and how to deal with that, but the essence is that. Like for
the BSD license someone can take the application, rebrand it and sell
it, however the license demands that the modified source is available
under the same license.

However modifications only have to be made available to the public if
distribution happens. So it's perfectly fine to take GPL code, modify it
heavily and use it in a not distributed application / library. This is
how companies like Google can run their own patched versions of Linux
for example.

But what this also means is that non GPL code can't use GPL code which
is also the main problem of it.

## License Compatibilities

BSD is GPL compatible, but GPL does not permit the use of GPL licensed
code in non-GPL code. This is especially annoying if important libraries
users expect are GPL. For example the very popular [readline](http://en.wikipedia.org/wiki/GNU_readline) library is GPL licensed.
Users of OS X will know that, because interactive shells of Python and
other non GPL applications sucks there. People tried to rewrite readline
to get rid of the GPL problem but the alternatives are not as well
maintained as the original one.

Duplicate explicit target name: "zine".

I guess this is also what Steve Ballmer referred to as “cancer”.
Unfortunately he's not entirely wrong there. For example I tried to
develop an interactive administration shell for [Zine](http://zine.pocoo.org/) but without readline (which I cannot use as
Zine is BSD licensed) the user experience is just meh. I would have to
relicense the entire application to GPL just so that I can have an
interactive shell with readline support.

## Freedom

Now this depends on how you define freedom. The people behind the GPL
have a very communistic point of view in terms of freedom: free software
should be available to everybody under the same terms. Unfortunately
like communism it does not work out that well because it turns out
humans are not really compatible to that way to look at things. On the
other hand there are the permissive licenses like BSD that just give
away all rights except the copyright and do not enforce freedom. You can
take BSD code and re-license it under the GPL if you want to. That kind
of freedom however is a one-way ticket. Once you made a GPL release of
your code there will always be a GPL version of it. If not for future
releases, at least for that one release as you can't revoke the license.

## Making Money

Ultimately the goal of software development for many is to make money.
Many people decide to utilize the GPL license for that by dual-licensing
the code under the GPL and a proprietary license where the latter is
only available to costumers. As a single developer it's arguable harder
to sell code that is licensed under the BSD license. There the business
model is probably more selling non-open-source extensions to paying
costumers. If you open source all your code under the BSD you have to be
really good so that you can make money out of it.

Many developers don't really care about that, have their fun developing
it and BSD license it for others to start where they stopped. A good
example of successful BSD / MIT code are [Django](http://www.djangoproject.com/) and [Ruby on Rails](http://rubyonrails.org/). Both projects developed by strong
communities with supporting companies behind it. The company behind
Rails creates very successful closed source applications based on Rails;
Many of the developers working on Django are paid by individual
companies that work with it.

## Recap

Before you license your code under an Open Source license: Think about
the license! Both types of licenses have their advantages and
disadvantages and it would be stupid to use the GPL without thinking
just because “everybody does”. Many just do because they haven't read
the license either.
