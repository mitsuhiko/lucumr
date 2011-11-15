public: yes
tags: [python, web, battlefield, thoughts]
summary: |
  Battlefield 3's Battlelog system is an interesting web application that
  many of us missed.  Here is why it's amazing and worth a look at.

Battlelog: Modern Web Applications are Here
===========================================

It's the shooter season of the year and this fall was all about Modern
Warfare 3 versus Battlefield 3.  And being the kind of game they are they
also try to keep their audience playing by introducing some additional
level of engagement.  Both Call of Duty and Battlefield introduced their
own online community websites and statistic platforms.  Call of Duty has
Elite, Battlefield has Battelog.

But just because these services are sitting in the same spot it does not
mean they are in any way similar.  And that actually goes for more than
just their monetization plans and feature sets.  Elite is a traditional
application as traditional as it can be.  You sign up, there is Flash,
there is a bit of JavaScript, there are tons of requests for each page and
a playercard transmits about 3 MB of data to your client.  Not very
interesting to say the least.

But what are they doing?  Notwithstanding some of their respective extra
features both Battlelog and Elite are essentially a social network for
shooter gamest that expose the statistics of your individual gameplay as
well as the one of your friends to you.  Everything you do in the game is
reflected on these websites and you can further interact with the game
there by commenting on gameplay and chatting up with friends.

Elite by itself is not very interesting technology wise, however Battlelog
certainly is.  It shows that an application that is probably used by
millions of gamers can be built on modern web technology as well.  And
under the hood is one of the most interesting ways to built a modern web
application that I think you should check out.

Embrace the Client
------------------

A few months back I was claiming that WSGI is not the place for pluggable
applications and that it would make sense `to assemble applications on the
client-side </2011/7/27/the-pluggable-pipedream/>`_.  Turns out, Battlelog
is doing just that.  While I do not know what all of their infrastructure
looks like, their network graph and license information on the page is
revealing.

Battlelog is written by a company called `ESN <http://esn.me/>`_ and their
infrastructure from the released code is basically Python 2.x with
gevent as well as JavaScript with jQuery and their own stuff on the client
and Java for their websocket backend.

If you send an HTTP request to the website it appears to work as if it was
a regular website.  You get a bunch of HTML rendered and nothing
interesting happens.  However if you click on any link you do not get HTML
transmitted.  Instead what is transmitted is JSON, the HTML5 history API
is used to modify the URL dynamically and all the HTML is rendered on the
client.  Since it appears to be able to do both we can compare the sizes
of the data transmitted easily.

The HTML for the index page is 18KB in size.  If we trigger the request to
the same URL with just the JSON it's 4KB.  Not only is it less to
transmit, it also means that the server is essentially just generating
JSON instead of rendering whole templates which also means a performance
improvement for the client.

The platform is a work of beauty in general and I am amazed how little I
have heard on the interwebs about it.  So to give you an idea why it's an
incredible technical achievement on so many levels, here the breakdown.

Feature Overview
----------------

To understand what Battlelog is here a brief overview of what it does.
These are not necessarily the features that are immediately obvious to the
user but are very obvious for the interested developer that wants to peak
under the hood:

-   the website insta-updates based on information coming from the push
    connection.  If you have the website open in the background you can
    hear a notification sound being played just the second your game ends.
    That notification sound is for the report generated from the round you
    played.
-   The same websocket connection for the website is also used for the
    chat feature on the site as well as game invites and more.
-   All the pages can be rendered on both the client side via JavaScript
    as well as the server.  How this work I cannot tell you but I find it
    interesting considering the server side is Python.  So their templates
    compile to Python and JavaScript as it seems.
-   Battlelog comes with an optional browser plugin that makes it possible
    to join into a game on the PC version of Battlefield right from within
    the browser.  This plugin can interact with the game and exposes some
    other functionality that is lacking in HTML5 (such as issuing pings).

How the Client Operates
-----------------------

In order to understand why Battlelog is interesting engineering we have to
reconstruct what it appears to be doing.  Again, I am not claiming
knowledge of their server technology, I basically just observed what I saw
and concluded a few things from it.

When you access a page you get some nicely rendered HTML back.  One of the
things that is also transmitted to you is a large JavaScript document that
contains their client side framework as well as the rendering instructions
for all pages compiled to JavaScript code.  The framework then hooks into
your browser's navigation code an intercepts all page loads.  Instead of
letting the browser replace the page with something new on load it instead
does the HTTP request via Ajax and adds an additional header to the HTTP
request: `X-Ajax-Navigation`.  If the server side sees that header it will
instead of rendering to HTML deliver the data that is normally passed to
the template as JSON.

