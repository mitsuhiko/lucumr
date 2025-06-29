tags: [python, c, thoughts]
summary: |
  A guide on writing beautiful native libraries in C or C++ that compile
  to native code.

Beautiful Native Libraries
==========================

I'm obsessed with nice APIs.  Not just APIs however, also in making the
overall experience of using a library as good as possible.  For Python
there are quite a few best practices around by now but it feels like there
is not really a lot of information available about how to properly
structure a native library.  What do I mean by native library?
Essentially a dylib/DLL/so.

Since I'm currently spending more time on C and C++ than Python at work I
figured I might take the opportunity and collect my thoughts on how to
write proper shared libraries that do not annoy your users.

Shared or Static?
-----------------

This post almost entirely assumes that you are building a DLL or shared
library and not something you link statically.  While it sounds like a
statically and dynamically linked library are essentially the same thing
where the only difference is how you link against it, there is much more
to it.

With a dynamically linked library you have much better control over your
symbols.  Dynamically linked libraries also work much better between
different programming languages.  Nothing stops you from writing a library
in C++ and then using it in Python.  In fact, that's exactly how I
recommend doing unittests against such libraries.  More about that later.

Which Language?
---------------

So you want to write a library that compiles into a DLL or something of
that sort and it should be somewhat platform independent.  Which languages
can you actually use there?  Right now you can pick between C and C++ and
soon you might also be able to add Rust to that list.  Why not others?  C
is easy: because that's the only language that actually defines a somewhat
stable ABI.  Strictly speaking it's not the language that defines it, it's
the operating system, but in one way or another, C is the language of
choice for libraries and the C calling conventions is the lingua franca of
shared libraries.

“The greatest trick that C ever pulled was convince the world that it does
not have a runtime”.  I'm not sure where I heard the quote first, but it's
incredibly appropriate when talking about libraries.  Essentially C is so
commonplace that everything can assume that some basic functionality is
provided by the C standard library.  That's the one thing that everybody
agreed on that exists.  For C++ the situation is more complicated.  C++
needs a bunch of extra functionality that is not provided by the C
standard library.  Primarily it needs support for exception handling.  C++
however degrades otherwise nicely to C calling conventions so it's very
easy to still write libraries in it, that completely hide the fact that
there is C++ behind the scenes.

For other languages that's not so easy however.  Why for instance is it
not a good idea to write a library in Go?  The reason for this is that Go
for needs quite a heavy runtime that does garbage collection and provides
a scheduler for it's coroutines.  Rust is getting closer to not having any
runtime requirements besides the C standard library which will make it
possible to write libraries in it.

Right now however, C++ is most likely the language you want to use.  Why
not C?  The reason for this is that Microsoft's C compiler is notoriously
bad at receiving language updates and you would otherwise be stuck with
C89.  Obviously you could just use a different compiler on Windows but
that causes a whole bunch of problems for the users of your library if
they want to compile it themselves.  Requiring a tool chain that is not
native to the operating system is an easy way to alienate your developer
audience.

I would however generally recommend to a very C like subset of C++: don't
use exceptions, don't use RTTI, don't build crazy constructors.  The rest
of the post assumes that C++ is indeed the language of choice.

Public Headers
--------------

The library you're building should ideally have exactly one public header
file.  Internally go nuts and create as many headers as you want.  You
want that one public header file to exist, even if you think your library
is only ever going to be linked against something that is not C.  For
instance Python's CFFI library can parse header files and build bindings
out of that.  People of all languages know how headers work, they will
have a look at them to build their own bindings.

What rules are there to follow in headers?

