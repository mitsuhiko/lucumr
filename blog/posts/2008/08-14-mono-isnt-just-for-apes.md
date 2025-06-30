---
tags:
  - mono
summary: "An old article from the time when mono just came out.  Still think it's
an excellent environment."
---

# Mono isn’t just for Apes

On my trip through the Scotland I bought an edition of “Linux Format” to
have something to read while waiting for the train. I was reading the
letters to the editor when I came across one letter that was basically
an insult to the magazine complaining about their [Mono](http://www.mono-project.com/) support. Apparently they reviewed
[Tomboy](http://www.gnome.org/projects/tomboy/) in an earlier edition
and haven't criticised for using Microsoft technology.

I came in contact with C# and .NET about two years ago when it was .NET
2.0 and instantly fell in love with it. It was Java inspired but
implemented tons of really cool features like properties, delegates and
much more. However at the time, Mono hasn't yet implemented generics
which was a 2.0 feature. Maybe it did, but at least my ubuntu
installation wasn't shipping gmcs yet. Because of that I pretty much
forgot about Mono for a while and just played with it once in a while.

A few weeks ago I noticed that gmcs has a command line switch called
`-langversion:linq` which enables all 2.0 features plus a few from 3.0
and 3.5 which made me play a lot with it. My main development
environments are an OS X notebook and an Ubuntu linux one. I still do
have a windows box but I just use it for playing. As a matter of fact
I'm only interested in Mono and not the Microsoft versions of the .NET
technologies. What I've seen so far is that Mono implemented all the
cool features I actually want to use. That is C# with generics, “yield
return”, lambdas, extension methods and LINQ (that is .NET 3.0 + some
3.5 features as far as I know, afair LINQ is a 3.5 feature). They also
have XSP2 and `System.Web` which makes it possible to use it for web
applications. What I've seen so far qualifies as “awesome” so I want to
share my feelings about Mono and why I think it's the best since the
advent of ubuntu. My real experience with Mono is only a few weeks old
therefore I may be missing quite a few things so please take this
“review” with a grain of salt.

I think there are three major types of critics of Mono in the Open
Source community. Those who think Microsoft pays Novell for developing
Mono to take over the world, those who think Mono is a project that will
face patent problems in the future because Microsoft will claim
copyright infringement and those who have a problem with Novell because
of the patent agreement with Microsoft. Of course there are more. There
are people who actually had a look at it and compare it to established
platforms like the JVM and come to the conclusion that the Sun compiler
is better than Mono or something similar. I agree that it's perfectly
okay to not like Mono because one is happy with the JVM or to hate
Novell to sign that patent agreement with Microsoft. However none of
that makes Mono as such a bad thing to have.

Mono is largely based on two ECMA standards (ECMA-334 aka C#) and
(ECMA-335 aka CLI or Common Language Infrastructure). Other than that
Mono also implements parts of ASP.NET, ADO.NET as well as
`Windows.Forms` which are subject to lots of concern from the Open
Source community. I don't know if parts of those are patented already or
if that's just a hypothetical problem but it seems to be one of the main
reasons why people hate Mono. Fortunately you don't have to use any of
them to do proper development with Mono. Especially Windows.Forms is
something you don't even *want* to use ;-)

Mono itself is a fantastic piece of software and one of the best
programming environments Linux users got since ages. The big advantage
of it is that the Mono environment can host multiple programming
languages, not just C#. Even though there are multiple languages running
on top of it they can exchange code which is somewhat hard to achieve
with the more traditional approaches. For example it's nearly impossible
to use a Python library with Ruby or the other way round. With Mono,
IronRuby and IronPython this becomes somewhat possible. But I must agree
that I haven't played with that in detail so far. C# alone was
convincing enough.

There are just two languages I dare to compare with C#. One is obviously
Java where C# got mosts of it's inspiration. The other one is D, a
rather new language(**Edit:** Apparently D is a lot older than I
remembered. [turns out](http://www.reddit.com/r/programming/comments/6wewu/mono_isnt_just_for_apes/c051x69)
it's there since 1999) that unlike C# or Java is not running on an
runtime environment but produces nativ code only. There is another one
which is called Vala and popped up a while ago which basically tries to
be C# compiling down to glib-C. D is a rather new language and there are
not many bindings to popular libraries available so far. Vala is even
newer. Until Mono popped up there was no statically compiled language
with bindings to major open source libraries such as GTK or DBus and was
beginner friendly. Most people used C/C++ or Python to develop GNOME
applications at least and on my rather new ubuntu box most GUI
applications are still made with those languages.

The language that is most similar to C# is Java. Having learned a lot
from Java, Microsoft improved C# over Java a lot. C# feels a lot more
like Python than Java. My favourite feature of C# is without a doubt the
ability to create properties. And from all the languages with comparable
features I know (which are Python, Ruby, D and C#) C# really has one of
the best solution for the problem. Unlike Java there is no need to write
getters and setters from the ground up in fear of breaking code later
when code execution on setting/getting of values is required and unlike
Python you don't have two variables (`foo` and `_foo`) lurking around on
the object. A non-property approach to represent a user could look like
this:

```csharp
class User {
  public string Username;
  public User(string username) {
    Username = username;
  }
}
```

If you later decide to execute code on setting the `Username` attribute
you can easily do so by making the attribute private and adding a
property:

```csharp
class User {
  private string username;
  public User(string username) {
    Username = username;
  }
  public Username {
    get { return username; }
    set {
      Utils.MoveHomeFolder(username, value);
      username = value;
    }
  }
}
```

My favorite feature after properties is definitively that you have to
make methods virtual explicitly. This enables faster code and hides a
lot of errors. In general the compiler can save you from quite a lot of
problems you only spot with excessive unit-testing in Python. For me
that is a huge advantage because I'm a) quite lazy and b) bad at typing.
I get typos in the easiest words and thanks to ^P in Vim those appear
multiple times before I notice :)

One of the things I love about Python is the possibility to subclass
internal objects such as dicts, lists and more to given them a behavior
more practical to the kind of data I store in them than the normal
version of the objects. For example Werkzeug comes with tons of custom
dicts, lists and sets for case insensitive data, multiple keys in a dict
and similar stuff. C# makes it ridiculously easy to do that thanks to
generics and the classes from System.Collections.Generic. First of all
they check the types of the objects you put into them and furthermore
you don't even have to subclass them to get collections the standard
library accepts as containers. In Python you pretty much have to
subclass the builtins because many Python libraries perform instance
checks against list, dict etc. In C# there are Interfaces for that and
they are used all over the place which is clever.

A huge advantage over Java is also that you have delegates and lambdas
which enable a lot of cool stuff not possible in Java. C# also knows
“yield return” which is essentially a helper to generate Enumerator
(iterator in Python) objects automatically which saves you tons of
boilerplate code. Another neat thing about C# is that you have
preprocessor directives which enable conditional compilation and allow
you to affect the error reporting by providing different line numbers or
filenames in “#line” comments. I often wished for something like that in
Python for example when writing Jinja which has to do an ugly hack to
rewrite the Tracebacks on the fly to get a proper debug output.

But C# goes far beyond that. Apparently the thread safety in C# is
mostly achieved by per-object locking which you can control with
`lock(obj) { ... }` which makes it a lot easier to write thread safe
classes. The Python “with” statement is available as `using (expr) { ...
}` which leads to much shorter code compared to Java. Take this Java
example:

```java
import java.io.*;

public class FileExample {
  public static void main (String[] args) {
    StringBuilder out = new StringBuilder();
    try {
      BufferedReader in = new BufferedReader(new FileReader("filename.txt"));
      try {
        String line, separator = System.getProperty("line.separator");
        while ((line = in.readLine() != null) {
          out.append(line);
          out.append(separator);
        }
      }
      finally {
        in.close();
      }
    }
    catch (IOException ex) {
      ex.printStackTrace();
    }
    doSomethingWith(out.toString());
  }
  public static void doSomethingWith(string s) {}
}
```

This is just ugly and I don't even know if I works because I hacked up
from memory without actually testing it. Now compare that with the
following C# version of the above code:

```java
using System.IO;

class FileExample {
  public static void Main(string[] args) {
    string result;
    using (StreamReader r = new StreamReader("filename.txt"))
      result = r.ReadToEnd();
    DoSomethingWith(result);
  }
  public static void DoSomethingWith(string s) {}
}
```

Not a single try/finally. using automatically does the right thing
because the `StreamReader` is an object implementing `IDisposable` which
means that after the `using` block C# will automatically call
`r.Dispose()`.

All the libraries I played with so far (that are the `System.*` ones,
GTK#, Dbus and many others) are using the language features like they
should. Properties are used where wanted, all public namespaces,
classes, methods and properties are named in a consistent way and
attribute classes (a special feature somewhat comparable to decorators
in Python) are used where useful (for example Dbus). That's a
consistency in the core libraries you won't find in Python! It's really
a pleasure to work with that because the code looks nice and there are
few surprises when looking for names.

Of course there are problems too. The documentation for Mono is still
lacking but you can help yourself by using the MSDN one. In general the
Mono documentation is a lot better than some other open source projects.

The progress Mono makes is astonishing. They may not be as fast as
Microsoft but the majority of the features work and even if we wouldn't
get any new it would be a great development platform. It really doesn't
matter if Mono can't keep up with Microsoft's .NET. The linux community
isn't very keen on Silverlight anyways and besides Silverlight not many
non-mono applications will hit the average Linux PC. The goal of the
Mono project is not to run arbitrary Windows .NET applications on Linux
but to have a free implementation of the .NET framework. It's saddening
that so many people torpedo the development because of FUD or just
because Microsoft came up with the idea.

So if you haven't had a look at Mono yet because you've heard so many
negative things about it: Forget about that and give it a try yourself.
You can't lose :)
