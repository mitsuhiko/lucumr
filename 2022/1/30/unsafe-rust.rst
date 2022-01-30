public: yes
tags: [thoughts, rust]
summary: |
  Why unsafe Rust is a complex and user unfriendly experience.

Uninitialized Memory: Unsafe Rust is Too Hard
=============================================

Rust is in many ways not just a modern systems language, but also quite
a pragmatic one.  It promises safety and provides an entire framework that
makes creating safe abstractions possible with minimal to zero runtime
overhead.  A well known pragmatic solution in the language is an explicit
way to opt out of safety by using `unsafe`.  In unsafe blocks anything
goes.

Except that's a big lie and within `unsafe` so many rules apply that
people often forget to follow, and that are so complex, that writing the
(supposedly) equivalent C code significantly easier and safer.

I made the case on Twitter a few days ago that writing unsafe Rust is
harder than C or C++, so I figured it might be good to explain what I mean
by that.

From C to Rust
--------------

So let's start with something simple: we have some struct that we want to
initialize with some values.  The values in that struct don't require
allocation themselves and we want to allow passing this final value
around.  Where it's allocated doesn't matter to us, let's just put it on
the stack for this example.  The idea is that after the initialization
that thing can be passed around safely and printed.

.. sourcecode:: c

    #include <stdio.h>
    #include <stdlib.h>
    #include <stdbool.h>
    
    struct role {
        const char *name;
        bool disabled;
        int flag;
    };
    
    int main() {
        struct role r;
        r.name = "basic";
        r.flag = 1;
        r.disabled = false;
        printf("%s (%d, %s)\n", r.name, r.flag, r.disabled ? "true" : "false");
    }

Now let's write this in Rust.  Let's not read the docs too much, let's
just do a 1:1 translation to more or less the same but by using `unsafe`.
One note here before you read the code: we're purposefully trying to
create an object that looks familiar to Rust programmers and can be seen
as public API.  So we use a `&'static str` here instead of a C string so
there are some changes to the C code.

.. sourcecode:: rust

    use std::mem;

    struct Role {
        name: &'static str,
        disabled: bool,
        flag: u32,
    }

    fn main() {
        let role = unsafe {
            let mut role: Role = mem::zeroed();
            role.name = "basic";
            role.flag = 1;
            role.disabled = false;
            role
        };

        println!("{} ({}, {})", role.name, role.flag, role.disabled);
    }

So immediately one will ask why unsafe is needed here and the answer is
that of course you don't need it here.  However this code is also using a
suboptimal function: `std::mem::zeroed`.  If you run this on a recent Rust
compiler you will get this result::

    thread 'main' panicked at 'attempted to zero-initialize type `Role`,
      which is invalid', src/main.rs:11:30

On older Rust compilers this code will run but it was never really
correct.  So how do we solve this?  The compiler already tells us that we
need to use something else::

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

So why does this type not support zero initialization?  What do we have to
change?  Can `zeroed` not be used at all?  Some of you might think that
the answer is ``#[repr(C)]`` on the struct to force a C layout but that
won't solve the problem.  We in fact need to reach for `MaybeUninit` as
the compiler indicates.  So let's try that first and then afterwards we
figure out why we need it:

.. sourcecode:: rust

    use std::mem::MaybeUninit;
    
    struct Role {
        name: &'static str,
        disabled: bool,
        flag: u32,
    }
    
    fn main() {
        let role = unsafe {
            let mut uninit = MaybeUninit::<Role>::uninit();
            let role = uninit.as_mut_ptr();
            (*role).name = "basic";
            (*role).flag = 1;
            (*role).disabled = false;
            uninit.assume_init()
        };
    
        println!("{} ({}, {})", role.name, role.flag, role.disabled);
    }

By swapping out `zeroed` for `MaybeUninit` everything changes.  We can no
longer manipulate our struct directly, we now need to manipulate a raw
pointer.  Because that raw pointer does not implement deref and because
Rust has no ``->`` operator we now need to dereference the pointer
permanently to assign the fields with that awkward syntax.