Header Guards
`````````````

Each public header that other people use should have sufficiently unique
header guards to make sure they can be included multiple times safely.
Don't get too creative with the guards, but also don't be too generic with
them.  It's no fun including a header that has a super generic include
guard at the top (like ``UTILS_H`` and nothing else).  You also want to
make sure that there are ``extern "C"`` markers for C++.

This would be your minimal header:

.. sourcecode:: cpp

    #ifndef YOURLIB_H_INCLUDED
    #define YOURLIB_H_INCLUDED
    #ifdef __cplusplus
    extern "C" {
    #endif

    /* code goes here */

    #ifdef __cplusplus
    }
    #endif
    #endif

Export Markers
``````````````

Because you yourself will probably include your header file as well you
will need to make sure that there are macros defined that export your
functions.  This is necessary on Windows and it's a really good idea on
other platforms as well.  Essentially it can be used to change the
visibility of symbols.  I will go into that later, for the time being just
add something that looks like this:

.. sourcecode:: cpp

    #ifndef YL_API
    #  ifdef _WIN32
    #     if defined(YL_BUILD_SHARED) /* build dll */
    #         define YL_API __declspec(dllexport)
    #     elif !defined(YL_BUILD_STATIC) /* use dll */
    #         define YL_API __declspec(dllimport)
    #     else /* static library */
    #         define YL_API
    #     endif
    #  else
    #     if __GNUC__ >= 4
    #         define YL_API __attribute__((visibility("default")))
    #     else
    #         define YL_API
    #     endif
    #  endif
    #endif

On Windows it will set ``YL_API`` (I used ``YL`` as short version for
“Your Library” here, pick a prefix that fits you) for DLLs appropriately
depending on what flag is set.  Whoever includes the header without doing
anything fancy before will automatically get ``__declspec(dllimport)`` in
its place.  This is a really good default behavior on Windows.  For other
platforms nothing is set unless a somewhat recent GCC/clang version is
used in which case the default visibility marker is added.  As you can see
some macros can be defined to change which branch is taken.  For instance
when you build the library you would tell the compiler to also defined
``YL_BUILD_SHARED``.

On Windows the default behavior for DLLs has always been: all symbols are
not exported default unless marked with ``__declspec(dllexport)``.  On
other platforms unfortunately the behavior has always been to export
everything.  There are multiple ways to fix that, one is the visibility
control of GCC 4.  This works okay, but there are some extra things that
need to be considered.

The first is that the in-source visibility control is not the silver
bullet.  For a start the marker will do nothing unless the library is
compiled with ``-fvisibility=hidden``.  More important than that however
is that this will only affect your own library.  If you statically link
anything against your library, that library might expose symbols you do
not want to expose.  Imagine for instance you write a library that depends
on another library you want to statically link in.  This library's symbols
will also be exported from your library unless you prevent that.

This works differently on different platforms.  On Linux you can pass
``--exclude-libs ALL`` to ``ld`` and the linker will remove those symbols
automatically.  On OS X it's tricker because there is no such
functionality in the linker.  The easiest solution is to have a common
prefix for all functions.  For instance if all your functions start with
``yl_`` it's easy to tell the linker to hide everything else.  You do this
by creating a symbols file and then pointing the linker to it with
``-exported_symbols_list symbols.txt``.  The contents of this file can be
the single line ``_yl_*``.  Windows we can ignore as DLLs need explicit
export markers.

Careful with Includes and Defines
---------------------------------

One thing to be careful about is that your headers should not include
too many things.  Generally I believe it's fine for a header to include
things like ``stdint.h`` to get some common integer types.  However what
you should not do is being clever and defining types yourself.  For
instance msgpack had the brilliant idea to define ``int32_t`` and a few
other types for Visual Studio 2008 because it lacks the ``stdint.h``
header.  This is problematic as only one library can define those types
then.  Instead the better solution is to ask the user to provide a
replacement ``stdint.h`` header for older Visual Studio versions.

Especially do not ever include ``windows.h`` in a library header.  That
header pulls in so much stuff that Microsoft added extra defines to make
it leaner (``WINDOWS_LEAN_AND_MEAN``, ``WINDOWS_EXTRA_LEAN`` and
``NOMINMAX``).  If you need ``windows.h`` included, have a private header
file that's only included for your ``.cpp`` files.

Stable ABI
----------

Do not put any structs into public headers unless you are 100% sure that
you will never change them.  If you do want to expose structs and you do
want to add extra members later, make sure that the user does not have to
allocate that header.  If the user does have to allocate that header, add
a version or size information as first member into the struct.

Microsoft generally puts the size of structs into the structs to allow
adding members later, but this leads to APIs that are just not fun to use.
If you can try to avoid having too many structs in the headers, if you
can't at least try to come up with alternative methods to make the API
suck less.

With structs you also run into the issue that alignments might differ
between different compilers.  Unfortunately there are cases where you are
dealing with a project that forces the alignment to be different for the
whole project and that will obviously also affect the structs in your
header file.  The fewer structs the better :-)

Something that should go without saying: do not make macros part of your
API.  A macro is not a symbol and users of languages not based on C will
hate you for having macros there.

One more note on the ABI stability: it's a very good idea to include
the version of the library both in the header as well as compiled into
the binary.  That way you can easily verify that the header matches the
binary which can save you lots of headaches.

Something like this in the header:

.. sourcecode:: cpp

    #define YL_VERSION_MAJOR 1
    #define YL_VERSION_MINOR 0
    #define YL_VERSION ((YL_VERSION_MAJOR << 16) | YL_VERSION_MINOR)

    unsigned int yl_get_version(void);
    int yl_is_compatible_dll(void);

And this in the implementation file:

.. sourcecode:: cpp

    unsigned int yl_get_version(void)
    {
        return YL_VERSION;
    }

    int yl_is_compatible_dll(void)
    {
        unsigned int major = yl_get_version() >> 16;
        return major == YL_VERSION_MAJOR;
    }


Exporting a C API
-----------------

When exposing a C++ API to C there is not much that needs to be
considered.  Generally for each internal class you have, you would have an
external opaque struct without any fields.  Then provide functions that
call into your internal functions.  Picture a class like this:

.. sourcecode:: cpp

    namespace yourlibrary {
        class Task {
        public:
            Task();
            ~Task();

            bool is_pending() const;
            void tick();
            const char *result_string() const;
        };
    }

The internal C++ API is quite obvious, but how do you expose that via C?
Because the external ABI now no longer knows how large the structs are you
will need to allocate memory for the external caller or give it a method
to figure out how much memory to allocate.  I generally prefer to allocate
for the external user and provide a free function as well.  For how to
make the memory allocation system still flexible, have a look at the next
part.

For now this is the external header (this has to be in ``extern "C"``
braces):

.. sourcecode:: c

    struct yl_task_s;
    typedef struct yl_task_s yl_task_t;

    YL_API yl_task_t *yl_task_new();
    YL_API void yl_task_free(yl_task_t *task);
    YL_API int yl_task_is_pending(const yl_task_t *task);
    YL_API void yl_task_tick(yl_task_t *task);
    YL_API const char *yl_task_get_result_string(const yl_task_t *task);

And this is how the shim layer would look like in the implementation:

.. sourcecode:: c++

    #define AS_TYPE(Type, Obj) reinterpret_cast<Type *>(Obj)
    #define AS_CTYPE(Type, Obj) reinterpret_cast<const Type *>(Obj)

    yl_task_t *yl_task_new()
    {
        return AS_TYPE(yl_task_t, new yourlibrary::Task());
    }

    void yl_task_free(yl_task_t *task)
    {
        if (!task)
            return;
        delete AS_TYPE(yourlibrary::Task, task);
    }

    int yl_task_is_pending(const yl_task_t *task)
    {
        return AS_CTYPE(yourlibrary::Task, task)->is_pending() ? 1 : 0;
    }

    void yl_task_tick(yl_task_t *task)
    {
        AS_TYPE(yourlibrary::Task, task)->tick();
    }

    const char *yl_task_get_result_string(const yl_task_t *task)
    {
        return AS_CTYPE(yourlibrary::Task, task)->result_string();
    }

Notice how the constructor and destructor is fully wrapped.  Now there is
one problem with standard C++: it raises exceptions.  Because constructors
have no return value to signal to the outside that something went wrong it
will raise exceptions if the allocation fails.  That's however not the
only problem.  How do we customize how the library allocates memory now?
C++ is pretty ugly in that regard.  But it's largely fixable.

Before we go on: please under no circumstances, make a library, that
pollutes the namespace with generic names.  Always put a common prefix
before all your symbols (like ``yl_``) to lower the risk of namespace
clashes.

Context Objects
---------------

Global state is terrible, so what's the solution?  Generally the solution
is to have what I would call “context” objects that hold the state
instead.  These objects would have all the important stuff on that you
would otherwise put into a global variable.  That way the user of your
library can have multiple of those.  Then make each API function take that
context as first parameter.

This is especially useful if your library is not threadsafe.  That way you
can have one per thread at least, which might already be enough to get
some parallelism out of your code.

Ideally each of those context objects could also use a different
allocator, but given the complexities of doing that in C++ I would not be
super disappointed if you did not make that work.

Memory Allocation Customization
-------------------------------

As mentioned before, constructors can fail and we want to customize memory
allocations, so how do we do this?  In C++ there are two systems
responsible for memory allocations: the allocation operators ``operator
new`` and ``operator new[]`` as well as the allocators for containers.  If
you want to customize the allocator you will need to deal with both.
First you need a way to let others override the allocator functions.  The
simplest is to provide something like this in the public header:

.. sourcecode:: c

    YL_API void yl_set_allocators(void *(*f_malloc)(size_t),
                                  void *(*f_realloc)(void *, size_t),
                                  void (*f_free)(void *));
    YL_API void *yl_malloc(size_t size);
    YL_API void *yl_realloc(void *ptr, size_t size);
    YL_API void *yl_calloc(size_t count, size_t size);
    YL_API void yl_free(void *ptr);
    YL_API char *yl_strdup(const char *str);

And then in your internal header you can add a bunch of inline functions
that redirect to the function pointers set to an internal struct.  Because
we do not let users provide ``calloc`` and ``strdup`` you probably also
want to reimplement those functions:

.. sourcecode:: c

    struct yl_allocators_s {
        void *(*f_malloc)(size_t);
        void *(*f_realloc)(void *, size_t);
        void (*f_free)(void *);
    };
    extern struct yl_allocators_s _yl_allocators;

    inline void *yl_malloc(size_t size)
    {
        return _yl_allocators.f_malloc(size);
    }

    inline void *yl_realloc(void *ptr, size_t size)
    {
        return _yl_allocators.f_realloc(ptr, size);
    }

    inline void yl_free(void *ptr)
    {
        _yl_allocators.f_free(ptr);
    }

    inline void *yl_calloc(size_t count, size_t size)
    {
        void *ptr = _yl_allocators.f_malloc(count * size);
        memset(ptr, 0, count * size);
        return ptr;
    }

    inline char *yl_strdup(const char *str)
    {
        size_t length = strlen(str) + 1;
        char *rv = (char *)yl_malloc(length);
        memcpy(rv, str, length);
        return rv;
    }

For the setting of the allocators themselves you probably want to put that
into a separate source file:

.. sourcecode:: c

    struct yl_allocators_s _yl_allocators = {
        malloc,
        realloc,
        free
    };

    void yl_set_allocators(void *(*f_malloc)(size_t),
                           void *(*f_realloc)(void *, size_t),
                           void (*f_free)(void *))
    {
        _yl_allocators.f_malloc = f_malloc;
        _yl_allocators.f_realloc = f_realloc;
        _yl_allocators.f_free = f_free;
    }

Memory Allocators and C++
-------------------------

Now that we have those functions set, how do we make C++ use them?  This
part is tricky and annoying.  To get your custom classes allocated through
your ``yl_malloc`` you need to implement the allocation operators in all
your classes.  Because that's quite a repetitive process I recommend
writing a macro for it that can be placed in the private section of the
class.  I chose to pick by convention that it has to go into private, even
though the function it implements are public.  Primarily I did that so
that it lives close to where the data is defined, which in my case is
usually private.  You will need to make sure you don't forget adding that
macro to all your classes private sections:

.. sourcecode:: cpp

    #define YL_IMPLEMENTS_ALLOCATORS \
    public: \
        void *operator new(size_t size) { return yl_malloc(size); } \
        void operator delete(void *ptr) { yl_free(ptr); } \
        void *operator new[](size_t size) { return yl_malloc(size); } \
        void operator delete[](void *ptr) { yl_free(ptr); } \
        void *operator new(size_t, void *ptr) { return ptr; } \
        void operator delete(void *, void *) {} \
        void *operator new[](size_t, void *ptr) { return ptr; } \
        void operator delete[](void *, void *) {} \
    private:

Here is how an example usage would look like:

.. sourcecode:: cpp

    class Task {
    public:
        Task();
        ~Task();

    private:
        YL_IMPLEMENTS_ALLOCATORS;
        // ...
    };

Now with that all *your* classes will be allocated through your allocator
functions.  But what if you want to use STL containers?  Those containers
will not be allocated through your functions yet.  To fix that particular
issue you need to write an STL proxy allocator.  That's an enormously
annoying process because of how complex the interface is, for essentially
doing nothing.

.. sourcecode:: cpp

    #include <limits>

    template <class T> 
    struct proxy_allocator {
        typedef size_t size_type;
        typedef ptrdiff_t difference_type;
        typedef T *pointer;
        typedef const T *const_pointer;
        typedef T& reference;
        typedef const T &const_reference;
        typedef T value_type;

        template <class U>
        struct rebind {
            typedef proxy_allocator<U> other;
        };

        proxy_allocator() throw() {}
        proxy_allocator(const proxy_allocator &) throw() {}
        template <class U>
        proxy_allocator(const proxy_allocator<U> &) throw() {}
        ~proxy_allocator() throw() {}

        pointer address(reference x) const { return &x; }
        const_pointer address(const_reference x) const { return &x; }

        pointer allocate(size_type s, void const * = 0) {
            return s ? reinterpret_cast<pointer>(yl_malloc(s * sizeof(T))) : 0;
        }

        void deallocate(pointer p, size_type) {
            yl_free(p);
        }

        size_type max_size() const throw() { 
            return std::numeric_limits<size_t>::max() / sizeof(T); 
        }

        void construct(pointer p, const T& val) {
            new (reinterpret_cast<void *>(p)) T(val);
        }

        void destroy(pointer p) {
            p->~T();
        }

        bool operator==(const proxy_allocator<T> &other) const {
            return true;
        }

        bool operator!=(const proxy_allocator<T> &other) const {
            return false;
        }
    };

So before we go on, how does one use this abomination?  Like this:

.. sourcecode:: cpp

    #include <deque>
    #include <string>

    typedef std::deque<Task *, proxy_allocator<Task *> > TaskQueue;
    typedef std::basic_string<char, std::char_traits<char>,
                              proxy_allocator<char> > String;

I would recommend making a header somewhere that defines all the
containers you want to use and then force yourself not to use anything
else from the STL without typedefing it to use the right allocator.
Careful: do not ``new TaskQueue()`` those things as you would invoke the
global new operator.  Place them instead as members in your own structs so
that the allocation happens as part of your object which has a custom
allocator.  Alternatively just put them on the stack.

Memory Allocation Failures
--------------------------

In my mind the best way to deal with memory allocation failures is to not
deal with them.  Just don't cause any allocation to fail.  For a library
that's easy to accomplish, just be aware of how much memory you will
allocate in the worst case scenario and if you are unbounded, provide the
user of the library with a way to get an idea of how bad things are.  The
reason for this is that nobody deals with allocation failures either.

For a start the STL entirely depends on ``std::bad_alloc`` being thrown
from operator new (which we're not doing above, hehe) and will just bubble
up the error for you to deal with it.  When you compile your library
without exception handling then the library will just terminate the
process.  That's pretty terrible, but that's what's going to happen
anyways if you're not careful.  I have seen more code that ignores the
return value of malloc than code that deals with it properly.

Aside from that: on some systems malloc will totally lie to you about how
much memory is available anyways.  Linux will gladly give you pointers to
memory it can't back up with real physical memory.  This fiat memory
behavior is quite useful but also will mean that you generally already
have to assume that allocation failure might not happen.  So instead of
reporting allocation errors, if you use C++ and you also want to stick to
the STL, then give up on that and just don't run out of memory.

In computer games the general concept there is to give subsystems their
own allocator and just make sure they never allocate more than what they
are given.  EA seems to recommend the allocator to handle allocation
failures.  For instance when it fails to load more memory it would check
if it can free up some resources that are not needed (like caches) instead
of letting the caller know there is a memory failure.  This works even
with the limited design that the C++ standard gives with allocators.

Building
--------

Now that you have written the code, how do you build your library without
making your users unhappy?  If you're like me you come from a Unix
background where makefiles are what builds software.  However that's not
what everybody wants.  Autotools/autoconf are terrible, terrible pieces of
software and if you give that to a windows guy they will call you all
kinds of names.  Instead make sure there are Visual Studio solutions
sitting around.

What if you don't want to deal with Visual Studio because it's not your
toolchain of choice?  What if you want to keep solutions and makefiles in
sync?  The answer to that question is `premake
<http://industriousone.com/premake>`__ or `cmake
<http://www.cmake.org/>`__.  Which of the two you use depends largely on
you.  Both can generate Makefiles, XCode or Visual Studio solutions out of
a simple definition script.

