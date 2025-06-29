tags: [python, thoughts]
summary: |
  A sad example of how easy it is to dismiss certain design principles
  because it does not seem relevant at the time.

Python Packaging: Hate, hate, hate everywhere
=============================================

I admit that I was a huge fan of the Python setuptools library for a long
time.  There was a lot in there which just resonated with how I thought
that software development should work.  I still think that the *design* of
setuptools is amazing.  Nobody would argue that setuptools was flawless
and it certainly failed in many regards.  The biggest problem probably was
that it was build on Python's idiotic import system but there is only so
little you can do about that.  In general setuptools took the realistic
approach to problem-solving: do the best you can do by writing a piece of
software scratches the itch without involving a committee or require
language changes.  That also somewhat explains the second often cited
problem of setuptools: that it's a monkeypatch on distutils.

**Update**: I rarely do updates on my articles but I want to make one
thing very clear: the point of this is not to complain about any of the
established tools for package management in Python.  For a long I did not
care about binary distributions because I never had the use case, so I did
not even notice that pip did not provide them.  Then suddenly the use case
came up and I realized that pip removed functionality from plain
setuptools and it's very hard (impossible for myself) to bring it back.
It's more of an observation how easy it is to miss use cases when
replacing tools with something else.

Setuptools Recap
----------------

