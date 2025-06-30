---
tags:
  - thoughts
  - rust
summary: Why unsafe Rust is a complex and user unfriendly experience.
---

# Uninitialized Memory: Unsafe Rust is Too Hard

Rust is in many ways not just a modern systems language, but also quite
a pragmatic one.  It promises safety and provides an entire framework that
makes creating safe abstractions possible with minimal to zero runtime
overhead.  A well known pragmatic solution in the language is an explicit
way to opt out of safety by using `unsafe`.  In unsafe blocks anything
goes.

If you have read this article before you might be surprised that it looks
quite different now.  This article in itself was a victim of the author
being confused by the rules surrounding unsafe.  It has since been changed
with an alternative example that better explains the pitfalls.  A thank
you goes to eddyb who
[pointed out my mistakes on reddit](https://www.reddit.com/r/rust/comments/sg6pp5/uninitialized_memory_unsafe_rust_is_too_hard/).

I made the case on Twitter a few days ago that writing unsafe Rust is
harder than C or C++, so I figured it might be good to explain what I mean
by that.

## From C to Rust

So let's start with something simple: we have some struct that we want to
initialize with some values.  The interesting value here will be the
`name`.  It's a pointer to an allocated string.  Other than that where
it's allocated doesn't matter to us so we keep the struct itself on the
stack.  The idea is that after the initialization that thing can be passed
around safely and printed.

```c
#include <stdio.h>
#include <stdlib.h>
#include <stdbool.h>

struct role {
    char *name;
    bool disabled;
    int flag;
};

int main() {
    struct role r;
    r.name = strdup("basic");
    r.flag = 1;
    r.disabled = false;
    printf("%s (%d, %s)\n", r.name, r.flag, r.disabled ? "true" : "false");
    free(r.name);
}
```

Now let's write this in Rust.  Let's not read the docs too much, let's
just do a 1:1 translation to more or less the same but by using `unsafe`.
One note here before you read the code: we're purposefully trying to
create an object that looks familiar to Rust programmers and can be seen
as public API.  So we use a `String` here instead of a C string so
there are some changes to the C code.

```rust
use std::mem;

struct Role {
    name: String,
    disabled: bool,
    flag: u32,
}

fn main() {
    let role = unsafe {
        let mut role: Role = mem::zeroed();
        role.name = "basic".to_string();
        role.flag = 1;
        role.disabled = false;
        role
    };

    println!("{} ({}, {})", role.name, role.flag, role.disabled);
}
```

So immediately one will ask why unsafe is needed here and the answer is
that of course you don't need it here.  However this code is also using a
suboptimal function: `std::mem::zeroed`.  If you run this on a recent Rust
compiler you will get this result:

```
thread 'main' panicked at 'attempted to zero-initialize type `Role`,
  which is invalid', src/main.rs:11:30
```

On older Rust compilers this code will run but it was never really
correct.  So how do we solve this?  The compiler already tells us that we
need to use something else:

```
warning: the type `Role` does not permit zero-initialization
  --> src/main.rs:11:30
   |
11 | let mut role: Role = mem::zeroed();
   |                      ^^^^^^^^^^^^^
   |                      |
   |                      this code causes undefined behavior when executed
   |                      help: use `MaybeUninit<T>` instead, and only call
   |                         `assume_init` after initialization is done
   |
```

So why does this type not support zero initialization?  What do we have to
change?  Can `zeroed` not be used at all?  Some of you might think that
the answer is `#[repr(C)]` on the struct to force a C layout but that
won't solve the problem.  We in fact need to reach for `MaybeUninit` as
the compiler indicates.  So let's try that first and then afterwards we
figure out why we need it:

```rust
use std::mem::MaybeUninit;

struct Role {
    name: String,
    disabled: bool,
    flag: u32,
}

fn main() {
    let role = unsafe {
        let mut uninit = MaybeUninit::<Role>::zeroed();
        let role = uninit.as_mut_ptr();
        (*role).name = "basic".to_string();
        (*role).flag = 1;
        (*role).disabled = false;
        uninit.assume_init()
    };

    println!("{} ({}, {})", role.name, role.flag, role.disabled);
}
```

By swapping out `zeroed` for `MaybeUninit::zeroed` everything changes.  We
can no longer manipulate our struct directly, we now need to manipulate a
raw pointer.  Because that raw pointer does not implement deref and
because Rust has no `->` operator we now need to dereference the pointer
permanently to assign the fields with that awkward syntax.

So first of all: does this work now?  The answer is yes.  But is it
correct?  The answer is not.  But let's see what changed?  The answer lies
in the fact that any construct like a mutable reference (`&mut`) or value
on the stack in itself (even in `unsafe`) that would be valid outside of
unsafe code still needs to be in a valid state at all times.  `zeroed`
returns a zeroed struct and there is no guarantee that this is a valid
representation of either the struct or the fields within it.  In our case
it happens that our `String` is valid with everything zeroed out but this
is not guaranteed and undefined behavior.

One important note is that a mutable reference must also never point to an
invalid object, so doing `let role = &mut *uninit.as_mut_ptr()` if that
object is not fully initialized is also wrong.

So let's change from `zeroed` to `uninit`.  If we run it again we're
crashing.  So why are we crashing?  The answer is that by assigning a
string to `name` we also drop the old string that was there before.  We
just happened to not encounter this before because `Drop` happened to be
able to deal with a zeroed out string, but we were deep in undefined
behavior there.  Now how do we solve that?  We need to somehow directly
write to the pointer there.

So let's just accept that `MaybeUninit` is necessary and we need to deal
with raw references here.  It's somewhat cumbersome but it doesn't look
too bad.  So now we have two new problems: we know that `&mut X` is not
allowed, but `*mut X` is.  How do we get a `*mut X` without using `&mut X`
first?  Ironically until Rust 1.51 it was impossible to construct such a
thing without breaking the rules.  Today you can use the `addr_of_mut!`
macro.  So we can do this:

```rust
let name_ptr = std::ptr::addr_of_mut!((*role).name);
```

Great, so now we have this pointer.  How do we write into it?  We can use
the `write` method instead:

```rust
addr_of_mut!((*role).name).write("basic".to_string());
```

Are we okay now?  Remember how we used a regular struct?  If we read the
documentation we learn that there are no guarantees of such a struct at
all.  It turns out that despite what [the documentation currently says](https://github.com/rust-lang/reference/issues/1151) we can rely on
fields being aligned.  If however we were dealing with `#[repr(packed)]`
we would have to use `write_unaligned` instead which is legal if Rust were
to pick for a member of the struct to be unaligned.  So this could be the
final version:

```rust
use std::mem::MaybeUninit;
use std::ptr::addr_of_mut;

struct Role {
    name: String,
    disabled: bool,
    flag: u32,
}

fn main() {
    let role = unsafe {
        let mut uninit = MaybeUninit::<Role>::uninit();
        let role = uninit.as_mut_ptr();
        addr_of_mut!((*role).name).write("basic".to_string());
        (*role).flag = 1;
        (*role).disabled = false;
        uninit.assume_init()
    };

    println!("{} ({}, {})", role.name, role.flag, role.disabled);
}
```

## When to use `addr_of_mut!`

There are two cases to consider: uninitialized memory and unaligned
references.  You're not allowed to (even temporarily) create an unaligned
reference to something and you're not allowed to create a reference to
uninitialized memory.  So when are these references created?

If you write `(*role).flag = 1;` this is fine by Rust rules *if* the
type does not `Drop`.  If it does, then we have more a problem:
`Drop::drop` gets called and it gets called on uninitialized memory.  So
in that case we need to go via `addr_of_mut!`.  This is why we can
directly assign to flag, but we need to go via `addr_of_mut!` for the
`name` as it is a `String`.

## `MaybeUninit`

A meta issue is that the understanding of safety changed with time.  At
one point `mem::uninitialized` was considered a sound API.  At a later
point `MaybeUninit` was added to address the detected short comings.
However `MaybeUninit` in practical terms not ideal because of partially
initialized types.  While `MaybeUninit<T>` and `T` are memory
compatible thanks to `#[repr(transparent)]` this does not work well with
nested use.

It's not uncommon that you need to have a `MaybeUninit` on a field of a
struct, but at a later point you want this abstraction not to be there.
Actually working with `MaybeUninit` in practice can be a very challenging
experience which this blog post does not sufficiently capture.

## Is my Unsafe Correct?

It's 2022 and I will admit that I no longer feel confident writing unsafe
Rust code.  The rules were probably always complex but I know from reading
a lot of unsafe Rust code over many years that most unsafe code just did
not care about those rules and just disregarded them.  There is a reason
that `addr_of_mut!` did not get added to the language until 1.53.  Even
today the docs both say there are no guarantees on the alignment on native
rust struct reprs.

Over the last few years it seem to have happened that the Rust developers
has made writing unsafe Rust harder in practice and the rules are so
complex now that it's very hard to understand for a casual programmer and
the documentation surrounding it can be easily misinterpreted.  An
[earlier version of this article](https://github.com/mitsuhiko/lucumr/blob/48440d3cf151f0d774bc9ad62f903034ca2b30ff/2022/1/30/unsafe-rust.rst)
for instance assumed that some uses of `addr_of_mut!` were necessary that
really were not.  And that article got quite a few shares overlooking this
before someone pointed that mistake out!

These rules have made one of Rust's best features less and less
approachable and also harder to understand.  The requirement for the
existence `MaybeUninit` instead of “just” having the old
`mem::uninitialized` API is obvious but shows how complex the rules of the
language are.

I don't think this is good.  In fact, I believe this is not at all a great
trend that fewer and fewer people seem to understand unsafe rust.  C
interop is a bit part of what made Rust great, and that we're creating
such massive barriers should be seen as undesirable.  More importantly:
the compiler is not helpful in pointing out when I'm doing something
wrong.

Making unsafe more ergonomic is a hard problem for sure but it might be
worth addressing.  Because one thing is clear: people won't be stopping
writing unsafe code any time soon.
