---
tags:
  - c
summary: "Using the C preprocessor to achive basic generic collection types."
---

# Collections in C

Inspired by Minecraft (like countless other people out there) I decided to
give a clone a try to see how this can be accomplished.  My last few
adventures into the 3D world went through C++ but that always presented me
with a problem: The C++ code I write does not scale well to computer
games.  This time I thought I can probably try to work around the problem
by forcing myself to simple C.

This worked really well up to the point where I needed two kinds of lists.
One that accepted floats and another one that works with arbitrary
pointers.

The C++ way for this is obvious: use templates.  That's also one of the
best features in C++ and works surprisingly well for the (I imagine) great
hack it is.  However in C we don't have that but the closest to templates
in C (or code generation in general) is the preprocessor.

A warning upfront: all these examples use very generic names.  This is a
very bad idea.  If you want to use something like this in your own code,
make sure to prefix all macros, functions, types etc. with a unique
prefix.  (For instance instead of `CAT` name it `MYLIB_CAT`).

## Abusing the Preprocessor

Generally there are two ways to do code generation for C.  One involves
external tools that create new C files, the other involves the C
preprocessor which is normally intended to expand macros, include other
files or remove comments before the compiler goes over your code.

I normally like to avoid tools that generate new C files for the very
simple reason that these usually generate ugly looking code I then have to
look at which is annoying or at least require yet another tool in my
toolchain which causes headaches when compiling code on more than on
operating system.  A simple Python script that generates a C file sounds
simple, but it stops being simple if you also want that thing to be part
of your windows installation where Python is usually not available or
works differently.

So for my collections I went straight with the C preprocessor.  When you
limit yourself to the C preprocessor (CCAT) there are two common usage
patterns:

- The most common is generating code in a macro.  This has the downside
that macros are always expanded into a single line which has brings
nearly useless error messages if you make a mistake on expanding.

The second downside of this approach is that macros generally are
really unfriendly to write.  They must be in a single line and when
you need more than one you have to backslash escape the newline.  If
you forget about that, welcome to interesting compiler errors.

Macros are fine if they are small, bug looking at endless lines of
generated C code from the preprocessor can be hairy and frustrating.

- The second approach is to move your implementation into a standard C
file and use macros to replace the dynamic parts of the
implementation.  (Such as the function names, storage types and other
things).

This is what I ended up doing for my collection classes.

## Features of the Preprocessor

Before we head over to the details of the implementation, let's have a
look at some of the features of the C preprocssor.

`#include "file"`This is the best known feature of the preprocessor.  It includes
another file from the search path and inserts it at the same location.
Unless you protect your file from multiple inclusions with include
guards (macros that are set and detected) you can include a file more
than once.  This is actually quite helpful in our case.

`#error "message"`With this directive you can emit an error message that will abort the
compilation.  You can combine it with preprocessor conditionals to
notify the user about unsupported configurations, platforms etc.  In
our case it can help us giving the user feedback about missing
defines.

`#ifdef / #ifndef`Executes code only if a macro of a given name was defined or not.
This does not support checking for more than one macro, so often it
makes more sense to use `#if defined(MACRO)`.

`#if / #elif / #else`Can test arbitrary preprocessor conditions.  It can perform basic
arithmetic and check if other macros are defined (`defined(X)`).

`#define MACRO value`Defines a new simple macro.  From that point onwards each occurrence
of `MACRO` will be replaced with `value`.  In fact, after `MACRO` more
than one C token of any form can be placed if necessary.  You can let
a macro be replaced by a full function definition.

`#define MACRO(X) X`Macros can also have parameters that are simple tokens.  Whenever that
token appears in the list of tokens that will act as replacement, that
token is replaced with the actual token that was passed to the macro.

For example this is a very simple and stupid way to specify an `abs()`
macro that will take a value and return the absolute value:

```c
#define ABS(X) ((X) < 0 ? -(X) : (X))
```

The preprocessor will then expand the macro upon usage:

```c
int x = ABS(-42);

/* this is expanded to this: */

int x = ((-42) < 0 ? -(-42) : (-42))
```

The additional parentheses are there to avoid ambuiguities in case
there are operators involved in the passed expression.

Because macro arguments work by replacing tokens I always use
uppercase letters as first letter of a macro argument.  The reason for
this is that nothing in my C code is written in camelcase and thus
there is no way this could clash with an actual token that might be in
use.

