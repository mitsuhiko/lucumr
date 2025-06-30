---
tags: ['django']
summary: "An old post of back in the days when Django was considering releasing
a 2.0 version before 1.0."
---

# Django’s Problems and Why 2.0 is a Bad Idea

I stumbled about [this thread on django-developers](http://groups.google.com/group/django-developers/browse_thread/thread/b4c237ad76f9eeca)
which proposes calling the Django 1.0 release Django 2.0. One the one
hand version numbers say nothing. Just take Wine or Trac as two examples
that are already very stable but still below the magical 1.0 release.
Open Source software often takes some time until a 1.0 is released and
that's perfectly fine. However skipping a version number is purely a
marketing trick IMO. Just think of Java which currently names 1.6 Java 6
whereas 1.4 still was Java 2.

With django it looks like the plan is to keep up with Rails which went
to 2.0 a few days ago. While I love to see that django kicks ass and
it's moving toward a stable release I have a bad feeling naming it 2.0.
Because there is currently a huge gap between rails and django
unfortunately. Rails has gained really good integrated migrations, REST
webservices, a debugger and many other things django is still lacking.

Django makes an incredible good framework if you get your problem into
the use case of django. But as soon as you break out of it and need
something that goes beyond what's possible in django you wish you have
chosen something else. The django ORM is far from optimal, the admin
rocks but as soon as the number of users exceeds 10.000 users it's
impossible to use it (chose yourself in a dropdown of 50.000 users …) or
becomes utterly complex. Complex data models also look awkward in the
admin or become too complicated to manage. And if you want to stick with
the admin you cannot replace the user model. Now what do you do if you
have a forum and want to count the posts? Use a UserProfile module? And
how do you want to display a list of users sorted by their number of
posts?

Yes there are ways to hack around it but the more complex the
application becomes the more you of django's strengths become obsolete.
The application I'm working on right now now is only using two more
contrib modules. The auth and the admin, and it looks like we have to
drop them too, due to the limitations. All applications in that project
hack around ORM limitations, we have an incredible number of recreated
base middlewares, we have to monkey patch the request object to hack in
subdomain support.

I was talking with David Cramer from curse gaming about some of the
issues and he told me that they have forked django at a given point and
patched the ORM. The django template engine was replaced by Jinja (our
application does the same) and they are caching the hell out of the
application to scale it. Bryan McLemore from the curse team told me some
time ago that some pages have up to 30 queries on a page.

I don't want to say that django fails in what it's doing. But it's far
from 2.0.
