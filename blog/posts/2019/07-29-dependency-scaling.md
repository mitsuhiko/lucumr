---
tags:
  - rust
  - javascript
  - opensource
  - thoughts
summary: "An update to my struggles accepting that the current explosion of
the amount of dependencies is the best we can do."
---

# Updated Thoughts on Trust Scaling

A few years back I wrote down my thoughts on the problem of [micropackages
and trust scaling](/2016/3/24/open-source-trust-scaling/).  In the
meantime the problem has only gotten worse.  Unfortunately my favorite
programming language Rust is also starting to suffer from dependency
explosion and how risky dependencies have become.  Since I wrote about
this last I have learned a few more things about this and I have some new
ideas of how this could potentially be managed.

## The Problem Summarized

Every dependency comes with a cost.  It pulls in code and a license and it
needs to be pulled from somewhere.  One of the things that has generally
improved over the last few years is that package registries have become
largely immutable.  Once published it's there forever and at the very
least it cannot be replaced by different code.  So if you depend on a
precise version of a library you will no longer be subject to the risk of
someone putting something else in place there.  We are still however
dealing with having to download, compile and link the thing.  The number
and size of dependencies has been particularly frustrating for me in
JavaScript but it's also definitely a concern in Rust where even the
smallest app quickly has north of 100 dependencies.

