public: yes
tags: [wasm, rust]
summary: |
  A short introduction of the current state of debugging WebAssembly code.

How to WASM DWARF
=================

So you're excited about `WebAssembly <https://webassembly.org/>`__?  You're not
alone, many are.  WebAssembly has huge opportunities that extend way past just
compiling non JavaScript code to make it run in the browser.  The reason
for this is that it is quickly becoming a widely supported compilation
target for a range of runtimes.  This lets one ship a custom WebAssembly
runtime to run your stuff and then update the code that is running on it
trivially across a variety of environments.  It's a more modern take of
Java's “compile once run everywhere” philosophy.

Not excited about WebAssembly yet?  You really should be though.  There
are so many projects now that show the power of it.  From `emulating Flash
<https://ruffle.rs/>`__ to `edge computing
<https://www.fastly.com/blog/how-fastly-and-developer-community-invest-in-webassembly-ecosystem>`__,
WebAssembly is showing up everywhere.  WebAssembly thus also makes a
perfect tool for custom plugin systems in cross platform applications.

There is one catch though: if you start distributing more and more complex
WebAssembly targets to the edge (or browser) and you want to do fast
iteration, you are going to experience crashes and errors in production
that haven't shown up during development.  So you need a crash reporting
tool.  If we emphasize the “web” in WebAssembly for a second then one
instantly starts thinking about source maps.  Source maps are what enables
crash reporting of minified JavaScript in production.  Source maps take
the location in a minified JavaScript file and let us figure out where
that pointed to in the original source file.

With WebAssembly that simplified approach breaks down.  I don't want to
explain for too long while source maps are not appropriate and why `DWARF
<https://en.wikipedia.org/wiki/DWARF>`__ is what we should all be
interested in but gladly I don't have to.  DWARF is now slowly being adopted
by more and more and we're about to support it for WebAssembly on `Sentry
<https://sentry.io/welcome/>`__.  A lot of what went into this post is
extracted from notes I took while working on WebAssembly support for our
crash reporting system.

Short WebAssembly Primer
------------------------

Before we can dive into debugging WebAssembly we need to talk about how
WebAssembly actually works.  A WebAssembly runtime is a stack machine
(kinda) that can execute WebAssembly instructions at near native speeds.
It does this in a way that is optimized to allow interoperability with the
outside world, even if the outside world is a JavaScript browser
environment.

If you have never looked at the internals of WebAssembly you can find lots
of explanations online about how it works.  However one of the probably
most interesting ways to get excited about it is a talk titled `“A talk
Near the Future of Python”
<https://www.youtube.com/watch?v=r-A78RgMhZU>`__ by David Beazley where he
live codes a WASM interpreter in Python.  The reason the talk is a great
way to dive into WASM is because it shows really well the basics of what
it's all about.

WebAssembly while being quite simple comes in a few flavors.  The first
flavor dimension is the address size.  Today all of WebAssembly you will
encounter is dubbed "wasm32".  That's the flavor of WebAssembly with 32
bit pointer address size.  There is also a 64bit variant but basically
nobody supports it and because JavaScript has no 64bit integers there will
be likely some restrictions in interoperability with the JavaScript world.
In addition we have a second dimension which is the representation of
WebAssembly on disk / in source: text (also called WAT) and binary
(normally called WASM).   Today when you open a browser console and try to
debug WebAssembly most likely you will be presented with the textual
representation of WebAssembly most of the time as the browser will
"decompile" the binary into the textual representation if it has no other
debug information available.

The difference between WASM and WAT is going to play a pretty significant
role later when we talk about debugging.  For now you need to know that
WAT does not play a significant role when working with WASM for anything
other than as an intermediate format and for debugging.

To run WebAssembly you need a runtime.  The runtime executes the
instructions and provides an interface to the outside world.  The most
popular runtimes are node and your browser.  Whenever you want to do
something fancy in your application (like IO or really anything that
sounds like a syscall) the runtime needs to "inject" that into your
module.  This sounds like wild west and in a way it is.  To allow
interoperability of different runtimes some standards are emerging.  The
most prominent one is called “`WASI <https://wasi.dev/>`__”.

How to WebAssembly
------------------

So how do I get a WebAssembly thing compiled?  At the moment the language
of choice appears to be Rust because of the excellent tooling around it
that makes starting with WebAssembly pretty straightforward.  You just
need to add the ``wasm32-unknown-unknown`` target and you're ready to go:

.. sourcecode:: shell-session

    $ rustup target add wasm32-unknown-unknown
    $ cargo new --lib wasm-example

Then you need to change the library target to ``cdylib`` in the generated
`Cargo.toml` and you're ready to roll:

