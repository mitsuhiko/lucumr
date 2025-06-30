---
tags:
  - python
  - websocket
summary: |
  Quick introduction into the final specification of websockets
  (:rfc:`6455`).
---

# Websockets 101

Out of curiosity I taught the [Fireteam](http://fireteam.net/) presence
server websockets as a protocol in addition to the proprietary protocol it
speaks out of the box.  I don't really have a usecase for websocket per-se
with the server, but I thought it might make it more useful for
customers that want to use the event based parts of the API with HTML5
games.  This post focuses on implementing websockets on the server, not so
much about how you would use them from the client and basically collects
all thing I wish I would have known before.

## What are Websockets

So let's start with that part first.  What are websockets and why would
you use websockets?  Basically only if you want to have a bidirectional
communication between an actual web browser and some server.  Websocket is
not necessarily a good protocol if neither of the endpoints is an actual
browser.  Websockets suffer a lot under the restrictions and
implementation details that were forced upon the protocol to make it work
with existing HTTP infrastructure.

Websockets in the current iteration as specified by [RFC 6455](https://tools.ietf.org/html/rfc6455.html) do a bunch
of things differently to what a raw TCP connections does.  The name
websocket gives the impression that it's a traditional socket.  In
practice it combines the parts of UDP and TCP:  it's message based like
UDP, but it's reliable like TCP.  So assuming you know what TCP is, here
is what websocket adds on top of that:

- it upgrades from HTTP 1.1 through a system previously defined as part
of the HTTP specification (upgrade header).

- it sends the origin domain in the upgrade so that connections can be
restricted to prevent CSRF attacks.  This works similar to CORS for
XMLHttpRequest.

- Through the HTTP handshake it becomes feasible to proxy the connection
without losing information (a proxy could inject an `X-Real-IP` or
`X-Forwarded-For` header).

- It sends messages.  Each message can also carry control information
and is wrapped in a frame.

- Messages sent from the client to the server are obfuscated with a
basic transmission mask of 4 bytes which is sent within each websocket
package.  Messages can be of utf-8 text type or binary nature.

- It adds an agreed way for the two peers to signal that the connection
is about to be terminated that does not rely on the underlying TCP
connection.

- Builtin heartbeating support.  That's actually pretty nifty because
the application code in the browser does not have to deal with
keeping the connection alive and can just assume that either the
server or the browser will make sure that they exchange ping/pongs.

## When to use them?

Websockets make you sad.  There, I said it.  What started out as a really
small simple thing ended up as an abomination of (what feels like) needles
complexity.  Now the complexity comes for a reason.  The protocol went
through many iterations and basically had to be changed multiple times
because of unforeseen security problems that came up with misbehaving
proxies.  The protocol I created for the internal communication of our
server is upgrading from HTTP just like websockets do, but without the
“secure” parts.  And here is why it does not matter:

Everybody knows about HTTP proxies.  We have proxies that do load
balancing on the application side, we have proxies that do SSL offloading,
we have proxies for all kinds of things.  Unfortunately outside our
internal infrastructure everyone of us also has to deal with HTTP proxies
in corporate networks, and worse, on mobile network connections.  The
amount of shitty HTTP middleware installed all around the world is just
staggering.  And this pretty much has shown me that the only way you can
do anything useful these days is by putting TLS on top of everything and
just force people to stop with their shenanigans.  On O2's mobile networks
you cannot use websockets unless they are encrypted.  You cannot get
websocket connections through Amazon's ELB (Their load HTTP/TCP balancer).
Heck, you can't even get PATCH as an HTTP method through the ELB.

Everything that Fireteam will be doing will most likely always be behind
an encrypted connection.  It guarantees me that nothing can do funny
things with the data I'm sending around.  And as a positive side effect I
don't have to mask my communication like websocket does because I know the
software stack on my side until it hits the internet.  The communication
gets encrypted and I know nobody is going to change my data on the way to
the client.

In fact, I would also recommend to always use websockets through TLS.
Even if you don't care about the security side of things you will still
benefit from the fact that your websocket connections succeed in many more
cases.  Not encrypting your connection is definitely something you will
regret sooner or later.

## The Handshake

Alright.  After this fairly long disclaimer you're still there, which
probably means you still want to do websockets.  Fair enough.  Now let's
start with the basics, the handshake.  This is where everything starts.
It upgrades your connection from HTTP to something else.  For the internal
protocol we recommend to customers we upgrade our HTTP connection
basically to a raw TCP connection.  Websockets are not an upgrade to TCP,
it's an upgrade to a message based communication.

To begin: why would you upgrade from HTTP instead of directly starting
with TCP as a protocol?  The reasons for why Fireteam's protocol starts
with HTTP not all that different from why websockets upgrade from HTTP.

Websockets upgrade from HTTP because it was believed that people would
develop servers that serve both websocket connections as well as HTTP
ones.  I don't believe for a second that this will be what people do at
the end of the day however.  A server that handles stateless requests to
answer with a reply has a very different behavior than a server that keeps
TCP connections open.  However the advantage is that websockets use the
same ports as HTTP and HTTPS do and that is a huge win.  It's a win
because these are privileged ports (< 1024) and they are traditionally
handled differently than non privileged ports.  For instance on a linux
system only root can open such ports.  Even more important: ELB only lets
you open a handful of these privileged ports (25, 80 and 443 to be exact).
Since ELB also does socket level load balancing you can still do
websockets on Amazon, just not through their HTTP local balancer.

We're handling our persistent presence protocol very differently than our
HTTP webservice but we still benefit from the HTTP upgrade in some edge
cases.  That's mainly where we have to tunnel our communication through a
HTTP library because arbitrary socket connections are not possible for
security or scalability reasons.  If you have ever used Google Appengine
or early Windows Phone you will have noticed that HTTP connections are
possible where regular socket connections are not.

You will also see that many corporate networks only allow certain ports
outgoing.  The fact that websockets use the same port as HTTP/HTTPS make
this much more interesting.  If anyone has ever used the flash socket
policy system will know that pain.  Currently it's entirely impossible to
use flash sockets behind Amazon's ELB because the Flash VM will attempt to
connect to port 843 to get authorization information.  That's a port you
can't open on the ELB.  So the idea of starting with HTTP is pretty solid.

HTTP always supported upgrades, but unfortunately many proxies seem to
have ignored that part of the specification.  The main reason for that
probably is that until websockets came around nobody was actually using
the `Upgrade` flag.  There was an SSL upgrade RFC that used the same
mechanism but I don't think anyone is using that.

Alright.  So what does the handshake look like?  The upgrade is initiated
by the client, not by the server.  The way Fireteam upgrades the
connection is by following the old SSL RFC and looks like this:

```
OPTIONS / HTTP/1.1
Host: example.com
Upgrade: firepresence
X-Auth-Token: auth-info-here
```

The server then replies by upgrading:

```
HTTP/1.1 101 Switching Protocols
Upgrade: firepresence/1.0
Connection: Upgrade
```

If the upgrade header was missing, the server instead answers with 426
Upgrade Required:

```
HTTP/1.1 426 Upgrade Required
```

What's interesting about this is that the upgrade require status code is
defined, but it does not show up in the HTTP/1.1 RFC.  Instead if does
come from that SSL RFC.

Websockets upgrade very similar, but they are using `400 Bad Request` to
signal a missing upgrade.  They also transmit a special key with the
upgrade request which the server has to process and send back.  This is
done so that a websocket connection cannot be established with an endpoint
that is not aware of websockets.  Here is what the handshake looks like
for the client:

```
GET / HTTP/1.1
Host: example.com
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==
Origin: http://example.com
```

The websocket key here are random bytes.  The server takes these bytes and
appends the special string `258EAFA5-E914-47DA-95CA-C5AB0DC85B11` to it,
then creates the SHA1 hash from it and base64 encodes the result (the
bytes, not the hexadecimal representation).  The magic string looks like a
UUID and also is one, but that's completely irrelevant because the exact
string needs to be used.  A lowercase representation or braces around the
string would obviously fail.  That value is then put into the
`Sec-WebSocket-Accept` header.  When the server has computed the value it
can send an upgrade response back:

```
HTTP/1.1 101 Switching Protocols
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=
```

The handshake can also include a protocol request and the websocket
version information but you can't include arbitrary other headers.  If you
compare the websocket upgrade with our own upgrade you will notice that we
can't transmit the authorization information.  There are two ways around
that.  You can either transmit the authorization information as the first
request or put it into the URL as query parameter.

Also notice that the `Sec-WebSocket-Accept` header brings it's own
grammar for the value.  Normally you would expect you can quote the value
but the specification specifically requires a base64 value there:

```
Sec-WebSocket-Accept     = base64-value-non-empty
base64-value-non-empty = (1*base64-data [ base64-padding ]) |
                         base64-padding
base64-data      = 4base64-character
base64-padding   = (2base64-character "==") |
                   (3base64-character "=")
base64-character = ALPHA | DIGIT | "+" | "/"
```

## Websocket URLs

Alright.  As if websockets were not painful enough as they are, someone
had the amazing idea to also introduce a new URL scheme.  Two in fact.
`ws://` and `wss://`.  Sounds like a tiny change from `http` to
`https` but unfortunately that's not the case.  URLs have scheme
specific grammar.  For instance FTP URLs can have authorization
information in the netloc part (`ftp://username@server/`) whereas HTTP
can't.  `mailto` URLs don't have the leading slashes etc.  Websocket
URLs are special in that they do not support anchors (`#foo`).  Now why
would that matter?  It matters because whoever created the URL parsing
module in Python also decided that they should stick as closely as
possible to the strict standard that you cannot throw arbitrary URLs at
the module.  For instance if you would try to parse websocket URLs you
quickly realize that the results are just wrong:

```pycon
>>> import urlparse
>>> urlparse.urlparse('wss://foo/?bar=baz')
ParseResult(scheme='wss', netloc='foo', path='/?bar=baz',
            params='', query='', fragment='')
```

The reason why websockets have a separate URL is beyond me.  I suspect it
stems from the fact that the RFC hints towards eventually dropping the
upgrade from HTTP so the HTTP URL would not make much sense.  In any case
it's just a very annoying example of where we now have to things now that
were previously unnecessary.

Also since it's a different protocol, protocol relative links will
obviously not work.  You will have to switch between `wss` and `ws` by
hand.

Otherwise the same rules as for HTTP style URLs apply.  Namely that `ws`
is unencrypted and has port 80 as default port and `wss` requires TLS
encryption and port 443 as default.

## Authorization and IPs

Before we dive further into websockets let me throw yet another problem at
you.  Since proxying is a word that comes up with websockets so very often
we should probably talk about how proxies work there.  HTTP in the
original RFC does not really talk much about TCP and IP addresses don't
show up in there either.  However it has become clear over the last couple
of years that there is a lot of value behind knowing which IP address
connects to your server.  Traditionally this is doing by looking at the IP
address that is stored in the individual IP packets.  Unfortunately this
falls short the moment you start proxying HTTP through another server.

There are two headers that have become popular to remedy that situation.
The first one is `X-Forwarded-For` which can contain one or multiple IPs
of servers that took part in the request.  Each proxy server would add the
remote address of the request to the header.  So if you have a user agent
at 192.168.0.100 connect to 192.168.0.200 which acts as a proxy for
192.168.0.201 you end up with an `X-Forwarded-For` of `192.168.0.100`.
Bring in yet another proxy server that one would append it's own IP
address to that list.

Now there has to be a limit to this.  Usually what you do is you configure
the first HTTP server to reject any already set `X-Forwarded-For`
headers or users can just use a browser extension or a proxy to inject a
forged value in there.  And people do that.  I remember that people did
exactly that to get American streaming content available in Europe by just
injecting an American IP into that header.

With websockets it's worse.  Odds are that your frontend proxy is doing
TCP level proxying.  If it would be doing HTTP level load balancing and
it would understand the `Upgrade` header it you could make it inject an
`X-Forwarded-For` header and then read that on the server.  However
Amazon's ELB as mentioned only works with websockets if you set it to TCP
level proxying for instance.  And with that you lose your remote address.
Maybe not a problem for you, it definitely is a problem for us.  Now I
know that protocols exists to inform a peer about the IP address on the
other side of a proxy connection, but ELB does not speak it so it's a
rather uninteresting thing for me.

The way our server works is pretty similar to how the node.js juggernaut
server used to work.  You connect to a presence server that holds your
socket connection open and acts as a central hub that uses other means to
communicate with backend services.  We have a pretty lightweight server
and we don't want to make it too complicated to authorize requests against
it.  Namely we don't want to implement OAuth a second time for that server
when we already use it for the strictly request/response based webservice
infrastructure.

The trick we use for that is that we let a user authorize against the
webservice infrastructure through OAuth and then call an endpoint that
gives you a ticket that is valid for a few seconds.  That ticket is stored
in redis.  It contains your account ID and a few important internal
attributes, but we also store the IP on it which you used at the time the
ticket was generated.

With that ticket you go to the presence server and redeem it.  The
presence server only needs to connect to redis and check if such a ticket
exist and delete it.  Since we already use redis anyways in that server
it's a pretty simple undertaking.  We obviously assume here that nobody
takes the ticket between IP addresses.  We can't gurantee that this does
not happen but we don't care about the implications either.  Someone could
obviously create the ticket through a VPN and then disable the VPN
connection when it's time to connect to the presence server.  But to be
honest: I don't care.  It's as far as I am concerned, no security problem.

In theory the spec says you can also use any of the HTTP authorization
systems (basic auth, cookies etc.) but since you can't customize the
headers with the JavaScript API that are being sent with the handshake you
are basically very limited to implicit auth or auth through one of the
first requests / URL based.

## Framing

Now that we know how we can connect to the websocket server, how to
upgrade to the websocket protocol and how authorization can be handled
without losing the IP address information even if we do TCP level load
balancing.  The next thing you have to know is how websocket transfer
works.  As mentioned earlier websocket is not a stream based protocol like
TCP, it's message based.  What's the difference?  With TCP you send bytes
around and have to make sure (for the most part) that you can figure out
the end of a message.  Our own protocol makes this very easy because we
send full JSON objects around which are self terminating.  For naive JSON
parsers (like the one in the Python standard library) that cannot parse of
a stream we also add a newline at the end and ensure that all newlines in
JSON strings are escaped.  So you can just read to the newline and then
hand that line to the JSON parser.

Websockets makes this easier because it puts a frame around everything.
Upside: easier to handle from the JavaScript side, downside: much harder
to handle on the server side because you now need to wrap everything in
frames.

So let's have a look first how the frames are defined.  This is what the
RFC provides us with:

```
+-+-+-+-+-------+-+-------------+-------------------------------+
 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
+-+-+-+-+-------+-+-------------+-------------------------------+
|F|R|R|R| opcode|M| Payload len |    Extended payload length    |
|I|S|S|S|  (4)  |A|     (7)     |             (16/64)           |
|N|V|V|V|       |S|             |   (if payload len==126/127)   |
| |1|2|3|       |K|             |                               |
+-+-+-+-+-------+-+-------------+ - - - - - - - - - - - - - - - +
|     Extended payload length continued, if payload len == 127  |
+ - - - - - - - - - - - - - - - +-------------------------------+
|                               | Masking-key, if MASK set to 1 |
+-------------------------------+-------------------------------+
| Masking-key (continued)       |          Payload Data         |
+-------------------------------- - - - - - - - - - - - - - - - +
:                     Payload Data continued ...                :
+ - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - +
|                     Payload Data continued ...                |
+---------------------------------------------------------------+
```

Good news first:  as of the websocket version specified by the RFC it's
only a header in front of each packet.  The bad news is that it's a rather
complex header and it has the frighting word “mask” in it.  Here are the
individual parts explained:

- `fin` (*1 bit*): indicates if this frame is the final frame that
makes up the message.  Most of the time the message fits into a
single frame and this bit will always be set.  Experiments show that
Firefox makes a second frame after 32K however.

- `rsv1`, `rsv2`, `rsv3` (*1 bit each*): it wouldn't be a proper
protocol if it did not include reserved bits.  As of right now, they
are unused.

- `opcode` (*4 bits*): the opcode.  Mainly says what the frame
represents.  The following values are currently in use:

`0x00`: this frame continues the payload from the last.  
`0x01`: this frame includes utf-8 text data.  
`0x02`: this frame includes binary data.  
`0x08`: this frame terminates the connection.  
`0x09`: this frame is a ping.  
`0x0a`: this frame is a pong.  

(As you can see, there are enough values unused, they are reserved for
future usage).

- `mask` (*1 bit*): indicates if the connection is masked.  As it
stands right now, every message from client to server *must be masked*
and the spec wants to to terminate the connection if it's unmasked.

- `payload_len` (*7 bits*): the length of the payload.  7 bits is not
enough?  Of course not.  Websocket frames come in the following length
brackets:

0-125 mean the payload is that long.  126 means that the following two
bytes indicate the length, 127 means the next 8 bytes indicate the
length.  So it comes in ~7bit, 16bit and 64bit.  I don't even have
words for this.  My browser fragments off after 32K of payload
anyways, when would I ever send a package of 64bit size (oh well, the
most significant bit must be null at least)?  32bit would have been
plenty but oh well.  This also means there is more than one way to
represent the length but the spec is very clear about only using the
shortest possible way to define the length of a frame.

- `masking-key` (*32 bits*): if the mask bit is set (and trust me, it
is if you write for the server side) you can read for unsigned bytes
here which are used to xor the payload with.  It's used to ensure that
shitty proxies cannot be abused by attackers from the client side.

- `payload`: the actual data and most likely masked.  The length of
this is the length of the `payload_len`.

Why websockets are frame based and not stream based?  Probably because
JavaScript lacks the tools to deal with stream data.  Personally I take a
stream based socket over a frame based one every day because if I really
need frames, I can express them on top of a stream ones easily.

## Data Frames

Let's start talking about the data on the frames.  As mentioned before the
data can be fragmented into multiple frames.  The first frame that
transmits the data has a opcode on it that indicates what sort of data is
being transmitted.  This is only really necessary because JavaScript has
pretty much nonexisting support for binary data at the time the
specification was started and now we have to live with it.  `0x01`
indicates utf-8 encoded text data, `0x02` is binary data.  Most people
will transmit JSON over that thing anyways in which case you probably want
to chose the text opcode.  When you emit binary data it will be
represented in a browser specific `Blob` object.

## Fragmentation and Masking

Ah, the best part.  Payload data can be split up into multiple individual
frames.  The receiving end is supposed to buffer them up until the `fin`
but is set.  So you can transmit the string `Hello World` in 11 packages
of 6 (header length) + 1 byte each if that's what floats your boat.
However fragmentation is not allowed for control packages.  However
the specification wants you to be able to handle interleaved control
frames.  You know in case TCP packages arrive in arbitrary order :-/.

The logic for joining frames is roughly this:  receive first frame,
remember opcode, concatenate frame payload together until the `fin` bit
is set.  Assert that the opcode for each package is zero.

The reason for fragmentation supposedly that you can generate bits and
pieces of information on the server and send them to the client to buffer
up instead of the server and vice versa.  It's annoying to handle on both
client and server but I can see how it makes it easier for a JavaScript
programmer to handle.  The dirty bits of the transport protocol are
entirely hidden away.  Since the server's native protocol was entirely
based on the concept of streaming JSON there is zero value in the
messages.  I suppose that will be a common thing for people adding
websocket support to servers that previously spoke some other protocol on
top of TCP.

But when dealing with the payload we not only have to concatenate frames
together, we also have to unmask them.  The unmasking is pretty simple
once you have the mask key:

```c
uint8_t payload[payload_len];
read_bytes(payload, payload_len);
for (i = 0; i < payload_len; i++)
    payload[i] ^= mask[i % 4];
```

Masking is the best part because it makes debugging so incredible fun.

Why is there masking at all?  Because apparently there is enough broken
infrastructure out there that lets the upgrade header go through and then
handles the rest of the connection as a second HTTP request which it then
stuffs into the cache.  I have no words for this.  In any case, the
defense against that is basically a strong 32bit random number as masking
key.  Or you know… use TLS and don't use shitty proxies.

In the case of our proprietary protocol that's not even a problem because
we only allow JSON requests.  As such if you would attempt to attempt to
submit a HTTP request in place of a JSON payload the server would respond
with a generic error message which is not very useful attacking purposes.
But really… use TLS and don't use shitty proxies.

## Heartbeating

Heartbeating is useful, I can agree with that.  First of all certain
things (like ELB  \o/) will terminate idle connections, secondly is it not
possible for the receiving side to see if the remote side terminated.
Only at the next send would you realize that something went wrong.  With
websockets you can send the ping opcode at any time to ask the other side
to pong.  Pings can be sent whenever an endpoint thinks it should and a
pong is sent “as soon as is practical”.  Someone also decided that
something like ping and pong are too simple so they were “improved” so
that they can carry application data and if you pong you have to send the
payload of the ping back.  Sounds easy enough to implement but this
actually can make it fairly annoying to deal with because now there is
something you have to remember from a ping to a pong (and that application
data an be up to 125 bytes).

Since you can't send pings/pongs yourself anyways from JavaScript I chose
to ignore the application data part for the moment until I find a browser
that actually sends something there.  (If it does, I will be very sad and
complain loudly on Twitter)

## Closing the Connection

Lastly: closing connections.  Now to go with the rest of the pattern
websocket rolls its own thing here.  In theory a TCP disconnect should
work as well but it looks like that at least Firefox just reconnects on
connection drop.  Instead a connection is terminated by sending the close
opcode (`0x08`).  There the pattern seems to be to exchange close
opcodes first and then let the server shut down.  The client is supposed
to give the server some time to close the connection before attempting to
do that on its own.  The close can also signal why it terminated the
connection.  The lazy person I am I just did not care and just close.
Important however is that you do send the opcode around, otherwise at
least Firefox will not really believe that you closed the connection.

It should be said that the specification does not introduce a close opcode
just because to make the protocol more complex.  It does have actual use
in that it makes the disconnect more reliable.  Anyone that ever had to
deal with TCP disconnects will know that this can be a somewhat tricky
thing to do and behaves differently on different environments.  That being
said, I don't believe that websocket implementations will get disconnects
right either which now leaves developers on both sides hope that the
implementation is correct.  It's too far from TCP that you could fix the
problem yourself if you are programmer that writes the client-side
implementation.

## Browser Differences

There are also differences between how browsers respond to websockets.
For instance if you do not provide an application level protocol with
Chrome but the server emits the `Sec-WebSocket-Protocol` header Chrome
will loudly complain about a protocol mismatch whereas Firefox does not
care a single bit.  Safari 5.1 (the one I have installed) does not speak
the current protocol of websockets and sends different headers altogether.

What's also interesting is that Firefox treats the upgrade as an actual
HTTP request and sends the regular headers (User agent, DNT flag, accept
headers, cache control, etc.).  On the other hand Chrome will just submit
the bare minimum and special cases the cookie header.  As such you won't
be able to do browser based detection just from the handshake.

## Lessons Learned

Websockets are complex, way more complex than I anticipated.  I can
understand that they work that way but I definitely don't see a value in
using websockets instead of regular TCP connections if all you want is to
exchange data between different endpoints and neither is a browser.  If
you do want to make them work I recommend the following things:

- keep your websockets miles away from the rest of your application
code.  Keep them in separate server if you can.  They have completely
different performance characteristics than your regular HTTP requests
and I would not be surprised if they moved further from HTTP in the
future.  Instead use something to communicate from your websocket
server to the rest of the infrastructure (redis pubsub for instance).

- Expect websockets to not be implemented entirely correct.  When I got
my implementation working I was not even at ~50% of RFC compliance but
it already worked good enough that I did not bother too much with it.
I am pretty sure I won't be the last person that creates a half-arsed
websocket implementation.

- Require TLS.  Unless you are debugging websockets locally always
require TLS/SSL.  There are just too many broken HTTP implementations
out there that break websockets.

- Consider a one-time-token auth system for establishing the connection
instead of teaching your websocket server how to read your cookies /
sessions.  It's easier to handle and more flexible.  And it's also the
perfect solution to get the whole thing running behind the ELB (which
I can recommend because it does perfect SSL offloading and provides
you with virtual IP addresses in case you need to speak to endpoints
that don't do SNI).

## Going Forward

Looking at the RFC it's pretty clear that websockets won't be getting any
simpler any time soon.  It hints towards adding multiplexing support and
dropping the remaining HTTP upgrade parts.  Also there is a builtin
extension system that will soon be used to negotiate per-frame
compression and that's definitely not the end of it.  I also did not
mention that you can negotiate version numbers and application level
protocols through the websocket handshake or that it defines termination
codes when the connection closes.  There is an awful lot of stuff in the
specification and even more to come which gives me the impression that we
will see some broken implementations of websockets in the future.

Maybe a simple policy file like Unity3D and Flash are using would have
been a better idea and just let people speak TCP themselves.  At least it
leaves you as application developer with more options to fix problems
yourself instead of hoping the websocket implementation is 100% correct.
But well, that's what we're stuck with now and since it already took three
or four major revisions of the specification and god knows how many
browser updates it's probably not a very wise decision to revisit the
protocol now.  I do however believe that when browsers finally get CORS
running for SSE this might be a better solution for many use-cases where
people might want to use websockets.  And that is definitely easier to
implement.
