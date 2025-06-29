tags: [python]
summary: |
  Some hidden features of the Python re module and the support machinery
  that drives it.

Python's Hidden Regular Expression Gems
=======================================

There are many terrible modules in the Python standard library, but the
Python `re` module is not one of them.  While it's old and has not been
updated in many years, it's one of the best of all dynamic languages I
would argue.

What I always found interesting about that module is that Python is one of
the few dynamic languages which does not have language integrated regular
expression support.  However while it lacks syntax and interpreter support
for it, it makes up for it with one of the better designed core systems
from a pure API point of view.  At the same time it's very bizarre.  For
instance the parser is written in pure Python which has some bizarre
consequences if you ever try to trace Python while importing.  You will
discover that 90% of your time is probably spent in on of re's support
module.

Old But Proven
--------------

The regex module in Python is really old by now and one of the constants
in the standard library.  Ignoring Python 3 it has not really evolved
since its inception other than gaining basic unicode support at one point.
Till this date it has a broken member enumeration (Have a look at what
``dir()`` returns on a regex pattern object).

However one of the nice things about it being old is that it does not
change between Python versions and is very reliable.  Not once did I have
to adjust something because the regex module changed.  Given how many
regular expressions I'm writing in Python this is good news.

One of the interesting quirks about its design is that its parser and
compiler is written in Python but the matcher is written in C.  This means
we can pass the internal structures of the parser into the compiler to
bypass the regex parsing entirely if we would feel like it.  Not that this
is documented.  But it still works.

There are many other things however that are not or badly documented about
the regular expression system, so I want to give some examples of why the
Regex module in Python is pretty cool.

Iterative Matching
------------------

The best feature of the regex system in Python is without a doubt that
it's making a clear distinction between matching and searching.  Something
that not many other regular expression engines do.  In particular when you
perform a match you can provide an index to offset the matching but the
matching itself will be anchored to that position.

In particular this means you can do something like this:

.. sourcecode:: pycon

    >>> pattern = re.compile('bar')
    >>> string = 'foobar'
    >>> pattern.match(string) is None
    True
    >>> pattern.match(string, 3)
    <_sre.SRE_Match object at 0x103c9a510>

This is immensely useful for building lexers because you can continue to
use the special ``^`` symbol to indicate the beginning of a line of entire
string.  We just need to increase the index to match further.  It also
means we do not have to slice up the string ourselves which saves a ton of
memory allocations and string copying in the process (not that Python is
particularly good at that anyways).

In addition to the matching Python can search which means it will skip
ahead until it finds a match:

.. sourcecode:: pycon

    >>> pattern = re.compile('bar')
    >>> pattern.search('foobar')
    <_sre.SRE_Match object at 0x103c9a578>
    >>> _.start()
    3

Not Matching is also Matching
-----------------------------

A particular common problem is that the absence of a match is expensive to
handle in Python.  Think of writing a tokenizer for a wiki like language
(like markdown for instance).  Between the tokens that indicate
formatting, there is a lot of text that also needs handling.  So when we
match some wiki syntax between all the tokens we care about, we have more
tokens which need handling.  So how do we skip to those?

One method is to compile a bunch of regular expressions into a list and to
then try one by one.  If none matches we skip a character ahead:

.. sourcecode:: python

    rules = [
        ('bold', re.compile(r'\*\*')),
        ('link', re.compile(r'\[\[(.*?)\]\]')),
    ]

    def tokenize(string):
        pos = 0
        last_end = 0
        while 1:
            if pos >= len(string):
                break
            for tok, rule in rules:
                match = rule.match(string, pos)
                if match is not None:
                    start, end = match.span()
                    if start > last_end:
                        yield 'text', string[last_end:start]
                    yield tok, match.group()
                    last_end = pos = match.end()
                    break
            else:
                pos += 1
        if last_end < len(string):
            yield 'text', string[last_end:]

This is not a particularly beautiful solution, and it's also not very
fast.  The more mismatches we have, the slower we get as we only advance
one character at the time and that loop is in interpreted Python.  We also
are quite inflexible at the moment in how we handle this.  For each token
we only get the matched text, so if groups are involved we would have to
extend this code a bit.

