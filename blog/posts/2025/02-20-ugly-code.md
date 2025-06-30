---
tags:
  - thoughts
summary: Why ugly and dumb code sometimes blind sights engineers from the
---

# Ugly Code and Dumb Things

This week I had a conversation with one of our engineers about “shitty
code” which lead me to sharing with him one of my more unusual
inspirations: [Flamework](https://github.com/exflickr/flamework/), a
pseudo framework created at Flickr.

## Two Passions, Two Approaches

There are two driving passions in my work.  One is the love of creating
beautiful, elegant code — making Open Source libraries and APIs that focus
on clear design and reusability.  The other passion is building quick,
pragmatic solutions for real users (who may not even be developers).  The
latter usually in a setting of building a product, where the product is
not the code.  Here, speed and iteration matter more than beautiful code
or reusability, because success hinges on shipping something people want.

Flamework is in service of the latter, and in crass violation of the
former.

Early on, I realized that creating reusable code and directly solving
problems for users are often at odds.  My first clue came when I helped
run the German
[ubuntuusers](https://www.ubuntuusers.de/) website.  It was powered by
a heavily modified version of phpBB, which despite how messy it was,
scaled to a large user base when patched properly.  It was messy, but easy
to adjust.  The abstractions were one layer deep.

Back then, me and a friend tried to replace it by writing my own bulletin
board software, [Pocoo](https://web.archive.org/web/20070502223619/http://flying.circus.pocoo.org/).
Working in isolation, without users, led me down a path of
over-engineering.  While we learned a lot and ended up creating popular
Open Source libraries (like Jinja, Werkzeug and Pygments), Pocoo never
became a solid product.  Later, my collaborators and I [rebuilt
ubuntuusers](https://github.com/inyokaproject/inyoka/), without the
goal of making it into a reusable product.  That rewrite shipped
successfully and it lives to this very day.

But it took me years to fully realize what was happening here: reusability
is not that important when you’re building an application, but it’s
crucial when you’re building a library or framework.

## The Flickr Philosophy

If you are unfamiliar with Flamework you should watch a talk that Cal
Henderson gave in 2008 at DjangoCon ([Why I hate Django](https://www.youtube.com/watch?v=i6Fr65PFqfk)).  He talked about scale
and how Django didn't solve for it.  He enumerated all the things
important to him: sharding, using custom sequences for primary keys,
forgoing joins and foreign keys, supporting database replication setups,
denormalizing data to the extreme.  This is also were I first learned
about the possibility of putting all session data into cookies via
signing.  It was a memorable talk for me because it showed me that there
are shortcomings.  Django (which I used for ubuntuusers) had beautiful
APIs but at the time solved for little of that Cal needed.  The talk
really stuck with me.

At the time of the talk, Flamework did not really exist.  It was more of
an idea and principles of engineering at Flickr.

A few years later, Flamework appeared on GitHub, not as an open-sourced
piece of Flickr code but as a reimplementation of those same ideas.  You
can explore its repository and see code like this:

Cannot analyze code. No Pygments lexer found for "phpinline".

```
.. sourcecode:: phpinline

    function _db_update($tbl, $hash, $where, $cluster, $shard){
        $bits = array();
        foreach(array_keys($hash) as $k){
            $bits[] = "`$k`='$hash[$k]'";
        }
        return _db_write("UPDATE $tbl SET ".implode(', ',$bits)." WHERE $where", $cluster, $shard);
    }

```

Instinctively it makes me cringe.  Is that a SQL injection?  Well you were
supposed to use the PHP [addslashes](https://www.php.net/manual/en/function.addslashes.php) function
beforehand.  But notice how it caters to sharding and clustering directly
in the query function.

## Messy but Effective

Code like this often triggers a visceral reaction, especially in engineers
who prize clean design.

How does something like that get created?  Cal Henderson described
Flickr's principle as “doing the dumbest possible thing that will work.”
Maybe “dumb” is too strong — “simple” might be more apt.  Yet simplicity
can look messy to someone expecting a meticulously engineered codebase.
This is not at all uncommon and I have seen it over and over.  The first
large commercial project that got traction that I ever worked on ([Plurk](https://en.wikipedia.org/wiki/Plurk)) was also pretty pragmatic and
messy inside.  My former colleague Ben Vinegar also [recently shared](https://benv.ca/blog/posts/the-hardest-problem) a story of early,
messy FreshBooks code and how he came to terms with it.  Same story at
[Sentry](https://sentry.io/welcome).  We moved fast, we made a mess.

None of this is surprising in retrospective.  Perfect code doesn't
guarantee success if you haven't solved a real problem for real people.
Pursuing elegance in a vacuum leads to abandoned side projects or
frameworks nobody uses.  By contrast, clunky but functional code often
comes with just the right compromises for quick iteration.  And that in
turn means a lot of messy code powers products that people love —
something that's a far bigger challenge.

## A Rorschach Test

I have shown Flamework's code to multiple engineers over the years and it
usually creates such a visceral response.  It blind sights one by
seemingly disregarding all rules of good software engineering.

That makes Flamework serve as a fascinating Rorschach test for engineers.
Are you [looking at it](https://github.com/exflickr/flamework) with
admiration for the focus on some critical issues like scale, the built-in
observability and debugging tools.  Or are you judging it, and its
creators, for manually constructing SQL queries, using global variables,
not using classes and looking like messy PHP4 code?  Is it a pragmatic
tool, intentionally designed to iterate quickly at scale, or is it a naive
mess made by unskilled developers?

Would I use Flamework?  Hello no.  But I appreciate the priorities behind
it.  If these ugly choices help you move faster, attract users and
validate the product, then a rewrite, or large refactorings later are a
small price to pay.

## A Question of Balance

At the end of the day, where you stand on “shitty code” depends on your
primary goal:

- Are you shipping a product and racing to meet user needs?

- Or are you building a reusable library or framework meant to stand the
test of time?

Both mindsets are valid, but they rarely coexist harmoniously in a single
codebase.  Flamework is a reminder that messy, simple solutions can be
powerful if they solve real problems.  Eventually, when the time is right,
you can clean it up or rebuild from the ground up.

The real challenge is deciding which route to take — and when.  Even with
experience, it is can be hard to know when to move from quick fixes to
more robust foundations.  The principles behind Flamework are also
reflected in [Sentry's development philosophy](https://develop.sentry.dev/getting-started/philosophy/).  One more
poignant one being “Embrace the Duct Tape”.  Yet as Sentry matured, much
of our duct tape didn't stand the test of time, and was re-applied at
moments when the real solution would have been a solid foundation poured
with concrete.

That's because successful projects eventually grow up.  What let you
iterate fast in the beginning might eventually turn into an unmaintainable
mess and will be rebuilt from the inside out.

I personally would never have built Flamework, it repulses me a bit.  At the
same time, I have a enormous respect for the people who build it.  Their
work and thinking has shaped how I solve problems and think of product
engineering.
