---
tags:
  - python
summary: |
  An exploration of singletons in Python, where they appear and why
  they can become a problem.
---

# Singletons and their Problems in Python

The infamous Singleton design pattern is now widely seen as [stupid](http://steve.yegge.googlepages.com/singleton-considered-stupid) and
[evil](http://blogs.msdn.com/scottdensmore/archive/2004/05/25/140827.aspx)
and also causes some [hatred](http://tech.puredanger.com/2007/07/03/pattern-hate-singleton/).
Fortunately singletons in Python are not that common and few people use
it. It seems to be a natural thing not to create a singleton class.

But beware. Just because you do not implement the singleton *design
pattern* it does not mean you avoid the core problem of a singleton. The
core problem of a singleton is the global, shared state. A singleton is
nothing more than a glorified global variable and in languages like Java
there are many reasons why you would want to use something like a
singleton. In Python we have something different for singletons, and it
has a very innocent name that hides the gory details: *module*.

That's right folks: a Python module is a singleton. And it shares the
same problems of the singleton pattern just that it's a little bit
worse.

## Namespaces

So let's dive into the problems of Python modules by looking at a
completely different language.  Let's compare our beloved Python modules
with C# namespaces for a moment.  If you don't know C#, let me show you
how they are declared:

```csharp
namespace MyNamespace {
  class MyClass {
  }
}
```

So as you can see, a namespace in C# is something you specify
explicitly. On the surface that looks like the big difference between a
Python module and a C# namespace. However, that's really just the
surface. The biggest difference is that a C# namespace is something like
a folder. You put stuff into it so that you can better organize it. And
the only stuff you can stuff into a C# namespace are classes,
interfaces, other namespaces, enums and delegates (something like a
function prototype in C).

In Python a module is an object. And that object is an instance of a
class called module and it has as many attributes as you like. You can
put whatever you want on it. What's stored on there are usually the
imported objects, the classes and functions declared in that module and
other global variables or constants.

That means the big difference is that a Python module has the ability to
store state, a C# namespace does not. There is nothing you can store on
a C# namespace that could change at runtime. That means the only thing
“stored” on a C# namespace is compiled code that was loaded from an
assembly (something like a .pyc file in Python, just more portable).

So what are the implications?

## There can only be one…

So I have already told you that modules in Python are simple objects
with attributes. So what happens if you write `import meh` (Ignoring the
obscure details about the Python import system)? First the Python
interpreter checks if the module was already imported and if yes, it's
using the already imported module, otherwise it's creating a new module
object and executes the code that creates it.

The already imported modules are stored in a special dictionary inside
the interpreter. `sys.modules` points to this dictionary, so you can
access that from the Python code. Each module that was already imported
(and also modules that are known to not exist) are stored in there to
ensure *there will only be one*. So as you might have guessed, it's what
we call a singleton.

The second step, the execution of code to create the module attributes
is the second “problem” here. It's what creates the shared state or what
can create the shared state. In order to not talk about irrelevant
things, let's have a look at one of the modules from the [standard
library](http://lucumr.pocoo.org/2009/3/2/std-stands-for-sleazy-tattered-and-dead),
the [mimetypes](http://lucumr.pocoo.org/2009/3/1/the-1000-speedup-or-the-stdlib-sucks)
module.

Have a look:

```python
inited = False

def init(files=None):
    global inited
    db = MimeTypes()
    ...
```

This is actual code from the `mimetypes` module that ships with Python,
just with the more gory details removed. The point is, there is shared
state. And the shared state is a boolean flag that is `True` if the
module was initialized or `False` if it was not. Now that particular
case is probably not that problematic (trust me, it is) because
mimetypes initializes itself, but you can see that there is a `files`
parameter to the `init` function. If you pass a list of files to that
function, it will reinitialize the mime database in memory with the mime
information from those files. Now imagine what would happen if you have
two libraries initializing mimetypes with two different sources …

Now obviously, that's a problem of the library that implements it not of
Python itself. Nobody should have shared state in module scope.
Unfortunately there are many standard library modules that have that
(`cgi`, `logging`, `mimetypes`, `csv`, …) and it seems to be standard
practice in Python world. There is a lot of shared state in Django and
nearly all modern frameworks, not just for the web.

## Let it be None?

Now before I ask for more than one, I want to ask for none. Because this
is the problem that freaks me out the most. I'm mainly doing Python
webdevelopment and that means I have some long running processes that
are managed by some external server I don't really control. Not only do
I work with Python, I also obsessed by the idea to have extensible
systems. Which is why [a project of mine](http://zine.pocoo.org/) has
a plugin interface. Users can upload new plugins in the web interface
and activate and deactivate them.

What does all of that have to do with singletons and modules?
Unfortunately too much. I told you already that once a module is
imported, it's stored in that `sys.modules` thing. Now imagine a user
uploads a new version of a plugin, he upgrades it. In order for the new
code to load you would first have to shutdown the Python interpreter and
restart it again. Unfortunately there is no way for a WSGI application
to request a restart from the webserver.

So how does one unload a module to reload a new version? There is no
documented way for that, and the thing I'm doing is dangerous, not
portable, kills little kittens and you should never, ever do that.

The road to insanity or code reloading in Python:

1. Put your reloading code into a separate module, one with a
special name (`zine._core` in my case)

1. Have some sort of lock.

1. Acquire that lock, and do that when you're sure no other thread
is executing code from your package (haha, good luck)

1. Clear all modules from `sys.modules` that belongs to your code,
except the one that implements the reloader.

1. Import your package again and execute the code that sets up the
application again.

This is dangerous and stupid. Imagine what happens if a thread is still
active in the old code and you kick away the modules it's executing in.
Because of weak references you could get rid of the global scope (the
module one) a called function is still weakly referencing and the
function would break with an obscure error.

Currently there is no solution for that problem, and I don't expect one
to appear in Python anytime soon, at least not without breaking stuff.
Because what we would need is …

## … more Singletons

If one singleton does not solve the problem, a second one could. That's
the point where you should disagree with me and call me names, but let
me explain myself first. The problem is shared state, but why is shared
state the problem? In Python development we seem to love shared state, a
whole lot. And it does make development simple and lets you learn and
understand the language quickly. The shared state is usually stored on
modules or stuff stored on modules, so modules seem to be the root of
all evil. There can only be one version of a module, what does this mean
for us? Imagine we have *one running Python interpreter*, the following
things do not work:

- that interpreter runs application A and application B, A wants
libfoo in version 1.0, B wants libfoo in version 2.0, both API
incompatible

- we can't reload code on the fly because we would have to tear
everything down first and restart, we can't load the new version of
the code and slowly moving over to it and get rid of the old code with
the help of the garbage collector when it's no longer needed.

- we can't have two instances of the same application running in the
same process that want different search paths for plugins loaded with
the regular import API (instance 1 loading the modules below
`app.plugins` from `/var/www/instance1/plugins` and instance 2 loading
the modules from `/var/www/instance2/plugins`)

The funny (and sad) part is that all these nice things do not work just
because of one single object: `sys.modules`, the übersingleton of
Python.

But we can't get rid of it because our modules are objects and we want
to get the same module back if we import it in two different modules. So
if we can't get rid of the singleton, add some more!

This solution would solve the problems of the three cases outlined
above, but there would still be many problems left. Also there is no way
this could be implemented in a backwards compatible fashion in Python
due to the fact how pickle imports objects and how we refer to objects,
but this is how it could work:

## Tagging sys.modules

Currently the key for the items in `sys.modules` is the name of the
module. In an ideal world, the keys would be tuples in the form
`(module_name, tag)` where tag could be used for the following things:

- specify a specific version of the library (like `'1.0'`)

- a secondary import of a library (like mimetypes import for library
B)

- an random ad-hoc identifier to enforce fresh imports (think about
testsuites and benchmarks that need to work on clean imports of a
library because of … well … shared state …)

How to express which tag to use?

```text
# a string literal as tag
from sqlalchemy['0.6'] import create_engine

# the contents of a variable as tag
from zine.plugins[my_instance] import myrtle_theme
```

What if no tag is provided? No idea man.

## What's your Point?

I guess … there is none. It shows a problem I have with Python and
provides the first part of a solution. It explains why [Zine](http://zine.pocoo.org/) is doing funny things and why there can only
be one Zine instance per interpreter. It's some brainstorming I wanted
to share with the world and maybe someone can use that to implement a
new dynamic language that fixes that problem. It's not like that's a
problem only Python has …
