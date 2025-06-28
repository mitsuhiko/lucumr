public: yes
tags: [python, django, jinja]
summary: |
  Status update on Jinja and django templates and why it's not a big
  deal that django has a limiting templating engine.

Opinionated Frameworks
======================

Once again `my post about Jinja and the Django template engine
<http://lucumr.pocoo.org/2008/9/16/why-jinja-is-not-django-and-why-django-should-have-a-look-at-it>`_
appeared on `reddit <http://reddit.com/>`_. The second time in the last
two weeks, probably because my feeds changed and planets re-displayed
it. 

I originally wrote the post a few months ago to promote `Jinja
<http://jinja.pocoo.org/>`_ a bit. I was and still am very happy with
Jinja2 and wanted to write some lines about what I like about it and how
it works. And I also was hoping that the Django guys have a look at it
and copy some features of it. Mainly because every once in a while I
contribute code to a Django powered project or have my fingers in some
way in such a project's code. And every time I'm kinda puzzled how
simple some really complex tasks in Django are. 

So what has changed in Django's templates the last four months? Not that
much. The only changes in the Django template engine was the addition of
`{% empty %}` blocks in `{% for %}` loops (which does exactly what
Jinja's `{% else %}` does for loops) and some bug fixing. Is that a
problem? I don't know, but probably not. 

Django's templates are still slow and limited as they were, but it's not
causing problems so that users *have* to switch. Every once in a while I
notice that people switch to Jinja from Django templates because of
performance of the limitations, but very often they throw away half the
framework because they discover that Python has more to offer than just
Django. And with that in mind I guess the Django guys are doing the
right thing. 

Django is designed for content driven websites not so much for
independently deployed applications (like trac, WordPress, MediaWiki and
others). So not so much for applications and also not so much for stuff
where you need crazy database queries that are not possible with Django.
The template engine is designed for simple HTML generation and that's
it. If you want more, you often want something different than Django
anyways. 

I know many successful projects that are running Django without problems
and it works out for them, because their requirements match (nearly)
exactly what the framework was developed for. And I know many that
adopted Django because of the fuzz but what they actually want to do
does not fit into the Django style of development. 

In many ways Django reminds me a bit of unpacking cool stuff. You
download it and are instantly blown away how cool it is. Database just
works, templating is awesome, URL routing gives you these incredible
neat looking URLs and much more. It's so cool that many are trying to
suddenly do everything with it. And that's kinda where the problem lays.
You are forcing Django to do things it's not designed for. 

I *think* what is missing is a website that explains the advantages and
disadvantages of the particular solutions and what projects work best
with what solution. There are `Pylons <http://pylonshq.com/>`_,
`Werkzeug <http://werkzeug.pocoo.org/>`_, `Paste
<http://pythonpaste.org/>`_, `Repoze <http://repoze.org/>`_ and a lot
more frameworks and utility libraries that focus on different kinds of
web applications. And that does not only apply to full blown frameworks
or WSGI utilities, but also template engines, database libraries and
even databases themselves. It would prevent a lot of frustration if
people could find the framework or toolchain of choice *before* they
start developing their project. 

But such a page would have to be designed by someone unbiased. And
neither me, nor anyone else who develops on/for a Python powered
framework should create such a comparison page. But I would encourage
everybody with experiences in multiple frameworks to write down their
experiences with different Python frameworks, template engines, database
adapters and combinations thereof. 

**Update:** Fixed misleading sentence. Swapped complex and simple.