.. sourcecode:: shell-session

    $ cargo build --target=wasm32-unknown-unknown
       Compiling wasm-example v0.1.0 (/Users/mitsuhiko/Development/wasm-example)
        Finished dev [unoptimized + debuginfo] target(s) in 0.63s

This produces a file called
`target/wasm32-unknown-unknown/debug/wasm-example.wasm`.  If you were to
use a tool that can dump out contents of `.wasm` files you would see
that it consists of all the general WASM sections (like ``Code``) but also
custom sections called ``.debug_frame``.  That's because rustc like many
other tools now can emit DWARF for WASM.  Point being: we're at the point
where the out of the box tooling experience can produce DWARF debug
information.

DWARF is a debug format that can help us make sense of the binary.  In
particular it lets us figure out where a specific instruction in our
binary points to in the source files.  So for instance it might tell us
that at ``0x53`` there is a function called ``foobar`` declared in file
`example/src/foobar.rs` in line `42`.  More importantly it can also tell
is if a function call was "virtual" in the sense that it was inlined.
Inline information is particularly important in release builds where small
function calls are typically fully inlined.  Without that information we
would not see where the actual crash happened.

What the DWARF?
---------------

I already talked a bit about DWARF but in practice this requires some
explanation.  DWARF is a debug standard that has been embraced on most
platforms.  The notable exception for that is the Microsoft ecosystem
where two competing file formats prevail: native PDBs with embedded
CodeView and portable PDBs for .NET.  Neither of those file formats use
DWARF.  It's not clear to me right now if Microsoft will support DWARF
once they start supporting WebAssembly on their toolchain so there is
hoping.  That said, everywhere else we have been exposed to the different
versions of DWARF for many years now so tooling is pretty good.

DWARF is not a file format in itself, it's a standard that defines a lot
of different aspects of debugging.  Because it's not a file format it
requires a container to put this information in.  On Linux for instance
DWARF information is embedded in ELF files, on iOS/macOS and other Apple
platforms it's embedded in Mach-O binaries.  On all those platforms it's
also common to split these files in two.  That often leaves one ELF file
behind with the code you run and a separate ELF debug file just containing
the DWARF information.

One added complexity here is that you often need access to both files if
you want to do certain types of debugging happen.  For instance to produce
a stack trace out of a memory dump you don't just need the DWARF data, you
also need the executable.  The reason for this is that that the process of
creating a stack trace is also something that the executable itself needs
for a lot of languages.  So for instance C++ has exceptions and in order
to throw them, it needs to “unwind” the stack.  For that it uses on some
platforms a derived version of DWARF embedded in the binary as `eh_frame`.
Since often that information is not retained in the debug files we
typically need both.

To match those two files together the concept of “build IDs” (also called
“debug IDs” and/or “code IDs”) has been established.  In Mach-O binaries
they are prominently stored as a header in the Mach-O file and are called
``LC_UUID``.  In ELF binaries two systems are used: the more modern
the ``NT_GNU_BUILD_ID`` ELF note in the program headers or the more legacy
``.note.gnu.build-id`` ELF section.  The same concept also exists for PDBs
on Windows executables contain an ID that uniquely defines the PDB that
goes with it.

So how do we do this on WASM?  It turns out for WASM there is no standard
yet.  `I proposed one <https://github.com/WebAssembly/tool-conventions/issues/133>`__
which is what we currently support on Sentry.  Basically we embed a custom
section called ``build_id`` into the WASM file containing a UUID.  When the
binary is "stripped" (that is, the debug data is removed for size or
intellectual property concerns) the ``build_id`` section remains in both
files so we can match them together.  This is particularly important when
debug files are stored in a central location like a `symbol server
<https://getsentry.github.io/symbolicator/advanced/symbol-server-compatibility/>`__.
Sentry for instance will look up the debug data exclusively with the
``build_id`` at any symbol server configured or in a customer's uploaded
symbol repository.  Due to `a quirk in the WASM spec <https://github.com/WebAssembly/tool-conventions/issues/155>`__
it's important that the debug file made available to Sentry or other crash
reporting tools retains all original data including the `Code` sections.
More about that later.

Stack Traces and Instruction Addresses
--------------------------------------

So earlier we talked about WebAssembly being a stack machine.  Unlike
what you encounter in the real world most of the time WebAssembly does not
have registers and it does not have a unified virtual address space.  This
poses some challenges to DWARF but not insurmountable ones.  To
understand the problem let's look at how a normal binary works and then
how WebAssembly works.

