tags: [thoughts, python]
summary: Musings about the changes to Python over the years, particularly typing.

Untyped Python: The Python That Was
===================================

A lot has been said about Python typing.  If you have been following me on
Twitter (or you have the dubious pleasure of working with me), you
probably know my skepticism towards Python typing.  This stems from the
syntax's complexity, the sluggishness of mypy, the overall cumbersome
nature of its implementation and awkwardness of interactions with it.  I
won't dwell on these details today, instead I want to take you on a little
journey back to my early experiences with Python.  Why?  Because I believe
the conflict between the intrinsic philosophy of Python and the concept of
typing is fundamental and profound, but also not new.

The concept of typed programming languages predates 2015 by a long
stretch.  They were not invented now.  Debates over the necessity of
typing are not a recent phenomenon at all.  When you wanted to start a new
software project, particularly something that resembles a web service you
always had a choice of programming language.  Back in 2004 when I started
diving into programming, there were plenty of languages to chose.  The
conventional choice was not Python, the obvious choice was not even PHP rather
Java.  Java was the go-to for serious web application projects, given its
typing system and enterprise-grade features.  PHP was for toys, Python
was nowhere to be found.  PHP was popular, but in my circles it was always
seen as an entirely ridiculous concept and the idea that someone would
build a business on it even more so.  I remember in my first year of
University the prevalent opinion was that the real world runs on .NET,
Java and C++.  PHP was ridiculed, Python and Ruby did not appear in
conversations and JavaScript on the server was non existent.

Yet here I was, I built stuff in PHP and Python.  My choice wasn't driven
by an aversion to static typing out of laziness but by the exceptional
developer experience these languages offered, to a large part because of
the lack of types.  There was a stellar developer experience.  Yes it did
not have intellisense, but all the changes that I did appear on the web
instantly.  I recall directly modifying live websites via FTP in real time.
Later editing web sites straight from vim on the production server.
Was it terrible and terrifying?  Absolutely.  But damn it was productive.
I learned a lot from that.  They taught me valuable lessons about trade-offs.
It was not just me that learned that, an entire generation of developers in
those languages learned that our biggest weakness (it not being typed, and
i wasn't compiled) was also our biggest strength.  It required a bit of
restraint and it required a slightly different way of programming, but it
was incredibly productive.

There was the world of XPath, there was the world of DTDs, there was the
world of SOAP and WSDL.  There was the world where the inherent complexity
of the system was so great, that you absolutely required an IDE, code
generation and compile time tooling.  In contrast there was my world.  My
world had me sitting with Vim, CVS and SVN and a basic Linux box and I was
able to build things that I was incredibly proud of.  I eventually swapped
PHP for Python because it had better trade offs for me.  But I will never
not recognize what PHP gave me: I learned from it that not everything has
to be pretty, it has to solve problems.  And it did.

But in the same way with PHP, the total surface area between me and the
Python language runtime was tiny.  The code I wrote, was transformed by
the interpreter into bytecode instructions (which you could even look at!)
and evaluated by a tiny loop in the interpreter.  The interpreter was Open
Source, it was easy to read, and most importantly I was able to poke
around in it.  Not only was I able to learn more about computers this way,
it also made it incredibly easy for me to understand what exactly was
going on.  Without doubt I was able to understand everything between the
code that I wrote, and the code that ran end to end.

Yes, there was no static type checking and intellisense was basically non
existing.  Companies like Microsoft did not even think that Python was a
language yet.  But screw it, we were productive!  Not only that, we build
large software projects.  We knew were the tradeoffs were.  We had runtime
errors flying left and right in production because bad types were passed,
but we also had the tools to work with it!  I distinctly remember how
blown away a colleague from the .NET world was when I showed him some of
the tools I had.  That after I deployed bad code and it blew up in
someone's face, I got an email that not only shows a perfectly readable
stack trace, but also a line of source code for the frames.  He was even
more blown away when I showed him that I had a module that allowed me to
attach remotely to the running interpreter and execute Python code on the
fly to debug it.  The developer experience was built around there being
very few layers in the onion.

But hear me out: all the arguments against dynamic languages and dynamic
typing systems were already there!  Nothing new has been invented, nothing
really has changed.  We all knew that there was value in typing, and we
also all collectively said: screw it.  We don't need this, we do duck
typing.  Let's play this to our advantage.

Here is what has changed: we no longer trust developers as much and we are
re-introducing the complexity that we were fighting.  Modern Python can at
times be impossible to comprehend for a developer.  In a way in some areas we
are creating the new Java.  We became the people we originally displaced.
Just that when we are not careful we are on a path to the world's worst
Java.  We put typing on a language that does not support it, our
interpreter is slow, it has a GIL.  We need to be careful not to forget
that our roots are somewhere else.  We should not collectively throw away
the benefits we had.

The winds changed, that's undeniable.  Other languages have shown that
types add value in new and exciting ways.  When I had the arguments with
folks about Python vs Java typing originally, Java did not even have
generics.  JavaScript was fighting against its reputation of being an
insufferable toy.  TypeScript was years away from being created.  While
nothing new has been invented, some things were popularized.  Abstract
data types are no longer a toy for researchers.  .NET started mixing
static and dynamic typing, TypeScript later popularized adding types to
languages originally created without them.  There are also many more
developers in our community who are less likely to understand what made
those languages appealing in the first place.

So, where does this leave us?  Is this a grumpy me complaining about times
gone and how types are ruining everything?  Hardly. There's undeniable
utility in typing, and there is an element that could lead to greater
overall productivity.  Yet, the inherent trade-offs remain unchanged, and
opting for or against typing should be a choice free from stigma.  The
core principles of this decision have not altered: types add value and
they add cost.

----

**Post script:** Python is in a spot now where the time spent for me
typing it, does not pay dividends.  TypeScript on the other hand tilts
more towards productivity for me.  Python could very well reach that
point.  I will revisit this.