So first of all: why does this work now and what changed?  The answer
lies in the fact that any construct like a mutable reference (`&mut`) or
value on the stack in itself (even in `unsafe`) that would be valid
outside of unsafe code still needs to be in a valid state at all times.
`zeroed` returns a zeroed struct and there is no guarantee that this is a
valid representation of either the struct or the fields within it.  So in
particular our `&'static str` reference is definitely not valid all
zeroed out.

A mutable reference must also never point to an invalid object, so doing
``let role = &mut *uninit.as_mut_ptr()`` if that object is not fully
initialized is also wrong.

So let's just accept that `MaybeUninit` is necessary and we need to deal
with raw references here.  It's somewhat cumbersome but it doesn't look
too bad.  Unfortunately we're still using it wrong.  Remember how I
mentioned that creating “safe things” that don't uphold the guarantees of
that safe thing is not allowed, even in unsafe code?  We're in fact having
exactly this happen in our code.  For instance ``(*role).name`` creates a
`&mut str` behind the scenes which is illegal, even if we can't observe
it because the memory where it points to is not initialized.

So now we have two new problems: we know that `&mut X` is not allowed, but
`*mut X` is.  How do we get this?  Ironically until Rust 1.51 it was
impossible to construct such a thing without breaking the rules.  Today
you can use the `addr_of_mut!` macro.  So we can do this:

.. sourcecode:: rust

    let name_ptr = std::ptr::addr_of_mut!((*role).name);

Great, so now we have this pointer.  How do we write into it?  Can't you
just dereference and assign?

.. sourcecode:: rust

    let name_ptr = std::ptr::addr_of_mut!((*role).name);
    *name_ptr = "basic";

Again, dereferencing is illegal, so we need to do something else.  We can
use the `write` method instead:

.. sourcecode:: rust

    addr_of_mut!((*role).name).write("basic");

Are we okay now?  Remember how we used a regular struct?  If we read the
documentation we learn that there are no guarantees of such a struct at
all.  I'm pretty sure we can depend on things being aligned as even the
original `motivating GitHub issue
<https://github.com/rust-lang/rust/issues/82523>`_ only calls out
``#[repr(packed)]`` but let's be better safe than sorry.  So we now either
change to ``#[repr(C)]`` or we use `write_unaligned` instead which is
legal if Rust were to pick for a member of the struct to be unaligned.  So
this could be the final version:

.. sourcecode:: rust

    use std::mem::MaybeUninit;
    use std::ptr::addr_of_mut;

    struct Role {
        name: &'static str,
        disabled: bool,
        flag: u32,
    }

    fn main() {
        let role = unsafe {
            let mut uninit = MaybeUninit::<Role>::uninit();
            let role = uninit.as_mut_ptr();

            addr_of_mut!((*role).name).write_unaligned("basic");
            addr_of_mut!((*role).flag).write_unaligned(1);
            addr_of_mut!((*role).disabled).write_unaligned(false);

            uninit.assume_init()
        };

        println!("{} ({}, {})", role.name, role.flag, role.disabled);
    }

Is my Unsafe Correct?
---------------------

It's 2022 and I will admit that I no longer feel confident writing unsafe
Rust code.  The rules were probably always complex but I know from reading
a lot of unsafe Rust code over many years that most unsafe code just did
not care about those rules and just disregarded them.  There is a reason
that `addr_of_mut!` did not get added to the language until 1.53.  Even
today the docs both say there are no guarantees on the alignment on native
rust struct reprs yet a lot of code assumes now that `write` rather than
`write_unaligned` is legal.

Over the last few years it seem to have happened that the Rust developers
has made writing unsafe Rust harder in practice and the rules are so
complex now that it's very hard to understand for a casual programmer.
This has made one of Rust's best features less and less approachable.

I'm no longer think this is good.  In fact, I believe this is not at all a
great trend.  C interop is a bit part of what made Rust great, and that
we're creating such massive barriers should be seen as undesirable.  More
importantly: the compiler is not helpful in pointing out when I'm doing
something wrong.  The compiler does not warn that not using `addr_of_mut!`
is wrong.  It also does not warn if I'm using `write` instead of
`write_unaligned` and even consulting the docs does not clarify this.

Making unsafe more ergonomic is a hard problem for sure but it might be
worth addressing.  Because one thing is clear: people won't be stopping
writing unsafe code any time soon.
