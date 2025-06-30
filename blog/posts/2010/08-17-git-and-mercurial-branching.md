---
tags:
  - hg
  - git
summary: "Comparsion of mercurial's and git's branching systems and why one of
them works better for me than the other."
---

# Git and Mercurial Branching

People using my stuff will have noticed a trend that I started using git
(and github) for some of my newer projects. Now there are two parts of
the story. One is obviously github which is currently unbeatable. Not
necessarily due to the size of the community but that it gives you a
very neat way to look at what patches are available all over the place
(I'm referring to the fork queue). But the other reason is that despite
all the hate for git I have, it has grown on me as the tool that does
the job better.

This however is a shame because if you remove the github component and
some other addons like the hub command, hg is the superior tool. If you
would download both tools and compare what they can do out of the box
with the stuff they ship, hg has the better user interface and better
tools for collaboration. These tools are essentially `hg incoming`, `hg
outgoing` and the `hg serve` command. Additionally the zeroconf
extension is pretty awesome when you collaborate locally.

Just to give you an example: Georg and me where hacking on [Logbook](http://logbook.pocoo.org/) at EuroPython over an ad-hoc Wifi network
because the people running the conference were unable to keep the
network running. Even though logbook is hosted at github currently, we
were using mercurial for hacking locally. You fire up an `hg serve` in
one window and other persons on the network can instantly pull from it.
That's patch exchange you don't have to think about, it just works (tm).

On the surface hg and git look very much alike. The commands are now
pretty similar and they appear to solve the same problems. However there
is a philosophical difference between these two: the handling of
branches.

In both hg and git you're exchanging things called changesets. They have
an sha1 checksum and are linked with their parents and some other meta
information. Whatever information you are changing, the checksum will
change as well. So if you would take a changeset and only change the
name of the committer, the checksum would change. In hg there is another
piece of information that makes a changeset: the branch the changeset
was committed to. A branch in hg has a name (one that for a long time
was eternal) and in a way a head (the latest commit changeset).

Now to understand my problem you have to keep two things in mind:
changesets in hg are linked to the first one that ever happened in the
repository (same for git) and that a changeset belongs to a branch, even
if merged.

**I don't like merging**. That might sound strange, but I really don't
like merging. I did a lot of merging in hg because it works good enough,
but what I started doing with git is picking single changesets and
applying their diffs. Why am I doing this? Now first the implications:
the checksum changes, because the parents of a changeset will change
with that operation. On the other hand it gives you the flexibility to
pick a single changeset and apply it to different branches.

So a good example are maintenance branches. My concept of maintenance is
to release bugfix releases if enough bugs accumulated. I don't promise a
bugfix release upfront, because if the API does not change in a
backwards incompatible way and a release is upcoming, I can combine that
into one release. Now that might sound like bad release management, and
it clearly is not the optimal way, but I am one person doing the
releases and I have way too many projects to care about and a limited
amount of time.

Now what if at one point there are already two or three bugfixes or a
critical bug comes up that absolutely must be released (for example
security issues). What I do in git is I check out the tag of the release
I want to incorporate the patches and start cherry-picking the patches
from the master branch I want to apply. I obviously could not merge with
master because then I would pull in all the patches up to the patch I
was interested in (remember, they are linked and only exist if the link
to the first changeset is fully established).

In git branches are just labels to a changeset. When you cherry pick one
changeset from a branch (or a branch of another repo) and apply it to
another one, you no longer know where the changeset was coming from.
That's a limitation I can totally live with. The cherry picking command
in git has a flag that allows me to add a "signed off" flag. That way I
can preserve the original author of the changeset and add my own name
for the signed off flag. So a changeset shows both authors. Here an
example of how this looks like: [commit 36a421bb3a235f696131 to Flask](http://github.com/mitsuhiko/flask/commit/36a421bb3a235f696131bc8a546492fc04a411f0).
This is actually implemented by just adding a mime-like header as footer
to the changeset, nothing fancy with commit metadata etc. However the
important thing of this feature is that it's consistently implemented by
the little amount of UI that exist in git and other commands. People are
aware of this signed off thing.

Doing the same in hg is also possible with the transplant command. The
downside is that if you transplant patches from one repo or branch into
another one, the incoming and outgoing commands no longer work like you
would expect them to do. They compare the checksum of the changeset
instead of the checksum of the contents of the patch. And as soon as the
UI starts no longer working, user frustration starts happening. But the
frustration of a user is not the issue here, the real issue is that this
confuses users and will cause them to make (understandable) mistakes.
I'm not a revision control system author myself and my knowledge of the
tools I'm using is limited to the subset I am using as well. Very often
when I get the link to a hg repo from another person I will notice that
they have a bugfix hg branch or something similar and screwed up merging
with upstream. Sometimes in the process of correcting that mistake I
will make another huge mistake myself that I then start correcting in
frustration by stripping all the changesets I just made and applying the
patch by hand, totally bypassing hg. These mistakes happen because
features like remote bookmarks, transplanting changesets and even named
branches are not integrated well enough into other commands. Especially
that the branch name is imprinted into the changeset is confusing to say
the least.

For example the hg repositories on pocoo.org were partially created from
a huge subversion repository by an early version of one of the
subversion conversion commands. Don't ask me which one, but what it did
was naming the default branch everyone works on "trunk". However to the
best of my knowledge a hg repository starts with "default" as default
branch name and hides that from the user interface. When people now pick
up work on one of our converted repos sometimes the confusion kicks in
why their hg experiments never had a displayed branch and why certain
assumptions are now invalidated. This especially becomes an obvious
problem the more git users are out there. A git user has the idea that
"git pull" will fetch all the changesets and merge that with the branch
they are tracking. Git has a pretty bizarre but working concept to track
remote branches that involves entries in the git config I don't
understand at all. I'm thankful the git UI provides some support to do
that for me. However on the other hand in hg we don't have the concept
of tracking remote branches. What we have there instead are just aliases
to a URL that points to a hg repository (and lately we can even refer to
branches on a remote repo in the URL that is another source of confusion
for me I will explain later). hg will pull changes from there and let
you do the merge then. Because that is quite repetitive someone came up
with the fetch extension for hg that pulls in changes and merges if
necessary, otherwise will just update. Now that fetch extension just
assumes that if there are two heads it should merge them, otherwise if
there is one head it will update, and if it finds anything else it will
just error out. You have no idea how many times hg fetch totally
destroyed the recent history when I merged in stuff that looked find in
hg incoming. Now obviously I should not have used hg fetch in the first
place, but a bit of help from the extension would be appreciated. Fetch
is also only partially to blame because it predates bookmarks and back
then nobody was using named branches.

It all boils down basically to hg having an awesome internal concept
that does a lot of things really well, but other things not being
properly supported by the user interface I suppose.

In layman terms git's branching concept roughly works like this: all
your changesets are linked to at least one parent. A changset has a
checksum for the commit + metadata and I think a checksum for the
contents of the patch as well. Additionally you can assign names to
changesets. There are tags which are aliases to changesets that do not
change, and there are branches which are basically names that are moved
to a new changeset on commit. Because of how this works you can have
changesets that are no longer linked to any place of the history because
they point away from one changeset and the name information of their
hash is lost. Git has a garbage collector that can remove these things
from the repository. There is not much magic in there and obviously it
would be very easy for hg to support that, but the core issue here is
not the implementation but the user interface. I don't think hg needs
git style branches at all!

What hg needs instead is a user interface that is aware of certain
operations:

- `hg push` can push bookmarks to remote repositories nowadays, but this
also involves pushing multiple heads to the serverside which the hg
command currently disallows by default unless you force it to. This is
user unfriendly and even if you are an experienced hg user you will
most likely not do the force but ask first if you are doing something
wrong here.

- The special label "tip" in hg moves between branches. This is the
worst user interface fail because all tools are interested in tip more
than what branch you are on. For example if you are using named
branches in hg things like bitbucket, trac (and I think even hgweb)
will show you the contents of the default file browser view
alternating between different branches. If the last commit was on
0.2-maintenance you will see the contents of the 0.2-maintenance
branch by default, if the last commit was on 2.0-new-features it will
display that branch instead. I think the invention of a tip label was
a mistake. It should have been per-branch instead.

- `hg incoming` / `hg outgoing` are unaware of things like `hg transplant`.
If you are doing transplanting, hg incoming over the times becomes so
filled up with changesets already applied that you better not use it
at all. It also forces people you just transplanted patches from
delete their local checkout (or strip it to an older revision) and
pull again. In git this is not a problem because you just delete your
local feature branch and update the separately tracked master branch
which will magically include the changes I transplanted. Due to the
separate content tracking this will not even transfer larger amounts
of data over the wire, because git will already find them locally.

- The `hg heads` command is intended to help people merge changes
locally by visualizing what unmerged heads are there, but when you
start using bookmarks and named branches it's intentional that there
are multiple heads. The more branches, the more useless the command.
The solution here would be git-like branch tracking so that heads can
filter out uninteresting pieces of information.

There is that hg over the time started adopting solutions that actually
are not solutions. For example you can have an alias not only for the
URL of a repository but the URL of a repository + a branch. That sounds
like wonderful thing to have, unfortunately due to the fact that the
name of the branch is part of the changesets you will be surprised
sooner or later when you merge in changes from another persons repo and
suddenly see feature branches appear even though you never specified
anything like that. This is a problem that becomes more apparent the
more people use hg with git knowledge where it's logical and encouraged
to create branches for every single feature you are implementing.

I am not quite sure what the named-branch-in-URL is supposed to fix, but
for me it just created more confusion when working with repositories
that actually have named branches in that differ from the one or two I
have.

So why does hg has these "limitations" in the first place? Probably
because the history of the project was not the big-ass Linux kernel
(though that is not entirely true) but mercurial itself. And for smaller
repositories the git model does not appear too appealing at the first
glance. It took me a while to start fully appreciating the possibilities
of small branches and now I can't live without them any more.

The git UI might suck, and I still have a hard time with it, but the
branching works nicely and so is dealing with other people's patches.
It's the perfect tool for me currently when it comes to quickly
reviewing and applying patches and it grew on me. I still wonder
internally why the hell I'm writing `git push origin :branchname` to
delete a branch remotely :) And with all these UI faults, git has the
better UI for branchy development :(

But due to the horrible git UI and the incredible hostility of git for
people switching from the friendly lands from mercurial I am pretty sure
very few core developer of git had a look a serious at "the other tool"
to get an idea of what everybody is buzzing about when the topic "hg and
git branching" comes up.
