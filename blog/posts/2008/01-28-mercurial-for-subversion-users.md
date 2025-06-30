---
tags:
  - hg
summary: "Short introduction into mercurial from the perspective of a subversion
user."
---

# Mercurial for Subversion Users

More and more projects are switching over to [mercurial](http://www.selenic.com/mercurial/) or similar DVCS. Great as
mercurial is, it's hard to get started if you are used to subversion
because the concept behind Subversion (svn) and mercurial (hg) is
fundamentally different. This article should help you understand how
mercurial and similar systems work and how you can use it to contribute
patches to the pocoo projects.

If you compare Subversion to mercurial you won't find that many
similarities beside the command arguments. Subversion works like FTP
whereas mercurial is bittorrent. In Subversion the server is special: it
keeps all the revision log and all the operations require a connection
to this server. In mercurial I can take down the central repository if
there is one an all developers will still be able to exchange changes.
All the revision information is available to anyone and there is
absolutely no difference between server and clients.

This fundamental design decision means that there are dozens of separate
branches of the code. hg makes it easy to merge and branch and it's
developed exactly for that. In Subversion branching and merging is
painful an often people just don't branch and don't commit there changes
until the testsuite etc. passes again which of course results in huge
changesets. But let's step right into it!

The first thing in Subversion you do is either creating a repository on
the server or checking it out on the client. In hg there is no
difference between server and client so the process of creating a
repository is available to everybody. Creating a repository is just as
simple as typing "hg init name_of_the_repository". If that folder does
not exist yet it will create an empty folder and initialize it as root
of the repository, otherwise it will create the repository in the name
of that folder.

The process of checking out is a bit different from Subversion because
it's effectively the same as creating a branch. Say you want to check
out the current Pygments version to do some changes. The first thing you
will do is looking for a way to access this repository. There are three
very common ways to access it: filesystem, HTTP or SSH. Pygments is
available as SSH and HTTP, but for non core developers only HTTP is
available. Interestingly quite a few people have problems locating the
checkout URL which is not very surprising because hgweb handles that.
hgweb is the standard mercurial web interface which doesn't only provide
a way to look at the changesets and tree but also handles patch
exchange. In the case of Pygments this command should give you a fresh
checkout in a few seconds into the new folder "pygments":

```
hg clone http://dev.pocoo.org/hg/pygments-main pygments
```

One thing you will notice is that it's incredible fast and even though
the repository contains the whole history the checkout is pretty small.
By the time I'm writing this blog post the pygments sourcecode including
the unittests and example sourcecode without the revision history is
2.5MB. A complete mercurial checkout is only 5MB even though it includes
486 changesets.

After you got your very own repository by cloning the pygments one you
will notice that all the subversion-like commands ("hg ci", "hg add",
"hg up", ...) work locally only. You check into your local version of
the repository and hg up won't incorporate remote changes. One of the
things that happen on hg clone is that mercurial will set the path to
the repository you cloned from into the hgrc of the newly created
repository. This file (".hg/hgrc") is used to store per-repository
configuration like the path of remote repositories, the name used for
checkins, plugins that are only enabled for this repository and more.
Executing "hg pull" will automatically pull changes from this remote
repository and put them into the current repository as second branch. To
see what "hg pull" will pull from that remote repository you can execute
"hg incoming" and it will print a list of changesets that are in the
remote repository but not yet in the local one. After you have pulled
you have to update the repository with "hg up" so that you can actually
see the changes. If there were remote changes that require merging you
have to "hg merge" them and "hg ci" the merge.

Because this process is very common there are ways to simplify it. "hg
pull && hg update" can be written as "hg pull -u". All the commands
(pull, update, merge and checkin if required) can be handled in one go
using "hg fe". This command however is part of a plugin which is
disabled by default. If you want to use it you have to add the following
lines into the repository hgrc or your personal one:

```
[extensions]
hgext.fetch=
```

The other important difference to subversion is how you push your
changes back to the server. In open source projects usually only a small
number of developers has access to the main repository and contributors
create patches using "diff" or "svn diff" and mail it to one of the
persons with commit rights or attach it to a ticket in the project's
tracker. If you are a person with push privileges you can do "hg push"
and it will push the changesets which are not yet on the server (you can
look at them using "hg outgoing"). If you don't have push access you can
create a bundle of changes and attach that to a ticket rather than a
patch. A bundle stores multiple changesets in one file and it also
preserves the correct author information and timestamps. Another way is
mailing the changes to a different developer using the patchbomb
extension (I won't cover that here, just google it up). Or you can let
other people pull from your repository. Therefore you either have to
configure your apache to server a hgweb instance or you just call "hg
serve" and it will spawn a server on localhost:8000 everybody can pull
from.

Once the developer has decided to put your changes into the central
repository and pushed them, your changes will appear there unaltered and
with the same revision hashes. What will be different is the local
number the changeset is given. If the revision was called deadbeef:42
locally it could be called deadbeef:52 on the server because different
changesets were applied first.

All the commands that interact with remote repositories ("hg pull", "hg
push", "hg fe", ...) also take a different path than the default path
from the hgrc as argument. This allows you to pull changes from
repositories shared over the web.

A cool example what mercurial allows you to do is our last ubuntuusers
webteam meetup. There we used my notebook to store the central
repository and everybody pushed the changes every once in a while to it.
Additionally some people exchanged patches to not yet working features
among each other so that the code on the central repo was seldom broken.
When I left everybody had all the changes locally because they pulled
and I could remove my notebook and everybody continued working on their
way home. When we met again on IRC I copied my repo on the server and
everybody pushed their local changes to it.
