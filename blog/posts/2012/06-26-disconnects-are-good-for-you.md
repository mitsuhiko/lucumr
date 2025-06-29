---
tags:
  - python
  - thoughts
  - zmq
summary: |
---

# ZeroMQ: Disconnects are Good for You

ZeroMQ is a cool technology.  It's advertised as “better sockets” and I
can get behind that idea for the most part.  Unfortunately the high
abstraction also makes it very easy to write applications that become
unresponsive.  That's because ZeroMQ has an implicit state machine for a
very common socket type that can get stuck in the wrong state if the peer
disconnects.

## Hello ZeroMQ

If you walk over to the ZeroMQ website you will find an example of the
`REQ` / `REP` socket pair.  It works very similar to TCP sockets.  One the
one side you bind the socket to an interface and port, on the other side
you connect to it.  However there is one huge difference between those
two.

When talking about TCP sockets the server socket has a way to `accept` a
new client connection.  In the mainloop you typically wait until you
accept a new connection which then “produces” a new socket.  In ZeroMQ
there are always only two sockets in the request / response relationship.
So how do you send replies back if a request comes?  It works because
ZeroMQ switches state of the request socket.  When the request socket gets
a request it memorizes where the request came from and the next sent
response goes to that socket.

This example server shows the general pattern that is provided by the
documentation.  it runs in a loop and receives a request and sends a reply
back:

```python
import zmq

context = zmq.Context()
socket = context.socket(zmq.REP)
socket.connect('tcp://*:5555')
while 1:
    # Get request
    request = socket.recv()
    # Reply with response
    socket.send('this is anwer to ' + request)
```

The client to this is very simple as well.  Instead of using `REP` it uses
`REQ` as socket type, connect, sends a message and waits for one reply:

```python
import zmq

context = zmq.Context()
socket = context.socket(zmq.REQ)
socket.connect('tcp://localhost:5555')
socket.send('Hello')
message = socket.recv()
print 'Received reply: %s' % message
```

## Cosmic Rays, Zap! POW!!

From the same page that introduces `REP` and `REQ` sockets you can also
find this wonderful paragraph:

> Now this looks too simple to be realistic, but a ØMQ socket is what
you get when you take a normal TCP socket, inject it with a mix of
radioactive isotopes stolen from a secret Soviet atomic research
project, bombard it with 1950-era cosmic rays, and put it into the
hands of a drug-addled comic book author with a badly-disguised fetish
for bulging muscles clad in spandex. Yes, ØMQ sockets are the
world-saving superheroes of the networking world.
>

Now I hope you did not get too much carried away with marketing speak
because I certainly were.  Unfortunately it seems like there is something
terribly wrong with these general pattern.

It's basically this question that shows the problem: what happens if a
disconnect happens between the `send` and the `recv`?  Since ZeroMQ hides
disconnects entirely from you, there is no way to be notified if the
client or the server went away.

Sadly the socket has an implicit state attached so if a disconnect happens
while the socket is in the bound state everything falls apart.  And to the
best of my knowledge there is no way to force the socket into a different
state by hand.

Imagine this piece of code on the server:

```python
import zmq

while 1:
    # Receive a request
    request = socket.recv()
    # Reply with a response, but sadly we get an exception
    raise Exception('Unfortunately this failed')
    socket.send('this is answer to ' + request)
```

So before the server was able to reply with a response the server died of
an exception.  Very unfortunate.  If this was a TCP based server you would
just restart the server after this incident, the client got a connection
reset and would hopefully try again.  In ZeroMQ you're now in a worse spot
after the server restart.  The server's socket is in the “accepting
requests” state again but the client never noticed the server to disappear
and is still waiting for the reply to come.  This however will never
happen.

This behavior should probably be obvious but I have never seen a ZeroMQ
example that did not suffer from that.  The Python bindings make that even
worse by providing you with `recv_json` and `send_json` methods.  What
happens if you send invalid JSON data to such a ZeroMQ endpoint?  Correct:
an exception and most likely a stuck client.

But this is not limited to uncaught exceptions.  The authorization flow of
[salt](http://saltstack.org) is taking long enough on our servers that
if you restart the salt master in the wrong moment you end up with a stuck
minion.  Very annoying behavior because it means someone has to SSH into
the server restarting the stuck process.  If your server management tool
gets stuck that's very much the worst case scenario.

## How to Prevent?

With that knowledge, how do you prevent this from happening?
Unfortunately there is no easy cure.  The only thing I can think of is
adding timeouts to all calls.  Since ZeroMQ by itself does not really
provide simple timeout functionality I recommend using a subclass of the
ZeroMQ socket that adds a `timeout` parameter to all important calls:

```python
from functools import update_wrapper
import zmq

class Socket(zmq.Socket):

    def __init__(self, ctx, type, default_timeout=None):
        zmq.Socket.__init__(self, ctx, type)
        self.default_timeout = default_timeout

    def on_timeout(self):
        return None

    def _timeout_wrapper(f):
        def wrapper(self, *args, **kwargs):
            timeout = kwargs.pop('timeout', self.default_timeout)
            if timeout is not None:
                timeout = int(timeout * 1000)
                poller = zmq.Poller()
                poller.register(self)
                if not poller.poll(timeout):
                    return self.on_timeout()
            return f(self, *args, **kwargs)
        return update_wrapper(wrapper, f, ('__name__', '__doc__'))

    for _meth in dir(zmq.Socket):
        if _meth.startswith(('send', 'recv')):
            locals()[_meth] = _timeout_wrapper(getattr(zmq.Socket, _meth))

    del _meth, _timeout_wrapper
```

Now instead of calling `s.recv()` you would call `s.recv(timeout=5.0)` and
if a response does not come back within that 5 second window it will
return `None` and stop blocking.  For most applications it probably makes
more sense to raise some sort of signalling exception in `on_timeout`
which bubbles up to whatever mainloop is there and handle it there.

This could probably be improved by having a background thread that uses a
ZeroMQ socket for heartbeating.  That way you could detect disconnects
easier.  The problem with the general timeout is that some
request/replies might take a while to go through and legitimate replies
could exceed that 5 second window.  Also if you expect a lot of
disconnects the 5 seconds might be too much in general.

## Better Solutions

I was thinking about the problem a little bit and I am not sure if there
is a better solution for that particular problem.  Disconnect detection is
a general problem if there is a high level of abstraction.  I was running
into a similar problem when I tried using redis lists as a communication
layer for a monitoring system.  If the application dies it will not have
the chance to send a disconnect signal, at least not reliably — a timeout
is the only chance you have.

However on the TCP level the operating system is responsible for sending
disconnect information and heartbeating which makes this a lot more
reliable.  Even if your app is stuck for 60 seconds doing nothing, the OS
will still not terminate the connection.  On top of that is TCP something
that multiple components along the route speak.  Network equipment in the
middle also close your connection if they detect problems on the network.

A userspace level communication protocol like ZeroMQ can't really benefit
from all of that.  ZeroMQ could provide an API that provides disconnect
information if it can get that from the layer it sits on, but part of the
ZeroMQ design is that TCP is just one possible implementation and I don't
know if it helps to bring disconnect information back.

I suppose the better solution for the problem would be to memorize the
state the socket is in in your app and to bring it by hand into the state
before the crash/restart.  If for instance I could write the application
in a way that if I restart it, it restarts exactly at the point where it
left off, ZeroMQ's behavior would work fine again.
