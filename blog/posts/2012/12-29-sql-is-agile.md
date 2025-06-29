---
tags:
  - thoughts
summary: |
---

# SQL is Agile

I have to admit, I was contemplating for a very long time if I should
write an essay about databases because the whole topic feels so much like
opening a can of worms.  First of all there is very little that was not
been written somewhere else, secondly the topic is too complex that it
would be possible to draw any conclusion out of personal experience.

The last two weeks however made me realize however that I would never
start a project with MongoDB — or for that matter any other non relational
database as primary data store — again.  Notice however that I said
“start”.  I did not say I will never use MongoDB again, I said I will
most likely not start a project with that again.

Now before I start with explaining myself I want to give a few disclaimers
here to make sure everyone is on the same page.  First of all my main
experience with non-relational datastores boils down to three rather
different pieces of technology: MongoDB, hbase and redis.  It's very
likely that what I attribute as an intrinsic redeeming quality of SQL
might be something that another non-relational datastore can do as well.
When I'm talking non-relational here I'm mostly talking about MongoDB
however because that's what everybody else is talking about as well.  The
newcomers to the pocoo IRC channel are overwhelmingly picking MongoDB as
data store to get started.  In fact that is happening in so high numbers
that the sentence “MongoDB is not the only data store” was added to the
title.

The reason for this blog post is that I see a lot of people claiming that
non-relational datastores are so much easier for prototyping than SQL
based ones and I disagree somewhat with that.

## Schemas are Awesome

It seems like a lot of people are terribly afraid of the concept of a
schema.  Schema == explicit typing == productivity killer.  The problem
with this notion is that it's based on the idea that schemas could be
removed entirely.  Unfortunately this idea is a pipe dream.  At one point
you need to have an understanding of what you're dealing with: you need to
know of what type a value is.  If we would not want to write out types
in programming languages we have some options.  For instance we can solve
that problem either by having some flow analysis on the code to see what
type is contained in a variable at one point in time statically.  That's
how Rust's type inference works for instance.  Alternatively we could do
what Python and JavaScript do and switch to dynamic typing and solve the
problem at runtime.

The problem is significantly worse in a data store because we're not
talking about single types, we're talking about composite types in
collections.  So say you are treating your non-relational database like a
thing where you throw JSON documents at: even if you are not declaring a
schema, you are assuming a schema if you are operating on collections on
objects.  Assuming each of your posts has a comment count associated with
it and you would want to find the total number of comments by tallying up
the comment count on the post: you just used a schema.  You were expecting
your comment count on each single post to be an integer or something else
you can add together for this operation to make sense.

At the very least the schema lives in your head.  The problem with that is
that this schema is not enforced so you will make mistakes.  Well maybe
you won't, I certainly did make mistakes there.  If you store a string
where you previously stored an integer in another document that will work
for a while until you start to look at more than one document and suddenly
your collection disagrees.

It turns out that even if you are not using schemas, your non-relational
data store still uses some leftovers of a schema system for indexes.
Despite all what people might tell you, non-relational data stores are
still not magic, they operate under the same constraints as any other
datastore and need explicit indexes to be fast.  When you add an index you
are freezing a part of your schema which previously only existed in your
head into your database.  Suddenly you have the same problems you had
before again, just a little bit different.

Maybe I just always wanted schemas.  I definitely love schemas but I did
not know that I love them so much until I suddenly did not have them.
Everything became messy and the first thing I added to our codebase was a
type system to express schemas.

One thing that's worth of note here is that the Parse web service is
deriving schemas from the data you're inserting to ensure sanity.  If you
created a document with a `foo` key that is an integer all future inserts
for that key also have to be of type integer.  That's another approach but
it fails because JSON (what they are storing) has null types so for long
you have no documents or `null` values in your document Parse does not yet
know your type.

## Do you know what you want?

Now the lack of schemas should not be a reason to not use MongoDB or any
other relational data store.  It's easy to add schemas on top and things
like mongoengine for Python already do that for you.  While it does punch
some holes into the concept of “you don't need schemas” it does not really
question the use of a non-relational data store.  As far as I am concerned
relational vs. non-relational is not about schemas vs. the lack of schemas
but the embracing the idea of denormalized data.

Denormalized data is cool, no question about that.  It's fast and it's
easy to understand and denormalizing in many non-relational data stores is
so much easier than in SQL because you can nest things.  It will work for
as long as you know what you are doing.  Unfortunately sometimes things
happen and then you realize you now have data you can't get access to.
This is what happened to me multiple times this week.

For reasons too complicated I could explain them here I had to extract
some information from our database that I knew was there but not in the
format I needed.  Everything was so amazingly well denormalized that it
was a bloody mess getting some data out that with an SQL database would
have been the case for a few joins and a group by.  It's because it was
not written with that in mind the first place.  I suddenly needed the data
in a different format.

## Killed by “Too Complicated”

What I took away from the last month is that there is a lot of value in
being able to adjust to changes quickly.  We were in the lucky position of
[our game](http://warchest.com/radsoldiers) being featured on iTunes over
Christmas in a few countries but that comes with downsides.  We suddenly
had a lot more players than you would otherwise expect and suddenly we
wanted answers to questions we did not even know we would ask two months
ago and our data model did not make it particularly easy to provide the
answers.

I like to believe we're quite capable and chose our technologies with
great care, but there are always things you will be overlooking.

MongoDB and other non-relational datastores are amazing if you already
know everything.  There are no surprises, now all you need to do is to
scale up a successful product.  When you have a new product however there
is a lot of value in being agile and being able to get useful information
out of your data quickly, even if that was not what you had in mind
originally.

SQL databases make that easy and up to a certain point they don't make you
suffer for your lack of proper planning.  If queries get slow you can look
at a slowlog and decide to add indexes to things you previously did not
have indexes on.  In certain non-relational data stores that's not an
option.  In redis you are maintaining your data structures yourself so if
you suffer from your data being laid out the wrong way you have a problem.
In MongoDB the presence or absence of an index changes the results of your
queries sometimes which can make adding indexes a nontrivial task.

What's worse though is that sometimes you just can't add an index.  If you
have nested objects you can't query on those because they are contained
within other things.  Since the database does not provide any queries
either it's not hard to be in the situation where you basically have to
fetch all the data for offline processing through map reduce.

It's not a problem, it's part of the design of the database.  I did
however despite all the planning we did not expect us to run into that as
a problem.  Unfortunately sometimes the world does not play as it should
and you are confronted with a new situation and then nothing is more
demolishing than sitting on your data and not being able to get the
information out quickly that you know is there.

Unfortunately a neat little idea I had was essentially killed by it being
too complicated to do because it became too complex for the datastore
without changing the layout.  So for at least myself my personal
conclusion is that I will never be able to predict all the things upfront
so while I have the chance I will opt for a more flexible data store and
right now that means I will use a SQL database.

And I still like you MongoDB.
