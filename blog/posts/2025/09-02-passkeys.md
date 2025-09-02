---
tags: [thoughts, security]
summary: "Some thoughts in support of simple solutions."
---

# Passkeys and Modern Authentication

There is an ongoing trend in the industry to move people away from username and
password towards [passkeys](https://en.wikipedia.org/wiki/WebAuthn).  The
intentions here are good, and I would assume that this has a significant net
benefit for the average consumer.  At the same time, the underlying standard
has some peculiarities.  These enable behaviors by large corporations,
employers, and governments that are worth thinking about.

## Attestations

One potential source of problems here is the attestation system.  It allows the
authenticator to provide more information about what it is to the website that
you're authenticating with.  In particular it is what tells a website if you
have a Yubikey plugged in versus something like 1password.  This is the
mechanism by which the Austrian government, for instance, prevents you from
using an Open Source or any other software-based authenticator to sign in to do
your taxes, access medical records or do anything else that is protected by
[eID](https://en.wikipedia.org/wiki/Electronic_identification).  Instead you
have to buy a [whitelisted hardware
token](https://www.id-austria.gv.at/de/hilfe/hilfe-zu-ida/authentifizierungsfaktoren#header-welche_fido_sicherheitsschlussel_sind_mit_id_austria_kompatibel_und_wo_sind_sie_erhaltlich-qbvpmo).

Attestations themselves are not used by software authenticators today, or
anything that syncs.  Both Apple and Google do not expose attestation data in
their own software authenticators (Keychain and Google Authenticator) for
consumer passkeys.  However, they will pass through attestation data from
hardware tokens just fine.  Both of them also, to the best of my knowledge,
expose attestation data for enterprises through Mobile Device Management.

One could make the argument that it is unlikely that attestation data will be
used at scale to create vendor lock-in.  However, I'm not sufficiently
convinced that this won't create sub-ecosystems where we see exactly that
happening.  If for no other reason, this API exists and it has already been
used to restrict keys for governmental sign-in systems.

## Auth Lock-in

One slightly more concerning issue today is that there is effectively no way to
export private keys between authentication password managers.  You need to
enroll all of your ecosystems individually into a password manager.  An attempt
by an open source password manager to provide export of private keys was ruled
insecure and [should not be
supported](https://github.com/keepassxreboot/keepassxc/issues/10407#issuecomment-1994299617).

This might be for good intentions, but it also creates problems.  As someone
recently trying to leave the Apple ecosystem step by step, I have noticed how
many services are now bound to an iCloud-based passkey.  Particularly when it
comes to Apple, this fear is not entirely unwarranted.  Sign-in with Apple
using non-shared email addresses makes it very hard to migrate to Android
unless you retain an iCloud subscription.

Obviously, one could pay for an authenticator like 1Password, which at least is
ecosystem independent.  However, not everybody is in a situation where they can
afford to pay for basic services like password managers.

## Sneaky Onboarding

One reason why passkeys are adopted so well today is because it happens
automatically for many.  I discovered that non-technical family members now all
have passkeys for some services, and they did not even notice doing that.  A
notable example is Amazon.  After every sign-in, it attempts to enroll you into
a passkey automatically without clear notification.  It just brings up the
fingerprint prompt, and users will instinctively touch it.

If you use different types of devices to authenticate — for instance, a Windows
and an iOS device — you may eventually have both authenticators associated.
This now covers the devices you already use.  However, it can make moving to a
completely different ecosystem later much harder.

## We Are Run By Corporations

For many years already, people lose access to their Google account every day
and can never regain it.  Google is well known for terminating accounts without
stating any reasons.  With that comes the loss of access to your data.  In this
case, you also lose your credentials for third-party websites.

There is no legal recourse for this and no mechanism for appeal.  You just have
to hope that you're a good citizen and not doing anything that would upset
Google's account flagging systems.

As a sufficiently technical person, you might weigh the risks, but others will
not.  Many years ago, I tried to help another family gain access to their
child's Facebook account after they passed away.  Even then, it was a
bureaucratic nightmare where there was little support by Facebook to make it
happen.  There is a real risk that access becomes much harder for families.
This is particularly true in situations where someone is incapacitated or dead.
The more we move away from basic authentication systems, the worse this
becomes.  It's also really inconvenient when you are not on your own devices.
Signing into my accounts on my children's devices has turned from a
straightforward process to an incredibly frustrating experience.  I find myself
juggling all kinds of different apps and flows.

## Complexity and Gatekeepers Everywhere

Every once in a while, I find myself in a situation where I have very little
foundation to build on.  This is mostly just because of a hobby.  I like to see
how things work and build them from scratch.  Increasingly, that has become
harder.  Many username and password authentication schemes have been replaced
with OAuth sign-ins over the years.  Nowadays, some services are moving towards
passkeys, though most places do not enforce these yet.  If you want to build an
operating system from scratch, or even just build a client yourself, you often
find yourself needing to do a lot of yak-shaving.  All this work is necessary
just to get basic things working.

I think this is at least something to be wary of.  It doesn't mean that bad
things will necessarily happen, but there is potential for loss of individual
agency.

An accelerated version of this has been seen with email.  Accessing your own
personal IMAP account from Google today has been significantly restricted under
security arguments.  Getting OAuth credentials that can access someone's IMAP
accounts with their approval has become increasingly harder.  It is also very
costly.

Username and password authentication has largely been removed.  Even the
app-specific passwords on Google are now entirely undocumented.  They are no
longer exposed in the settings unless you [know the
link](https://myaccount.google.com/apppasswords) [^1].

## What Does Any Of This Mean?

I don't know.  I am both a user of passkeys and generally wary of making myself
overly dependent on tech giants and complex solutions.  I'm noticing an
increased reliance and potential loss of access to my own data.  This does
abstractly concern me.  Not to the degree that it changes anything I'm doing,
but still.  As annoying as managing usernames and passwords was, I don't think
I have ever spent so much time authenticating on a daily basis.  The systems
that we now need to interface with for authentication are vast and
complex.

This might just be the path we're going.  However, it is also one where we
maybe want to reflect a little bit on whether this is really what we want.

[^1]: This OAuth dependency also puts Open Source projects in an interesting
      situation.  For instance, the Thunderbird client ships with OAuth
      credentials for Google when you download it from Mozilla.  However, if you
      self-compile it, you don't have that access.
