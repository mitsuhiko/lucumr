public: yes
tags: [rust]
summary: Some good news is coming in Rust 1.86

Rust Any Part 3: Finally we have Upcasts
========================================

Three years ago I shared the `As-Any Hack </2022/1/7/as-any-hack/>`__ on
this blog.  That hack is a way to get upcasting to supertraits working on
stable Rust.  To refresh your memory, the goal was to make something like
this work:

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

----

For completeness' sake here is the extension map from the original
block post cleaned up so that it does not need the as-any hack:

.. sourcecode:: rust

    use std::any::{Any, TypeId};
    use std::cell::{Ref, RefCell, RefMut};
    use std::collections::HashMap;
    use std::fmt::Debug;

    trait DebugAny: Any + Debug {}
    impl<T: Any + Debug + 'static> DebugAny for T {}

    #[derive(Default, Debug)]
    pub struct Extensions {
        map: RefCell<HashMap<TypeId, Box<dyn DebugAny>>>,
    }

    impl Extensions {
        pub fn insert<T: Debug + 'static>(&self, value: T) {
            self.map
                .borrow_mut()
                .insert(TypeId::of::<T>(), Box::new(value));
        }

        pub fn get<T: Default + Debug + 'static>(&self) -> Ref<'_, T> {
            self.ensure::<T>();
            Ref::map(self.map.borrow(), |m| {
                m.get(&TypeId::of::<T>())
                    .and_then(|b| (&**b as &dyn Any).downcast_ref())
                    .unwrap()
            })
        }

        pub fn get_mut<T: Default + Debug + 'static>(&self) -> RefMut<'_, T> {
            self.ensure::<T>();
            RefMut::map(self.map.borrow_mut(), |m| {
                m.get_mut(&TypeId::of::<T>())
                    .and_then(|b| ((&mut **b) as &mut dyn Any).downcast_mut())
                    .unwrap()
            })
        }

        fn ensure<T: Default + Debug + 'static>(&self) {
            if self.map.borrow().get(&TypeId::of::<T>()).is_none() {
                self.insert(T::default());
            }
        }
    }
