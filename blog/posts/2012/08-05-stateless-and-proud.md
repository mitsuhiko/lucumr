---
tags:
  - python
  - thoughts
  - web
summary: "Why the real time web does not require changes on your web framework
and why those changes are actually not at all what you want."
---

# Stateless and Proud in the Realtime World

There is one question that comes up with Flask (and I can only suspect
Python web applications in general) more than anything else: and that is
when will we be able to do realtime applications in Flask.  The only
proper answer to this from my point of view has been: since forever.  But
not in the way you might think.

I'm going to argue that the overall stateless design of modern web
frameworks is perfectly adequate even for more realtime environments.

## What is Realtime?

Now this is where the whole problem starts.  What actually does realtime
mean.  If we keep the marketing side of things away the only difference
between realtime and not realtime in web applications is that realtime is
pushing, non realtime is polling.

Let's take a concrete example where these two different paradigms are both
applicable to the same problem but in different ways.  The most basic
example here is writing a chat application where different users can talk
to each other.

When the transport method is push a client sits there and waits for
messages to arrive.  If we would have a bidirectional communication
channel like TCP that's how applications used to work for a really long
time.  IRC is fundamentally just that: client A sends a message into the
TCP socket, the server receives that and forwards that message to all
other clients that share a channel with client A.  The latency for that
transmission is basically network latency + processing latency on the
server.

On the other side there is HTTP.  HTTP by itself is still a two way
communication protocol but you can only send one request and get one
response.  Each request and response cycle is independent and in theory
also very stateless.  Based on those restrictions people implemented chat
systems on the web in the past by making periodic HTTP requests (for
instance once per second) to figure out if something on the server
changed.  That's the inverse of push and often referred to as polling.
I still send a message to the chat server but that one then does not
directly send it to you but stores it in a queue.  Next time the recipient
polls for new messages the queue contents are delivered and the queue is
emptied.

## Avoiding Polling

Now let's ignore for a time being the problem of how we build such systems
on the server and focus on the more pressing question: how can we avoid
polling in browsers?  Push based HTTP is not exactly new.  Long before web
sockets people were able to push information to browsers.  Netscape added
a server push system to their browsers a long time ago.  If you ever used
Bugzilla and did a search you will have seen this functionality in action.
Instead of the browser sitting there on the loading circle for a long time
it instead showed you the Mozilla dragon munching on bugs until the
results were ready and then the loading splash disappeared and the results
came up.  This functionality was not well supported by anything but
Mozilla browsers so it never became widespread.

Another way to get information to the client in realtime is commonly named
“long polling”.  The idea is that instead of repeatedly polling the server
for results you poll it once and the server just does not reply with “no
new messages” but it waits there until a message comes up.  This has the
advantage over regular polling that you get the message with a lower
latency assuming you have a connection open (basically just the network
latency) but you can only get one message that way.  Once the result is
there you have to start the long polling process again.

There are however many more ways to push information to browsers.  A
common trick was opening an iframe in the background and let the server
stream pieces of javascript that invoked callback functions with provided
JSON data.  Neat, but obviously a huge hack.

And then as of lately we have websockets.  The idea behind those is that
you use HTTP only to establish a connection and then use the upgrade
functionality of HTTP to convert away from HTTP into a different TCP based
protocol.  Thanks to all the badly written HTTP proxying middleware around
this works best if you do an end to end encryption via SSL on top so that
nobody can break your communication channel.

## Push is a Solved Problem

Pushing information from the server to the client is as of now a solved
problem.  Depending on what browsers you want to support you might have to
provide more than one solution but at the end of the day people already
spend time on that and provided helper libraries that chose different
transport formats for you.  At first there was socket.io, now there is
SockJS and other projects that help you getting push going.

Now however when you ask around in the Python web development community
you will hear voices that realtime web requires new paradigms and
frameworks and someone has to replace WSGI with a new protocol.  People
are trying to revive Twisted and cling to Tornado because it is so
asynchronous, fast and realtime.

## Persistent Connections

Alright.  The plan is to do a push based web application.  It means we
will have to deal with persistent connections of clients.  They want to
keep the connection open for as long as possible, ideally they never
disconnect at all unless they want to.  If that standing connection is
directly exposed to your application internally I bet with you that you
will associate state with that standing connection.  What do I mean by
that?  I mean you will write code like this:

```python
def chat_application(connection):
    username = None
    while not connection.closed:
        event = connection.poll()
        if event['type'] == 'whoami':
            username = event['data']['username']
        ...
```

