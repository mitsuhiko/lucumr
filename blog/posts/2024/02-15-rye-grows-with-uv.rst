public: yes
tags: [python, announcement, rye]
summary: Rye is faster now by sitting on top of uv and it moves over to Astral.

Rye Grows With UV
=================

Two weeks ago I asked the question again about `What Rye should be
</2024/2/4/rye-a-vision/>`__.  There has been one thing that I have not
publicly shared before and that is that ever since Rye exists I have also
been talking to `Charlie Marsh <https://twitter.com/charliermarsh/>`__
about Python packaging and Python tooling.  It turns out that we had some
shared ideas of what an ideal Python tooling landscape would look like.
That has lead to some very interesting back and forths.  To make a
potentially very long story short: Together with Astral's release of
`uv <https://github.com/astral-sh/uv>`__ they will `take stewardship of Rye
<https://astral.sh/blog/uv>`__.  For the details read on.

For me Rye is an exciting test bed of what Python tooling can be.  I have
been using this test bed to run a of experiments over the last year.  I
learned a lot about what is missing in the ecosystem by building it and
where the challenges are.  What I enjoyed the most of working on it so far
has been the feedback from various people on it.  I wanted to explore what
a “cargo for Python” is like and it's becoming ever more evident what that
might look like.  At the same time from the very start I was very clear in
`questioning its existence
<https://github.com/mitsuhiko/rye/discussions/6>`__.

Since we were talking I was able to run an experiment which has been to
put in Astral's uv as replacement for `pip-tools`.  If you are not
familiar with it yet: uv today is a drop-in replacement for
`pip-tools` and `venv`.  The why is pretty clear: it's much faster than
`pip-tools`.  Instead of taking 5 seconds to sync a virtualenv, it's
almost instant.  It's hard to overstate how impactful this is in terms of
developer experience.

For entirely unrelated reasons Rye today already picks some of Astral's tools
to power other functionality.  If you invoke `rye fmt` and `rye check` it
behind the scenes uses Astral's `ruff` to do so.  They are fast,
sufficiently oppinonated and they do not require installing them into the
virtualenv of the project.  They are quickly becoming the obvious choice
if you are used to excellent tooling from other ecosystems.  So as it
stands, three things that Rye does are either already picking Astral
tools, or will soon default to doing so.

This led to a few conversations if it would make sense for Astral to
continue the work on Rye and build it out into that “cargo for Python”.
I'm very much convinced that there should be such a tool and that is
something Charlie from Astral shares.  Where we landed is a plan that
looks like the following:

Rye will continue to be a test bed for what Python tooling can be.  We
will move the project under Astral's stewardship with the desire to use it
to further explore what a good UX can be and we will be quite liberal in
trying different things.  For instance now that the package installation
process is blazing fast, I really want to see if we can remove the need of
calling `sync` manually.  There are also a lot of questions remaining
like how to make the most of the `indygreg builds
<https://github.com/indygreg/python-build-standalone/issues>`__ or what
lock files should look like in a Python world.  I also want to go deep on
exploring a multi-version Python import system.

Rye will turn into a blessed breeding ground of different things.  As the
user experience becomes more obvious uv itself will turn from what
it is today — low level plumbing — into that higher level tool with a
clear migration path of folks using `rye` to that new `uv`.

To try Rye on top of uv today `install
<https://rye-up.com/guide/installation/>`__ or update to the latest
version and enable the experimental uv support:

.. sourcecode:: console

    $ rye config --set-bool behavior.use-uv=true

To learn more about uv and rye head over to GitHub:

*   `astral-sh/uv <https://github.com/astral-sh/uv>`__
*   `mitsuhiko/rye <https://github.com/mitsuhiko/rye>`__

You might have some more questions about this so I compiled a basic FAQ:

**Why not make Rye the cargo for Python?**
    This in many ways might look like the obvious question.  The answer is
    quite simple: Rye as it exists today is unlikely to be the final
    solution.  For a start code wise it's pretty brittle coming from it
    cobbling together various tools.  It's a duck-taped solution that was
    built to sketch up what can be, for my very own uses.  It is however
    incredibly useful to play and explore possible solutions.

**Will Rye retired for uv?**
    Not today, but the desire is that these tools eventually converge into
    one.

**Will you continue to contribute and maintain Rye?**
    Short answer: yes.  Long answer is that me contributing to my own tool
    has been a pretty spotty thing over the last year.  There was in fact
    almost a multi month hiatus where the only changes to Rye were bumping
    Python versions and fixing minor issues and that not because it was
    perfect.  The reason more was that I realized that Rye runs into
    fundamental issues that are really gnarly to resolve which can be
    quite frustrating to attack as a side project.  So I want to continue
    to be involved in one way or another, but this is a project much
    larger than me and I do not have the motivation to give it enough of
    that push myself.

**Will I join Astral?**
    No :-)

**Is there a song about Python packaging?**
    Thanks to AI there is.

    .. raw:: html

        <audio controls
        src="http://mitsuhiko.pocoo.org/pep8-vs-packaging.mp3"></audio>
