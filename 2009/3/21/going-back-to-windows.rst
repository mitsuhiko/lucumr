public: yes
tags: [windows]
summary: |
  Why I am running Windows on my desktop computer now instead of ubuntu.

Going back to Windows
=====================

I was using my Macbook Pro for all of my development work lately.
However for various reasons I decided to buy a desktop computer again
and use that as main development system. Because you can only have Macs
in either in `crippled <http://www.apple.com/macmini/>`_, `in a monitor
<http://www.apple.com/imac/>`_ or `incredible expensive
<http://www.apple.com/macpro/>`_ a Mac was out of the question and I
assembled a nice computer for about 600€. 

Because I'm kinda annoyed by the bad state of the Linux desktop lately I
decided to give Windows Vista a try. Now. I'm not going to defend my
decision here (I already got enough discussions about why I'm using
Windows again) but to share my experiences with configuring Windows to
work more like I was used to work the last few years. 

More UNIX love
~~~~~~~~~~~~~~

A lot of the stuff I learned to love depends on some sort of UNIX
environment. There is a UNIX subsystem in Windows, but that's not what
you want to use. A better choice is `cygwin <http://www.cygwin.com/>`_
which installs a GNU user land with all the stuff you want on your
system. I also added `C:\cygwin\bin` to my *PATH*. 

The latter has the advantage that you can use (non-symlinked)
executables that come with cygwin from the normal Windows shell. This is
great for a couple of reasons: 

* You can use `ssh` and use that as ssh executable in hg 
* If you're accidentally writing `ls` it will still work like you
  think it would. 

This also makes the `make` command and the compilers available. If
you're using a Windows Python installation (like I do) make sure to add
the Windows Python path *before* the cygwin Python which is installed by
default. 

Configuring Version Control
~~~~~~~~~~~~~~~~~~~~~~~~~~~

I'm a vim user, so I installed vim.  However the version control systems
I installed (hg and subversion) decided that it was a better idea to use
the windows notepad.  That's easy to fix however.  Here my `.hgrc` which
sets the editor to vim and the ssh executable to the one from cygwin:

.. sourcecode:: ini

    [ui]
    editor = vim
    ssh = C:\cygwin\bin\ssh.exe

For subversion support I had to set the *SSH_EDITOR* variable to `vim`
in the computer properities. 

Configuring SSH-Agent
~~~~~~~~~~~~~~~~~~~~~

The next thing I wanted to continue using was the `ssh-agent`. That tool
keeps your SSH passwords for your keys in memory so that you don't have
to enter them over and over again. This is especially useful when using
hg or svn with the ssh protocol. 

Modern Linuxes automatically configure the ssh agent to start up with
your X11 server and give you a nice UI prompt the first time the key is
unlocked.  Unfortunately you can't have it *that* nice in Windows, but
it's not that far from it.  All you have to do is to create a
`start-ssh-agent.sh` script in `C:\cygwin\home\USERNAME` that with this
code in it:

.. sourcecode:: bash

    #!/bin/sh
    export SSH_AUTH_SOCK=/tmp/.ssh-socket
    rm -f $SSH_AUTH_SOCK
    ssh-add -l 2>/dev/null
    if [ $? = 2 ]; then
      ssh-agent -a $SSH_AUTH_SOCK 2>/dev/null | sed 's/^echo/#echo/' >/tmp/.ssh-script
      . /tmp/.ssh-script
      echo $SSH_AGENT_PID >/tmp/.ssh-agent-pid
    fi

Afterwards create a new Link in your autostart folder that points to
`C:\cygwin\bash.exe start-ssh-agent.exe` and let it execute in
`C:\cygwin\home\USERNAME`. Now you can start up your command line and
enter `ssh-add` the next time you login and it will prompt you for the
passphrases of your keys. 

Keyboard Layout
~~~~~~~~~~~~~~~

I use the German Windows keyboard layout ever since I use computers. It
may not be the best one, but I got used to it and I want to continue
using it. The only thing that was different on Linux was that the accent
keys were not dead and produce a backtick without having to wait for a
second key press. Also I had typographical quotes on my keyboard.
Fortunately you can have the same on Windows by creating your own layout
using the `Microsoft Keyboard Layout Creator
<http://www.microsoft.com/downloads/details.aspx?displaylang=en&FamilyID=8be579aa-780d-4253-9e0a-e17e51db2223>`_.
Here the one I created: `Deutsch - Verbessert
<http://paste.pocoo.org/show/108910/>`_. 

The Good
~~~~~~~~

For a fair comparison I briefly installed the development version of
Ubuntu on this machine as well. I was kinda surprised how fast the
Windows desktop is. On OS X / GNOME you get used to a sluggish user
interface and it's really an interesting experience going back to
Windows because of that. The thing I was expecting to miss the most here
are virtual desktops. Turns out that I don't really miss those, but I
will probably buy a secondary screen to move X-Chat / Thunderbird /
foobar onto it. 

It's interesting how many things you're not missing until you rediscover
them. `foobar 2000 <http://www.foobar2000.org/>`_ was one of those,
NetBeans the other. I was using NetBeans on ubuntu too, but the user
experience was that the GUI was incredible slow. Eclipse was even worse.
And the same thing happened on OS X as well. I don't know what the
developers are doing that these two IDEs suck that much on non-Windows
platforms, but the experience on a Windows system is great. I also just
rediscovered the awesomeness of Visual Studio and really have to wonder
how I managed to stick to MonoDevelop for that long. 

The Bad
~~~~~~~

Unfortunately there are some bad aspects too. The worst is probably that
a lot of the Python libraries I was using so far have a bad Windows
support, including mine. `Fabric <http://pypi.python.org/pypi/Fabric>`_
for example didn't even import on Windows when I was trying it. The
other negative experience was that countless open-source zealots treat
you like an outcast if you're working on Windows. 

Anyhow. Works for me now and on the upside you can expect improved
versions of the pocoo libraries regarding Windows-compatibility now :-)

