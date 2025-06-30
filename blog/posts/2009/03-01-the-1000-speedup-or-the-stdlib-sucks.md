---
tags:
  - python
  - rant
summary: How a small change on an import resulted in an 1000% speedup.
---

# The 1000% Speedup, or, the stdlib sucks

I hate the [stdlib](http://docs.python.org/dev/library). There! I said
it. Why do I hate it? `Cookie`, `cgi`, `urllib`, n'uff said. Today I can
add another module to the “I hate you” list.

I noticed that [Werkzeug](http://werkzeug.pocoo.org/)'s
`SharedDataMiddleware` was just delivering 50 requests a second. I tried
around a bit but nothing changed. Until I removed the call to
`mimetypes.guess_type`. Suddenly I got 500 requests the second instead
of the previous 50.

How badly implemented can that function be I was asking myself.  So I
had a look:

```python
def guess_type(url, strict=True):
    init()
    return guess_type(url, strict)
```

WTF? And then it hit me. `init()` was loading the mimetype database and
monkey patching the module so that `guess_type()` was replaced by a new
function. Actually a method of the mimetype database.

And I was importing `guess_type` as follows:

```python
from mimetypes import guess_type
```

So on every call the database was reloaded.  GNAAAaa.  So check out [If
you're doing the same mistake](http://www.google.com/codesearch?hl=en&sa=N&q=%22from+mimetypes+import+guess_type%22).
If yes, change it to the following import:

```python
import mimetypes
```

And now I file a ticket in the Python bug tracker [ticket filed](http://bugs.python.org/issue5401). -.-
