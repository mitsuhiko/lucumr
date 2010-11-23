public: yes
summary: |
  Experiences with XML in Wordpress (or what they call XML)

How not to do XML
=================

Imagine for the moment there `was a PHP blog software
<http://wordpress.org/>`_ that has the ability to dump the blog posts
into some sort of extended RSS 2 feed and import from there later and
probably from a different installation. That's nice, XML is a flexible
format and RSS allows extensions via namespaces. Even better, there are
XML parsers for all major programming languages and from python working
with XML is especially cool because of lxml and element tree. But there
is a problem with that...

...that XML, is not XML. It's called WordPress eXtended RSS (WXR) but
it's not XML? And why in god's name did nobody notice so far? I mean,
WordPress must have an importer for that.

Why it's not XML? It has XML syntax, XML namespace declarations but what
doesn't it have? A doctype. What's the problem? It's referencing HTML
entities! So step one for parsing: inject an inline DTD that defines
those entities. Great fun isn't it? Then it parses. I was happy and
finished my work. That XML doesn't have HTML entities is something PHP
developers probably don't know and their parser isn't resolving any
entities during the parsing process. Or worse, their XML parser expands
HTML entites.

But it's worse! I loaded another dump that happened to have some broken
HTML in comments (could happen, does happen, thanks broken trackback
support). What happens next? THE XML DOESN'T PARSE ANY MORE! Why?
Because comments are neither escaped nor marked as CDATA. I wonder why,
especially because it's so much easier to handle embedded HTML/XHTML for
dumping as cdata and not XML, especially if you are working with PHP.

But WordPress was able to import that.... so I looked at their
parser.... `WORDPRESS PARSES THAT WXR FILE
<http://trac.wordpress.org/browser/trunk/wp-admin/import/wordpress.php?rev=6870>`_
USING REGULAR EXPRESSIONS!!! Argharhgarhghargh. That's not XML what you
are doing there, that's nothing. WordPress can't even parse it's own
file if you bind the WordPress exporter namespace to a different prefix!
WordPress can't handle it's own file if you replace their CDATA foobar
against properly escaped stuff. Dammit!

I can't even write a proper exporter using XML tools because what my XML
tools generate is not compatible to WordPress. And what tops it all?

Reading that in the #wordpress channel: 

::

    <nickname_deleted> why does it matter what wp's xml format has flaws?
                          adapt your importer to the flaws

ARGHARGHARGHARGH. and then the webpage says: WordPress is a
state-of-the-art semantic personal publishing platform with a focus on
aesthetics, web standards, and usability.

Without further comments... I lost my faith into standards that moment.
Wait a second, I lost it earlier. Still sad.