I used to be a huge fan of cmake but I now switched to premake.  The
reason for this is that cmake has some stuff hardcoded which I need to
customize (for instance building a Visual Studio solution for Xbox 360 is
something you cannot do with stock cmake).  Premake has many of the same
problems as cmake but it's written almost entirely in lua and can be
easily customized.  Premake is essentially one executable that includes a
lua interpreter and a bunch of lua scripts.  It's easy to recompile and if
you don't want to, your premake file can override everything if you just
know how.

Testing
-------

Lastly: how do you test your library?  Now obviously there are tons of
testing tools written in C and C++ you can use, but I think the best tools
are actually somewhere else.  Shared libraries are not just for C and C++
to enjoy, you can use them in a variety of languages.  What better way is
there to test your API by using it from a language that is not C++?

In my case I am using Python to test my libraries.  More to the point: I'm
using `py.test <http://pytest.org/>`__ and `CFFI
<http://cffi.readthedocs.org/>`__ to test my library.  This has a couple
of big advantages over directly doing it in C/C++.

The biggest advantage is the increased iteration speed.  I do not have to
compile my tests at all, they just run.  Not only does the compilation
step fall away, I can also take advantage of Python's dynamic typing and
py.test's good assert statement.  I write myself helpers to print out
information and to convert data between my library and Python and I get
all the benefit of good error reporting.

