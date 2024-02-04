public: yes
tags: [python, announcement]
summary: A progress update on where my Rye Project is today.

Rye: A Vision Continued
=======================

In April of last year I released `Rye <https://rye-up.com/>`__ to the public.
Rye, both then and now, represents my very personal vision of what an improved
Python packaging and project management solution can look like.
Essentially, it's a comprehensive user experience, designed so that the
only tool a Python programmer would need to interface with is Rye itself
and it gets you from zero to one in a minute.  It is capable of
bootstrapping Python by automatically downloading different Python
versions, it creates virtualenvs, it manages dependencies, and lints and
formats.  Initially developed for my own use, I decided to release it to
the public, and the feedback has been overwhelmingly positive.

When I introduced it, I initiated a discussion thread titled `“Should Rye
Exist” <https://github.com/mitsuhiko/rye/discussions/6>`__ referencing the
well known `XKCD #929 <https://xkcd.com/927/>`__ which humorously comments
on the proliferation of competing standards.  I did not feel well throwing
yet another Python packaging tool into the ring.

Yet it exists now and has user.  This standard issue however I think is
helped a bit by the fact that Rye doesn't actually do any of these things
itself.  It wraps established tools:

* **Downloading Python**: it provides an automated way to get access to
  the amazing `Indygreg Python Builds <https://github.com/indygreg/python-build-standalone/>`__
  as well as the PyPy binary distributions.
* **Linting and Formatting**: it bundles `ruff <https://github.com/astral-sh/ruff>`__
  and makes it available with `rye lint` and `rye fmt`.
* **Managing Virtualenvs**: it uses the well established `virtualenv
  <https://virtualenv.pypa.io/en/latest/>`__ library under the hood.
* **Building Wheels**: it delegates that work largely to `build <https://pypi.org/project/build/>`__.
* **Publishing**: its publish command uses `twine
  <https://pypi.org/project/twine/>`__ to accomplish this task.
* **Locking and Dependency Installation:** is today implemented by
  using `unearth <https://pypi.org/project/unearth/>`__ and
  `pip-tools <https://github.com/jazzband/pip-tools/>`__.

As you can see, Rye is not revolutionary and it's not intended to be.  Rye
itself doesn't do all that much as it delegates all the core functionality
to other tools in the ecosystem.  Rye packages these tools together in a
user-friendly manner, significantly reducing the cognitive load for
developers.  This convenience eliminates the need to learn about various
tools, read extensive documentation, and integrate these components
independently.  Rye lets you get from no Python on a computer to a fully
functioning Python project in under a minute with linting, formatting and
everything in place.  It is sufficiently opinionated that many important
decisions are made for you.  For instance it starts you out with using
`pyproject.toml` and picks a wheel build system for you.  It also picks
the linter and formatter, and the preferred Python distribution and
decides on a build tool.

Defaults Matter
---------------

Rye is designed to select the best tools for the job — it picks winners.
Why does it do that?  This approach is inspired by my admiration for the
developer experience in the Rust ecosystem, particularly the seamless
integration of `rustup` and `cargo`.  Their functionality made me long for
a similar experience within the Python community.  Crucially the way this
works in the Rust world does not mean that `cargo` does everything.  When
you run `cargo build` it invokes `rustc`, when you run `cargo doc` it runs
`rustdoc`.  When you invoke `cargo clippy` it runs `clippy` for you and so
worth.  Cargo is a manager that delegates the important work to bespoke
tools that are improved by sometimes entirely different teams.  This also
means that tools can be swapped out if they are found to be not the right
choice any more.  The experience in the Rust world also showed me that
excellent Windows support is just a must have.  That's why Rye is not just
a great experience on macOS and Linux, it's also excellent on Windows.

I am convinced that the Python community is deserving of an excellent
developer experience, and Rye, as it stands today, offers a promising
beginning.  My belief is supported by evidence gathered from conducting
in-person user interviews and demos, where Rye was well received.  In
fact, every individual who I was able to give a guided tour of Rye was
impressed by how swiftly one could start working with Python.  Because it
was demonstrably designed to avoid interference with any pre-existing
Python configurations, Rye allows for a smooth and gradual integration and
the emotional barrier of picking it up even for people who use other tools
was shown to be low.

That said, Rye is a one person project and it does not address the
fundamental challenges of some of the issues we have in the Python
ecosystem.  It does not solve multi version dependencies, it does not
offer better performance for the installation of dependencies.  It does
not help with distributing executables for end user applications or
anything like this.  However I am getting multiple signals that the time
is right for a tool like Rye to not just exist, but also to rally a larger
number of the Python community embrace some of these standardization
ideas.

What's Next?
------------

`Chris Warrick <https://github.com/Kwpolska>`__ recently `wrote a blog post
<https://chriswarrick.com/blog/2024/01/15/python-packaging-one-year-later/>`__
where he looked back at the last year of Python packaging that made the
rounds on Twitter.  It laments a bit that we did not make much of a
progress in packaging and it also talks a bit about Rye and correctly
points out that Rye does not have enough contributors (basically just me).
That's not a healthy setup.

I still don't really know if Rye *should* exist.  It has not yet become
established and there are plenty of rough edges.  I personally really
enjoy using it but at the same time every time I use it, I get reminded
that it would stop existing if I did not invest time into it which in some
sense is what keeps me going on it.

However I would love to see the community converge to a Rye like solution,
no matter where it comes from.

Learn More
----------

Did I spark your interest?  I would really appreciate it if you give it a
try and give feedback:

.. raw:: html

    <div style="text-align: center">
        <p><em>a 16 minute introduction to Rye</em>
        <iframe width="782" height="441" style="display: block; margin: 0 auto;" src="https://www.youtube.com/embed/q99TYA7LnuA" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
    </div>

* `Project Website <https://rye-up.com/>`__
* `User Guide and Documentation <https://rye-up.com/guide/>`__
* `GitHub Project <https://github.com/mitsuhiko/rye>`__
* `Discussion Forums <https://github.com/mitsuhiko/rye/discussions>`__
* `Discord <https://discord.gg/drbkcdtSbg>`__