The data you get back is everything the page needs to render, including
the name of the template.  When that data arrives on the client the
browser replaces the current page content with the data that was rendered
on the client side from the received JSON.  Not only that, it also makes
sure to use the HTML5 history API to change the browser URL.

The user does not notice that anything interesting is going on unless he's
tech savvy enough to open the firebug network panel and watch the system
operate.  In fact the whole thing is so incredible smooth that you would
not notice anything interesting besides the fact that the page loads fast.
I mean seriously fast.  Clicking on a link in Battlelog is such a snappy
operation it's haunting for the trained web developer eye.  Very few
systems respond this quickly.  This is especially noticeable on pages that
do not involve a lot of different data such as the news section of the
website or the forums.

If you look at the website it also has a bar on the bottom of the screen
that shows notifications, your friendlist, open chat windows and a few
other things.  This bar can have state.  You can toggle windows open and
closed, you can scroll in the chat window, enter new next and the bar will
stay open and unchanged if you navigate to a different page.  True, this
is nothing special these days, facebook does it too.  However from the
design that Battlelog follows this comes natural.  When the page contents
are hooked in the DOM element for that bar on the bottom is preserved and
not touched.

The other aspect of Battlelog is the real time component with web sockets.
I have not looked too far into that but it appears that it's based on an
abstraction layer on top of web sockets, Flash or whatever is supported
that was written by ESN for other projects in mind as well.  The server
code sends an information to the push hub which handles the socket
connection for the clients.  This way various systems can inform the
client about updates, that does not even have to be Battlelog itself.

Why the Client?
---------------

While it's not necessarily the case with Battlelog, there are a bunch of
really good reasons why you want to render stuff on the client side:

1.  You can do partial updates.  And you want partial updates since they
    are good for the user experience.
2.  You can mix content together from different resources which is good
    for caching.  If there is information on the page that rarely changes
    and is the same for each user you can load it from a well cached page
    and keep it in the client's DOM and never replace it.
3.  Generating HTML on the server side is more expensive than on the
    client.  You don't pay for the client side and even the fastest
    template engine on the server is beaten by an optimized JSON
    serializer.  Faster apps mean more satisfied customers.

Even if you do not have a JavaScript heavy application, moving
computations to the client side is a good thing.  This obviously assumes
that it does not break the navigation like some websites do.  Battlelog
does not do that.  The principles on which Battlelog is built would also
very well work in a more traditional application.  However it requires a
well structured architecture were the data you're sending to the template
engine is simple (and secure!) enough that you can put it in JSON and that
the templates themselves are simple enough that compiling them to
JavaScript is an option.

Jinja2 for instance could in theory execute on the client but practically
not.  Practically it's exposing a little bit too much of Python to make
sense to compile to JavaScript.  But a template language much like Jinja2
could be written that would make this possible.

In fact I think you could build a microframework that would very well
support this paradigm and still be agnostic to the JavaScript code you're
running on the client for the most part.

The Native Code Thing
---------------------

The real interesting thing about Battlelog however is a Windows PC
specific component.  If you are heading to Battlelog from a Windows PC and
you own the PC version of Battlefield 3 you can launch into a game right
from within the browser.  How does this work?  It works with the help of a
browser plugin that exposes additional functionality to the in browser
client.  Namely it has a function to start the game and pass it
information as well as a general purpose function to ping an IP address
which is used for the server browser.

In fact if you are playing on PC this is how the game is launched, always.
There is no in game menu, you join from within your browser.  This is mind
blowing thing.  First of all it makes it easier for DICE to update the
server infrastructure since it's now mostly separated from the client and
also makes for much quicker iterations.

The communication for the most part works in one-way but in a cycle as it
seems.  If you log into Battlelog and head to the server browser you get a
list of servers.  How does *that* work?  Here's how:

1.  When you send an HTTP request to Battlelog it determines your
    approximate location based on the request IP.  This way it can
    pre-filter servers for you that are probably near you.
2.  Each server connects to a ping site on connect.  There are a couple
    different ping sites for different countries.  The USA have three I
    think, Europe has one, Japan has one, Australia etc.  Each ping site
    then notifies Battlelog about the distance of that server to the ping
    site.
3.  Based on that information as well as your filter settings, Battlelog
    now sends you a list of servers.  Once that data is retrieved by the
    client it starts connecting to the browser plugin and asks it to ping
    all the server IPs it received.