The second advantage is good isolation.  `pytest-xdist
<https://pypi.python.org/pypi/pytest-xdist>`__ is a plugin for py.test
that adds the ``--boxed`` flag to py.test which runs each test in a
separate process.  That's amazingly useful if you have tests that might
crash due to a segfault.  If you enable coredumps on your system you can
then afterwards load up the segfault in gdb and figure out what's wrong.
This also works really well because you don't need to deal with memory
leaks that happen because an assertion failed and the code skips the
cleanup.  The OS will clean up for each test separately.  Unfortunately
that's implemented through the ``fork()`` system call so it does not work
well on windows right now.

So how do you use your library with CFFI?  You will need to do two things:
you need to make sure your public header file does not include any other
headers.  If you can't do that, just add a define that disables the
includes (like ``YL_NOINCLUDE``).

This is all that's needed to make CFFI work:

.. sourcecode:: python

    import os
    import subprocess
    from cffi import FFI

    here = os.path.abspath(os.path.dirname(__file__))
    header = os.path.join(here, 'include', 'yourlibrary.h')

    ffi.cdef(subprocess.Popen([
        'cc', '-E', '-DYL_API=', '-DYL_NOINCLUDE',
        header], stdout=subprocess.PIPE).communicate()[0])
    lib = ffi.dlopen(os.path.join(here, 'build', 'libyourlibrary.dylib'))

