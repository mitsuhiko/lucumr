public: yes
tags: [openid, security]
summary: an alternative way to look at OpenID's security.

The Lazy User is OpenID's Security Issue
========================================

For `Lincoln Loop <http://lincolnloop.com/>`_ I am doing more with the
Facebook API currently than is good for me. Now Facebook is not using
OpenID but OAuth, but the core issue is the same and it becomes a little
bit more obvious when you're doing OAuth based sign in. The problem is
that users are lazy, and so are developers. Developers are especially
lazy because when they have to sign into their development application
multiple times a day for testing the authentication module you will take
every measure possible to save time. And in my case it usually involves
remembering the password for my OpenID for the session. But even without
remembering the actual password of my OpenID account, it still means
that my OpenID provider remembers the authentication request for my
application and will skip the screen the next time the application
requested authentication until the browser closes. 

Enter OpenID's (and OAuth's) security problem: the remember me for this
computer button. 

For as long as I have to do with websites and authentication systems the
following three rules were widely followed by application developers: 

1. To change your password you have to enter your old password for
   confirmation. 
2. To change your email address for an account you have to enter
   your password or old email address. 
3. To delete your account you have to confirm per email or at least
   old password, sometimes even a combination of both. 

Notice one thing? All these steps require you to enter a password. Now
with OpenID / OAuth we don't have a password we could enter on that
website, what we could do instead is redirecting to the OpenID provider
/ OAuth service to let the user confirm the action. Unfortunately these
services will remember you. If you are a careful user you will not let
the service there remember your password for general authentication, but
it will remember you when you come back in the same browser session. 

So say you are logging in on your computer and not close the browser.
Leave the notebook unattended for a few seconds and someone else comes
to the PC to delete your account for example (or do something else of
destructive nature). Even if the application does a OpenID auth check to
delete the account (which no website I tested does) the OpenID provider
will have remembered you (at least the ones I tried all do). Bam, you
lost your account. 

Deleting here is not really the problem, just think about the OpenID
equivalent of password change: linking another OpenID account to your
profile. Most websites support more than one OpenID identity. To add
another OpenID identity URL to a website you most of the time don't even
have to confirm from an old one. It will just happily accept a second
OpenID identity URL. And again, even if it would check for the old one,
your provider would still have you remembered. 

This problem is unique to OpenID because OAuth services usually do not
support more than one connection because the OAuth based login mechanism
is customized for each website. Signing in with Twitter is a completely
different procedure than signing in with Facebook. You usually can't
hook a different twitter account to the same user account that was
already linked to Facebook or the other way round. 

The `OpenID Security Best Practices
<http://wiki.openid.net/OpenID-Security-Best-Practices>`_ only mention
that you have to check the added OpenID identity URLs if they are
controlled by the user by passing it trough the authentication
handshake, but it does not mention anywhere that you should check at
least one of the already authenticated for confirmation. And as
mentioned above, if the OpenID provider remembers you that would not
solve anything here. 

I might be missing something completely obvious, but there does not seem
to be a way to force the OpenID provider to force the user to approve
the authentication again (same for OAuth). The OpenID PAPE extension
does provide some metadata for the application to check if the
authentication happened via password or a hardware device but as far as
I can see, it also does not provide a way to force the approval screen
on the user again. The PAPE extension however does provide a way to
specify a maximum lifetime for the approval in advance (like a minute).
That would certainly help to fight that problem, but then you would have
to do that on the initial sign in and not when you want to force the
approval from the user when adding a second OpenID for example. 

I might be completely wrong with what I just wrote above, but from my
experience existing systems are not providing a way to force this
approval screen on users or it's just not obviously documented so that
nobody is using it. If there is a way, please let me know. Either way I
will be very careful to not leave my notebook unattended for a second
when a browser is still open.

