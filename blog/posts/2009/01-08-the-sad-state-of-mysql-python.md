---
tags: ['databases', 'python']
summary: "Old blog post about the broken state of the MySQL python module."
facets:
  mood: {worried: 0.73, angry: 0.26}
  scale: {craft: 0.67, community: 0.32}
  time: {present: 0.93}
  ai: {not_ai: 1}
  imagery: {body: 0.48, none: 0.44}
  stance: {critic: 0.89}
  actor: {individual: 0.44, machine: 0.22, idea: 0.17, group: 0.11}
  ending: {practical: 0.98}
  tension: 0.17
  certainty: 0.56
  valence: 0.18
  energy: 0.51
  wander: 0.41
  personal: 0.5
  humor: 0.28
  technical: 0.63
---

# The Sad State of MySQL Python

I admit it. I was a friend of [MySQL](http://mysql.org/). Two years
ago MySQL was the only database server I was using at all. Lately
however I replaced nearly all applications that were still using MySQL
with postgres and even SQLite. One of the applications that is still
using MySQL is [Inyoka](http://ubuntuusers.de/inyoka/), the portal
software deployed [ubuntuusers](http://ubuntuusers.de/). For reasons
you don't want to know we are unable to switch the deployment setup from
MySQL to postgres.

Now that would be fine if [mysql-python](http://sourceforge.net/projects/mysql-python) aka `MySQLdb` would not
suck so much. Besides not supporting the latest MySQL features it also
leaks memory a lot. A friend of mine who discovered the problem, noticed
a couple of lost megabytes the minute on ubuntuusers — that's a lot.

That problem seems to be fixed in the SVN trunk but the latest activity
there was more than 9 months ago which is a problem. Neither the
cheeseshop`^W^W`pypi has non-leaking packages, also not Linux
distributions such as debian or ubuntu. The [development blog](http://mysql-python.blogspot.com/) was last updated in May of 2008
which makes me even more concerned.

Now I wonder if anyone has experience with the MySQL library and the
Python API to take over the development. I guess there are still some
MySQL users left, even though the project has an incredible bad
reputation lately [due to problems in the release management](http://monty-says.blogspot.com/2008/11/oops-we-did-it-again-mysql-51-released.html).

As a temporary workaround I can recommend either updating to the trunk
version (which seems to be unstable according to one of the last commit
messages) or disable unicode support where the leak apparently is. Nice
libraries such as [SQLAlchemy](http://sqlalchemy.org/) can convert
bytestrings to unicode automatically on their own as well if you [tell
them to](http://www.sqlalchemy.org/trac/wiki/DatabaseNotes#MySQL).
