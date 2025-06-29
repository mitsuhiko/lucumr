tags: [thoughts, rust]
summary: More musing on dependencies.

Fat Rand: How Many Lines Do You Need To Generate A Random Number?
=================================================================

I recently wrote `about dependencies in Rust
</2025/1/24/build-it-yourself/>`__.  The feedback, both within and outside
the Rust community, was very different.  A lot of people, particularly
some of those I greatly admire expressed support.  The Rust community, on
the other hand, was very dismissive on on Reddit and Lobsters.

Last time, I focused on the ``terminal_size`` crate, but I also want to
show you a different one that I come across once more: ``rand``.  It has a
similarly out-of-whack value-to-dependency ratio, but in a slightly
different way.  More than ``terminal_size``, you are quite likely to use
it.  If for instance if you want to generate a random UUID, the ``uuid``
crate will depend on it.  Due to its nature it also has a high security
exposure.

I don't want to frame this as “``rand`` is a bad crate”.  It's not a bad
crate at all!  It is however a crate that does not appear very concerned
about how many dependencies it has, and I want to put this in perspective:
of all the dependencies and lines of codes it pulls in, how many does it
actually use?

As the name implies, the ``rand`` crate is capable of calculating random
numbers.  The crate itself has seen a fair bit of churn: for instance 0.9
broke backwards compatibility with 0.8.  So, as someone who used that
crate, I did what a responsible developer is supposed to do, and upgraded
the dependency.  After all, I don't want to be the reason there are two
versions of ``rand`` in the dependency tree.  After the upgrade, I was
surprised how fat that dependency tree has become over the last nine
months.

Today, this is what the dependency tree looks like for the default feature
set on macOS and Linux::

    x v0.1.0 (/private/tmp/x)
    └── rand v0.9.0
        ├── rand_chacha v0.9.0
        │   ├── ppv-lite86 v0.2.20
        │   │   └── zerocopy v0.7.35
        │   │       ├── byteorder v1.5.0
        │   │       └── zerocopy-derive v0.7.35 (proc-macro)
        │   │           ├── proc-macro2 v1.0.93
        │   │           │   └── unicode-ident v1.0.16
        │   │           ├── quote v1.0.38
        │   │           │   └── proc-macro2 v1.0.93 (*)
        │   │           └── syn v2.0.98
        │   │               ├── proc-macro2 v1.0.93 (*)
        │   │               ├── quote v1.0.38 (*)
        │   │               └── unicode-ident v1.0.16
        │   └── rand_core v0.9.0
        │       ├── getrandom v0.3.1
        │       │   ├── cfg-if v1.0.0
        │       │   └── libc v0.2.169
        │       └── zerocopy v0.8.14
        ├── rand_core v0.9.0 (*)
        └── zerocopy v0.8.14

About a year ago, it looked like this::

    x v0.1.0 (/private/tmp/x)
    └── rand v0.8.5
        ├── libc v0.2.169
        ├── rand_chacha v0.3.1
        │   ├── ppv-lite86 v0.2.17
        │   └── rand_core v0.6.4
        │       └── getrandom v0.2.10
        │           ├── cfg-if v1.0.0
        │           └── libc v0.2.169
        └── rand_core v0.6.4 (*)

Not perfect, but better.

So, let's investigate what all these dependencies do. The current version
pulls in quite a lot.

Platform Dependencies
---------------------

First there is the question of getting access to the system RNG.  On Linux
and Mac it uses ``libc``, for Windows it uses the pretty heavy Microsoft
crates (``windows-targets``).  The irony is that the Rust standard library
already implements a way to get a good seed from the system, but it does
not expose it.  Well, not really at least.  There is a crate called
``fastrand`` which does not have any dependencies which seeds itself by
funneling out seeds from the stdlib via the hasher system.  That looks a
bit like this:

.. sourcecode:: rust

    use std::collections::hash_map::RandomState;
    use std::hash::{BuildHasher, Hasher};

    fn random_seed() -> u64 {
        RandomState::new().build_hasher().finish()
    }

Now obviously that's a hack, but it will work because the hashmap's hasher
is randomly seeded from good sources.  There is a single-dependency crate
too which can read from the system's entropy source and that's
``getrandom``.  So there at least could be a world where ``rand`` only
depends on that.

Dependency Chain
----------------

If you want to audit the entire dependency chain, you end up with
maintainers that form eight distinct groups:

