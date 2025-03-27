public: yes
tags: [rust]
summary: Some good news is coming in Rust 1.86

Rust Any Part 3: Finally we have Upcasts
========================================

Three years ago I shared the `As-Any Hack </2022/1/7/as-any-hack/>`__ on
this blog.  That hack is a way on stable rust to get upcasting to
supertraits working in Rust.  super traits.  To refresh your memory, the
goal was to make something like this work:

.. sourcecode:: rust

    #[derive(Debug)]
    struct AnyBox(Box<dyn DebugAny>);

    trait DebugAny: Any + Debug {}

    impl<T: Any + Debug + 'static> DebugAny for T {}

The problem? Even though `DebugAny` inherits from `Any`, Rust wouldn't let you
use methods from `Any` on a `dyn DebugAny`.  So while you could call
`DebugAny` methods just fine, trying to use `downcast_ref` from `Any` (the
reason to use Any in the first place) would fail:

.. sourcecode:: rust

    fn main() {
        let any_box = AnyBox(Box::new(42i32));
        dbg!(any_box.0.downcast_ref::<i32>());  // Compile error
    }

The same would happen if we tried to cast it into an `&dyn Any`?  A
compile error again:

.. sourcecode:: rust

    fn main() {
        let any_box = AnyBox(Box::new(42i32));
        let any = &*any_box.0 as &dyn Any;
        dbg!(any.downcast_ref::<i32>());
    }

But there is good news!  As of Rust 1.86, this is finally fixed. The cast
now works:

::

    [src/main.rs:14:5] any.downcast_ref::<i32>() = Some(
        42,
    )

At the time of writing, this fix is in the beta channel, but stable
release is just around the corner.  That means a lot of old hacks can
finally be retired.  At least once your MSRV moves up.

Thank you so much to everyone who `worked on this
<https://github.com/rust-lang/rust/issues/65991>`__ to make it work!