Place it in a file called ``testhelpers.py`` next to your tests.

Now obviously that is the simple version that only works on OS X but it's
simple to extend for different operating systems.  In essence this
invokes the C preprocessor and adds some extra defines, then feeds the
return value of that to the CFFI parser.  Afterwards you have a beautiful
wrapped library to work with.

Here an example of how such a test could look like.  Just place it in a
file called ``test_something.py`` and let ``py.test`` execute it:

.. sourcecode:: python

    import time
    from testhelpers import ffi, lib

    def test_basic_functionality():
        task = lib.yl_task_new()
        while lib.yl_task_is_pending(task)
            lib.yl_task_process(task)
            time.sleep(0.001)
        result = lib.yl_task_get_result_string(task)
        assert ffi.string(result) == ''
        lib.yl_task_free(task)

py.test has other advantages too.  For instance it supports fixtures which
allow you to set up common resources that can be reused between tests.
This is super useful for instance, if using your library requires creating
some sort of context object, setting up common configuration on it, and
later destroying it.

To do that, just create a ``conftest.py`` file with the following content:

.. sourcecode:: python

    import pytest
    from testhelpers import lib, ffi

    @pytest.fixture(scope='function')
    def context(request):
        ctx = lib.yl_context_new()
        lib.yl_context_set_api_key(ctx, "my api key")
        lib.yl_context_set_debug_mode(ctx, 1)
        def cleanup():
            lib.yl_context_free(ctx)
        request.addfinalizer(cleanup)
        return ctx

To use this now, all you need to do is to add a parameter called
``context`` to your test function:

.. sourcecode:: python

    from testhelpers import ffi, lib

    def test_basic_functionality(context):
        task = lib.yl_task_new(context)
        ...

Summary
-------

Since this is longer than usual, here a quick summary of the most
important things to keep in mind when building a native shared library:

-   Write it in C or C++, don't get crazy with building it in a language
    that pulls in a whole runtime that takes up CPU and memory.
-   No global state if you can avoid it!
-   Do not define common types in your public headers
-   Do not include crazy headers like ``windows.h`` in your public
    headers.
-   Be light on includes in your headers altogether.  Consider adding a
    way to disable all includes through a define.
-   take good care about your namespace.  Don't expose symbols you do not
    want to be exposed.
-   Create a macro like ``YL_API`` that prefixes each symbol you want to
    expose.
-   Try to build a stable ABI
-   Don't go crazy with structs
-   let people customize the memory allocators.  If you can't do it per
    “context” object, at least do it per library.
-   Be careful when using the STL, always only through a typedef that adds
    your allocator.
-   Don't force your users to use your favourite build tool, always make
    sure that the user of a library finds a Visual Studio solution and
    makefile in place.

That's it!  Happy library building!