4.  If you now want to join that server it sends an HTTP request to
    the Battlelog server side to reserve a slot on that server.  In
    response it gets a token that identifies that slot.  When the server
    managed to reserve a slot for that player the client uses the
    serverlog plugin to boot up the game.  It passes that token to the
    game alongside a secret and lets the game boot in the background.
5.  While the game is booting up it uses the received authentication
    information to use the slot that was reserved.  When it loaded up
    properly it notifies the Battlelog client with the help of the plugin
    about changes in the executable.
6.  The plugin also exposes some more functionality of the client to the
    website which makes it possible for the JavaScript part of Battlelog
    to close the game away and initiate some other game modes such as coop
    hosting.

Thinking: Does it need the Plugin
---------------------------------

Now here was me thinking.  Would the plugin be necessary to accomplish all
of the above things or could it be done in a different way?  Native
applications are here to stay, that's a given.  However more and more
stuff of what a native application does can be moved into a browser for
great success.  So how does a web application speak to a native
application?

The traditional way is by letting the application register a custom URL
scheme and then letting the user click on that link which then launches
the application.  That's unfortunately a one way communication only.  But
that might be everything that is needed.

So here is how it could be done.  Battlefield or any other application
that wants to do the same but without the browser plugin could instead
register a URL handler with a unique name.  Let's say ``battlefield3://``.
The operating system then knows about this URL scheme and can start a
handling application.  What can we do with this?

The server component would have to uniquely identify a user for starters.
Considering that each user has to log in that's fine anyways.  Then next
to that user information one would have to remember if the game is
running and how.  What does that mean?  Let's start with the simple case:
the game is not running.  The Battlelog server looks at the current user
and sees he or she does not have the game running.  Consequently it will
generate a unique token and generate a URL to the URL scheme (for instance
``battlefield3://start?token=...``.  It then generates a JavaScript prompt
that informs the user that he has to launch the game by clicking on the
link generated.  This is the only chance in flow that is necessary.  By
clicking that link the user agrees that he wants to start that
application.

But instead of launching the game it starts a daemon.  That daemon takes
the token and picks a random TCP port on the system and starts an HTTP
server there.  Once that server is running it notifies the central server
that it's running and on what port.  Since the web browser has a push
notification channel open it will get a notification now that the daemon
is running and on which port.

After that it can use HTTP and JSONP to communicate with the daemon.  But
how does the daemon know when to shut down?  Basically that daemon will
needs to be informed when to shut down.  I would assume that 15 minutes
without a ping from the browser would be a good indication that it should
destruct itself.  When shutting down it also tells Battlelog that it's no
longer running to clear out the port entry.

Additionally to make this better it should not only record the port but
also an identifier that uniquely identifies the machine the daemon is
running on so that the user can alternate between different computers
without ending up with weird behavior where the central server is
informing the browser that the game is running when in fact it's running
on a different machine.

Since Battlefield 3 supports only one running game per user account it
does not make sense to support more than one session.  If that would be
wanted it could obviously be done.

The downside here obviously is that it needs a websocket connection and a
central server that acts as mediator between the different systems
(daemon, client side app).  In Battlefield 3's case that would not be a
concern (and already is not) since it's an online game.  The second
problem here is that it needs one additional user interaction: the user
has to click on the link to activate it.  This currently is not necessary
in Battlelog since it's provided by a plugin.

Browser <-> Native Code Communication
-------------------------------------

The whole concept of using a browser application as a frontend for a
native application is an interesting thing indeed.  Due to offline support
becoming widespread that is also no longer a concern if the application
can largely run in the client side.  But that would break my above
hypothetical example of interacting with a local application.

Falling back to a browser plugin currently is the only way to make a
consenting communication with a local application.  I really wonder if
there is not room for improvement by having an API in HTML5 that makes
this possible which would also work for offline applications.

Basically what would be needed is a simple way for a two way communication
with a local application.  That application would have to register itself
somewhere and then be able to respond to the client's requests.  It could
totally work like a CGI script (eg: speak HTTP via stdin/stdout).

I think there is a lot of potential for such applications in the future
and Battlelog shows that it can be done already with a little help of a
small plugin.

Killer Applications
-------------------

One last thing.  Battlefield 3 sold a couple millions of copies.  The PC
users all have to update to recent version of their browsers since the
website basically demands a modern browser.  Even with all the fallbacks
in place, it kinda forces people to update.  For a certain audience
websites like Battlelog can be the killer application of modern HTML5
features.  Keep this in mind.  In case you have a similar audience that's
something to take advantage of.
