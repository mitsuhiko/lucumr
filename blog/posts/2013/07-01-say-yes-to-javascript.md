---
tags:
  - javascript
  - python
  - thoughts
summary: |
  Some random notes about why I think that removing the option to disable
  JavaScript in Firefox is one of the best things.
---

# Say “Yes” to JavaScript

A few days ago Mozilla finally removed some options from their control
panel.  The one I am most happy about is [the removal](https://bugzilla.mozilla.org/show_bug.cgi?id=873709) of the “Disable
JavaScript” checkbox.  This goes hand in hand with an earlier blog post
by Alex Limi about [Checkboxes that kill your product](http://limi.net/checkboxes-that-kill/).  If you have not read that
link, do it now.

My immediate response to change of removing the switch was: “Thank god,
that should have happened ages ago”.  When I was happily tweeting this I
got some responses about how I can support such a step in the browser that
removes features and restricts a user's freedom.  Instead of replying to
each and every tweet I figured I might just write down my thoughts on that
topic.

I believe there are two reasons why some people want to disable
JavaScript: the feeling of extra privacy and improving page speeds.  There
are two main problems with that: none of those things are solved by
disabling JavaScript categorically.  The better solution to that are
add-ons maintained by people that block out the right JavaScript and let
everything else through.

The reason for that is that a user cannot reliably decide on if the
JavaScript is necessary or not.  There is this general understanding among
some more technically skilled people that a website should always work
without JavaScript.  This might have been true a few years ago, but
nowadays that is impossible to do.

Some applications now are written as frontends to APIs and the application
does not provide any rendering on the server side besides a nice error
message that the website requires JavaScript.  Worse than that though,
some websites just assume that JavaScript is actually activated.  In some
cases they might have one landing page that does a nice fallback to give
you an error message if JavaScript is missing, but when it deep links you
to a page that goes away.

It's a great day for a web developer when we can finally assume that a
browser *will* have JavaScript running.  Many modern web applications can
be much more performant *because* they take advantage of JavaScript.  User
interfaces that depend on JavaScript have much better abilities to make it
enjoyable for a user.

I agree that the particular case of a page breaking entirely is not that
bad because the technical user that disabled it will quickly realize that
he or she should activate JavaScript again.  Unfortunately there are cases
where currently users are assuming that JavaScript is not necessary but
is.

A good example for instance is payment handling on the internet.  Unless
you want to go through all the hoops of getting PCI compliance for your
servers, you will have to deal with JavaScript payment gateways.  Some are
not even that nice and only give you a basic iframe to work with and you
will need JavaScript hacks to make your redirects break out of the iframe.

In that particular case the base page of the store does not require
JavaScript but once you go through a payment flow one step might require
the execution of JavaScript for the transaction to not get stuck.

You don't get extra privacy by disabling JavaScript.  I can fully track
you even without JavaScript.  At the same time I can enhance your browser
experience through better written JavaScript code that allows me to do
things with your browser that plain HTML does not allow.

Instead of having a global “disable JavaScript and cookies” flag we should
instead invest more into things like tightly tuned browser extensions that
intelligently remove obnoxious JavaScript from specific pages.

JavaScript is quickly becoming a huge part of modern web applications.  We
as developers should be happy that browsers go our way and make our life
easier.
