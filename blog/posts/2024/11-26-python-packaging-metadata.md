---
tags:
  - python
summary: "Some of the issues of why Python packaging is unnecessarily hard."
---

# Constraints are Good: Python's Metadata Dilemma

There is currently an effort underway to build a new universal lockfile
standard for Python, most of which is taking place on the Python
discussion forum.  This initiative has highlighted the difficulty of
creating a standard that satisfies everyone.  It has become clear that
different Python packaging tools are having slightly different ideas in
mind of what a lockfile is supposed to look like or even be used for.

In those discussions however also a small other aspect re-emerged: Python
has a metadata problem.  Python's metadata system is too complex and
suffers from what I would call “lack of constraints”.

## JavaScript: Example of Useful Constraints

JavaScript provides an excellent example of how constraints can simplify
and improve a system.  In JavaScript, metadata is straightforward.
Whether you develop against a package locally or if you are using a
package from npm, metadata represents itself the same way.  There is a
single `package.json` file that contains the most important metadata of a
package such as `name`, `version` or `dependencies`.  This simplicity
imposes significant but beneficial constraints:

- There is a 1:1 relationship between an npm package and its metadata.
Every npm package has a single `package.json` file that is the source of
truth of metadata.  Metadata is trivially accessible, even
programmatically, via `require('packageName/package.json')`.

- Dependencies (and all other metadata) are consistent across platforms
and architectures.  Platform-specific binaries are handled via a filter
mechanism (`os` and `cpu`) paired with `optionalDependencies`. [^1]

- All metadata is static, and updates require explicit changes to
`package.json` prior to distribution or installation.  Tools are
provided to manipulate that metadata such as `npm version patch`
which will edit the file in-place.

These constraints offer several benefits:

- Uniform behavior regardless of whether a dependency is installed locally
or from a remote source.  There is not even a filesystem layout difference
between what comes from git or npm.  This enables things like replacing
an installed dependency with a local development copy, without change in
functionality.

- There is one singular source of truth for all metadata.  You can edit
`package.json` and any consumer of that metadata can just monitor that
file for changes.  No complex external information needs to be
consulted.

- Resolvers can rely on a single API call to fetch dependency metadata for
a version, improving efficiency.  Practically this also means that the
resolver only needs to hit a single URL to retrieve all possible
dependencies of a dependency. [^2]

- It makes auditing much easier because there are fewer moving parts and
just one canonical location for metadata.

## Python: The Cost of Too Few Constraints

In contrast, Python has historically placed very few constraints on
metadata.  For example, the old `setup.py` based build system essentially
allowed arbitrary code execution during the build process.  At one point
it was at least strongly suggested that the `version` produced by that
build step better match what is uploaded to PyPI.  However, in practice,
if you lie about the version that is okay too.  You could upload a source
distribution to PyPI that claims it's `2.0` but will in fact install
`2.0+somethinghere` or a completely different version entirely.

What happens is that both before a package is published to PyPI and when a
package is installed locally after downloading, the metadata is generated
from scratch.  Not only does that mean the metadata does not have to
match, it also means that it's allowed to be completely different.  It's
absolutely okay for a package to claim it depends on `cool-dependency` on
your machine, but on `uncool-dependency` on my machine.  Or to dependent
on different packages depending on the time of the day of the phase of the
moon.

Editable installs and caching are particularly problematic since metadata
could become invalid almost immediately after being written. [^3]

Some of this has been somewhat improved because the new `pyproject.toml`
standard encourages static metadata.  However build systems are entirely
allowed to override that by falling back to what is called “dynamic
metadata” and this is something that is commonly done.

In practice this system incurs a tremendous tax to everybody that can be
easily missed.

- **Disjointed and complex metadata access:** there is no clear
relationship of PyPI package name and the installed Python modules.
If you know what the PyPI package name is, you can access metadata via
`importlib.metadata`.  Metadata is not read from `pyproject.toml`,
even if it's static, instead it takes the package name and it accesses
the metadata from the `.dist-info` folder (most specifically the
`METADATA` file therein) installed into `site-packages`.

