---
tags:
  - c++
summary: A concise list of some common C++ pitfalls.
---

# C++ Pitfalls

I just recently started using C++ for university (about two months ago)
and still have a hard time accepting some of the weird syntax rules and
semantics. For someone that mainly does Python development C++ feels
very unnatural. In Python the syntax is clean and there are no
ambiguities. C++ is drastically different in that regard. I know there
are tons of resources on the net about C++ pitfalls already, but I
thought I have to add my own for people switching to C++ with a
background in Python and/or C.

## Private is the new Public

In Python you usually don't have to worry too much about that topic
because the language is very dynamic, but it's somewhat of an issue in
C. I'm talking about hiding implementation details behind a surface in a
way that you can change the implementation in later version of a library
without breaking backwards compatibility. If you have an object in C, or
something that looks/works like an object, you usually have some kind of
typedef to a struct or `void*`, and functions to create, delete and
manipulate it. The reason why a lot of code does it that way is that the
size and position of the struct members these functions access, is not
stored in the calling code. So you can safely change the size of the
struct for later versions of the library and code that compiled against
the older version of the library continues to work.

If you look at C++ classes, you will sooner or later notice that the
“new” operator and size of the allocated structure where the operator is
called. That means if you change the size of your class later (by adding
a new private member for example) you have to recompile the code,
otherwise new would not allocate enough memory and most likely crash in
your constructor call. I don't really know how C++ libraries solve that
problem, but I suppose they provide wrapper classes that contain the
constructor call and proxy all the calls.

So be warned. If you add private members existing code will no longer
work without recompilation.

## It's a Constructor call, no, it's a Function

This one is pretty obvious if you know C, but it's still something that
could baffle a newcomer.  If you have a class with a constructor that
accepts arguments and you want to allocate it on the stack, you would
usually do it like this:

```c++
MyClass obj(param1, param2, param3);
```

However, if you have a default constructor without argument, you *have*
to create the instance without the parentheses:

```c++
MyClass obj;
```

The reason for this is of course, that with the parentheses after `obj`
you would declare a function called obj that takes no arguments and
returns a `MyClass` object by value.

There are more cases like this, the others are harder to spot.  This
code for example fails to compile because `foo` is declared as function
accepting another function returning a `std::string` object, taking no
parameters:

```c++
#include
#include

class Foo {
public:
  Foo(const std::string msg) : m_msg(msg) {}
  void display() { std::cout << m_msg << std::endl; }
private:
  std::string m_msg;
};

int main()
{
  Foo foo(std::string());
  foo.display();
}
```

The correct way to create a `foo` object in that situation is using
the long version of the initialization syntax:

```c++
Foo foo = Foo(std::string());
```

So whenever you get an error message that contains something that
looks like a function pointer where you expected to have an object,
you probably stumbled upon that limitation in the syntax.

## More Constructor / Destructor Fun

But there is more fun with constructors and destructors. C++ creates
some of them for you, if you don't do it yourself. Basically the C++
compiler adds a default constructor for you if you did not declare a
constructor for the class, and it will add a copy constructor if you
did not declare a copy constructor. The same thing happens for the
infamous `operator=` which is created by default as well.

This becomes a problem if you have pointers in your class which are
not copied.  So what most people do is declare some operators and
constructors as private and don't implement them.  That way the
compiler will give you errors if you try to create copies of the
objects:

```c++
class MyClass {
private:
  MyClass(const MyClass &);
  MyClas &operator=(const MyClass &);
}
```

Also if you plan to subclass your class, you *have* to declare the
destructor virtual, otherwise subclasses will not be able to add new
members. However the compiler will not warn about that, so be
warned.

If you want your class to be copyable and you have subclasses, don't
forget to call `operator=` of the parent class. Because `operator=`
nearly works like a copy constructor you can easily forget to call
the operator of the parent function. But if you don't do that, the
parent members are not copied.

## Rules for Operator Overloading

If you do operator overloading, there are some rules you have to
follow. They are not that hard to remember, but not following them
will cause memory leaks and headaches.

`operator=`… returns a reference to `this`

`operator+` and friends… return the newly constructed object *by value*. Do not use
“new”!

`operator[]`… returns a reference. Otherwise it's not possible to add/change
items.

`operator bool` and friends… are declared without return value!

## Pointers VS Exceptions

Take a look at this code:

```c++
int main()
{
  FILE *file = fopen("myfile.txt", "r");
  if (!file) {
    fwrite(stderr, "Could not open file\n");
    return 1;
  }
  do_something_with(file);
  fclose(file);
  return 0;
}
```

While this code would work perfectly fine in C, it's very dangerous
in C++ because `do_something_with` could raise an exception.  Even
if *you* don't raise one there, something else could still raise one
(Like for example “new”).  The correct solution for this particular
problem would be using streams of course, but if you need to work
with pointers, wrap them in something that closes the resource in
the destructor:

```c++
class File {
public:
  File(const char *filename) : m_handle(fopen(filename, "r")) {}
  ~File() { if (m_handle) fclose(m_handle); }
  FILE *get() { return m_handle; }
  bool operator!() { return !m_handle; }

private:
  FILE *m_handle;
  File(const File &);
  File &operator=(const File &);
};

int main()
{
  File file("myfile.txt");
  if (!file) {
    fwrite(stderr, "Could not open file\n");
    return 1;
  }
  do_something_with(file.get());
  return 0;
}
```

Now when the object goes out of scope, the destructor is called and the
file is properly closed if it was open.

## More Syntax Problems

Because C++ is based on some older version of C it continues to carry some
of C's problems around.  One is the preprocessor which does not play well
with templates for example.  If you plan to create a `FOREACH` macro, the
chance is high that the following code won't work:

```c++
FOREACH(Pair item, items) { ... }
```

The preprocessor does not know that `Pair<...>` belongs together and will
try to split it up.

Another common problem seems to be that wrapped template definitions often
end in “>>” which the parser interprets as right-shift but you actually
wanted to close two templates.  In this case you have to add some
whitespace:

```c++
// wrong
std::list<shared_ptr<Foo>>

// correct
std::list<shared_ptr<Foo> >
```

I suppose there is more I missed, but these are the ones that caused my
some headache already.  I'll update the post when I discover more.
