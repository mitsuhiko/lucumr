tags: [personal]
summary: |
  Things that will change for me in 2010.

Status Update 2010
==================

As you can see from the archives, the activity in this blog was rather
low the last couple of weeks. But not only the blog, also my visible
programming activity and everything related. There are a couple of
reason for that but unfortunately I'm not entirely sure how this will
change in the next few weeks. 

University turned out to be boring and stressful at the same time and is
the main limiting factor of my productivity. While at the same time many
courses bore or frustrate me, there is still a lot of stuff that has to
be delivered or learned for. 

While this is the primary reason for not being active at all, there are
a couple of other reasons as well. What I spend most of my time with the
last couple of years was certainly Open Source (I guess even free
software), Python and web applications. For a time I am interested in
other topics as well, I just never had the impression that I would be
able to learn was has to be learned to succeed at it. 

I still don't know, but without trying I will never know. So my Python /
Webdev activity will most likely stay as low as it currently is for a
while. That however does not mean that my projects will be unmaintained.

Project Maintenance
~~~~~~~~~~~~~~~~~~~

So what's happening to the projects in the near future? 

Werkzeug's Future
^^^^^^^^^^^^^^^^^

So this little bugger will certainly get a new release soon. I was
actually planning a release before the beginning of the new year but
there are a couple of things that I want to have sorted out first. I was
planning to move the debugger together with a couple of things into a
new library called Flickzeug, but because I don't think I will
personally need debugging tools any time soon, I will put that plan on
hold. 

If anyone is interested in helping out there, just drop me a line and I
will help you as good as I can. The design of the library is pretty much
finished, just the implementation is unfinished. 

Until something for Flickzeug is planned, the debugging component will
stay in Werkzeug and not be deprecated. The same cannot be said about
the Werkzeug templates however. Because it depends on a library that
goes away in Python 3 I will only deprecate it for future Werkzeug
Python 3 versions. 

This is also my biggest grief at the moment. I am totally unhappy how
Python is developing currently and especially with the implementation of
Python 3 and the plans for it. Graham Dumpleton is doing an insanely
great job with maintaining mod_wsgi and I am sure whatever he decides on
for Python 3's WSGI will become the standard everybody is using. And I
trust him enough that I know whatever is chosen, is an acceptable
solution everybody can be happy with. Until then however, I do not plan
to port Werkzeug to Python 3. 

Jinja
^^^^^

Jinja is a little bit more complicated. The hg tip should work on Python
3 already if you run it through 2to3, so with the next release we should
have acceptable builtin Python 3 support. What keeps me from releasing a
new version is that the compiler has a couple of scoping issues that
arrive from edge cases where Jinja scoping does not properly translate
to Python scoping. 

All that would not be an issue if I could generate bytecode directly,
but that unfortunately is not portable and does not work on the
appengine at all, so I can only add further workarounds into the code
generator. 

Right now I am looking for code that breaks on Jinja2 tip and come up
with solutions for these edge cases. If you have templates that break on
tip, let me know and file tickets for those. 

Zine
^^^^

Now this is the most tricky project. When I started working on Zine I
was extremely motived doing that, mostly because at that time WordPress
was really weak and easy to catch up to. However Zine is still a one man
project and because it is built in Python it is mostly interesting for
other Python developers and as such missing its market. 

The hg version is a lot better than the latest release so what I will do
is integrating the missing changes into it and release a new version at
the beginning of February. From that point onwards however I have no
plans. 

Why all that
~~~~~~~~~~~~

So why the sudden switch away from what I did the last years? It's not
that I lost motivation in general for what web development but I don't
want to limit myself to that area. There is more I am interested in and
because I picked the wrong studies all over again I won't learn enough I
will have to start learning that next to my regular studies. 

Alex Gaynor wrote an essay about `education
<http://lazypython.blogspot.com/2009/12/few-thoughts-on-education.html>`_
a while ago to which I wanted to respond, but I never had the time to.
Lately however that comes back more and more to me because the situation
in Austria regarding education and university is currently just weird
for a couple of reasons. 

Basically it boils down to me at the same time being incredible unhappy
with the way university works in Austria but finding myself over and
over again in the situation where I have to defend the system against
other stupid students that think it's a good idea to `occupy a large
auditorium
<http://www.austriantimes.at/news/General_News/2009-12-21/19038/Student_protesters_%27shocked%27_after_auditorium_evictions>`_
to get more money from the state (and by doing so disrupting other
students whose exams get relocated, access to library denied and so
forth). 

Call for Volunteers
~~~~~~~~~~~~~~~~~~~

So a while ago there were a couple of people contributing code to
various Pocoo projects. This is still true but even though the number of
people using Werkzeug, Jinja2 and Zine increased (not mentioning
Pygments here which Georg maintains) the number of patches and active
developers decreased. This is unfortunate because right now I'm pretty
much alone on these and working alone means that in times where I have
few time to spare, the amound of new features, improvements and
everything declines. 

Two projects of mine (CleverCSS and GHRML) either found new owners by
sending me a mail or got some better maintained branches on github and I
would love to either hand over the project completely (including the
pypi page) or getting you on the pocoo team and giving you commit access
here. 

For Werkzeug, Jinja2 and Zine my plan is to clean up the trackers a lot
so that it's easier to work on small tasks which hopefully will both
enable external contributions and make it possible for me to work on
these next to what I will do otherwise :) 

Happy new 2010
~~~~~~~~~~~~~~

So for all of you, a Happy new 2010 and may it have more, and more
stable releases, than 2009!

