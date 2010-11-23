public: yes
summary: |
  Read this with a grain of salt.

Why Python Sucks
================

And of course also why it sucks a lot less than any other language. But
it's not perfect. My personal problems with python: 

* It's dict and not Dict, it's list and not List and you cannot
  subclass them without overriding every method.......
* it's copy.copy and not just copy. Why in god's name is that an
  import?
* clean up the stdlib
* there is BaseHTTPServer and not py.http.baseserver or something like
  that. Why is that darn stdlib flat?
* there are soo many bad libraries in the stdlib and so many good ones
  not...
* no goddamn styleguide for the stdlib. it's UnitTest.assertEqual and
  not UnitTest.assert_equal like PEP 8 proposes
* By now you cannot reassign a variable from and outer scope. (there
  is a pep!)
* clean up the stdlib
* assignments are not expressions. gaaaaa. I want to do ``(foo |=
  []).append(42)`` and not ``foo |= []; foo.append(42)`` etc.
* No regexp literal and match objects are not instances of a Regexp
  class. Move the sre module into the core, add a ``@/foo/`` literal and
  create a Regexp class instead of something like _sre.SRE_Pattern which
  you cannot import to make isinstance tests
* missing blocks. darn. i want blocks
* unify unicode and string. quick! (waiting for Python 3000)
* clean up the stdlib

Why it still sucks less? Good question. Probably because the meta
programming capabilities are great, the libraries are awesome, indention
based syntax is hip, **first class functions**, quite fast, many
bindings (PyGTW FTW!) and the community is nice and friendly. And there
is WSGI!
