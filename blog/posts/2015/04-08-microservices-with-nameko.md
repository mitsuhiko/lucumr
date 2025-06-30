---
tags: ['python', 'soa']
summary: "A basic overview of building service oriented architecture like
microservices with the help of nameko."
---

# Nameko for Microservices

In December some of the tech guys at [onefinestay](http://www.onefinestay.com/) invited me over to London to do some
general improvements on their [nameko](http://nameko.readthedocs.org/en/latest/) library.  This collaboration
came together because nameko was pretty similar to how I generally like to
build certain infrastructure and I had some experience with very similar
systems.

So now that some of those improvements hit the release version of nameko I
figured it might be a good idea to give some feedback on why I like this
sort of architecture.

## Freeing your Mind

Right now if you want to build a web service in Python there are many
tools you can pick from, but most of them live in a very specific part of
your stack.  The most common tool is a web framework and that will
typically provide you with whatever glue is necessary to connect your own
code to an incoming HTTP request that comes from your client.

However that's not all you need in an application.  For instance very
often you have periodic tasks that you need to execute and in that case,
your framework is often not just not helping, it's also in your way.  For
instance because you might have built your code with the assumption that
it has access to the HTTP request object.  If you now want to run it from
a cronjob that request object is unavailable.

In addition to crons there is often also the wish to execute something as
the result of the request of a client, but without blocking that request.
For instance imagine there is an admin panel in which you can trigger some
very expensive data conversion task.  What you actually want is for the
current request to finish but the conversion task to keep on working in
the background until your data set is converted.

There are obviously many existing solutions for that.  Celery comes to
mind.  However they are typically very separated from the rest of the
stack.

Having a system which treats all of this processes the same frees up your
mind.  This is what makes microservices interesting.  Away with having
HTTP request handlers that have no direct relationship with message queue
worker tasks or cronjobs.  Instead you can have a coherent system where
any component can talk through well defined points with other parts of the
system.

This is especially useful in Python where traditionally our support for
parallel execution has been between very bad to abysmal.

## Enter Nameko

Nameko is an implementation of this idea.  It's very similar in
architecture to how we structure code at Fireteam.  It's based on
distributing work between processes through AMQP.  It's not just AMQP
though.  Nameko abstracts away from that and allows you to write your own
transports, while staying true to the AMQP patterns.

Nameko does a handful of things and you can build very complex systems
with it.  The idea is that you build individual services which can emit
events to which other services can subscribe to or they can directly
invoke each other via RPC.  All communication between the services happens
through AMQP.  You don't need to manually deal with any connectivity of
those.

In addition to message exchange, services also use a lifecycle management
to find useful resources through dependency injection.  That sounds like a
mouthful but is actually very simple.  Because services are classes, you
can add special attributes to them which will be resolved at runtime.  The
lifetime of the value resolved can be customized.  For instance it becomes
possible to attach a property to the class which can provide access to a
database connection.  The lifetime of that database connection can be
automatically managed.

So how does that look in practice?  Something like this:

```python
from nameko.rpc import rpc

class HelloWorldService(object):
    name = 'helloworld'

    @rpc
    def hello(self, name):
        return "Hello, {}!".format(name)
```

This defines a basic service that provides one method that can be invoked
via RPC.  Either another service can do that, or any other process that
runs nameko can also invoke that, for as long as they connect to the same
AMQP server.  To experiment with this service, Nameko provides a shell
helper that launches an interactive Python shell with an `n` object that
provides RPC access:

```pycon
>>> n.rpc.helloworld.hello(name='John')
u'Hello, John!'
```

If the AMQP server is running, `rpc.helloworld.hello` contacts the
`helloworld` service and resolves the `hello` method on it.  Upon
calling this method a message will be dispatched via the AMQP broker and
be picked up by a nameko process.  The shell will then block and wait for
the result to come back.

A more useful example is what happens when services want to collaborate on
some activity.  For instance it's quite common that one service wants to
respond to the changes another service performs to update it's own state.
This can be achieved through events:

```python
from nameko.events import EventDispatcher, event_handler
from nameko.rpc import rpc

class ServiceA(object):
    name = 'servicea'
    dispatch = EventDispatcher()

    @rpc
    def emit_an_event(self):
        self.dispatch('my_event_type', 'payload')

class ServiceB(object):
    name = 'serviceb'

    @event_handler('servicea', 'my_event_type')
    def handle_an_event(self, payload):
        print 'service b received', payload
```

The default behavior is that one service instance of each service type
will pick up the event.  However nameko can also route an event to every
single instance of every single service.  This is useful for in-process
cache invalidation for instance.

## The Web

Nameko is not just good for internal communication however.  It uses
Werkzeug to provide a bridge to the outside world.  This allows you to
accept an HTTP request and to ingest a task into your service world:

```python
import json
from nameko.web.handlers import http
from werkzeug.wrappers import Response

class HttpServiceService(object):
    name = 'helloworld'

    @http('GET', '/get/<int:value>')
    def get_method(self, request, value):
        return Response(json.dumps({'value': value}),
                        mimetype='application/json')
```

The endpoint function can itself invoke other parts of the system via RPC
or other methods.

This functionality generally also extends into the websocket world, even
though that part is currently quite experimental.  It for instance is
possible to listen to events and forward them into websocket connections.

## Dependency Injection

One of the really neat design concepts in Nameko is the use of dependency
injection to find resources.  A good example is the SQLAlchemy bridge
which attaches a SQLAlchemy database session to a service through
dependency injection.  The descriptor itself will hook into the lifecycle
management to automatically manage the database resources:

```python
from nameko_sqlalchemy import Session

import sqlalchemy as sa
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

class User(Base):
    __tablename__ = 'users'
    id = sa.Column(sa.Integer, primary_key=True)
    username = sa.Column(sa.String)

class MyService(object):
    name = 'myservice'
    session = Session(Base)

    @rpc
    def get_username(self, user_id):
        user = self.session.query(User).get(user_id)
        if user is not None:
            return user.username
```

The implementation of the `Session` dependency provider itself is
ridiculously simple.  The whole functionality could be implemented like
this:

```python
from weakref import WeakKeyDictionary

from nameko.extensions import DependencyProvider
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

class Session(DependencyProvider):

    def __init__(self, declarative_base):
        self.declarative_base = declarative_base
        self.sessions = WeakKeyDictionary()

    def get_dependency(self, worker_ctx):
        db_uri = self.container.config['DATABASE_URL']
        engine = create_engine(db_uri)
        session_cls = sessionmaker(bind=engine)
        self.sessions[worker_ctx] = session = session_cls()
        return session

    def worker_teardown(self, worker_ctx):
        sess = self.sessions.pop(worker_ctx, None)
        if sess is not None:
            sess.close()
```

The actual implementation is only a tiny bit more complicated, and that is
basically just a bit of extra code to support different database URLs for
different services and declarative bases.  Overall the concept is the same
however.  When the dependency is needed, a connection to the database is
established and when the worker shuts down, the session is closed.

## Concurrency and Parallelism

What makes nameko interesting is that scales out really well through the
use of AMQP and eventlet.  First of all, when nameko starts a service
container it uses eventlet to patch up the Python interpreter to support
green concurrency.  This allows a service container to become quite
concurrent to do multiple things at once.  This is very useful when a
service waits on another service as threads in Python are a very
disappointing story.  As this however largely eliminates the possibility
of true parallelism it becomes necessary to start multiple instances of
services to scale up.  Thanks to the use of AMQP however, this becomes a
very transparent process.  For as long as services do not need to store
local state, it becomes very trivial to run as many of those service
containers as necessary.

## My Take On It

Nameko as it stands has all the right principles for building a platform
out of small services and it's probably the best Open Source solution for
this problem in the Python world so far.

It's a bit disappointing that Python's async story is so diverging between
different Python versions and frameworks, but eventlet and gevent are by
far the cleanest and most practical implementations, so for most intents
and purposes the eventlet base in nameko is probably the best you can
currently get for async IO.  Fear not though, Nameko 2.0 now also runs on
Python3.

If you haven't tried this sort of service setup yet, you might want to
give Nameko a try.
