---
tags: ['thoughts', 'python', 'deployment']
summary: "A quick overview into wheel based Python deployments."
---

# Python on Wheels

The python packaging infrastructure has long received criticism from both
Python developers as well as system administrators.  For a long time even
the Python community in itself could not agree on what exactly the tools
to use were.  We had distutils, setuptools, distribute, distutils2 as
basic distribution mechanisms and then virtualenv, buildout, easy_install
and pip as high level tools to deal with this mess.

As distribution formats before setuptools we had source files and for
Windows there were some binary distributions in form of MSIs.  On Linux we
had `bdist_dumb` which was historically broken and `bdist_rpm` which
only worked on Red Hat based systems.  But even `bdist_rpm` did not
actually work good enough that people were actually using it.

A few years ago PJE stepped up and tried to fix the initial distribution
problems by providing the mix of setuptools + pkg_resources to improve
distutils and to provide metadata for Python packages.  In addition to
that he wrote the easy_install tool to install packages.  In lack of a
distribution format that supported the required metadata, the egg format
was invented.

Python eggs are basically zip packages that include the python package
plus the metadata that is required.  Even though many people probably
never built eggs intentionally, the egg metadata is still alive and
kicking and everybody deploys things through setuptools now.

Now unfortunately a few years ago the community split in half and part of
the community declared the death to binary distributions and eggs.  When
that happened the replacement for easy_install (pip) stopped accepting
eggs altogether.

