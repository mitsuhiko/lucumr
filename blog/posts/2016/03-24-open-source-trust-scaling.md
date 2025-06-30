---
tags:
  - thoughts
  - opensource
  - javascript
summary: "Some thoughts about why npm style micro-packages are a huge liability for
everybody and what we could do to make them work."
---

# Micropackages and Open Source Trust Scaling

Like everybody else this week [we](https://www.getsentry.com/) had fun
with [the pad-left disaster](http://www.haneycodes.net/npm-left-pad-have-we-forgotten-how-to-program/).
We're from the Python community and our exposure to the node ecosystem is
primarily for the client side.  We're big fans of the ecosystem that
develops around react and as such quite a bit of our daily workflow
involves npm.

What frustrated me personally about this conversation that took place over
the internets about the last few days however has nothing to do with npm,
the guy who deleted his packages, any potential trademark disputes or the
supposed inability of the JavaScript community to write functions to pad
strings.  It has more to do with how the ecosystem evolving around npm has
created the most dangerous and irresponsible environment which in many
ways leaves me scared.

My opinion very quickly went from “[Oh that's funny](https://twitter.com/mitsuhiko/status/712429716356124673)” to
“[This concerns me](https://twitter.com/mitsuhiko/status/712430645671280640)”.

## Dependency Explosion

When "pad left" disaster stroke I had a brief look at Sentry's dependency
tree.  I should probably have done that before but for as long things work
you don't really tend to do that.  At the time of writing we have 39
dependencies in our `package.json`.  These dependencies are strongly
vetted in the sense that we do not include anything there we did not
investigate properly.  What however we cannot do, is also to investigate
every single dependency there is.  The reason for this is how these node
dependencies explode.  While we have 39 direct dependencies, we have more
than a thousand dependencies in total as it turns out.

To give you a comparison: the Sentry backend (Sentry server) has 45 direct
dependencies.  If you resolve all dependencies and install them as well
you end up with a total of 65 packages which is significantly less.  We
only get a total of 20 packages over what we depend on ourselves.  The
typical Python project would be similar.  For instance the Flask framework
depends on three (soon to be four with Click added) other packages:
Werkzeug, Jinja2 and itsdangerous.  Jinja2 additionally depends on
MarkupSafe.  All of those packages are written by the same author however
but split into rough responsibilities.

Why is that important?

- dependencies incur cost.

- every dependency is a liability.

## The Cost of Dependencies

Let's talk about the cost of dependencies first.  There are a few costs
associated with every dependency and most of you who have been programming
for a few years will have encountered this.

The most obvious costs are that packages need to be downloaded from
somewhere.  This corresponds to direct cost.  The most shocking example I
encountered for this is the [isarray](https://www.npmjs.com/package/isarray)
npm package.  It's currently being downloaded short of 19 million times a
month from npm.  The entire contents of that package can fit into a single
line:

```javascript
module.exports = Array.isArray || function(a) { return {}.toString.call(a) == '[object Array]' }
```

However in addition to this stuff there is a bunch of extra content in it.
You actually end up downloading a 2.5KB tarball because of all the extra
metadata, readme, license file, travis config, unittests and makefile.  On
top of that npm adds 6KB for its own metadata.  Let's round it to 8KB that
need to be downloaded.  Multiplied with the total number of downloads last
month the node community downloaded 140GB worth of isarray.  That's half
of the monthly downloads of what Flask achieves measured by size.

The footprint of Sentry's server component is big when you add up all the
dependencies.  Yet the entire installation of Sentry from pypi takes about
30 seconds including compiling lxml.  Installing the over 1000
dependencies for the UI though takes I think about 5 minutes even though
you end up with a fraction of the code afterwards.  Also the further you
are away from the npm CDN node the worse the price for the network
roundtrip you pay.  I threw away my node cache for fun and ran npm install
on Sentry.  Takes about 4.5 minutes.  And that's with good latency to npm,
on a above average network connect and a top of the line Macbook Pro with
an SSD.  I don't want to know what the experience is for people on
unreliable network connections.  Afterwards I end up with 165MB in
`node_modules`.  For comparison the entirety of the Sentry's backend
dependencies on the file system and all metadata is 60MB.

When we have a thousand different dependencies we have a thousand
different licenses and copyright files.  Really makes me wonder what the
license screen of a node powered desktop application would look like.  But
it's not also a thousand licenses, it's a huge number of independent
developers.

## Trust and Auditing

This leads me to what my actual issue with micro-dependencies is: we do not
have trust solved.  Every once in a while people will bring up how we all
would be better off if we PGP signed our Python packages.  I think what a
lot of people miss in the process is that signatures were never a
technical problem but a trust and scaling problem.

I want to give you a practical example of what I mean with this.  Say you
build a program based on the Flask framework.  You pull in a total of 4-5
dependencies for Flask alone which are all signed off my me.  The attack
vector to get untrusted code into Flask is:

- get a backdoor into a pull request and get it merged

- steal my credentials to PyPI and publish a new release with a backdoor

- put a backdoor into one of my dependencies

All of those attack vectors I cover.  I use my own software, monitor what
releases are PyPI which is also the only place to install my software
from.  I 2FA all my logins where possible, I use long randomly generated
passwords where I cannot etc.  None of my libraries use a dependency I do
not trust the developer of.  In essence if you use Flask you only need to
trust me to not be malicious or idiotic.  Generally by vetting me as a
person (or maybe at a later point an organization that releases my
libraries) you can be reasonably sure that what you install is what you
expect and not something dangerous.  If you develop large scale Python
applications you can do this for all your dependencies and you end up with
a reasonably short list.  More than that.  Because Python's import system
is very limited you end up with only one version of each library so when
you want to go in detail and sign off on releases you only need to do it
once.

Back to Sentry's use of npm.  It turns out we have four different versions
of the same query string library because of different version pinning by
different libraries.  Fun.

Those dependencies can easily end up being high value targets because of
how few people know about them.  juliangruber's "isarray" has 15 stars on
github and only two people watch the repository.  It's downloaded 18
million times a month.  Sentry depends on it 20 times.  14 times it's a
pin for `0.0.1`, once it's a pin for `^1.0.0` and 5 times for
`~1.0.0`.  Any pin for anything other than a strict version match is a
disaster waiting to happen if someone would manage to push out a point
release for it by stealing juliangruber's credentials.

Now one could argue that the same problem applies if people hack my
account and push out a new Flask release.  But I can promise you I will
notice a release from one of my ~5 libraries because of a) I monitor those
packages, b) other people would notice a release.  I doubt people would
notice a new isarray release.  Yet `isarray` is not sandboxed and runs
with the same rights as the rest of the code you have.

For instance sindresorhus [maintains 827 npm packages](https://www.npmjs.com/~sindresorhus).  Most of which are probably one
liners.  I have no idea how good his opsec is, but my assumption is that
it's significantly harder for him to ensure that all of those are actually
his releases than it is for me as I only have to look over a handful.

## Signatures

There is a common talk that package signatures would solve a lot of those
issues but at the end of the day because of the trust we get from PyPI and
npm we get very little extra security from a package signature compared to
just trusting the username/password auth on package publish.

Why package signatures are not the holy grail was [covered by Donald
Stufft](https://caremad.io/2013/07/packaging-signing-not-holy-grail/)
aka Mr PyPI.  You should definitely read that since he's describing the
overarching issue much better than I could ever do.

## Future of Micro-Dependencies

To be perfectly honest:  I'm legitimately scared about node's integrity
of the ecosystem and this worry does not go away.  Among other things I'm
using keybase and keybase uses unpinned node libraries left and right.
keybase has 225 node dependencies from a quick look.  Among those many
partially pinned one-liner libraries for which it would be easily enough
to roll out backdoor update if one gets hold of credentials.

*Update: it has been pointed out that keybase shrinkwrapped in the node
client and that the new client is written in Go.* [Source](https://twitter.com/maxtaco/status/713037656255557632)

If micro-dependencies want to have a future then something must change in
npm.  Maybe they would have to get a specific tag so that the system can
automatically run automated analysis to spot unexpected updates.  Probably
they should require a CC0 license to simplify copyright dialogs etc.

But as it stands right now I feel like this entire thing is a huge
disaster waiting to happen and if you are not using node shrinkwrap yet
you better get started quickly.
