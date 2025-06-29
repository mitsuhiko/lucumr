---
tags:
  - flask
  - python
summary: |
---

# April 1st Post Mortem

This year I decided to finally do what I planned for quite some time: an
April's fool joke. (I did contribute a bit to [PEP 3117](http://www.python.org/dev/peps/pep-3117/), but that does not count).
This year I decided to make a little joke about Python microframeworks
(micro-web-frameworks?) and wrote a little thing, and created a website
and screencast for it: [denied.immersedcode.org](http://denied.immersedcode.org/).

I did expect some responses to that, but I was a little bit surprised by
some of them though. So here my full disclosure of the april's fool
prank, what people thought of it and what my conclusion is.

## The Motivation

It seems like everybody likes microframeworks. Not sure what caused
that, but there are plenty of them. web.py (Python) and camping (Ruby)
where the first of their kind I think. Later others followed and it
seemed that people love the idea of software that does not have
dependencies and comes in a single file. So I thought, I can do the same
and make fun of it, so let's just create a framework based on existing
technology and throw everything together in a large single file: denied
was born. I just bundled a Werkzeug, simplejson and Jinja2 into a single
file and added a bit of code that glues them together.

## The Implementation

Denied consists of 160 lines of code that implements a very basic WSGI
application based on Werkzeug and Jinja2 that incorporates really stupid
ideas into the code:

- it [stores state in the module](http://lucumr.pocoo.org/2009/7/24/singletons-and-their-problems-in-python)
and uses implicitly defined data structures

- there is a function that accepts both a template filename or a
template source string as the same parameter and guesses based on the
contents of the string.

- it introspects the interpreter frame to figure out the name of the
function that called a template render function to automagically guess
the name of the template.

- it uses automatic function registration and decorators to register
URL rules.

I don't want to go into details why I hate everything there, that would
be a blog post of its own, but I want to point out that nearly all of
these "features" were inspired by existing microframeworks.

I did not expect anyone to detect from these things that the framework
was an April's fool joke, but I thought that the obfuscated sourcecode
and the fact that it was basically just a zipfile would be obvious.
However I got more than one mail asking me to release the sourcecode of
it because people want to hack on it. Right now it has more than 50
followers and 6 forks on github which is insane if you keep in mind that
Jinja2 and Werkzeug have less than 30 on bitbucket.

Thinking about it a bit more made me realize that camping back in the
days was in fact delivered as obfuscated 2K file of Ruby code. Not sure
why _why did that, but he was a man of mysteries so probably just
because he thought it was fun.

## The Screencast

To make the joke more obvious I created a screencast that would showcase
the framework and do pretty much everything wrong. For that I created a
persona called "Eirik Lahavre" that implemented the framework and did
the screencast. Originally I wanted that person to be a Norwegian web
developer but unfortunately the designated speaker disappeared so I had
to ask a friend of mine (Jeroen Ruigrok van der Werven) to record it for
me but he told me he can't do a norwegian accent so he went with French
and Eirik Lundbergh became Eirik Lahavre. I lay flat on the floor when I
listened to the recording for the first time because he's actually Dutch
:)

## The Website

For the website I collected tongue-in-cheek fake endorsements from
popular Python programmers and added one for myself that was just
bashing the quality of the code. I'm afraid I sort of made myself
popular by bashing other people's web frameworks, at least reading
reddit, hacker news and various mailinglists leaves that impression so I
thought it would be fun to emphasize that a bit more on that website.
This also comes very close to the website of web.py which shows a few
obviously bad comments from popular Python hackers.

Furthermore the website shows a useless and short hello world example
which shows nothing about how the framework works. This was inspired by
every other microframework website out there. It claims RESTfulnes and
super scaling capabilities, kick-ass performance and describes the
developer of the project (the fictional Eirik Lahavre) as god of Python
code and coming from a professional company.

## The Details

For everything in the joke I did what I would never do. I even went so
far to create the HTML of the website against my own code style, to use
deprecated HTML tags in the presentation, claim to use XHTML even though
the doctype and mimetype was wrong. The screencast also claims that flat
files were a scalable NoSQL database and that missing form helpers were
something positive because it means full flexibility.

## The Impact

The screencast was downloaded over 10,000 times and the website got more
than 50.000 hits. The link is still tweeted and I never got that many
retweets for anything related to my projects so far. The fake project on
github has more than 50 followers and 6 forks. Quite a few people took
the project serious from the few comments on reddit and the emails I
got.

## What I learned

- It does not matter how good intended or well written a project is,
the bold marketing is king. Being present on github is *huge*. As much
as I love bitbucket and mercurial, but there is an immense difference
between having your project on github or bitbucket, and I'm afraid
that no matter what bitbucket does or what the mercurial people do,
they will never even come close to github in terms of user base people
following your code and contributing.

- Small snippets of code on the website are killer. Werkzeug tries to
be honest by not showcasing a small "Hello World" application but
something more complex to show the API, but that does not attract
users. Jinja2 does not even try to show anything at all, you have to
look at the documentation to see how it looks like. That drives
potential users away.

- Don't be honest: be bold. Nobody will check your claims anyway and
if they don't live up to the promise, you can still say that your test
setup was or your understanding of the problem is different.

- There is no such thing as a "bad endorsement". People took it as a
good sign that I did not give the project my blessing.

## The Small Library

I'm currently trying to learn everything about game development and 3D
graphics I possibly can. I found out that the best way to learn that is
to write a minimal engine from scratch. Right now I'm doing that by
looking at other source code and reading books and writing the most
minimal code I can. I always try to prove to myself: existing code is
way to complex, that has to be easier. After the third refactoring and
improvements I usually end up with something as complex as the original
code or the explanation from the book.

There is a reason why things are as complex as they are and not easier.
I think the same is true for microframeworks. The reason why everybody
is that crazy about having a single file implementing whatever is
necessary to implement a web application is because you can claim it's
easy and you can understand it. However things are not that easy in
reality. I am pretty sure that other framework developers will agree.

web.py is the perfect example for that. It started as a library in 1000
lines of code in a single file, and look at what it became. It's not
that simple any more. Many of the initial design decisions that were
plain wrong were reverted. Such as abusing the print statement for
outputting values to the browser. There were good reasons why nobody
before web.py used print to output strings, yet web.py did it that way.
And a few versions later it disappeared again for good.

## What will Change?

For one I will put small example snippets on the Werkzeug and Jinja2
website. Also for the fun of it I will publish one of the projects on
github just to see how that works out. In general though, I will try to
keep things low profile because I just feel more comfortable with that.

Obviously, denied will stay the April's fool joke it was and not get
further attention. The "promised" documentation will not come :) However
I will probably blog about "how to create your own microframework based
on Werkzeug" because right now people base their microframeworks on the
standard library which I think is a terrible idea. One dependency might
not be as good as no dependency, but with Tarek Ziade's tremendous work
on packaging with Python that should not be a problem in the near
future.
