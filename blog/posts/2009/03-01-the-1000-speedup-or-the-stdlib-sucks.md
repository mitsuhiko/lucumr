---
tags: ['python', 'web', 'engineering']
summary: "How a small change on an import resulted in an 1000% speedup."
facets:
  mood: {angry: 0.99}
  scale: {craft: 0.99}
  time: {past: 0.62, present: 0.35}
  ai: {not_ai: 1}
  imagery: {none: 0.77, body: 0.16}
  stance: {critic: 0.89}
  actor: {individual: 0.92}
  ending: {practical: 0.79, call: 0.2}
  tension: 0.45
  certainty: 0.98
  valence: 0.41
  energy: 0.78
  wander: 0.39
  personal: 0.53
  humor: 0.58
  technical: 0.79
---

# The 1000% Speedup, or, the stdlib sucks

I hate the [stdlib](http://docs.python.org/dev/library). There! I said
it. Why do I hate it? `Cookie`, `cgi`, `urllib`, n'uff said. Today I can
add another module to the "I hate you" list.

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
