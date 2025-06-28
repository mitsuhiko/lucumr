public: yes
tags: [sql, thoughts, postgres]
summary: |
  Some thoughts on why upserts are necessary to write reliable web
  applications.

A Case for Upserts
==================

It looks like upserts yet again will not land in Postgres.  This is deeply
unsatisfying because over the last couple of years it has become more than
obvious for me that this functionality is not just useful but a necessity.
Interestingly enough it seems like a lot of people are suggesting that
depending on upserts means that the design of the application is bad but I
would argue that anything other than upserts means that the application is
actually deeply unreliable or badly planned.

What's an Upsert
----------------

Upserts probably got a bad reputation because they were popularized by
MySQL which is often regarded as a bad SQL database.  However MySQL also
became popular as a driving force behind web applications so some of its
design decisions work really well in a web environment.

In MySQL there are two types of upserts: replaces (which can be emulated
in Postgres) and the "on duplicate" clause which can be used to react on
an already existing row.  The latter is really hard to efficiently
implement in Postgres at the moment.

I will go into the details of why upserts are important in a bit, I just
want to show the two types of it first.

Replaces
--------

The simple upsert in MySQL Is the replace insert.  It's an insert that
will implicitly delete an already existing row before it does anything.
The way it's implemented is an extension to the insert syntax:

.. sourcecode:: sql

    replace into my_table (key, value) values ('key', 'value');

With an alternative syntax that works similar to updates (which to be
fair, MySQL also has for `insert` and which I find much pleasant because
it mirrors the update syntax):

.. sourcecode:: sql

    replace my_table set key='key', value='value';

The way both of these work is by inserting a value and deleting an already
existing record for a given primary key or unique constraint.  The most
common case for this safely treating a table as a key value store.  In
this particular case you can also use a transaction safely in Postgres and
you can just send a delete before the insert:

.. sourcecode:: sql

    begin;
    delete from my_table where key='key';
    insert into my_table (key, value) values ('key', 'value');
    commit;

The obvious problem with this however is that a transaction that happens
concurrently will not see the row any more.  You can easily test this by
just not committing and attempting to update from another shell.  The
update will block until the commit happens but once it finishes it will
tell you that zero rows were updated even though there were clearly rows
available to update.  The reason for this is that transactions just
serialize the execution, they don't guarantee any atomicity of independent
row updates.  After the delete happens the second transaction gets a
chance to run and the update will fail because it no longer sees a row.

Now if you're thinking the solution is to just raise the isolation level,
you're in for a disappointment.  Even with the highest isolation level the
result is the same.  However an explicit table lock gets around this.  To
be honest, this probably has the same characteristics as doing the same
operation on MyISAM where MySQL got its initial upserts from:

.. sourcecode:: sql

    begin;
    lock my_table in exclusive mode;
    delete from my_table where key='key';
    insert into my_table (key, value) values ('key', 'value');
    commit;

This will work and still allow concurrent reads, but it will definitely
block any concurrent modifications from happening.

On Duplicate Clauses
--------------------

The more interesting upsert in MySQL is the ``ON DUPLICATE KEY UPDATE``
clause.  For some reason this got a bad reputation similar to basic's ``on
error resume next`` even though it's not just useful but also the only
safe way to handle concurrency with uniques.  The way it works is by
defining an insert as well as an update in the same statement.

For instance this is the way to implement safe counters that are not
initialized upfront:

.. sourcecode:: sql

    insert into counters (counter_name, seq) values ('my_counter', 1)
        on duplicate key update seq = seq + 1;

If the key ``'my_counter'`` does not exist yet, the row is created by
inserting it with the value ``1`` for ``seq`` otherwise it will execute
the update statement on that particular row.

There is an obvious question what happens if there are two unique
constraints on a table, and the answer is quite simply that it breaks down
in that case.  If there are two uniques MySQL will not give an error but
just execute the operation as if it was happening on the first row that
matches.  Essentially the where is extended to be be an or for any of the
unique constraints compared to the values from the insert statement.  This
is obviously dangerous and definitely not optional.

In a purely theoretical case the better way would be to be explicit about
the uniqueness.  This could work like this (if a database would support
it):

.. sourcecode:: sql

    insert into counters (counter_name, seq) values ('my_counter', 1)
        on duplicate key (counter_name) update seq = seq + 1;

The standard SQL way is to be super explicit about everything and very
confusing `MERGE STATEMENT <http://en.wikipedia.org/wiki/Merge_%28SQL%29>`_.

Why Upserts?
------------

So why are upserts important?  The reason is concurrency.  Without an
upsert there is no way to reliably ensure that a row is in a certain
state.  The only workaround is to move the code that creates the row into
a locked (or semi locked) situation.  For instance the traditional example
of a one-to-one relationship is usually solved in postgres by just
ensuring the related inserts have low chance of concurrency.

Imagine for instance you have users and user settings.  Each row in the
users table has also a related row in the user settings table but each
user can only ever have one.  Since users typically only ever register
once you can just hope for the best and just do an insert.  In case there
is some concurrency happening then the second transaction will just fail
with a unique constraint failure.

This reason this is a problem is because of lazy creation, network
failure and the hope to make all operations idempotent.

