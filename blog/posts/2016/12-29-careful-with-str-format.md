---
tags: ['python', 'security']
summary: "Some general warnings about the use of str.format in Python."
---

# Be Careful with Python's New-Style String Format

This should have been obvious to me for a longer time, but until earlier
today I did not really realize the severity of the issues caused by
`str.format` on untrusted user input.  It came up as a way to bypass the
Jinja2 Sandbox in a way that would permit retrieving information that you
should not have access to which is why I just pushed out a [security
release](https://www.palletsprojects.com/blog/jinja-281-released/) for
it.

However I think the general issue is quite severe and needs to be a
discussed because most people are most likely not aware of how easy it is
to exploit.

## The Core Issue

Starting with Python 2.6 a new format string syntax landed inspired by
.NET which is also the same syntax that is supported by Rust and some
other programming languages.  It's available behind the `.format()` method
on byte and unicode strings (on Python 3 just on unicode strings) and it's
also mirrored in the more customizable `string.Formatter` API.

One of the features of it is that you can address both positional and
keyword arguments to the string formatting and you can explicitly reorder
items at all times.  However the bigger feature is that you can access
attributes and items of objects.  The latter is what is causing the
problem here.

Essentially one can do things like the following:

```pycon
>>> 'class of {0} is {0.__class__}'.format(42)
"class of 42 is <class 'int'>"
```

In essence: whoever controls the format string can access potentially
internal attributes of objects.

## Where does it Happen?

First question is why would anyone control the format string.  There are a
few places where it shows up:

- untrusted translators on string files.  This is a big one because many
applications that are translated into multiple languages will use
new-style Python string formatting and not everybody will vet all the
strings that come in.

- user exposed configuration.  One some systems users might be permitted
to configure some behavior and that might be exposed as format
strings.  In particular I have seen it where users can configure
notification mails, log message formats or other basic templates in web
applications.

## Levels of Danger

For as long as only C interpreter objects are passed to the format string
you are somewhat safe because the worst you can discover is some internal
reprs like the fact that something is an integer class above.

However tricky it becomes once Python objects are passed in.  The reason
for this is that the amount of stuff that is exposed from Python functions
is pretty crazy.  Here is an example from a hypothetical web application
setup that would leak the secret key:

```python
CONFIG = {
    'SECRET_KEY': 'super secret key'
}

class Event(object):
    def __init__(self, id, level, message):
        self.id = id
        self.level = level
        self.message = message

def format_event(format_string, event):
    return format_string.format(event=event)
```

If the user can inject `format_string` here they could discover the secret
string like this:

```text
{event.__init__.__globals__[CONFIG][SECRET_KEY]}
```

## Sandboxing Formatting

So what do you do if you do need to let someone else provide format
strings?  You can use the somewhat undocumented internals to change the
behavior.

```python
from string import Formatter
from collections import Mapping

class MagicFormatMapping(Mapping):
    """This class implements a dummy wrapper to fix a bug in the Python
    standard library for string formatting.

    See http://bugs.python.org/issue13598 for information about why
    this is necessary.
    """

    def __init__(self, args, kwargs):
        self._args = args
        self._kwargs = kwargs
        self._last_index = 0

    def __getitem__(self, key):
        if key == '':
            idx = self._last_index
            self._last_index += 1
            try:
                return self._args[idx]
            except LookupError:
                pass
            key = str(idx)
        return self._kwargs[key]

    def __iter__(self):
        return iter(self._kwargs)

    def __len__(self):
        return len(self._kwargs)

# This is a necessary API but it's undocumented and moved around
# between Python releases
try:
    from _string import formatter_field_name_split
except ImportError:
    formatter_field_name_split = lambda \
        x: x._formatter_field_name_split()

class SafeFormatter(Formatter):

    def get_field(self, field_name, args, kwargs):
        first, rest = formatter_field_name_split(field_name)
        obj = self.get_value(first, args, kwargs)
        for is_attr, i in rest:
            if is_attr:
                obj = safe_getattr(obj, i)
            else:
                obj = obj[i]
        return obj, first

def safe_getattr(obj, attr):
    # Expand the logic here.  For instance on 2.x you will also need
    # to disallow func_globals, on 3.x you will also need to hide
    # things like cr_frame and others.  So ideally have a list of
    # objects that are entirely unsafe to access.
    if attr[:1] == '_':
        raise AttributeError(attr)
    return getattr(obj, attr)

def safe_format(_string, *args, **kwargs):
    formatter = SafeFormatter()
    kwargs = MagicFormatMapping(args, kwargs)
    return formatter.vformat(_string, args, kwargs)
```

Now you can use the `safe_format` method as a replacement for
`str.format`:

```pycon
>>> '{0.__class__}'.format(42)
"<type 'int'>"
>>> safe_format('{0.__class__}', 42)
Traceback (most recent call last):
  File "<stdin>", line 1, in <module>
AttributeError: __class__
```
