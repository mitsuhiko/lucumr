public: yes
tags: [jinja, python, django]
summary: |
  Why Jinja2's template engine design makes it harder for your to shoot
  yourself into the foot compared to Django's limited templating system.

Not So Stupid Template Languages
================================

Daniel Greenfield recently criticized templating languages such as Mako,
Genshi, Jinja2 or others for not being more than a stupid template
language.  That of course might be valid criticism, but there seems to be
some major misunderstanding out there about what Jinja2 compared to
Django's templating system actually is.

As said by Daniel:

    I often work on projects crafted by others, some who decided for
    arcane/brilliant/idiotic reasons to mix the kernel of their
    applications in template function/macros. This is only possible in
    Smart Template Languages! If they were using a Stupid Template
    Language they would have been forced put their kernel code in a Python
    file where it applies, not in a template that was supposed to just
    render HTML or XML or plain text.

I suppose the macro part there is written especially with Jinja2 in mind
there because I know very few templating systems calling things “macros”.
In fact, the only reason Jinja2 calls it's functions “macros” is that
“enddef” sounded stupid as a keyword and “endfunction” was past the
threshold of keyword lengths I was happy with.

So what is a macro in Jinja2 and why does it exist in the first place?  A
macro is basically nothing more than a template that is ment for
including, but with the additional information about what variables it
wants.  It's the Python principle of “explicit is better than implicit”
applied for templating languages.

Take the following Django template as example:

.. sourcecode:: html+django

    <ul>
    {% for user in users %}
        <li>{% include "_render_user.html" %}</li>
    {% endfor %}
    </ul>

From looking at that specific code it's completely impossible to figure
out what templates the included template depends on.  One might guess that
user is used, but there are two other variables available for sure: first
of all “users” is clearly available for the included template, however
django also adds “forloop” implicitly into the context, so the template
that was included could use that to.  Additionally however it might access
the current request, current user or tons of other variables.

Jinja2 makes this an explicit thing: don't use includes, import macros and
explicitly pass the variables there.  It's a little bit more to write but
comes with three nice advantages:

1.  it's explicit which makes it a lot easier to figure out what exactly
    is happening in a template.  Especially if you want to look over
    templates written by someone else it's a huge time saver.
2.  it allows the templating system to apply huge performance
    improvements.  “forloop” / “loop” is never referenced?  No point in
    creating an object then.
3.  Macros are functions and thus can be used in an expression context.
    This – among other things – makes it possible to expand / call macros
    in the context of internationalized blocks and other things.

This example here makes this pretty obvious:

.. sourcecode:: html+jinja

    {% from "_user.html" import render_user %}
    <ul>
    {% for user in users %}
        <li>{{ render_user(user) }}</li>
    {% endfor %}
    </ul>

Here Daniel is just wrong:

    What it comes down to is that Smart Template Languages designers
    assume that developers are smart enough to avoid making this mistake.
    Stupid Template Languages designers assume that developers generally
    lack the discipline to avoid creating horrific atrocities that because
    of unnecessary complexity have a bus factor of 1.

I don't know about how other template engine authors are handling the
issue, but I am well aware of the fact that users will find ways to shoot
themselves into the foot with any tool you give them which obviously
includes Jinja2.  Which is why Jinja2 also provides much superior ways to
Django to prevent this from happening.

Ever had the problem that a template accidentally triggered a database
query?  In Django land this is a very, very common problem and the exact
location of that query can be hard to pinpoint.  If you are passing
arbitrary Python models into the template there will always be ways to
trigger queries.

Jinja2 allows you to easily prevent that from happening by using a
sandboxed environment and overriding the callback functions.  In fact,
preventing queries from model attributes could probably be prevented from
happening in less than 10 lines of code.  If one would argue that the
sandbox adds inacceptable overhead I could generally agree for some kinds
of applications.  At the same time however there is no reason why you
shouldn't use such a sandbox during development and disable it for the
production system.

In general I have seen some really horrible and bad abuse of the Django
template language that I would argue the bus factor is a much harder
problem in the Django template world than anywhere else.  Undocumented
custom template tags written by someone on the project doing some things
in one way and other things in a different way, not behaving as intended
but still in use are very, very common.  It becomes especially hairy if
people start using custom template tags in internationalized applications
where suddenly they can't use particular constructs in block translation
blocks.  Then tags are extended to now also write into variables and not
render anything and because the intended syntax clashes due to the custom
parsing code with stuff that was already valid before inconsistent syntax
rules become the norm.  A giant mess.

I'm not arguing there that Django's template system would be bad, I think
it's good enough for what it does.  I however disagree strongly with the
fact that “non stupid template languages” are too complex for people to
handle or give them additional power to make your code unmaintainable.

Those are different systems with different ideas and different
consequences.  The “unrestricted template languages are bad and result in
PHP spaghetti code” straw man argument is just that: a straw man.  I have
seen equally bad Django, PHP, Jinja2 and Mako templates.