`#`Inside macro expressions the `#` operator can be used to convert the
following macro argument token passed into a string.  Please keep in
mind that this only works for macro arguments, not arbitrary tokens.
This is very helpful if you want to implement things like `assert()`
and have helpful error messages:

```c
#define assert(Expr) do { \
    if (!(Expr)) fail_with_message("Assertion failed: " #Expr, \
                                   __LINE__, __FILE__); \
} while (0)
```

This also showcases two other things you have to keep in mind when
using the preprocessor:

1. The macro might be used in the body of an if expression and using
a sole `if` there might cause the dangling else problem.  As a
simple workaround, always wrap your macros in a loop that only
runs once (`do { ... } while (0)`).  Also make sure to not
include a trailing semicolon.  The user of the macro should add
the semicolon, not the author of the macro.

1. If a macro spans more than one line you have to escape the
newlines by adding a backslash before them.  Also be sure not to
add any other whitespace before the newline or this will break.

`##`The `##` operator can be used to concatenate a macro argument token
with any other token.  Again, this only works if a macro argument
token is involved, it will not work on arbitrary tokens.

This can for example be used to dynamically generate functions that
are prefixed with something else:

```c
#define TEST(TestName) int mylib_##TestName(void)

TEST(foo)
{
    assert(foo == 42);
}
```

## Preprocessor Utilities

Now that we know the basics of the preprocessor we can also infer what
problems might exist.  Mainly the interesting operators for code
generation (`#` and `##`) can only operate on macro arguments.  This
is not a problem for the former, but it will become somewhat of a
limitation in case of the latter.  Thankfully this can be countered
nicely with another macro

```c
#define _CAT(A, B) A##B
#define CAT(A, B) _CAT(A, B)
```

Why do we need two macros here?  Wouldn't the first macro be enough to
concatenate macros?  Unfortunately not because when a macro argument is
another macro argument it wouldn't be expanded.  Look here:

```c
#define CAT(A, B) A##B

int
main(void)
{
    int CAT(foo, CAT(bar, baz));
}
```

This would generate the following C code:

```c
#define CAT(A, B) A##B

int
main(void)
{
    int fooCAT(bar, baz);
}
```

The extra indirection solves this problem nicely.

The second macro I like to declare for code generation is an `UCAT`
macro that concatenates two tokens with an underscore instead of
concatenating them directly:

```c
#define UCAT(A, B) CAT(A, CAT(_, B))
```

## Creating a List Header

Now we have everything to get started implementing a simple list type.
For this we first create a header where we declare all list types we want
to use.  In my case I am interested in a list for pointers and floats.
The header looks like this:

```c
#ifndef _INC_LIST_H_
#define _INC_LIST_H_

/* list of pointers */
#define _COLLECTION_TYPE void *
#define _COLLECTION_NAME list
#include "_list.h"

/* list of floats */
#define _COLLECTION_TYPE float
#define _COLLECTION_NAME floatlist
#include "_list.h"

#endif
```

As you can see we have a standard include guard and then we include
another header in there twice (once for each list type we want to have).
Before including that header, we also define the type for the list and the
name we want to use.

That header then declares the struct for the list and the methods we want
to have.  For this to work we will need another header that is used both
by this header as well as the implementation C file.  Let's call this
header `_collection_pre.inc`.  Because we have a `pre` header we will also need
a `post` header (`_collection_post.inc`).  The purpose of the `pre` header is
to declare some helper macros that return function names prefixed with the
necessary name and the idea of the `post` header is to get rid of these
macros again to allow the inclusion of this header another time (for the
next type).

This is what these headers look like:

`_collection_pre.inc`:

```c
/* include the header that declares CAT and UCAT */
#include "pputils.h"

/* ensure that the includer set type and name */
#if !defined(_COLLECTION_TYPE) || !defined(_COLLECTION_NAME)
#  error "Includer has to set _COLLECTION_TYPE and _COLLECTION_NAME"
#endif

/* helper macros to declare types and methods */
#define _COLLECTION_TYPENAME SC_PP_UCAT(_COLLECTION_NAME, t)
#define _COLLECTION_METHOD(Name) SC_PP_UCAT(_COLLECTION_NAME, Name)
```

