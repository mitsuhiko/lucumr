public: yes
tags: [python, ai]
summary: In a first for me, I published some agentic programmed AI slop to PyPI.

My First Open Source AI Generated Library
=========================================

I'm currently evaluating how different models perform when generating XML
versus JSON.  Not entirely unexpectedly, XML is doing quite well — except
for one issue: the models frequently return invalid XML.  That made it
difficult to properly assess the quality of the content itself,
independent of how well the models serialize data.  So I needed a sloppy
XML parser.

After a few failed attempts of getting Claude to just fix up my XML
parsing in different ways (it tried html5lib, the html lxml parser etc.)
which all resulted in various kinds of amusing failures, I asked Claude
to `ultrathink` and write me a proper XML library from scratch.  I gave it
some basic instructions of what this should look like `and it one-shotted
something
<https://github.com/mitsuhiko/sloppy-xml-py/commit/76d4a5a3da2c8ac33b96151fdab9557b3363edc8>`__.
Afterwards I prompted it ~20 more times to do various smaller fixes as a
response to me reviewing it (briefly) and using it and to create an
extensive test suite.

While that was taking place I had `4o create a logo
<https://github.com/mitsuhiko/sloppy-xml-py/blob/main/logo.svg>`__.  After
that I quickly converted it into an SVG with Illustrator and had Claude
make it theme-aware for dark and light modes, which it did perfectly.

On top of that, Claude fully set up CI and even remotely controlled my
browser to configure the trusted PyPI publisher for the package for me.

In summary, here is what AI did:

* It wrote ~1100 lines of code for the parser
* It wrote ~1000 lines of tests
* It configured the entire Python package, CI, PyPI publishing
* Generated a README, drafted a changelog, designed a logo, made it theme-aware
* Did multiple refactorings to make me happier

The initial prompt that started it all (including typos):

    I want you to implement a single-file library here that parses XML sloppily.  It should implement two functions:

    * `stream_parse` which yields a stream of events (use named tuples) for the XML stream
    * `tree_parse` which takes the output of stream_parse and assembles an element tree.  It should default to xml.etree.ElementTree and optoinally allow you to provide lxml too (or anything else)

    It should be fast but use pre-compiled regular expressions to parse the stream.  The idea here is that the output comes from systems that just pretend to speak XML but are not sufficiently protected against bad outoput (eg: LLMs)

    So for instance &amp; should turn into & but if &x is used (which is invalid) it should just retain as &x in the output.  Additionally if something is an invalid CDATA section we just gracefully ignore it.  If tags are incorrectly closed within a larger tag we recover the structure.  For instance <foo><p>a<p>b</foo> will just close the internal structures when </foo> comes around.

    Use ultrathink.  Break down the implementation into

    1. planning
    2. api stubs
    3. implementation

    Use sub tasks and sub agents to conserve context

Now if you look at that library, you might not find it amazingly
beautiful.  It probably is a bit messy and might have a handful of bugs I
haven't found yet.  It however works well enough for me right now for what
I'm doing and it definitely unblocked me.  In total it worked for about
30-45 minutes to write the initial implementation while I was doing
something else.  I kept prompting it for a little while to make some
progress as I ran into issues using it.

If you want to look at what it looks like:

* `mitsuhiko/sloppy-xml-py on GitHub <https://github.com/mitsuhiko/sloppy-xml-py>`__.
* `sloppy-xml on PyPI <https://pypi.org/project/sloppy-xml/>`__.

To be clear: this isn't an endorsement of using models for serious Open
Source libraries.  This was an experiment to see how far I could get with
minimal manual effort, and to unstick myself from an annoying blocker.
The result is good enough for my immediate use case and I also felt good
enough to publish it to PyPI in case someone else has the same problem.

Treat it as a curious side project which says more about what's possible
today than what's necessarily advisable.

----

**Postscriptum:** Yes, I did slap an Apache 2 license on it.  Is that even
valid when there's barely a human in the loop?  A fascinating question but
not one I'm not eager to figure out myself.  It is however certainly
something we'll all have to confront sooner or later.