So is there a better method to do this?  What if we could indicate to the
regular expression engine that we want it to scan for any of a few
regular expressions?

This is where it gets interesting.  Fundamentally this is what we do when
we write a regular expression with sub-patterns: ``(a|b)``.  This will
search for either ``a`` or ``b``.  So we could build a humongous regular
expression out of all the expressions we have, and then match for that.
The downside of this is that we will eventually get super confused with
all the groups involved.

Enter The Scanner
-----------------

This is where things get interesting.  For the last 15 years or so, there
has been a completely undocumented feature in the regular expression
engine: the scanner.  The scanner is a property of the underlying SRE
pattern object where the engine keeps matching after it found a match for
the next one.  There even exists an ``re.Scanner`` class (also
undocumented) which is built on top of the SRE pattern scanner which gives
this a slightly higher level interface.

The scanner as it exists in the ``re`` module is not very useful
unfortunately for making the 'not matching' part faster, but looking at
its sourcecode reveals how it's implemented: on top of the SRE
primitives.

The way it works is it accepts a list of regular expression and callback
tuples.  For each match it invokes the callback with the match object and
then builds a result list out of it.  When we look at how it's implemented
it manually creates SRE pattern and subpattern objects internally.
(Basically it builds a larger regular expression without having to parse
it).  Armed with this knowledge we can extend this:

.. sourcecode:: python

    from sre_parse import Pattern, SubPattern, parse
    from sre_compile import compile as sre_compile
    from sre_constants import BRANCH, SUBPATTERN


    class Scanner(object):

        def __init__(self, rules, flags=0):
            pattern = Pattern()
            pattern.flags = flags
            pattern.groups = len(rules) + 1

            self.rules = [name for name, _ in rules]
            self._scanner = sre_compile(SubPattern(pattern, [
                (BRANCH, (None, [SubPattern(pattern, [
                    (SUBPATTERN, (group, parse(regex, flags, pattern))),
                ]) for group, (_, regex) in enumerate(rules, 1)]))
            ])).scanner

        def scan(self, string, skip=False):
            sc = self._scanner(string)

            match = None
            for match in iter(sc.search if skip else sc.match, None):
                yield self.rules[match.lastindex - 1], match

            if not skip and not match or match.end() < len(string):
                raise EOFError(match.end())

So how do we use this?  Like this:

.. sourcecode:: python

    scanner = Scanner([
        ('whitespace', r'\s+'),
        ('plus', r'\+'),
        ('minus', r'\-'),
        ('mult', r'\*'),
        ('div', r'/'),
        ('num', r'\d+'),
        ('paren_open', r'\('),
        ('paren_close', r'\)'),
    ])

    for token, match in scanner.scan('(1 + 2) * 3'):
        print (token, match.group())

In this form it will raise an `EOFError` in case it cannot lex something,
but if you pass ``skip=True`` then it skips over unlexable parts which is
perfect for building things like wiki syntax lexers.

Scanning with Holes
-------------------

When we skip, we can use ``match.start()`` and ``match.end()`` to figure
out which parts we skipped over.  So here the first example adjusted to
do exactly that:

.. sourcecode:: python

    scanner = Scanner([
        ('bold', r'\*\*'),
        ('link', r'\[\[(.*?)\]\]'),
    ])

    def tokenize(string):
        pos = 0
        for rule, match in self.scan(string, skip=True):
            hole = string[pos:match.start()]
            if hole:
                yield 'text', hole
            yield rule, match.group()
            pos = match.end()
        hole = string[pos:]
        if hole:
            yield 'text', hole
    
Fixing up Groups
----------------

One annoying thing is that our group indexes are not local to our own
regular expression but to the combined one.  This means if you have a
rule like ``(a|b)`` and you want to access that group by index, it will
be wrong.  This would require a bit of extra engineering with a class that
wraps the SRE match object with a custom one that adjusts the indexes and
group names.  If you are curious about that I made a more complex version
of the above solution that implements a proper match wrapper `in a github
repository <https://github.com/mitsuhiko/python-regex-scanner>`_ together
with some samples of what you can do with it.
