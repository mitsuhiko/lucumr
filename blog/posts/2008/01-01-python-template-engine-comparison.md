---
tags:
  - python
  - jinja
  - mako
  - genshi
summary: "A comparison of three of the most popular template engines for Python
and why they are different."
---

# Python Template Engine Comparison

I was small-talking with [zzzeek](http://techspot.zzzeek.org/) about
some things when I told him that I'm using Jinja, Genshi and Mako
depending on what I'm doing. He told me that it's unusual to switch
tools like that but I don't think it's that unusual.

All three template engines are totally different but have a one thing in
common: All three are the "second generation" of template engines.
Genshi is the formal successor of kid, Mako somewhat replaced Mygthy and
Jinja was inspired by the django templates. All three of them are
framework agnostic, use unicode internally and have a cool API you can
use in WSGI applications without scratching your head. But what inspired
those template engines and which template engine to choose for which
situation?

I often used PHP in the past to do simple header/footer inclusion. But
what always drove me nuts was that I had to use mod_rewrite to get nice
URLs or use a bunch of folders with index.php files or use files and
folders and drop the extension in the apache config. While this is nice,
this is now that portable and you can't have dynamic parts in the URL
and once you want some more dynamic stuff such as RSS feeds etc. you
notice that you made a mistake by choosing PHP. Some days ago I then
started working on the website for TextPress (not yet online) and wanted
to try something new: I wrote a tiny WSGI application (about 50 lines of
code) that just uses werkzeug's routing system and uses template names
as endpoints. These templates are then loaded with Mako, rendered and
returned as responses. This is not possible in the same way with Jinja
because you don't have python blocks and not so simple and
straightforward with Genshi because you have to think about XML or use a
rather limited text based template engine. Another very cool feature of
Mako is that you can do dynamic inheritance which is not possible in
Jinja.

Mako is a great template engine if you know Python, if you need some
logic in templates (and you know: logic in templates is not bad in every
situation) and if you need the best performance. Without a doubt Mako is
one of the fastest template engines for Python and the fastest template
engine that does not use a C extension.

Then there is Jinja which is also a text based template engine like
Mako. However the focus is on a completely different level. When Mako is
like PHP, Jinja is like Smarty (even though Mako is a million times
better than PHP as template engine). When I started working with Python
as programming language for web applications I stumbled about django. I
looked at the template engine and thought: WTF is that? The syntax
seemed odd and the restrictions ridiculous. Later on I loved the syntax
(and apparently others do to: the mini template engine by Ian Bicking
(tempita if I recall correctly) and the Genshi text templates are using
that syntax or a similar one too) but some of the restrictions seem
still ridiculous. When I looked at all those Django templates I created
over the time I noticed that I often moved calculations into template
tags that could be function calls, that I did other calculations in
the view functions that did not belong there and even more important:
that you could replace 95% of the custom template tags with function
calls or function calls with an enclosed template block if the template
engine had proper expressions. This lead to the development of what is
now known as Jinja. The syntax, the fact that it's sandboxed and the
designed friendliness is still very similar to Django, but unlike Django,
Python like expressions are possible in Jinja.

I'm using Jinja wherever I think web designers want to work on later on.
For example as template engine for TextPress or other applications that
should be styled by third party web designers.

Genshi on the other hand is an XML template engine. As a result of that
it's slower but also "context aware". It knows when it's processing a
CDATA section, it knows when it's inside a tag or an attribute etc. This
makes it possible to defend XSS in an automatic way. Per default Genshi
inserts the text into the output stream as text and not as markup. That
means all the HTML entities are automatically escaped for you. And
because it's stream based you can rewrite streams during the rendering
process. This makes it possible to fill form fields automatically, use
XInclude for simple layout templates and a lot more. You can even
translate your XML based templates into HTML4 on the fly. So you can use
your XML tool chain internally and output HTML4 and use the best of both
worlds. But because of this high flexibility Genshi also has some
problems to fight: You need to have XML knowledge to use it. No problem
if you are a programmer, but not that good if you are a web designer
doing fancy layouts. You are also forced to use XML templates
everywhere. It's true that Genshi has text templates too to fill the
gaps, but they are not comparable with real text template engines and
you are still operating on an XML stream, just that you don't see it.
And lastly: this whole stream processing makes Genshi slow. Not so slow
that you can't use it for big applications, but noticeably slower than
Mako or Jinja.

If you are using XML anyways in your application, Genshi is a very good
idea. Also if you don't have template designers that don't know XML or
if performance is not that much of a problem. Most of the time the
bottleneck is the database anyways. I never had real problems with
Genshi performance so far.

I hope this post sums up why I'm using all three template engines and
why I think we should be happy that we can chose between a couple of
template engines :-) Why I'm not covering other template engines like
Cheetah or SimpleTAL? Mostly because I looked at them, tried them out
and never used them for something big. Mostly because Mako looks a lot
nicer than Cheetah to me and SimpleTAL is far too much away from Python
for me.