`_collection_post.inc`:

```c
/* get rid of everything declared in _collection_pre.h and the includer */
#undef _COLLECTION_NAME
#undef _COLLECTION_TYPE
#undef _COLLECTION_TYPENAME
#undef _COLLECTION_METHOD
```

Now we finally have everything in place to implement our `_list.h` header
that declares types and methods.  This is how it can look like:

```c
#include "_collection_pre.inc"

typedef struct {
    size_t size;
    size_t allocated;
    _COLLECTION_TYPE *items;
} _COLLECTION_TYPENAME;

/* creates a new list */
_COLLECTION_TYPENAME *_COLLECTION_METHOD(new)(void);

/* frees the list */
void _COLLECTION_METHOD(free)(_COLLECTION_TYPENAME *self);

/* appends a new item to the list */
int _COLLECTION_METHOD(append)(_COLLECTION_TYPENAME *self, _COLLECTION_TYPE item);

/* removes the last item from the list */
_COLLECTION_TYPE _COLLECTION_METHOD(pop)(_COLLECTION_TYPENAME *self);

#include "_collection_post.inc"
```

The preprocessor will then use this to generate a `list_t`, `floatlist_t`,
`list_new()`, `floatlist_new()` etc.

## Implementing the List

The actual implementation of the list (`list.c`) looks similar to our
`list.h` header, just that we are including `_list.inc` instead of
`_list.h`.  In both cases however we are using the same tricks as we did
with our header files:

`list.c`:

```c
/* list of pointers */
#define _COLLECTION_TYPE void *
#define _COLLECTION_NAME list
#include "_list.inc"

/* list of floats */
#define _COLLECTION_TYPE float
#define _COLLECTION_NAME floatlist
#include "_list.inc"
```

`_list.inc`:

```c
#include "_collection_pre.inc"

_COLLECTION_TYPENAME *
_COLLECTION_METHOD(new)(void)
{
    _COLLECTION_TYPENAME *rv = malloc(sizeof(_COLLECTION_TYPENAME));
    if (!rv)
        return NULL;
    rv->size = 0;
    rv->allocated = 32;
    rv->items = malloc(sizeof(_COLLECTION_TYPE) * rv->allocated);
    if (!rv->items) {
        free(rv);
        return NULL;
    }
    return rv;
}

void
_COLLECTION_METHOD(free)(_COLLECTION_TYPENAME *self)
{
    if (!self)
        return;
    free(self->items);
    free(self);
}

int
_COLLECTION_METHOD(append)(_COLLECTION_TYPENAME *self, _COLLECTION_TYPE item)
{
    if (self->size >= self->allocated) {
        size_t new_size = (size_t)(self->allocated * 1.33f);
        _COLLECTION_TYPE *rv = realloc(self->items,
                                       sizeof(_COLLECTION_TYPE) * new_size);
        if (!rv)
            return 0;
        self->allocated = new_size;
        self->items = rv;
    }
    self->items[self->size++] = item;
    return 1;
}

_COLLECTION_TYPE
_COLLECTION_METHOD(pop)(_COLLECTION_TYPENAME *self)
{
    return self->items[--self->size];
}

#include "_collection_post.inc"
```

## Usage

And this is then how you would use that list:

```c
#include "list.h"

int
main(void)
{
    floatlist_t *list = floatlist_new();
    floatlist_append(list, 42.0f);
    floatlist_append(list, 23.0f);
    assert(list->size == 2);
    assert(list->items[0] == 42.0f);
    assert(list->items[1] == 23.0f);
    assert(floatlist_pop(list) == 23.0f);
    floatlist_free(list);
}
```

## Language Limits

On top of that general concept you can then implement arbitrary data
structures.  The main problem with this over the template system from C++
is not only that it needs more files or does not have virtual functions,
but that it requires you to explicitly specify the types you want in the
header and implementation files and then generate specific typedefs and
functions for it.  There is really nothing you can do to change this, this
is how the language works.

Another problem is that you can't use the preprocessor to generate other
macros.  So if you want to declare a type specific macro that returns an
item from the list after doing an size assertion, you are out of luck.
However all modern compilers do support inlines, so what you want is to
create a static, inline function in the header instead of a macro.

Generally speaking though, this is probably good enough to cover the
majority of use cases and small applications.  It did the trick for me at
least.