When you're on Linux and you compile a program you typically end up
linking in some other code too.  Your binary might thus once it's loaded
into memory also refer to other dynamic libraries.  Every function that
exists has a unique address in the same address space as your variables.
This is typically referred to as a `von Neumann architecture
<https://en.wikipedia.org/wiki/Von_Neumann_architecture>`__.  One of the
effects of this is that I can normally take the address of a function and
then figure out based on the address of the function from which module the
function came.  For instance I might see that from ``0x1000`` to
``0x5000`` all functions come from a library called `utils.dylib`.
Simplified speaking if I see that my CPU crashed in ``0x1024`` I can just
look into the debug information for `utils.dylib` and look for ``0x1024 -
0x1000`` and see what it tells me about.

With WebAssembly we have two immediate problems.  First of all code and
data live are separated.  This is generally called a `Harvard architecture
<https://en.wikipedia.org/wiki/Harvard_architecture>`__.  Functions in
WASM are as far as the runtime is concerned referenced by name or index.
The “address” of a function is not a thing that WASM understands.  It
might be something that would be nice to have for the language that
compiles down to it though.  For instance it's very common to take the
address of a function in C++ and put it into a variable.  The other place
where function addresses show up is typically in stack traces.  When you
generate a stack trace in most native languages and operating systems you
end up with something that looks like a list of instruction addresses that
point directly into functions.  Since everything is in a huge memory space
no issues here.  In WebAssembly we might be offset within a function so we
need to know which function index we're in and how far we managed to
execute with in that function.

Generally it's currently not possible to generate stack traces in most
WebAssembly environments unless a custom implementation was made.  What is
possible in Browsers is to register a function with the WebAssembly module
that is implemented in JavaScript and raises an exception just to catch
the stringified stack trace:

.. sourcecode:: javascript

    function getStackTrace() {
        try {
            throw new Error();
        } catch (e) {
            return e.stack;
        }
    }

When this function is passed to WebAssembly the target module written in
Rust or C++ can parse that string to figure out what the stack observed by
the web assembly runtime looks like.  So what does such a stack look like?

Typically it looks something like this (in fact at least the WebAssembly
frames are standardized across browsers)::

    getStackTrace@http://localhost:8002/:23:13
    example@http://localhost:8002/wasm-example.wasm:wasm-function[1]:0x8c
    @http://localhost:8002/:37:9

Here we can see that our wasm-example was modified to call into the
``getStackTrace`` function from above.  What's important here is that the
WebAssembly code tells us a) the name of the function when available, the
URL of the WebAssembly module, the index of the function and a hexadecimal
address.  The latter is particularly important and we will get to it
shortly but first let's think about the URL a bit.  Remember the example
above from where I talked about having a dynamic library mapped into your
executable?  Now imagine we do the same in WebAssembly.  We have a
WebAssembly module linked to another one at runtime.  This could result in
a stack trace where two different WebAssembly modules show up in the
stack trace.  The only thing that tells them apart is the URL.  In both
files we will find a function with the index `1` and in both files we are
likely to find some code at address `0x8c`.

In the same way as stack traces are not defined in WebAssembly there is
also no concept of dynamic linking or working with multiple modules.
While it is possible to dynamically link there is no API to work with it.
This is not too different from how dynamic linking wasn't really ever
standardized in C either.  For instance at Sentry we need to implement
custom code for all platforms to figure out which dynamic library sits at
what address.  On macOS we need to work with the Apple dynamic linker and
parse Mach-O files, on Linux we need to parse ``/proc/maps`` and reach ELF
files etc.  The only advantage on those platforms is that because all code
ends up in the same address space it is pretty trivial to accomplish this.

In WebAssembly the situation is a lot more complex.  First of all it looks
like the only way we can keep these modules apart is the file name.  So
how do we map from file name (or URL) to the handle of our WebAssembly
object?  We effectively need to establish such a mapping in our runtime.
When we want to do this in the browser we quickly run into the limitation
that no such API exists.  The way we work around this currently is to
monkey patch the ``WebAssembly.instanciateStreaming`` function and *hope*
that the caller passes a ``fetch`` result which contains a URL.  Once we
have a handle for the WebAssembly module we can also access the
``build_id`` custom section to read the build ID.