Fast forward a few years later.  The removal of binary distributions has
become noticed very painfully as people started more and more cloud
deployment and having to recompile C libraries on every single machine is
no fun.  Because eggs at that point were poorly understood I assume, they
were reimplemented on top of newer PEPs and called [wheels](http://www.python.org/dev/peps/pep-0427/).

As a general information before we dive in: I'm assuming that you are in
all cases operating out of a virtualenv.

## What are Wheels

So let's start simple.  What exactly are wheels and what's the difference
to eggs?  Both eggs and wheels are basically just zip files.  The main
difference is that you could import eggs without having to unpack them.
Wheels on the other hand are just distribution archives that you need to
unpack upon installation.  While there are technically no reasons for
wheels not to be importable, that was never the plan to begin with and
there is currently no support for importing wheels directly.

The other main difference is that eggs included compiled python bytecode
whereas wheels do not.  The biggest advantage of this is that you don't
need to make wheels for different Python versions for as long as you don't
ship binary modules that link against libpython.  On newer Python 3
versions you can actually even safely link against libpython for as long
as you only use the stable ABI.

There are a few problems with wheels however.  One of the problems is that
wheels inherit some of the problems that egg already had.  For instance
Linux binary distributions are still not an option for most people because
of two basic problems: Python itself being compiled in different forms on
Linux and modules being linked against different system libraries.  The
first problem is caused by Python 2 coming in two flavours that are both
incompatible to each other: UCS2 Pythons and UCS4 Pythons.  Depending on
which mode Python is compiled with the ABI looks different.  Presently the
wheel format (from what I can tell) does not annotate for which Python
unicode mode a library is linked.  A separate problem is that Linux
distributions are less compatible to each other as you would wish and
concerns have been brought up that wheels compiled on one distribution
will not work on others.

The end effect of this is that you presently cannot upload binary wheels
to PyPI on concerns of incompatibility with different setups.

In addition to that wheel currently only knows two extremes: binary
packages and pure Python packages.  When something is a binary package
it's specific to a Python version on 2.x.  Right now that's actually not
the worst thing in the world because Python 2.x is end of life and we
really only need to build packages for 2.7 for a long time to come.  If
however we would start considering Python 2.8 then it would be interesting
to have a way to say: this package is Python version independent but it
ships binaries so it needs to be architecture specific.

The reason why you might have a package like this are packages that ship
shared libraries loaded with ctypes of CFFI.  These libraries do not link
against libpython and as such would work cross Python (even cross Python
implementation which means you can use them with pypy).

On the bright side: nothing stops yourself from using binary wheels for
your own homogenous infrastructure.

## Building Wheels

So now that you know what a wheel is, how do you make one?  Building a
wheel out of your own libraries is a very straightforward process.  All
you need to do is using a recent version of `setuptools` and the
`wheel` library.  Once you have both installed you can build a wheel out
of your package by running this command:

```
$ python setup.py bdist_wheel
```

This will throw a wheel into your distribution folder.  There are however
one extra things you should be aware of and that's what happens if you
ship binaries.  By default the wheel you build (assuming you don't use any
binary build steps as part of your setup.py) is to produce a pure Python
wheel.  This means that even if you ship a `.so`, `.dylib` or `.dll`
as part of your package data the wheel spit out will look like it's
platform independent.

The solution for this problem is to manually subclass the setuptools
distribution to flip the purity flag to false:

```python
import os
from setuptools import setup
from setuptools.dist import Distribution

class BinaryDistribution(Distribution):
    def is_pure(self):
        return False

setup(
    ...,
    include_package_data=True,
    distclass=BinaryDistribution,
)
```

## Installing Wheels

Now you have a wheel, how do you install it?  On a recent pip version you
can install it this way:

```
$ pip install package-1.0-cp27-none-macosx_10_7_intel.whl
```

But what about your dependencies?  This is what it gets a bit tricker.
Generally what you would want is to install a package without ever
connecting to the internet.  Pip thankfully supports that by disabling
downloading from an index and by providing a path to a folder for all the
things it needs to install.  So assuming you have all the wheels for all
your dependencies in just the right version available, you can do this:

```
$ pip install --no-index --find-links=path/to/wheels package==1.0
```

This will then install the `1.0` version of `package` into your
virtualenv.

## Wheels for Dependencies

Alright, but what if you don't have the wheels for your dependencies?  Pip
in theory supports doing that through the `wheel` command.  In theory
this is supposed to work:

```
pip wheel --wheel-dir=path/to/wheels package==1.0
```

In this case wheel will throw all packages that package depends on into
the given folder.  There are two problems with this.

The first one is that the command currently has a bug and does not
actually throw dependencies into the wheel folder if the dependencies are
already wheels.  What the command is supposed to do is to collect all the
dependencies and the convert them into wheels if necessary and then places
them in the wheel folder.  What's actually happening though is that it
only places wheels there for things that were not wheels to begin with.
So if a dependency is already available as a wheel on PyPI then pip will
skip it and not actually put it there.

The workaround is a shell script that goes through the download cache and
manually moves downloaded wheels into the wheel directory:

```
#!/bin/sh
WHEEL_DIR=path/to/wheels
DOWNLOAD_CACHE_DIR=path/to/cache
rm -rf $DOWNLOAD_CACHE_DIR
mkdir -p $DOWNLOAD_CACHE_DIR

pip wheel --use-wheel -w "$WHEEL_DIR" -f "$WHEEL_DIR" \
  --download-cache "$DOWNLOAD_CACHE_DIR" package==1.0
for x in "$DOWNLOAD_CACHE_DIR/"*.whl; do
  mv "$x" "$WHEEL_DIR/${x##*%2F}"
done
```

The second problem is more severe.  How can pip wheel find your own
package if it's not on PyPI?  The answer is: it cannot.  So what the
documentation generally recommends is to not run `pip wheel package` but
to run `pip wheel -r requirements.txt` where `requirements.txt`
includes all the dependencies of the package.  Once that is done, manually
copy your own package's wheel in there and distribute the final wheel
folder.

## DevPI Based Package Building

That workaround with depending on the requirements certainly works in
simple situations, but what do you do if you have multiple in-house Python
packages that depend on each other?  It quickly falls apart.

Thankfully Holker Krekel sat down last year and build a solution for this
problem called [devpi](http://doc.devpi.net/).  DevPI is essentially a
practical hack around how pip interacts with PyPI.  Once you have DevPI
installed on your own computer it acts as a transparent proxy in front of
PyPI and you can point pip to install from your local DevPI server instead
of the public PyPI.  Not only that, it also automatically caches all
packages downloaded from PyPI locally so even if you kill your network
connection you can continue downloading those packages as if PyPI was
still running.  In addition to being a proxy you can also upload your own
packages into that local server so once you point pip to that server it
will both find public packages as well as your own ones.

In order to use DevPI I recommend making a local virtualenv and installing
it into that and then linking `devpi-server` and `devpi` into your
search path (in my case `~/.local/bin` is on my `PATH`):

```
$ virtualenv devpi-venv
$ devpi-venv/bin/pip install --ugprade pip wheel setuptools devpi
$ ln -s `pwd`/devpi-venv/bin/devpi ~/.local/bin
$ ln -s `pwd`/devpi-venv/bin/devpi-server ~/.local/bin
```

Afterwards all you need to do is to start devpi-server and it will
continue running until you shut it down or reboot your computer:

```
$ devpi-server --start
```

Once it's running you need to initialize it once:

```
$ devpi use http://localhost:3141
$ devpi user -c $USER password=
$ devpi login $USER --password=
$ devpi index -c yourproject
```

In this case because I use DevPI locally for myself only I use the same
name for the DevPI user as I use for my system.  As the last step I create
an index named after my project.  You can have multiple indexes next to
each other to separate your work.

To point pip to your DevPI you can export an environment variable:

```
$ export PIP_INDEX_URL=http://localhost:3141/$USER/yourproject/+simple/
```

Personally I place this in the `postactivate` script of my virtualenv to
not accidentally download from the wrong DevPI index.

To place your own wheels on your local DevPI you can use the `devpi`
binary:

```
$ devpi use yourproject
$ devpi upload --no-vcs --formats=bdist_wheel
```

The `--no-vcs` flag disables some magic in DevPI which tries to detect
your version control system and moves some files off first.  Personally
this does not work for me because I ship files in my projects that I do
not want to put into version control (like binaries).

Lastly I would strongly recommend breaking your `setup.py` files in a
way that PyPI will reject them but DevPI will accept them to not
accidentally release your code with `setup.py release`.  The easiest way
to accomplish this is to add an invalid PyPI trove classifier to your
setup.py:

```python
setup(
    ...
    classifier=['Private :: Do Not Upload'],
)
```

## Wrapping it Up

Now with all that done you can start inter depending on your own private
packages and build out wheels in one go.  Once you have that, you can zip
them up and upload them to another server and install them into a separate
virtualenv.

All in all this whole process will get a bit simpler when the `pip
wheel`  command stops ignoring already existing wheels.  Until then, a
shell script is not the worst workaround.

## Comparing to Eggs

Wheels currently seem to have more traction than eggs.  The development is
more active, PyPI started to add support for them and because all the
tools start to work for them it seems to be the better solution.  Eggs
currently only work if you use easy_install instead of pip which seems to
be something very few people still do.

I assume the Zope community is still largely based around eggs and
buildout and I assume if an egg based deployment works for you, then
that's the way to go.  I know that many did not actually use eggs at all
to install Python packages and instead built virtualenvs, zipped them up
and sent them to different servers.  For that kind of deployment, wheels
are definitely a much superior solution because it means different servers
can have the libraries in different paths.  This previously was an issue
because the `.pyc` files were created on the build server for the
virtualenv and the `.pyc` files include the filenames.

With wheels the `.pyc` files are created upon installation into the
virtualenv and will automatically include the correct paths.

So there you have it.  Python on wheels.  It's there, it kinda works, and
it's probably worth your time.