1. ``libc``: rust core + various externals
2. ``cfg-if``: rust core + Alex Crichton
3. ``windows-*``: Microsoft
4. ``rand_*`` and ``getrandom``: rust nursery + rust-random
5. ``ppv-lite86``: Kaz Wesley
6. ``zerocopy`` and ``zerocopy-derive``: Google (via two ICs there, Google
   does not publish)
7. ``byteorder``: Andrew Gallant
8. ``syn``, ``quote``, ``proc-macro2``, ``unicode-ident``: David Tolnay

If I also cared about WASM targets, I'd have to consider even more
dependencies.

Code Size
---------

So let's vendor it.  How much code is there?  After removing all tests, we
end up with **29 individual crates** vendored taking up **62MB** disk
space.  Tokei reports **209,150 lines of code**.

Now this is a bit misleading, because like many times most of this is
within ``windows-*``.  But how much of ``windows-*`` does ``getrandom``
need?  A single function:

.. sourcecode:: rust

    extern "system" fn ProcessPrng(pbdata: *mut u8, cbdata: usize) -> i32

For that single function (and the information which DLL it needs link
into), we are compiling and downloading megabytes of ``windows-targets``.
Longer term `this might not be necessary
<https://rust-lang.github.io/rfcs/2627-raw-dylib-kind.html>`__, but today
it is.

On Unix, it's harder to avoid ``libc`` because it tries multiple APIs.
These are mostly single-function APIs, but some non-portable constants
make ``libc`` difficult to avoid.

Beyond the platform dependencies, what else is there?

* ``ppv-lite86`` (the ``rand``'s picked default randon number generator)
  alone comes to 3,587 lines of code including 168 unsafe blocks.  If
  the goal of using ``zerocopy`` was to avoid ``unsafe``, there is still
  a ton of ``unsafe`` remaining.
* The combination of ``proc-macro2``, ``quote``, ``syn``, and
  ``unicode-ident`` comes to 49,114 lines of code.
* ``byteorder`` clocks in at 3,000 lines of code.
* The pair of ``zerocopy`` and ``zerocopy-derive`` together?  14,004 lines
  of code.

All of these are great crates, but do I need all of this just to generate a random number?

Compilation Times
-----------------

Then there are compile times.  How long does it take to compile? 4.3
seconds on my high-end M1 Max.  A lot of dependencies block each other,
particularly the part that waits for the derives to finish.

* ``rand`` depends on ``rand_chacha``,
* which depends on ``ppv-lite86``,
* which depends on ``zerocopy`` (with the derive feature),
* which depends on ``zerocopy-derive``
* which pulls compiler plugins crates.

Only after all the code generation finished, the rest will make meaningful
progress.  In total a release build produces 36MB of compiler artifacts.
12 months ago, it took just under 2 seconds.

Final Thoughts
--------------

The Rust developer community `on Reddit
<https://www.reddit.com/r/rust/comments/1igjiip/rand_now_depends_on_zerocopy/>`__
doesn't seem very concerned.  The main sentiment is that ``rand`` now uses less
``unsafe`` so that's benefit enough.  While the total amount of unsafe
probably did not go down, that moved unsafe is is now in a common crate
written by people that know how to use unsafe (``zerocopy``).  There is
also the sentiment that all of this doesn't matter anyways, because we
will will all soon depend on ``zerocopy`` everywhere anyways, as more and
more dependencies are switching over to it.

Maybe this points to Rust not having a large enough standard library.
Perhaps features like terminal size detection and random number generation
should be included.  That at least is what people pointed out on Twitter.

We already treat crates like ``regex``, ``rand``, and ``serde`` as if they
were part of the standard library.  The difference is that I can trust the
standard library as a whole—it comes from a single set of authors, making
auditing easier.  If these external, but almost standard crates were more
cautious about dependencies and make it more of a goal to be auditable, we
would all benefit.

Or maybe this is just how Rust works now.  That would make me quite sad.

----

*Update:* it looks like there is some appetite in ``rand`` to improve on
this.

*   ``zerocopy`` might be removed in the core library: `issue #1574
    <https://github.com/rust-random/rand/issues/1574>`__ and `PR #1575
    <https://github.com/rust-random/rand/pull/1575>`__.

*   a stripped down version of ``chacha20`` (which does not require ``zerocopy``
    or most of the rust-crypto ecosystem) might replace ``ppv-lite86``:
    `PR #934 <https://github.com/rust-random/rand/issues/934>`__.

*   if you use Rust 1.71 or later, ``windows-target`` becomes mostly a
    no-op if you compile with ``--cfg=windows_raw_dylib``.

----

*Edit: This post originally incorrectly said that getrandom depends on
windows-sys.  That is incorrect, it only depends on windows-targets.*