Our [symbolicator](https://github.com/getsentry/symbolicator) project
written in Rust currently has 303 unique dependencies.  Some of these are
duplicates due to different versions being used.  For instance we depend
on `rand 0.4` [^1], `rand 0.5`, `rand 0.6` and `rand 0.7` and there a few more
cases like this.  But even if we remove all of this we still have 280
unique package names involved.

Currently I'm in the situation that I can just pray that when I run `cargo
update` the release is clean.  There is no realistic way for me to audit
this at all.

[^1]: One thing of note here is that rand is a bit special in that some
older rand versions will depend on newer ones so that they use the same
internals.  This is a trick that is also used by the libc library in
Rust.  For the purpose of the number of dependencies this optimization
however does not help much.

## Why we have Dependencies

We use dependencies because they are useful in general.  For instance
symbolicator would not exist if it could not benefit from a huge number of
code written by other people, a lot we contribute to.  This means the
entire community benefits from this.  Rust probably some of the best DWARF
and PDB libraries in existence now as a result of many different people
contributing to the same cause.  Those libraries in turn are sitting on
top of very powerful binary reading and manipulation libraries which are a
good thing not to be reinvented all over the place.

A quite heated discussion [^2] on Twitter emerged the last few days about the
danger and cost of dependencies among some Rust developers.  One of the
arguments that was brought up in support of dependencies was that software
for non English speakers is mostly so terrible because people chose to
reinvent the world instead of using third party libraries that handle
things like localization and text input.  I absolutely agree with this —
some problems are just too large not to be put into a common dependency.

So clearly dependencies are something we do not want to get rid of.  But
we also need to live with the downsides they bring.

[^2]: The thread on twitter with various different view points on this
issue can be found here: [https://twitter.com/pcwalton/status/1155881388106821632](https://twitter.com/pcwalton/status/1155881388106821632)

## The Goal: Auditing

The number of dependencies and the automatic way by which people generally
update them through semver in minor releases introduces a lot of unchecked
code changes.  It's not realistic to think that everything can be reviewed
but compared to our Python code base we bump dependencies in Rust (and
JavaScript) a lot more freely and without a lot of care because that's
what the ecosystem is optimized towards.

My current proposal to deal with this would be to establish a secondary
system where auditors can be established that you can pin groups of
packages against.  Such an auditor would audit new releases of packages
monitor primarily for just one property: that what's on Github is what's
in the package that made it to the registry.

Here a practical example of how this could work: symbolicator currently
has 18 `tokio-*` dependencies.  Imagine all of these were audited by a
"tokio auditor".  An imaginary workflow could be something like having a
registry of auditors and their packages stored on a registry (in this case
crates.io).  In addition to a lock file there would be an audit file (eg:
`Cargo.audit`) which contains the list of all used auditors and for which
packages they are used.  Then whenever the dependency resolution algorithm
runs it only accepts packages up to the latest audited version and it
skips over versions that were never audited.

This could reduce the total amount of people one needs to trust
tremendously.  For instance all the tokio packages could be audited by one
group.  Now how is this different than the current de-facto world where
all tokio packages are published by the same group of people anyways?  The
biggest difference immediately would be that that just because a package
starts with `tokio-` does not mean it comes from the tokio developers.
Additionally one does not have to trust just this group.  For instance
larger companies could run their own audits centrally for all packages
that they use which can then be used across the organization.

What matters here is the user experience.  Rust has an amazing packaging
tool with `cargo` and what makes it so convenient are all the helpers
around it.  If we have an auditing tool where auditing our dependencies
becomes an interactive process which gives us all the dependencies
currently involved which are not audited, can link us to the release in
github, show us the differences in the published cargo package compared to
the source repository and more I would feel a lot less worried about the
dependency count.

## Secondary Goal: Understanding Micro-Dependencies

That however is only half the solution in my book.  The second one is the
cognitive overhead of all those micro-dependencies.  They come with an extra
problem which is that every one of them carries a license, even if they
are only a single line.  If you want to distribute code to an end user you
need to ship all those licenses even though it's not quite sure if a
function like `left-pad` even constitutes enough intellectual property to
carry a license file.

I wonder if the better way to deal with those micro-dependencies is to call
them out for what they are and add a separate category of these.  It's
quite uninformative to hear that one's application has 280 dependencies
because that does not account for much if it each of these dependencies
can be a single line or a hundred thousand line behemoth.  If instead we
would start breaking down our packages into categories at installation and
audit time this could help us understand our codebases better.

Ideally the audit and installation/compilation process can tell us how
many packages are leaf packages, how many are below a certain line count,
how many use unsafe in their own codebase and tag them appropriately.
This could give us a better understanding of what we're dealing with and
how to deal with updates.

## Why do we update?

Overall most of the reasons why I update dependencies in Python have been:
bug fixed or security issue encountered.  I never proactively upgraded
packages.  In Rust and JavaScript on the other hand for some reason I
started upgrading the whole time.  The biggest reason for this has been
inter-package dependencies and without upgrading everything to latest one
ends up dragging multiple versions of the same library around.

This is what worries me the most.  We started to update dependencies
because it's easy, not because it's a good idea.  One should update
dependencies but an update should have a cost.

For instance for micro-dependencies I really do not want to install updates
ever.  The chance that there is a security vulnerability in `isArray` that
is fixed in an update is impossibly small.  As such I would like to skip
them entirely in updates unless a CVE is filed against it, in which case I
probably want to be notified about it.

On the other hand large and very important direct dependencies in my
system (like frameworks) I probably do want to update regularly.  The
thought process here is that skipping versions typically makes it harder
to upgrade later and security fixes will only go into some of the newer
versions.  Staying on old versions for too long has clear disadvantages.

Understanding best practices for reviewing and updating might be
interesting to analyze and could tell us write better tools to work with
dependencies.

## Hacking The Package Manager

One of the things that might be interesting for toying around would be to
make the dependency resolution process in package managers hook-able.  For
instance it would be very interesting if `cargo` or `yarn` could shell out
to a configured tool which takes the resolved dependencies which are in
the registry and can blacklist some.  That way separate tools could be
developed that try various approaches for auditing dependencies without
those having to become part of the core package manager until the
community has decided on best practices.

Theoretically one could do this entirely separately from the package
manager by using third party tools to emit lock files but considering how
the main build chain overrides lock files if the source dependencies
change it might be too easy to get this wrong accidentally.

Such a hook for instance could already be used to automatically consult
[rustsec](https://crates.io/crates/rustsec) to blacklist package
versions with security vulnerabilities.