Basically when the connection is established the client sends something
into it which is then kept around until the connection is closed.  The
direct consequence of that is that even if you have a proxy for the
connection around, a code update means disconnecting all clients.  Also
one of your workers now has a standing connection to a client, you can't
relocate that connection to another worker.

The more direct consequence of that code however is that it mixes badly
with traditional request/response based HTTP.  HTTP is kinda stateless.
While this paradigm is violated to some degree with the concept of cookies
you can still easily build applications where the same client can be
dispatched to different workers without breaking your application.

If I browse a large website my client can be routed to different workers
for each independent request.  Many applications (and all Flask
applications by default) will even used cookies with a MAC to store your
session information so that you can pass state between independent workers
without requiring a single database operation.

It seems wrong to give up on these design ideas that make HTTP powerful
just because we want to go from poll to push.  But we don't have to!

## Publish — Subscribe

Now unfortunately what's happening from here onwards is something you need
to implement yourself.  Mainly because the only open source implementation
of the general concept I found was Juggernaut which happens to be no
longer maintained.  Also it was not particularly good to begin with but
that does not invalidate the concept.

It's basically how we're approaching the problem at [Fireteam](http://fireteam.net/) albeit not for web browsers and not for Flask.
It is however how I believe these problems should be solved.

Basically we have a bunch of workers that run pretty much off-the-shelf
Python web applications.  What makes them more interesting than your
regular Flask application is that almost all requests going into the
infrastructure are separated from their HTTP request (if you're curious
about that see [We're doing HTTP right](http://fireteam.net/blog/were-doing-http-right)) and only the payload
of the request is processed.  Once we know what a request does (where it's
routed, what data was transmitted with it) we're calling a function that
is responsible for providing a response and the result is then serialized
into an HTTP response again and sent to the client.

Now up to that point nothing too fancy as far as the concept is concerned.
What makes it interesting however is that instead of going via HTTP it is
also possible to put the payload and some meta information onto a redis
queue instead.  The worker will pick it up like it picks up an HTTP
request but instead of making the response into an HTTP response it
publishes the result to a redis channel.

See where this is going?  We're using a regular Python web application but
we can send results to something other than an HTTP response and we can
handle requests other than HTTP bound requests.

Now when we do realtime we have one server that is sitting on a different
hostname and does nothing else but accepting TCP connections and keeping
them open.  There is a little bit of handshaking open so that we can
associate that connection with a specific user account and then it gets a
unique connection id.

The advantages are huge for us.  Each standing connection at the core is
still very stateless unless it does not want to be.  The same rules apply
as for regular requests to the system.  We can upgrade the worker code
without closing any client's connection.

Each standing connection to our server can subscribe to different
channels and there is also a private channel for a specific connection.

## Realtime in a Nutshell

To make realtime work this way you end up with four separate components:

- **Flask** (or any other WSGI app if you want) would continue to work
as it does.  However there is probably also a separate way to feed
requests to that application.  In our case we're putting requests on a
queue.

- **redis** for pubsub.  If you want biredirectional, you can also use
it as a message queue from the realtime server to the flask app.

- **a realtime server** that maintains the standing connections and
subscribes to redis.  The messages that come from redis are then
sent to the connected clients that want them.  If you want
bidirectional communication you can also accept messages from the
clients and put them on the queue for Flask to pick up.

- **a regular webserver** for exposing your WSGI app to the web.  This
could be nginx, Apache or whatever floats your boat.

As far as the framework is concerned nothing changes.  The only difference
is that you have a way to publish information.

## Pubsub at the Core

Now we did not come up with that concept.  In one form or another it was
already implemented by people before.  Juggernaut, pubnub, pusher,
beaconpush and many others provide that as a webservice really.  And at
the end of the day it's really just message passing.

However I have seen people respond to such suggestions in general very
negatively.  These kind of solutions are commonly seen as workarounds or
hacks.

I strongly disagree with that sentiment.  I believe that a stateless
communication protocol is what makes the web great and it can be extended
to the realtime web without removing functionality.  As a side effect it
gives you a more decentralized infrastructure and a better experience
for your or connected clients when upgrading the worker code.

## Framework Future

I am very convinced that Python frameworks will not change much when the
people demand more realtime on the web.  They will employ pubsub designs
more and similar things, but they will not start keeping Python processes
alive for a long time that keep connections open.  At least my personal
belief is that this is the wrong way to solve the problem.

Eventually I would love to make a new version of Flask that employs some
of the design principles of the Fireteam codebase in it since I believe
that is a much better way to develop remote APIs and web applications.
Until that happens though I want to share my thoughts on that topic so
that others might dive into making a reusable implementation of these
concepts instead of going down the road of making yet another Tornado.
