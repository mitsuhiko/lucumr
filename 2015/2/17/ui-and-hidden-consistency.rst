public: yes
tags: [git, thoughts, ui]
summary: |
  Some thoughts on why git's complex user interface works so well in
  practice.

Why I Don't Hate Git: Hidden Consistency
========================================

Git for me is an interesting topic.  I used it initially when git had no
UI and `cogito <http://git.or.cz/cogito/>`_ was still a thing.  I can't
say I enjoyed using it much.  At the time I did all my development tasks
with SVN and the world was good.  A little while later I played around with
mercurial and instantly fell in love.  I held onto mercurial for a long
time and defended it vigorously.  Only in 2008 did I finally start to use
git and it took me multiple attempts until I was convinced that I should
migrate my repositories from mercurial to git.

Git's Horrible UI
-----------------

I suppose anyone who comes from any version control system to git will be
quickly surprised by its utter lack of consistency in the UI.  Steve Losh
famously made fun of this in his `git koans
<http://stevelosh.com/blog/2013/04/git-koans/>`_.

However every time this topic comes up I am a bit in disbelief because I
don't remember the git UI confusing in daily operations.  Sure enough, for
whatever reason ``git remote`` works different from ``git branch`` and
``git tag`` for some reason but given that I also use them in a different
way I would not even make that association.  The only git command I
actually remember being odd is ``git show`` which has a bit of an
unfamiliar syntax for exploring object contents.

Yet at the same time I remember fighting against Mercurial very commonly
and I have a very strained relationship with perforce, but I can't
remember many cases where I had issues with git.

Why do I not hate git the same way?

Learning the UI vs the Concept
------------------------------

Thinking about this a bit more I think the reason git resonates so well
with me is because I learned git differently than any other version
control system.  With mercurial and perforce you learn the UI and you
learn how to solve some specific problems with it with the consequences or
implementations of those actions being a mystery.

With git on the other hand even the first page of the tutorial has a
direct link to the `internals chapter of the git book
<http://git-scm.com/book/en/v2/Git-Internals-Plumbing-and-Porcelain>`_
which explains the internal implementation of git.

This was even more the case in the past when git did not even have a UI.
As a user you were expected to work with some of the files in the `.git`
folder yourself!  I remember playing around in the very early days with
git where there was not even a way to commit.  The `.git/HEAD` was still a
symlink to the current branch and a documented way to commit was this
dance:

.. sourcecode:: bash

    echo "Commit message" | git-commit-tree $(git-write-tree) > .git/HEAD

Only later an alias for commit was added, and even then the tutorial was
still … `rough I would say
<https://raw.githubusercontent.com/git/git/c7c4bbe63193f580abd2460e96dd7e65f2d4904c/Documentation/tutorial.txt>`_.

Git didn't start as a version control system, it started as a concept that
other tools could use to build a version control system on top.  And this
set a very different tone for how it developed than many other systems.

Surely git changed over the last 10 years and some concepts were changed,
but in the grant scheme of things it has not changed much.  There is a
certain beauty in being able to create a repository in git from 2005, doing
another commit with git from 2015, doing another commit with git from 2005
and looking at the resulting log with git from 2015.

The core concept of git has not changed.

Of course the UI is something you need to learn to work with git, but
because you can learn the underlying concept of git, the UI fades largely
into the background.

Good Defaults
-------------

Git might not have the best UI, but it has good defaults and they are
getting better over time.  Things look nice by default, the common
behavior is in general the default and if it is not, there will at least
be a discussion about changing it.  There is one blessed way to do
something and it's easy to learn.  Branching in git has never changed,
knowledge acquired ten years ago is just as valid today.

A Solid Design
--------------

Ultimately I think Linus when he created git as a version control system
made an ungodly good design and very little change was necessary.  Sure,
some details had to change later, but the core of it was good.  Working
with commits and objects turned out to be the right way and the branching
clearly was always the right decision.  Even mercurial had to eventually
concede and is now warning when you create a named branch :)

I learned the git concepts once and now I can use this thing.  Sure,
sometimes I need to google a rarely used command, but when it really
matters, I do not need to.  There has never been a situation where I
failed so badly that I could not recover from it.  And this beautiful and
simple concept makes up for a lot of inconsistent UI.

Where the UI lacks consistency and maybe simplicity, the core design of
git has both.  I value this a ton.

Git Is There For Me
-------------------

That ultimately is the reason why I forgive git's UI a lot and why I
recollect very few frustrating experiences is because when it really
matters, git has always been on my side.  I screwed up really badly
before, merging wrong things together, accidentally deleting data and much
more, yet I *never* lost any data or felt left abandoned by my tool.

When I fail, sometimes I make a copy of my ``.git`` folder and carefully
trace back on what I did wrong.  This is where git shines.  There are very
few problems you cannot recover from.  On the other hand I have horrible
memories of me making mistakes in other version control systems where it
was either impossible or required the assistance of a developer of such
system to get out of my misery.

Neither did it break because I misused it nor did it broke out of its own
volition.  I can't say the same thing about any other version control
system I used.  I successfully broke many subversion checkouts (even
destroyed the database on the server), screwed up perforce workspaces and
entire mercurial repositories.

The worst that ever happened to me using git is that my Flask repositories
for all eternity will contain some bad file permissions on old tree
records due to a temporary github bug.

More of This
------------

I think I want more software like git.  Software where the way it works is
a crucial part of the user experience.  Where there is no disconnect
between how it works, and how it presents itself to the user.

A strong counter example of this is the cognitive disconnect I have when
using Apple's recent software.  The "save as" dialog is gone, the "save"
dialog now shows a delete button even if something was not saved to the
file system ever.  Too many times I accidentally overwrote a file in
keynote or preview because my knowledge of how a file system works, does
not apply to how the UI maps the application operations to what it's
doing.  When fundamentally different methods of operations (discarding
something never saved and deleting a file already on the file system) are
called the same and look the same it causes me frustration.

And this is why I don't hate git.