Lazy Creation
-------------

Lazy creation is the obvious example of where the lack of upserts is
painful.  The counter example was already brought up.  In this case a
counter gets created on first increment but that's by far not the only
example.  A much more common case is functionality that did not exist at a
certain point in time and is related to bulk data already existing or is
just inherently optional.

For instance say you have a few million users and all the sudden you want
to add a new one-to-one relationship for these users.  Say for instance
you added a new notification feature and you want to store the
notification settings in a new table.  If you don't have upserts the only
way to safely deal with this is to have a migration script that adds a
nulled-out row for each of these users at the time you add this feature to
your application.  This is expensive and ultimately a waste of space,
because many of your users will already be inactive at the time you add
this feature.  Also not all of those users will actually use
notifications.

The obviously better way is an upsert: create this row when the user first
needs to configure the notification settings.

Network Failure and Idempotency
-------------------------------

Upserts are especially important for web applications because the network
is inherently unreliable.  It's true that HTTP is implemented on top of
TCP, a reliable transport, but obviously there is one case that TCP (or
HTTP) cannot do by themselves: bidirectional acknowledgement of high level
operations.  An operation is idempotent if it can be applied multiple
times without changing the outcome.  An example of such an operation is
any read-only operation (such as selects).  It does not matter how many
times you select something, it will still give you the same result.  While
the data returned for the next select might be slightly different because
of concurrent updates, the select itself does not modify the data.
Another inherently idempotent operation is obviously a deletion.  No
matter how many times you delete something, in the end the row is always
gone.  Again, someone might concurrently re-create the row but that does
not make the operation non-idempotent.

On the other hand inserts, increments and similar things are *not*
idempotent.

The traditional example is usually brought up with purchases but really
this problem is not unique to purchases: it can happy for every single
non-idempotent HTTP request.  Say you click the purchase button but an
error occurs: is it safe to submit the payment again or not?  How would
you know?

The simple answer is that you cannot know because of late failure on the
network.  For instance say there was a badly implemented web store and a
user clicks on the submit button and ultimately the website times out or
the user gets a connection reset message.  However as far as the server
was concerned the request was made, the record for the payment was
recorded, the transaction was committed and the user was redirect to a
result page and the connection was closed after sending the data.
Unfortunately all of this went through a proxy server and the proxy server
barfed when sending the data back to the client.

The only way to make such an operation idempotent is to provide extra
information with the initial request to be able to detect a duplicate
attempt.  The very obvious one is a "nonce".  When the client shows the
payment page it rolls a large random number.  With the purchase the user
submits this number and the server will permanently store it.  Even if the
response to the client fails, the client can safely retry the transmission
under the assumption he sends the same number to the server.

The server can then look if the nonce was already stored in the database
and then not carry out the payment a second time.

The unfortunate truth is that network failure is very, very common and
can really happen for every single HTTP request.  The reason people mostly
bring it up with payments is because it's the part where you can lose the
most amount distrust in customers.  If you charge someone twice for a
service you can only deliver once you have a problem.

Constraint Failures
-------------------

Upserts do not solve this problem, but upserts make it much easier to deal
with the problem of resubmission in a generic way.  A unique constraint
gets you quite far, but it means that all code needs to be able to deal
with a constraint failure.  For instance to go back to the example of
notification settings.  If each user can only have one notification
setting page, then what happens if accidental concurrency happens and one
of the two transactions fails with a unique constraint failure?  Not
handling it will cause an internal server error most likely.

So how would code respond to this?  The obvious one is to try the insert
first, and then if a constraint failure happens to retry the transaction
with an update.  However this does not solve the problem, because a
concurrent delete might now all the sudden make your update fail.  So if
deletes are allowed, you now need to check if the update worked, and go
back to an insert.

This ultimately is loop that endlessly retries and has not guarantee of
ever succeeding if high concurrency happens.

Upserts are Hard
----------------

It has been brought up multiple times that upserts are hard to implement
in Postgres because there is no efficient way to resolve the concurrency.
This is true, because the only solution currently is to lock the whole
table which has a wide range of problems.  Unfortunately this problem does
not go away if you tell the client to solve it.  People tried many things
to work around it (CTEs which are inherently not concurrency safe, stored
procedures with endless loops, loops on the client through savepoints
etc., denormalization from an immutable append only log of modification)
and all of these solutions are terrible for various reasons.

If Postgres would implement a shitty and inefficient version of an upsert
statement at the very worst it could be as bad as the current
implementation that people write on their own and then at least, there is
an established syntax and a way to improve it further.

I'm deeply disappointed that this will again slip a Postgres release.

As a person not involved in the Postgres development I can't get rid of
the feeling that the main reason this is not progressing is because there
is a lot of emphasis to implement it in a standard compliant way through
the MERGE syntax instead of doing it through a proprietary and restricted
syntax extension in Postgres.

The unfortunate through is that Postgres is currently the only database
that does not have an upsert like functionality.  Even SQLite has some
workarounds by using a join in its replace into clause which is probably
good enough given the limited functionality it needs to provide.

I miss upserts.  A lot.  I just wish that more focus would be put on this
topic, especially now that Postgres is being more and more used as a
replacement for MongoDB.
