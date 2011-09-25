public: yes
tags: [python, import]
summary: |
  Ways to deal with the Python Import System Blackbox.

Dealing with the Python Import Blackbox
=======================================

*Turns out, this does not work reliably, in fact it will only work when
packages are involved.  I originally wrote the core for Flask extensions
and it appeared to work, but I never verified that it works without
extensions being involved.  And in fact the module cleanup breaks it.
Apparently Python **does** clean it up on module deallocation.*

For a long time Python's import system was (although customizable) at the
very core a black box.  You could hook into some parts of it but others
were hidden from you.  On top of that the only signalling that the import
system has is “here is your module, be happy” or “oh look, an import
error”.  Unfortunately Python's exceptions are an example of a `stringly
typed API
<http://stackoverflow.com/questions/2349378/new-programming-jargon-you-coined/2444303#2444303>`_,
and one of the worst.

But one step after another.  What's the actual problem of that black box.
it works, right?

The Use Case
------------

The problem arises when you start doing things and want to respond to
errors.  A good example are imports where you try to import something and
if that fails you want to do something else.  For instance you have a
module name as a string and you want to try to import that.  If that
module does not exist (not if it fails to import!) you want to do
something else.  Django's middlewares for instance are defined as strings
in the configuration module and if there is a typo you want to tell the
users where the problem is.

If you import module A and if that does not exist you want to fall back to
module B, you don't want to swallow the import error of module A since
that one might have been a dependency that failed loading.

Consider you have a module called `foo` that depends on a module named
`bar`.  If `foo` does not exist you want to retry with `simplefoo`.  This
is what nearly everybody is doing:

.. sourcecode:: python

    try:
        import foo
    except ImportError:
        import simplefoo as foo

However if now `foo` is failing to import because `bar` is missing you get
the import error “No module named simplefoo” even though the correct error
would have been “No module named bar”.

The Problem
-----------

The problem is that Python does not provide you with information if the
module was not found or failed to import.  In theory you could build
yourself something with the `imp` module that splits up finding and
loading but there are a handful of problems with that:

1.  The Python import process is notoriously underspecified and exploited
    in various ways.  Just because an importer says it finds a module it
    does not mean it can properly import it.  For instance there are many
    finders that will tell you that `find_module` succeeded just to fail
    later with an error on `load_module`.

2.  The Python import machinery is complex and even with the new
    `importlib` module everything but easy to use.  To replicate the logic
    that Python is applying to locate modules you need around 80 lines of
    code, even with `importlib` available.

3.  The import process is highly dynamic and there are various ways in
    which people can customize the importing, going beyond what is
    possible with regular import hooks by overriding `__import__`.

The second possibility that is actually in use sometimes is parsing the
error message of the import error.  This however is a lost cause because
the error message is implementation defined and differs quite often.  On
top of that is the import machinery in Python a recursive process and
gives very awkward results:

.. sourcecode:: pycon

    >>> import missing_module
    Traceback (most recent call last):
      File "<stdin>", line 1, in <module>
    ImportError: No module named missing_module

    >>> import missing_package.missing_module
    Traceback (most recent call last):
      File "<stdin>", line 1, in <module>
    ImportError: No module named missing_package.missing_module

    >>> import xml.missing_module
    Traceback (most recent call last):
      File "<stdin>", line 1, in <module>
    ImportError: No module named missing_module

As you can see, the error message does not even include the whole import
path at all times.  Sometimes the error message is something completely
unrelated, sometimes the whole error message is just the module name.
Sometimes it's “No module named %s”, sometimes the module name is on
quotes.  This is because various parts of the system can abort an import
process and since this is customizable …

Import Process Details
----------------------

The way imports work is that at a very early point an entry in
`sys.modules` is created for the new module.  When the module code is
executed it will be executed in a frame where the globals of the frame are
the dictionary of the module in `sys.modules`.  As such this is valid in
Python:

.. sourcecode:: python

    import sys
    a_value = [1, 2, 3]
    this = sys.modules[__name__]
    assert a_value is this.a_value

Now in theory one could think that if an import fails we will have a
partial entry in `sys.modules` left to introspect if the import failed at
a later point.  This however is usually not the case because on import
errors caused by the actual importers an importer is required to remove
the entry in `sys.modules` again so we don't have much luck there.

Consider this `fail_module.py`:

.. sourcecode:: python

    import sys

    # this works
    this = sys.modules['fail_module']

    # this fails
    import missing_module