For the few Python guys that don't know what setuptools is or why it
exists, let me provide you with a very basic recap of what it originally
wanted to do.  Back in the days someone (and I really don't know who)
added a system called “distutils” to Python.  The purpose of that library
was to provide functionality to distribute Python libraries.  And for its
existence we should all be really glad because besides all it's faults it
is still providing us with some of the most important bits of Python
package distribution.  In a nutshell: distutils can make tarballs of
Python code, provides you with some simple helpers that help you make an
installation script and also knows how to invoke compilers.

What distutils did not do was handling metadata and that's pretty much the
reason it exists in the first place.  Without metadata there is no
dependency tracking.  While this is only partially true because there was
a very limited amount of metadata even before setuptools available, that
metadata disappeared once the library was installed.

Now to understand why adding metadata is not so trivial with regular
Python libraries we first have to understand pth files.

PTH: The failed Design that enabled it all
------------------------------------------

I honestly don't know when .pth files were added to Python but I have a
theory: I think they were added to make it possible to migrate from
modules to packages.  At least that would explain why PIL was distributed
the way it was.  PIL for a long time (and probably still is) was putting a
folder called `PIL` into site packages.  However as everybody that worked
with PIL knows, you're not importing from the `PIL` package, you're
importing the PIL modules directly.  The reason this works is because PIL
places a file called `pil.pth` in the site-packages folder.

Each line in that file is added to the search path.  So far, so
uninteresting.  There is however another thing with .pth files that is
just an example of horrible design: each line that starts with the string
``import`` is executed as Python code.  This horrible design however
enabled setuptools existence to a large degree.  setuptools can use these
.pth files as a hook to execute custom Python code even if you're not
interacting with setuptools directly::

    $ echo $'import sys; sys.stdout.write("Hello World!\\n")' > \
    > test/lib/python2.7/site-packages/test.pth

.. sourcecode:: pycon

    $ test/bin/python
    Python 2.7.1 (r271:86832, Jul 31 2011, 19:30:53) 
    [GCC 4.2.1 (Based on Apple Inc. build 5658) (LLVM build 2335.15.00)] on darwin
    Type "help", "copyright", "credits" or "license" for more information.
    Hello World!

As you can see: the test.pth file is executed when then interpreter starts
up.  Perfect hook place.

Introducing Eggs
----------------

If you're using pip or before you're back in time before setuptools was
widespread, your filesystem looked like this after installing libraries::

    lib/
        site-packages/
            flask/
            django/
            genshi/

Setuptools on the other hand did something very different, it placed each
installed library in another folder (called an egg) and placed a .pth file
that added each of these folders to the python path::

    lib/
        site-packages/
            Flask-1.0.egg/
                flask/
            Django-1.0.egg/
                django/
            Genshi-1.0.egg/
                genshi/
            easy-install.pth

This behavior enraged a lot of people because it made ``sys.path`` very
long and hard to look at.  Now on the first glance this looks like a
horrible idea, why would you do that?  Enterprisey!!!11

However in retrospective that is actually the much better solution.  And
it becomes obvious why that is the case when you look closer at the actual
problem and why setuptools works the way it does.  The big problem there
is that Python developers think of packages as individual things that you
can freely nest.  They are a form of namespace with specific semantics
attached.  The way these imports work are convoluted and we won't go into
detail here, but the important part is that it's customizable to some
degree.  This customization however is not exposed through distutils in
any way.  Now why would you want to customize this?

The main reason is splitting up large monolithic packages.  For instance
take Django.  Django as a framework has `django` as the root packages but
it also ships a bunch of addon libraries in `django.contrib`.  If you want
to have two packages on PyPI with different release cycles for `django`
and `django.contrib.admin`, how would you do that with distutils?

The answer is: you don't and the main problem is the installation of
these.  Installing that would mean installing one library physically
within another library on the filesystem.  Now that sounds like a painless
operation but it's not.  For instance upgrades of the Django library would
also have to take into account that something is now contained within that
library.

The way setuptools solved that is that it installs all PyPI python
packages (that means Flask-1.0.egg intead of `flask` the importable Python
folder) into individual folders and then adds them to the path were
appropriate.  And it can also hook packages virtually within another
package by taking advantage of the fact that pth files can have executable
code in it.

Yes, this was not a very clean solution but it worked.  Setuptools in a
way was the Quake approach to distributing things.  You have individual
packages of things which then get merged together in a virtual filesystem.
In setuptools it's not a virtual filesystem but it's a virtual package
tree that is uncoupled from the filesystem.

And with those egg folders it also solved another problem: that there was
no place to put metadata.  With the added folder, setuptools had found a
suitable place to put information that was generated as part of the build
process.  Next to the importable package within the egg folder there are
also text files with the metadata.

Introducing the other Eggs
--------------------------

Setuptools was really good with giving the same term to different things,
a practice it copied from distutils.  Not only do we have Python packages
(the things with `__init__.py` files in it) and PyPI packages (what you
download from PyPI) but with setuptools there are also now two kinds of
eggs.  In the original design of setuptools there was no difference
between an egg folder and an egg archive, but over the years and with the
introduction of pip that changed.

Now when people talk about eggs they often talk about the folders on the
filesystem with the `.egg` extension.  This however was actually not the
interesting part about the original eggs at all.  What eggs could do was
actually more interesting and something we lost in the transition to pip.

If you take a folder with an `.egg` extension and make a zipfile of it's
content and give it the same name as the original folder everything still
worked.  What was this madness?  It's jar files for Python.  Why does this
work?  It works because Python has a default import hook that checks for
each file on `sys.path` if it's a zipfile.  If it is, it activates the zip
importer and imports from within the zipfile.  Due to how zipfiles are
structured that's actually a very speedy operation.

Now that's another thing that people hated about setuptools.  Mainly
because the Python tracebacks no longer included the source lines with the
traceback.  However there was no technical limitation for why it should
not be able to show the correct line numbers there.  It was just a bug in
the Python interpreter.  Likewise the paths in the tracebacks were wrong
too because they often had paths in it that were hard compiled by the
person that created the egg file.  Again this is an issue with the Python
interpreter and not setuptools.  For reasons unknown to me, the .pyc build
process puts absolute paths into .pyc files sometimes instead of relative
to the import path.

The other annoyance with eggs is obviously that people tend to do clever
things with `__file__`.  Now that's going to break because there are no
files.  Thankfully setuptools provided a library called `pkg_resources`
which allowed you to extract resources in a distribution agnostic way.  So
it could give you resources independent of it the resource was in a
zipfile or on the filesystem.

Binary Eggs
-----------

Alright.  At that point you're asking: what's the real advantage of an egg
over just a tarball I install.  My tool does the installation, I don't
care how it ends up on the filesystem.  Fair enough, but there is a huge
difference between eggs and tarballs (or source zipfiles for that matter).

The difference is that eggs (and I'm talking about actual eggs here, the
zipfiles) were usually distributed in binary form (and I recognize that
there used to be an issue with ucs2/ucs4 Python builds if you want to be
picky.  But that does not invalidate the concept!).

distutils knows two kinds of distributions: source and binary
distributions.  Unfortunately binary distributions in distutils don't
really work except for redhat (untested, but never heard complaints) and
windows.  So you can't use distutils binary distributions for instance to
install something into your virtualenv on OS X or any flavour of linux.
Setuptools however added a new binary distribution target called the egg
binary distribution which actually works.

When we talk about a source distribution then we're talking about a
tarball that has a setup.py file in it that is executes and installs the
library.  Binary distributions on the other hand do not have a setup
executable any more.  You just unpack them and you're done with them.
They are also platform specific and you have to make sure you install a
binary egg for the correct architecture and ucs size.  And then there are
other aspects to that too, but they can be ignored to understand the
concept.

Why Go Binary?
--------------

It's very easy to ignore binary distributions.  A lot of code is written
in “just” Python and the compilation is very cheap.  The only thing that
happens is parsing of the python files and writing out bytecode.  Some
other things however are more expensive to compile.  The one that causes
me most troubles is lxml because it takes a minute or two to compile.  Now
a while ago I ignored that like many other people by just keeping the
virtualenv around and I obviously just installed stuff once.

However when `we <http://fireteam.net/>`_ started doing our new server
deployment we wanted to have each build revision self contained with its
own virtualenv.  Now to accomplish our deployment we have two options.  We
can either go the easy_install + setuptools route or we can go the
pip + distribute route.  If you're not aware of how pip operates: it
basically undoes a bunch of stuff that setuptools does and is unable to
install binary eggs.

The scenario is very simple:

-   Have a big codebase with a bunch of packages that can depend of
    each other.
-   These packages also depend on things that can take a while to compile.
-   Each build wants to have its own virtualenv

Setuptools Distribution
-----------------------

So with easy_install and setuptools you can solve this problem very
easily.  For each package you're dealing with you basically just ``python
setup.py bdist_egg`` and copy the resulting egg into a folder.  Then you
start a fileserver that exposes these eggs via HTTP with a fileindex.

That out of the way you now make a virtualenv and ``easy_install
--site-url=http://fileserver package-name`` and you're set.

Pip based Distribution
----------------------

Now if you do the whole thing through pip instead of setuptool's
easy_install command you will notice very quickly that there is no support
for binary eggs.  Fair enough, so what's the alternative.  The way we're
doing that currently is making a cached virtualenv and installing things
in there.  When we deploy new code we copy that virtualenv out, update all
the paths in that virtualenv, rerun whatever commands are necessary to
build the code (usually just a ``pip install``) and copy it to the target
location.

Since virtualenvs are not relocatable this is what our script does:

1.  Find all the activation scripts in the ``bin`` folder and do a
    regular expression find for the parts that refer to the virtualenv
    path and update accordinly.
2.  Update all the shebang lines of scripts in the ``bin`` folder.
3.  Open all ``.pyc`` files and rewrite the bytecode so that the
    ``co_filename`` is relative instead of absolute.
4.  Update symlinks in the virtualenv.

In theory virtualenvs have a ``--relocatable`` flag but that one is
heavily broken and conceptionally can't work properly because it uses the
system Python interpreter to switch to the intended environment.

Is all lost?
------------

No, not at all.  Distributing Python code could be much, much worse.  I
think what can be learned from all that is that it's a better idea to
learn all of the design of a project first before attempting to replace
it.  As you can see from the previous section we're using pip and not
easy_install with eggs.  Why are we doing that?  Because pip *did* improve
certain things over plain setuptools with easy_install and since part of
the problem with broken paths is a Python interpreter problem and not one
of either setuptools of virtualenv we would have to do path rewriting for
pyc files even if we're using binary eggs.

The sad aspect is just that we have three competing distribution systems:
setuptools with easy_install, distribute with pip as well as the new
distutils2 efforts and not one covers all use cases.  And I am starting to
get the impression that setuptools, despite the fact that it's the oldest
still has the best design of all.  It ignored theoretical problems and
solved practical problems you encounter if you deploy closed source code.

For Future Reference
--------------------

What I learned of that personally is not so much anything about packaging
Python code but to not make any attempts to replace existing
infrastructure without understanding all the reasons that lead to its
existence.  Also since that happened in the past I think it's a good idea
to write down a list of design decisions and use cases and why they exist
when I make another open source project in the future.  A lot of what went
into setuptools can only be understood after a long time of using it
because the design is not documented enough.

Also there seems to be a lot of domain specific knowledge about tools
scattered around.  Especially in regards to deploying Python code to a
bunch of servers it seems like everybody made his own little tool for it.
It seems to me that the theoretical approach that distutils2 is currently
taking where there is more design being done on the paper than testing in
the real world.  Maybe that however is also just a wrong impression I got.

All in all, the issue is just too complex and it's easy to miss things
when starting from scratch again.  Pip was not even from scratch and it
forgot about binary distributions and Windows users.  As such I suppose it
would have been ultimately better to try and repair setuptools with as
much hacks as necessary and then rewrite the implementation once all
design decisions have been finalized.  This seems to have worked good
enough for virtualenv which has recently become part of the standard
library for Python 3.

*TL;DR: setuptools wrongly got so much hate that tools tried to replace
it which did not help much.*