The next thing we need to figure out is this instruction address.  As we
talked about before WebAssembly doesn't really have this address space for
instructions either.  In fact there are two formats for WebAssembly: text
(wat) and binary (wasm).  The DWARF standard for it came later and thus
the desire to talk about addresses appeared for the first time.  To make
it easier for DWARF tools the debug information is encoded in byte offsets
in the original source file.  This means that if you serialize a WASM
module to binary or text, the DWARF offsets would have to be different.
To make matters a bit more confusing, DWARF is specified to encode the
addresses in offsets *within the ``Code`` section*.  This creates again a
bit of a problem because browsers (and other runtimes) report the offset
within the entire WASM file instead.  Since the `Code` section never sits
at the beginning of the file, there is always going to be an offset
between them.  In the same way as browsers do not provide an API to access
the URL of a WebAssembly module, they also do not provide a way to access
the offset of the ``Code`` section.  This means that crash reporting tools
are required to be able to operate with the absolute offset in the WASM
file instead.  This in turn means that the WASM debug file `must not
remove the Code section or other sections
<https://github.com/WebAssembly/tool-conventions/issues/155>`__ or we
would have to add a second section that holds the original code offset.

For for instance if the address `0x8c` is reported, but code starts at
`0x80` the actual address reported in the DWARF file is `0xc`.

Wasm-Bindgen and Friends
------------------------

So cool, now we walked through all of this.  Unfortunately there is more.
When you start out with just `rustc` or another compiler you can get a
binary with DWARF data and all is well.  However once you work with tools
which open WASM files and serialize them back you're in a bit of a pickle
because they either destroy the debug info or remove it.  For instance a
common crate to use in the Rust ecosystem is `wasm-bindgen
<https://github.com/rustwasm/wasm-bindgen>`__ which can help work with
browser APIs.  The issue with it is that wasm-bindgen `completely destroys
the DWARF debug info
<https://github.com/rustwasm/wasm-bindgen/issues/1981>`__ as it's based on
`walrus <https://github.com/rustwasm/walrus/issues/67>`__ which does not
yet implement debug information tracking.  If your project involves a tool
like that, you're currently out of luck getting DWARF debug information
going.

Custom Hacks
------------

So what do we do at Sentry do now if you want WASM debugging going?

- We provide you with a tool called `wasm-split <https://github.com/getsentry/symbolicator/tree/master/wasm-split>`__
  which can add a ``build_id`` section if missing and splits debug
  information into a separate file and strips it from the release file
  leaving you with two files: a debug file containing everything and a
  library file without debug sections.
- We monkey-patch the browser's ``WebAssembly.instanciateStreaming``
  functions (`Pending integration into the JavaScript SDK
  <https://github.com/getsentry/sentry-javascript/pull/3080>`__) to keep
  track of URLs to build IDs.
- We `rebase all pointers on the server
  <https://github.com/getsentry/symbolic/blob/297bd3b08a2c0ee1bc72fbe1c946cc08cdf6cd83/symbolic-debuginfo/src/wasm.rs#L151-L156>`__
  to be relative within the `DWARF` file and back.

Wishlist and Future Direction
-----------------------------

So what does this leave us with?  Really overall we're getting there!
Sentry can now give you proper stack traces with source code even:

.. raw:: html

    <blockquote class="twitter-tweet" data-lang="en" data-dnt="true" data-theme="light"><p lang="en" dir="ltr">I&#39;m unreasonably excited about the first working WASM crash in <a href="https://twitter.com/getsentry?ref_src=twsrc%5Etfw">@getsentry</a> with DWARF debug info. <a href="https://t.co/SE0eVex3Au">pic.twitter.com/SE0eVex3Au</a></p>&mdash; Armin Ronacher (@mitsuhiko) <a href="https://twitter.com/mitsuhiko/status/1331591210323021825?ref_src=twsrc%5Etfw">November 25, 2020</a></blockquote>

Unfortunately there are many restrictions I wish we would not have to live
with:

-   When a WebAssembly module is loaded dynamically there is no way for us
    to work with it.  That's because on the one hand stack traces in
    browsers do not provide the ``build_id`` directly so we have no way to
    uniquely identify the file, secondly because there is also no way to
    get the URL of a ``WebAssembly.Module``.  I really wish there was an
    API for that.
-   Speaking of ``build_id``\s: I wish everybody would embrace them and
    they would become a standard.
-   The fact that we have code section relative offsets within DWARF files
    but no way to get the offset to the ``Code`` section in browsers seems
    suboptimal for people who want to use separate debug files.
-   I wish `wasm-bindgen` and the libraries it's build on would start
    supporting DWARF.
-   I wish there was a standardized API to get stack traces even from
    within WebAssembly (WASI etc.) so Rust code like the ``backtrace``
    crate could provide stack traces for error logging and more.

To end on a positive note: the ecosystem around WebAssembly — particularly
in the Rust world — is amazing.  In fact in general the ecosystem for
working with DWARF data in Rust is top notch and always a pleasure to work
with.  There are a lot of people working on making everybody's debugging
experience as good as possible and that work is rarely honored.  Every
developer knows and wants to have stack traces, yet very few people are
comparatively working on enabling this functionality.
