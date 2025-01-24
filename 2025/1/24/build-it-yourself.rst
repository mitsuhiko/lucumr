public: yes
tags: [thoughts, rust]
summary: We need a vibe shift on dependencies in programming.

Build It Yourself
=================

Another day, another `rant </2016/3/24/open-source-trust-scaling/>`__
`about </2022/1/10/dependency-risk-and-funding/>`__ `dependencies
</2024/3/26/rust-cdo/>`__. from me.  This time I will ask you that we
start and support a vibe shift when it comes to dependencies.

You're probably familiar with the concept of “dependency churn.”  It's that
never-ending treadmill of updates, patches, audits, and transitive
dependencies that we as developers love to casually install in the name of
productivity.  Who doesn't enjoy waiting for yet another `cargo upgrade`
just so you can get that fix for a bug you don't even have?

It's a plague in most ecosystems with good packaging solutions.
JavaScript and Rust are particularly badly affected by that.  A brand new
Tokio project drags in 28 crates, a new Rocket project balloons that to
172, and a little template engine like MiniJinja can exist with just a
single dependency — while its CLI variant slurps up 142.

If that doesn't sound like a big deal, let's consider `terminal_size
<https://crates.io/crates/terminal_size>`__.  It is a crate that does
exactly what its name suggests: it figures out your terminal dimensions.
The underlying APIs it uses have effectively been stable since the earliest days of computing
terminals—what, 50 years or so? And yet, for one function, terminal-size
manages to introduce three or four additional crates, depending on your
operating system.  That triggers a whole chain reaction, so you end up
compiling thousands of other functions just to figure out if your terminal
is 80x25 or 120x40.  That crate had 26 releases.  My own version of that
that I have stuck away in a project from 10 years ago still works without
a single update.  Because shocker: nothing about figuring out terminal
sizes has changed.  [1]_

So why does `terminal-size` have so many updates if it's so stable?
Because it's build on top of platform abstraction libraries that
constantly churn, so it needs to update to avoid code duplication and
blowing up compile times even more.

But “big supply chain” will tell you that you must do it this way.  Don't
you dare to copy paste that function into your library.  Or don't you date
to use “unsafe” yourself.  You're not qualified enough to write unsafe
code, let the platform abstraction architects do that.  Otherwise someone
`will slap you <https://github.com/geiger-rs/cargo-geiger>`__.  There are
entire companies who are making a living of supplying you with the tools
needed to deal with your dependency mess.  In the name of security, we're
pushed to having dependencies and keeping them up to date, despite most of
those dependencies being the primary source of security problems.

The goal of code in many ways should be to be written in a way that it
does not need updates.  It should eventually achieve some level of
stability.  In the Rust ecosystem stable code is punished.  If you have a
perfectly working dependency but you have a somewhat inactive bug tracker,
RUSTSEC will come by and `give you a chunk rating </2024/3/26/rust-cdo/>`__.

But there *is* a simpler path.  You write code yourself.  Sure, it's more
work up front, but once it's written, it's done. No new crates, no waiting
for upsteam authors to fix that edge case.  If it's broken for you, you
fix it yourself.  Code that works doesn't necessarily need the
maintenance treadmill.  Your code has a corner case?  Who cares.  This is
that vibe shift we need in the Rust world: celebrating fewer dependencies
rather than more.

We're at a point in the most ecosystems where pulling in libraries is not
just the default action, it's seen positively: “Look how modular and
composable my code is!”  Actually, it might just be a symptom of never
wanting to type out more than a few lines.

Now one will make the argument that it takes so much time to write all of
this.  It's 2025 and it's faster for me to have ChatGPT or Cursor whip up
a dependency free implementation of these common functions, than it is for
me to start figuring out a dependency.  And it makes sense as for many
such small functions the maintenance overhead is tiny and much lower than
actually dealing with constant upgrading of dependencies.  The code is just
a few lines and you also get the benefit of no longer need to compile
thousands of lines of other people's code for a single function.

But let's face it: corporate code review culture which also has infected
Open Source software.  Companies are more likely to reward engineers than
scold them for pulling in that new “shiny library” that solves the problem
they never actually had.  That creates problems, so dependabot and friends
was born.  Today I just dread getting dependabot pull requests but on
projects but I have to accept it.  I'm part of an ecosystem with my stuff
and that ecosystem is all about churn, churn, churn.  In companies you can
also keep entire internal engineering teams busy with vendoring
dependencies, internal audits and upgrading things throughout the company.

Fighting this fight is incredibly hard!  Every new hire has been trained
on the idea that dependencies are great, that code reuse is great.  That
having old code sitting around is a sign of bad engineering culture.

It's also hard to fight this in Open Source.  Years ago I wrote `sha1-smol
<https://crates.io/crates/sha1_smol>`__ which originally was just called
`sha1`.  It became the standard crate to calculate SHA1 hashes.
Eventually I was pressured to donate that package name to rust-crypto and
to depend on the rest of the crypto ecosystem as it was so established.
If you want to use the new sha1 crate, you get to enjoy 10 dependencies.
But there was just no way around it, because that name in the registry is
precious and people also wanted to have trait compatibility.  It feels
tiring to be the only person in a conversation pushing to keep the churn
down and dependencies low.

It's time to have a new perspective: we should give kudos to engineers who
write a small function themselves instead of hooking in a transitive web
of crates.  We should be suspicious of big crate graphs.  Celebrated are
the minimal dependencies, the humble function that just quietly does the
job, the code that doesn't need to be touched for years because it was
done right once.

And sure, it's not black and white.  There are the important libraries
that solve hard problems.  Graphics libraries that abstract over complex
drivers, implementations of protocols like HTTP and QUIC.  I won't be able
to get rid of tokio and I have no desire to.  But when you end up using
one function, but you compile hundreds, some alarm bell should go off.

We need that vibe shift.  To celebrate building it yourself when it's
appropriate to do so.  To give credit to library authors who build low to
no-dependency Open Source libraries.

For instance minijinja celebrates it in the readme::

    $ cargo tree
    minimal v0.1.0 (examples/minimal)
    └── minijinja v2.6.0 (minijinja)
        └── serde v1.0.144

And it has a PR to eventually `get rid of the last dependency
<https://github.com/mitsuhiko/minijinja/pull/539>`__.  And sometime this
year I will make it my goal to go ahead proudly and trim down all that fat
in my projects.

.. [1] Disclaimer: you will need one dependency for UNIX: `libc`.  That's
   because Rust does not expose the platform's libc constants to you, and
   they are not standarized.  That however is such a common and
   lightweight dependency that you won't be able to avoid it anyways.
