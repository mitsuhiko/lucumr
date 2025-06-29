tags: [python, lektor, announcement]
summary: |
  The background story to why I built yet another static website generator
  in Python.

Introducing Lektor — A Static File Content Management System For Python
=======================================================================

The longer I'm programming and creating software, the more I notice that I
build a lot of stuff that requires maintenance even though it should not.
In particular a topic that just keeps annoying me is how quickly
technology moves forward and how much effort it is to maintain older code
that still exists but now stands on ancient foundations.

This is not a new discovery mind you.  This blog you're reading started
out as a Django application many, many years ago; made a transition to
WordPress because I could not be bothered with updating Django; and then
turned into two different static site generators because I did not want to
bother with making database updates and rather wanted to track my content
in a git repository.

I like static website generators quite a bit.  As everything needs a
website these days — it's impossible to escape the work to create one.
For programmers it's possible to get away with building something with
static website generators like Jekyll, Hexo, Hugo, Pelican, Hyde, Brunch,
Middleman, Harp, Expose, …

As you can see the list of tools available is endless.  Unfortunately
though these tools are all aimed at programmers and it's very hard to use
them as someone without programming experience.  Worse though: many of
them are clones of each other just written in different programming
languages with very similar designs.  There is very little innovation in
that space and that's a bit unfortunate because I like the flexibility I
get from frameworks like Flask at times.

So I Built My Own
-----------------

This is by far not the first time I built a static website generator but I
hope it will be the last time.  This one however is different from any
project I built before.  The reason it exists is quite frankly that it's
impossible to escape family duties.  For me that means helping out with
the website of my parents.  I knew that I did not want that to be
WordPress or something that needs security updates so about two years ago
I started to investigate that options there are.

After a ton of toying around I ended up using `Frozen-Flask
<http://pythonhosted.org/Frozen-Flask/>`_ for that project.  It was neat
because it allowed me to structure the website exactly like I wanted.
However it also meant that whenever text started to change I needed to
spend time on it.  Thus I had to investigate CMS solutions again.
Countless weekends were wasted trying to make WordPress work again and
looking at Statamic.  However I found them quite a bit more complex to
customize than what I was used to with Frozen-Flask and they did not
really fit the format at all.  Especially WordPress feels much more like a
blog engine than a CMS.

Finally I decided to sit down and build something completely different: a
content management system that uses flat files as source files like most
other systems, but it has a locally hosted admin panel that a non
programmer can use.  You install the application, double click on the
project, a browser opens and you can edit the pages.  It builds in the
background into static HTML files and there is a publish button to ship it
up to a server.  For collaboration one can use Dropbox.

Enter Lektor
------------

I called this system Lektor and Open Sourced it initially a few months ago
after not having cared about it in a year or so.  However I had another
run-in with a project which was the Sentry documentation.  Sentry uses
Sphinx for the documentation and customizing the docs for what we had in
mind there turned out to be a complete waste of time and sanity.  While
Lektor is currently not in a position where it could replace Sphinx for
Sentry it gave me enough motivation to hack on it again on weekends.

So I figured I might retry Open Sourcing it and made a website for it with
documentation and cleaned up some bad stuff in it.

Here is what it looks like when you open up the admin panel:

.. image:: https://raw.githubusercontent.com/lektor/lektor-archive/master/screenshots/admin.png
   :width: 100%

Lektor is a Framework
---------------------

But what makes Lektor so much fun to work with is that Lektor is (while
very opinionated) very, very flexible.  It takes a lot of inspiration from
ORMs like Django's.  Instead of there being a "blog component" you can model
your own blog posts and render them with the templates you want to use.
There is not a single built-in template that you have to use.  The only
thing it gives you is a quickstart that sets up the folders and copies
default minimalistic templates over.

As an example, here is how a blog index template looks like:

.. sourcecode:: html+jinja

    {% extends "blog_layout.html" %}
    {% from "macros/pagination.html" import render_pagination %}
    {% block title %}My Blog{% endblock %}
    {% block body %}
      <h1>My Blog</h1>
    
      <ul class="blog-index">
      {% for post in this.pagination.items %}
        <li>
          <a href="{{ post|url }}">{{ post.title }}</a> —
          by {{ post.author }}
          on {{ post.pub_date|dateformat }}
      {% endfor %}
      </ul>
    
      {% if this.pagination.pages > 1 %}
        {{ render_pagination(this.pagination) }}
      {% endif %}
    {% endblock %}

The system understands what the blog is, that it has child records, that
those records are paginated, it can provide pagination etc.  However there
is nothing in there that makes it a blog in itself.  It just has a very
flexible ORM inspired component that gives access to the structured files
on the file system.  Programming for Lektor feels very much like
programming something with Flask or Django.

Learn More
----------

If you want to learn more about it, there are quite a few resources at
this point:

*   `The Lektor Website <https://www.getlektor.com/>`_, with documentation
    and all that cool stuff.
*   `Introduction Blog Post <https://www.getlektor.com/blog/2015/12/hello-lektor/>`_,
    with some more back story and explanations of how it works.
*   `A Few Guides <https://www.getlektor.com/docs/guides/>`_ on how to
    build blogs, portfolio websites, etc.
*   `A Quickstart <https://www.getlektor.com/docs/quickstart/>`_ with a
    screencast to show the basics.
*   `A Deployment Guide for Lektor + GitHub Pages
    <https://www.getlektor.com/docs/deployment/travisci/>`_ that shows how
    to put something up with the help of Travis-CI (which also includes a
    short screencast).

Final Words
-----------

I hope people find it useful.  I know that I enjoy using it a ton and I
hope it makes others enjoy it similarly.  Because I run so many Open
Source projects and maintenance of all of them turns out to be tricky I
figured I do this better this time around.  Lektor belongs to a separate
org and the project does not use any resources only I have access to
(other than the domain name and the server travis-CI deploys to).  So in
case people want to help out, there is no single point of failure!

I hope I can spend some time over Christmas to do the same to my other
projects and alter the bus factor of them.

There is far too much in Lektor to be able to cover it in a single blog
post so I will probably write a bit more about some of the really cool
things about in in the next few weeks.  Enjoy!