If we however attempt to access `fail_module` later it will be gone:

.. sourcecode:: pycon

    >>> import sys
    >>> import fail_module
    Traceback (most recent call last):
      File "<stdin>", line 1, in <module>
      File "fail_module.py", line 7, in <module>
        import missing_module
    ImportError: No module named missing_module
    >>> import sys
    >>> 'fail_module' in sys.modules
    False

Since we also can't replace `sys.modules` with a custom data structure
where we get callbacks when things are inserted we have no chance there.

Sidechannels
------------

I had to solve this problem again yesterday when I worked on a way to get
rid of namespace packages in `Flask <http://flask.pocoo.org/>`_ without
pissing existing users off.  I think I found something that works reliable
enough where I don't want to shoot myself for writing the code.

The idea is that if you get an import error you don't only get an import
error but also a traceback object if you want.  And that traceback object
has all the frames of the traceback linked to it.  If you walk the
traceback you can find out if at any point the module you attempted to
import was involved.  If that was the case, the module succeeded in
loading and something that it did resulted in an import error.

Now obviously there are downsides of this approach, so let's go over them:

1.  It assumes that the module we import does not override `__name__`.
    Since that is a horrible idea anyways that's something we can ignore.

2.  It assumes that there will be at least one traceback frame originating
    from that module.  This will *not* be the case if that module was a C
    module that dynamically imported another module.  This however is
    negligible since this is on the one hand a very uncommon thing to do
    and secondly this comes with its own set of problems.

3.  It walks a traceback so your JIT will not be happy with that.  On the
    other hand you should only import modules in non critical code paths
    anyways.

So how does the code look?

.. sourcecode:: python

    import sys

    def import_module(module_name):
        try:
            __import__(module_name)
        except ImportError:
            exc_type, exc_value, tb_root = sys.exc_info()
            tb = tb_root
            while tb is not None:
                if tb.tb_frame.f_globals.get('__name__') == module_name:
                    raise exc_type, exc_value, tb_root
                tb = tb.tb_next
            return None
        return sys.modules[module_name]

You can use it like this:

.. sourcecode:: python

    json = import_module('simplejson')
    if json is None:
        json = import_module('json')
        if json is None:
            raise RuntimeError('Unable to find a json implementation')

Generally the implementation is straightforward.  Try to import with
`__import__`, if that fails get the current traceback and see if any of
the frames originated in the module we tried to import.  If that is the
case, we reraise the exception with the original traceback, otherwise just
return `None` to mark a missing module.

Since `None` has a special meaning in `sys.modules` which marks an import
error we know that an imported module never is `None` and we can use this
as return value to indicate a module that does not exist.  If we would
instead raise an exception we would have the very same problem again since
exceptions bubble up and we don't know if someone would handle it.  So
raising something like `ModuleNotFound` instead of returning `None` would
cause troubles if the module we import recursively imports something with
`import_module` and does not handle the exception.

Why does it work?
-----------------

Now you would think this only makes sense that it works, but it actually
surprised me that it does.  The reason it surprises me is that Python
normally shuts down modules in a very weird way by setting all the values
in the global dictionary to ``None``.   Since the actual modules is long
gone when you get the import error you would think that the reference to
the globals you have is full of ``None``\s and the names would never be
the module name.

To quote the documentation:

    Starting with version 1.5, Python guarantees that globals whose name
    begins with a single underscore are deleted from their module before
    other globals are deleted; if no other references to such globals
    exist, this may help in assuring that imported modules are still
    available at the time when the `__del__` method is called.

This however is only true when the module is shut down when the
interpreter is shutting down, not when the module is garbage collected.
And with that, the above hack works.  If Python would do what the
documentation says in the module destructor instead of the interpreter
shutdown code our hack would not work.

Also this requires that a traceback object indeed still owns a reference
to `f_globals`.  Now if you look at the traceback output itself you will
never see information that needs to be derived from the module global
dictionary so it appears to be implementation specific functionality that
is not guaranteed.  However, and here is the catch.  The import hook
protocol also specifies that a module can inject `__loader__` into the
frame so that the source can be loaded from the `__loader__` if the source
is not based on the filesystem.  And for this to work the globals have to
be there.  On top of that this also gives us confirmation that garbage
collected modules must not clear out their globals with `None`\s or we
would not be able to extract the sourcecode for certain import hooks when
an import error occurs since the loader would be gone.

And with that, the above hack suddenly looks quite reasonable and
supported again.
