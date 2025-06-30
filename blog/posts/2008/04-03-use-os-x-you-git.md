---
summary: "Why a popular choice for an operating system does not necessarily
mean you will become more productive and a better programmer."
---

# Use OS X you Git!

[So rails is ditching trac and subversion](http://weblog.rubyonrails.org/2008/4/2/rails-is-moving-from-svn-to-git)
in favour of git and [lighthouse](http://www.lighthouseapp.com/).
Additionally they won't host git themselves but rely on [github](http://github.com/). Keeping in mind that the preferred development
environment called OS X + TextMate, rails is now kneedeep in closed
source land. Something I could care less about as I'm thankfully not
using rails or any rails powered application. But what hit me was the
discussion attached to that blog post. Apparently there are quite a few
pissed of Windows users left. Gosh, they still exist!

David "Fuck You" Hansson could really care less as he stated in the past
["that he would have a hard time hiring a programmer who was still on
Windows"](http://www.loudthinking.com/arc/000433.html). Skimming
through the blog you can see enough mac users telling the windows crowd
to switch and I think you can nowhere find as many mac users as in the
rails community. He really did a great job converting proprietary
windows developers into even more proprietary Mac users. There are some
really great quotes in that blog:

> The proper move is to stop using Windows for development of RoR
apps.
>

or

> Windows users, please stop complaining about others using the right
tool for their jobs and just start doing the same.
>
> You can get rid of this shit and use something serious. Really.
Others are doing it and nobody ever looks back. So you can do it,
too.
>

Yeah stupid folks. Why in god's name are you still using windows, that
proprietary crap from redmond. DDH your Führer already told you to use
OS X, do so and don't ask questions. Interestingly though is that Linus
himself [is not that happy of OS X](http://kerneltrap.org/mailarchive/git/2008/1/23/592628) (the link
goes to another post, I was refering to the reply, but that one is good
too) as their filesystem handling is beyond broken, at least for git's
requirements.

So I'm asking. What exactly makes OS X better than Windows? Nicer
hardware? I would count that as a major disadvantage of OS X as you're
bound to vendor. The Apple support here is very weak (where weakhere is
Austria) as far as I've noticed. Sending a notebook in for two weeks for
a single broken key on the keyboard is ridiculous. Additionally you're
paying a lot of money for it. I know that the design is the selling
point of Apple computers but that doesn't mean all PCs are looking bad.
A Thinkpad or one of the more expensive Sony Notebook next to an Macbook
Pro and it's pretty hard to decide what looks better. Especially in
terms of quality. My Macbook Pro is a bit more than half a year old and
on the silver plastic you can spot where the palms of my hands are as
the color is chipping off there. But even if the hardware was the
selling point you could use other operating systems on it.

There is TextMate (which was the main reason why I personally bought
one) but as it turns out, it looks better in the screencasts than in
real world. If you're used to a different editor it's hard to switch. I
tried multiple times and every once in a while i was cursing why `:vs`
didn't work out. Together with the braindead keyboard layout on the
apple computers (probably an issue you only have on German macs) gives
you a ridiculous feeling. When I switch between Windows and OS X (which
happens quite a lot recently) I permanently mix things up. Windows after
OS X locks me out every once in a while while writing mails (as alt+l is
windows+l on a windows pc, which apparently is equivalent to "lock
workstation"). The other way round I close my mailer as alt gr + q
(which on a German layout gives you the at symbol) is command + q on a
mac, which means "close application". Can't count the times I killed my
vim/thunderbird that way.

One point where OS X shines is font rendering. I think for artists OS X
is a reasonable good choice as operating system. The system itself has a
good understanding of fonts and all that but for me as developer the
rendering freaks me out. In a regular gvim with bright fonts on dark
backgrounds it's especially anonying as everything looks bold and there
is no visible difference between bold and nobold. I know that Windows
was flamed in the past dozens of times for aligning the fonts on the
pixel raster but quite frankly, I prefer that over the OS X way. It
might be true that Windows will block the 300dpi screen era for another
ten years or so, but so will Linux and OS X. Most of the websites or
applications still depend on pixel values, and even if web designers
will switch to the SVG or better vector formats, you can't ignore the
old websites. So the problems with high resolution screens are clearly
not the windows font rendering. Beside that I want to point out recent
ubuntu releases have got real good font rendering thanks to the turner
patches for subpixel rendering and with some additional configuration
and better fonts you get everything from the OS X to Windows ClearType
like rendering.

But the real problem with OS X is that it tries to be Windows and Linux
at the same time and fails miserably. For me as linux user the most
important detail of linux is missing: the package manager. But at the
same time the beloved setup.exes are missing. Dmgs with application
bundles are a nice thing in theory but they don't work out that well.
There are neither uninstallation tools norr do they provide a user
experience that makes sense. The OS X mouse behavior is ridiculous and
installing applications via drag/drop is just crazy. The first thing I
did when I got my Mac was dragging the Firefox out of the DMG into the
Dock. Then I noticed that I want to have it in the applications too and
draged it there. What happened? I deleted it. The same way I managed to
delete a file when moving from my harddrive to a network share. I lost
the wireless connection and the file was lost. That's ridiculous and
must never ever happen on an operating system. Application management on
OS X is stupid anyways. To fully remove an application from your
computer you better buy a shareware that is better as that. Seems like
most functionallity you want to have on a computer comes as third party
application on OS X.

And why in god's name is there no cut/paste of files in the finder? I
don't want to start ranting about the finder as I think it's OS X
weakest point anyways but that's a stupid limitation. Drag/Drop works
but Cut/Paste not? Some 1337 terminal hackery later I got Cut/Paste
support in Finder but then I had to notice why it's not enabled by
default. Because the Apple implementation of this simple but useful
feature is broken. If you cut a file, and cut another, not only the
latter is cut. No! The first one is moved to the trash. WTF? Not even
Nautilus does that wrong, and Nautilus does tons of things wrong right
now.

Then OS X is inconsistent. ":" in the Finder is "/" in the terminal and
the other way round. Fortunately you don't see location bars anywhere
otherwise you would notice that. Unfortunately there are no location
bars so you end up using the mouse all the time. Speaking of the broken
mouse: mousing on OS X files like mousing through meter deep mud. Just
google for "OS X mouse" and the first hit is "mouse acceleration
problem" :-/. Oh and yes, you can fix that. Either buy a shareware or
hack together an application that uses a deprecated interface in the
IOkit. After one week of OS X mousing my hand hurt, something I don't
have on any other operating system, no matter how hard I try. I ended up
using the touchpad of my Macbook as the mouse acceleration is better
there.

But back to application management for a second as that goes back to the
original topic: development environment. On ubuntu you have that cool
GNU userland I'm used to. Not only that, you also have a kick-ass
package manager that keeps my whole system up to date. On OS X you have
a BSD userland which is irritating if you're used to GNU tools. Many
applications that seems to work out of the box on ubuntu and with a
cygwin installation on windows too, work completely different on OS X.
Like python. Why? Because of OS X bundles, frameworks and all that fancy
stuff that you have to face when developing on OS X. For example on
Tiger the python executable is in
"/System/Library/Frameworks/Python.framework/Versions/2.3/bin/python2.3"
and the standard library in
"/System/Library/Frameworks/Python.framework/Versions/2.3/lib/python2.3/site-packages".
A non-framework Python comes via port which is installed to
"/opt/local/bin/python2.3". The cool thing: it's a regular python
executable like you know it from Linux or Windows. The problem? It's not
in a framework, so no wxPython for you. What frameworks do? No clue man.
It's a bundle, that's what I know. Quite frankly I don't want to know
what's the fucking difference, it's just annoying. Teeworlds for example
has a broken mouse behavior when started from a bundle. Why? No clue.
But outside of a bundle it works. I won't argue that it's broken, it
probably comes from the old Next times. But as windows or Linux user
it's irritating. Windows is easy to understand, linux is not much more
complicated once you groked where the stuff is located, OS X is just
irritating.

And the biggest problem of all for me: It's slow. Freaking slow. Slower
than ubuntu on my old notebook which was a 2GHz dothan with only 512 MB
RAM. And GTK is slow, very slow. All kinds of gvims I tried on OS X are
so slow that you can see the refreshing while scrolling, especially if
more complex highlighting is activated. My python interpreter does
something 0.3 seconds every startup, so does ruby. The network is slower
here too. I don't know if it's the Wireless LAN chip or OS X in general,
but if I start up my old notebook and the OS X one, transfering files is
a lot faster. And by lot I mean I haven't benchmarked it, but I can see
the difference.

Then let's come to security. Quite frankly I have no idea how secure the
system really is, but the number of security updates is annoying. While
I think it's cool that they are patched, you're downloading something
like 300MB security updates per month I think and most of them require a
reboot. Feels a lot like windows, just that I don't have to reboot
windows when a Windows Media Player update is installed.

But what's the conclusion? It's certainly not that OS X sucks. If you
like it, feel free to use it. But telling other people that they are
stupid because they can't see the ingeniousness of all Apple products is
just ignorant. OS X is just another proprietary operating system, and
not the solution for all of your problems. It has it's problems too and
it doesn't have any real advantages over Windows beside a nicer design
and nicer application design and the fact that it has such a low
userbase that you're not the target of malware authors. At least not
currently, let's see if that changes the next four years. With such a
homogeneous environment it will become a nice target for attacks at
least.

Oh. And I don't think that linux on the desktop will be the solution
either. As long as patents exist or the kernel doesn't allow binary
drivers and KDE and GNOME people can't settle on one architecture and
HIG linux on the desktop is on the best way to become the most sucking
operating system on the desktop for the regular user. But for
developers? A good choice!

So let's conclude: [every OS sucks](http://video.google.com/videoplay?docid=2514730680283477734). And OS
X is no exception. So don't judge users by their prefered operating
system / desktop environment. And don't tell them to use something else
just because you're too lazy to adapt.