- **Mandatory metadata re-generation:** As a consequence if you edit
`pyproject.toml` to edit a piece of metadata, you need to re-install the
package for that metadata to be updated in the `.dist-info`.  People
commonly forget doing that, so desynchronized metadata is very common.
This is true even for static metadata today!

- **Unclear cache invalidation:** Because metadata can be dynamic, it's not
clear when you should automatically re-install a package.  It's not
enough to just track `pyproject.toml` for changes when dynamic metadata
is used.  `uv` for instance has a really complex, explicit [cache
management system](https://docs.astral.sh/uv/concepts/cache/#dynamic-metadata) so one
can help uv detect outdated metadata.  This obviously is
non-standardized, requires uv to understand version control systems and
is also not shared with other tools.  For instance if you know that the
version information incorporates the git hash, you can tell uv to pay
attention to git commits.

- **Fragmented metadata storage:** even where generated metadata is stored
is complex.  Different systems have slightly different behavior for
storing that metadata.

  - When working locally (eg: editable installs) what happens depends
on the build system:

    - If `setuptools` is used, metadata written into two locations.
The legacy
`<PACKAGE_NAME>.egg-info/PKG-INFO` file.  Additionally it's placed
in the new location for metadata inside `site-packages` in a
`<PACKAGE_NAME>.dist-info/METADATA` file.

    - If `hatch` and most other modern build systems are used, metadata is
only written into `site-packages`. (into
`<PACKAGE_NAME>.dist-info/METADATA`)

    - If no build system is configured it depends a bit on the
installer.  pip will even for an editable install build a
wheel with `setuptools`, `uv` will only build a wheel and make
the metadata available if one runs `uv build`.  Otherwise the
metadata is not available (in theory it could be found in
`pyproject.toml` for as long as it's not dynamic).

  - For source distributions (`sdist`) first the build step happens as
in the section before.  Afterwards the metadata is thrown into a
`PKG-INFO` file.  It's currently placed in two locations in the
`sdist`: `PKG-INFO` in the root and `<PACKAGE_NAME>.egg-info/PKG-INFO`.
That metadata however I believe is only used for PyPI, when
installing the `sdist` locally the metadata is regenerated from
`pyproject.toml` (or if setuptools is used `setup.py`).  That's
also why metadata can change from what's in the sdist to what's
there after installation.

  - For wheels the metadata is placed in
`<PACKAGE_NAME>.dist-info/METADATA` exclusively.  Wheels have
static metadata, so no build step is taking place.  What is in the
wheel is always used.

- **Dynamic metadata makes resolvers slow:** Dynamic metadata makes the
job of resolvers and installers very hard and slows them down.  Today
for instance advanced resolvers like poetry or uv sometimes are not able
to install the right packages, because they assume that dependency
metadata is consistent across sdists and wheels.  However there are a
lot of sdists available on PyPI that publish incomplete dependency
metadata (just whatever the build step for the sdist created on the
developer's machine is what is cached on PyPI).

Not getting this right can be the difference of hitting one static URL
with all the metadata, and downloading a zip file, creating a
virtualenv, installing build dependencies, generating an entire sdist
and then reading the final generated metadata.  Many orders of magnitude
difference in time it takes to execute.

This also extends to caching.  If the metadata can constantly change,
how would a resolver cache it?  Is it required to build all possible
source distributions to determine the metadata as part of resolving?

- **Cognitive complexity:** The system introduces an enormous cognitive
overhead which makes it very hard to understand for users, particularly
when things to wrong.  Incorrectly cached metadata can be almost
impossible to debug for a user because they do not understand what is
going on.  Their `pyproject.toml` shows the right information, yet for
some reason it behaves incorrectly.  Most people don't know what "egg
info" or "dist info" is.  Or why an sdist has metadata in a different
location than a wheel or a local checkout.

Having support for dynamic metadata also means that developers continue
to maintain elaborate and confusing systems.  For instance there is a
plugin for hatch that dynamically creates a readme [^4], requiring even
arbitrary Python code to run to display documentation.  There are
plugins to automatically change versions to incorporate git version
hashes.  As a result to figure out what version you actually have
installed it's not just enough to look into a single file, you might
have to rely on a tool to tell you what's going on.

## Moving The Cheese

The challenge with dynamic metadata in Python is vast, but unless you are
writing a resolver or packaging tool, you're not going to experience the
pain as much.  You might in fact quite enjoy the power of dynamic
metadata.  Unsurprisingly bringing up the [idea to remove it](https://discuss.python.org/t/brainstorming-eliminating-dynamic-metadata/71405)
is very badly received.  There are so many workflows seemingly relying on it.

At this point fixing this problem might be really hard because it's a
social problem more than a technical one.  If the constraint would have
been placed there in the first place, these weird use cases would never
have emerged.  But because the constraints were not there, people were
free to go to town with leveraging it with all the consequences it causes.

I think at this point it's worth moving the cheese, but it's unclear if
this can be done through a standard.  Maybe the solution will be for tools
like `uv` or `poetry` to warn if dynamic metadata is used and strongly
discourage it.  Then over time the users of packages that use dynamic
metadata will start to urge the package authors to stop using it.

The cost of dynamic metadata is real, but it's felt only in small ways all
the time.  You notice it a bit when your resolver is slower than it has
to, you notice it if your packaging tool installs the wrong dependency,
you notice it if you need to read the manual for the first time when you
need to reconfigure your cache-key or force a package to constantly
reinstall, you notice it if you need to re-install your local dependencies
over and over for them not to break.  There are many ways you notice it.
You don't notice it as a roadblock, just as a tiny, tiny tax.  Except that
is a tax we all pay and it makes the user experience significantly worse
compared to what it could be.

The deeper lesson here is that if you give developers too much
flexibility, they will inevitably push the boundaries and that can have
significant downsides as we can see.  Because Python's packaging ecosystem
lacked constraints from the start, imposing them now has become a daunting
challenge.  Meanwhile, other ecosystems, like JavaScript's, took a more
structured approach early on, avoiding many of these pitfalls entirely.

[^1]: You can see how this works in action for `sentry-cli` for instance.
The `@sentry/cli` package declares all its platform specific
dependencies as `optionalDependencies` (relevant [package.json](https://github.com/getsentry/sentry-cli/blob/e08b23ac693e8c6f24517973ca4936643b70ccd7/package.json#L33C7-L39)).
Each platform build has a filter in its `package.json` for `os` and
`cpu`.  For instance this is what the arm64 linux binary dependency
looks like: [package.json](https://github.com/getsentry/sentry-cli/blob/e08b23ac693e8c6f24517973ca4936643b70ccd7/npm-binary-distributions/linux-arm64/package.json#L13-L19).
npm will attempt to install all optional dependencies, but it will skip
over the ones that are not compatible with the current platform.

[^2]: For `@sentry/cli` at version 2.39.0 for instance this means that
this singular URL will return all the information that a resolver
needs: [registry.npmjs.org/@sentry/cli/2.39.0](https://registry.npmjs.org/@sentry/cli)

[^3]: A common error in the past was to receive a `pkg_resources.DistributionNotFound`
exception when trying to run a script in local development

[^4]: I got some [flak on Bluesky](https://bsky.app/profile/hynek.me/post/3lbvwswpfwc2y)
for throwing readme generators under the bus.  While they do not
present the same problem when it comes to metadata like dependencies
and versions do, they do still increase the complexity.  In an ideal
world what you find in site-packages represents what you have in your
version control and there is a `README.md` file right there.  That's
what you have in JavaScript, Rust and plenty of other ecosystems.  What
we have however is a build step (either dynamic or copying) taking that
readme file, and placing it in a RFC 5322 header encoded file in a dist
info.  So instead of "command clicking" on a dependency and finding the
readme, we need special tools or arcane knowledge if we want to read
the readme files locally.
