public: yes
tags: [rust]
summary: |
  A creative workaround to the inability of implementing additional traits
  to `Any`.

Rust Any Part 2: As-Any Hack
============================

`Yesterday I wrote </2022/1/6/rust-extension-map/>`__ about how to use the
`Any` type in Rust to implement extension maps.  One thing that was
brought up as a response is that it's hard to implement `Debug` for the
extension map as `Any` does not implement Debug.  The challenge is that
unfortunately in Rust you cannot do ``Box<dyn Any + Debug>``.  However
there are ways around it.

The Simplifed Problem
---------------------

Let's say you want to have a wrapper around a boxed any that you can
debug.  This is what we basically want to accomplish:

.. sourcecode:: rust

    #[derive(Debug)]
    struct AnyBox(Box<dyn Any + Debug>);

If we were to compile this, the compiler doesn't come back happy::

    error[E0225]: only auto traits can be used as additional traits in a trait object
     --> src/main.rs:9:29
      |
    9 | struct AnyBox(Box<dyn Any + Debug>);
      |                       ---   ^^^^^ additional non-auto trait
      |                       |
      |                       first non-auto trait
      |
      = help: consider creating a new trait with all of these as supertraits and
        using that trait here instead: `trait NewTrait: Any + Debug {}`

Supertraits
-----------

Thankfully the compiler actually tells is what the solution is: we need to
create a new super trait that we can use.  However it leaves us a bit in
the dark of how to do this successfully.  Basically we want to implement
our super trait for all types implementing the individual traits.
Something like this:

.. sourcecode:: rust

    #[derive(Debug)]
    struct AnyBox(Box<dyn Any + Debug>);

    trait DebugAny: Any + Debug {}

    impl<T: Any + Debug + 'static> DebugAny for T {}

Rhis will in fact compile and you will be able to construct such a box,
but what will not work is downcasting:

.. sourcecode:: rust

    fn main() {
        let any_box = AnyBox(Box::new(42i32));
        dbg!(any_box.0.downcast_ref::<i32>());
    }

The compiler will tell us that our value in the anybox has no method named
`downcast_ref`::

    error[E0599]: no method named `downcast_ref` found for struct
      `Box<(dyn DebugAny + 'static)>` in the current scope
      --> src/main.rs:15:20
       |
    15 |     dbg!(any_box.0.downcast_ref::<i32>());
       |                    ^^^^^^^^^^^^ method not found in `Box<(dyn DebugAny + 'static)>`

The reason for this is that a ``Box<dyn DebugAny>`` unfortunately is not a
``Box<dyn Any>`` and as such we don't get the methods from it that we
need.  So how do we fix this?  The simplest method is the “as any” pattern
where we implement a method on our `DebugAny` trait that upcasts into an
`Any`.  This looks like this:

.. sourcecode:: rust

    trait DebugAny: Any + Debug {
        fn as_any(&self) -> &dyn Any;
        fn as_any_mut(&mut self) -> &mut dyn Any;
    }

    impl<T: Any + Debug + 'static> DebugAny for T {
        fn as_any(&self) -> &dyn Any { self }
        fn as_any_mut(&mut self) -> &mut dyn Any { self }
    }

Now we still can't ``downcast_ref`` on the box, but we can take our value,
call `as_any` on it, retrieve a `&dyn Any` and then go to town:

.. sourcecode:: rust

    fn main() {
        let any_box = AnyBox(Box::new(42i32));
        dbg!(any_box.0.as_any().downcast_ref::<i32>());
        dbg!(&any_box);
    }

Except if we run it, we get `None`. What's going on?

::

    [src/main.rs:23] any_box.0.as_any().downcast_ref::<i32>() = None

The answer to this riddle has to do with how the method resolution works
and blanket implementations.  When we invoke `as_any` on `Box<dyn
DebugAny>` we're not looking through the box, we're in fact invoking
`as_any` on the `Box<dyn DebugAny>` itself since the box also implements
our `DebugAny` now.  So how do we reach through the box?  By dereferencing
it.

.. sourcecode:: rust

    fn main() {
        let any_box = AnyBox(Box::new(42i32));
        dbg!((*any_box.0).as_any().downcast_ref::<i32>());
        dbg!(&any_box);
    }

And now we get what we expect::

    [src/main.rs:23] (*any_box.0).as_any().downcast_ref::<i32>() = Some(
        42,
    )
    [src/main.rs:24] &any_box = AnyBox(
        42,
    )

Debuggable Extension Map
------------------------

These learnings we can now take back to building an extension map which
can be debug printed.  Let's take the non sync `extension map from last
time </2022/1/6/rust-extension-map/>`__ and modify it so we can debug
print it:

.. sourcecode:: rust

    use std::any::{Any, TypeId};
    use std::cell::{Ref, RefCell, RefMut};
    use std::collections::HashMap;
    use std::fmt::Debug;
    
    trait DebugAny: Any + Debug {
        fn as_any(&self) -> &dyn Any;
        fn as_any_mut(&mut self) -> &mut dyn Any;
    }
    
    impl<T: Any + Debug + 'static> DebugAny for T {
        fn as_any(&self) -> &dyn Any { self }
        fn as_any_mut(&mut self) -> &mut dyn Any { self }
    }
    
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
                    .and_then(|b| (**b).as_any().downcast_ref())
                    .unwrap()
            })
        }
    
        pub fn get_mut<T: Default + Debug + 'static>(&self) -> RefMut<'_, T> {
            self.ensure::<T>();
            RefMut::map(self.map.borrow_mut(), |m| {
                m.get_mut(&TypeId::of::<T>())
                    .and_then(|b| (**b).as_any_mut().downcast_mut())
                    .unwrap()
            })
        }
    
        fn ensure<T: Default + Debug + 'static>(&self) {
            if self.map.borrow().get(&TypeId::of::<T>()).is_none() {
                self.insert(T::default());
            }
        }
    }

Adding some stuff into the map and debug printing it makes it output
something like this now::

    [src/main.rs:63] &extensions = Extensions {
        map: RefCell {
            value: {
                TypeId {
                    t: 13431306602944299956,
                }: 42,
            },
        },
    }

In this case I placed a 32bit integer ``42`` in the map and we can see
that it prints out the type id of that as key, and ``42`` as value.

Retaining Type Names
--------------------

If we want to retain the original type name and not just type ID we could
change our `TypeId` key for a custom type which also stores the original
type name.  This could be accomplished by creating a wrapper for our
`TypeId` which uses ``std::any::type_name`` internally:

.. sourcecode:: rust

    use std::any::{TypeId, type_name};
    use std::hash::{Hash, Hasher};
    use std::fmt::{self, Debug};

    pub struct TypeKey(TypeId, &'static str);

    impl TypeKey {
        pub fn of<T: 'static>() -> TypeKey {
            TypeKey(TypeId::of::<T>(), type_name::<T>())
        }
    }
    
    impl Hash for TypeKey {
        fn hash<H: Hasher>(&self, state: &mut H) {
            self.0.hash(state);
        }
    }
    
    impl PartialEq for TypeKey {
        fn eq(&self, other: &Self) -> bool {
            self.0 == other.0
        }
    }
    
    impl Eq for TypeKey {}
    
    impl Debug for TypeKey {
        fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
            write!(f, "{}", self.1)
        }
    }

Now we can replace our use of `TypeId` with `TypeKey` in the extension map
and our debug output looks like this instead::

    [src/main.rs:90] &extensions = Extensions {
        map: RefCell {
            value: {
                i32: 42,
                alloc::vec::Vec<i32>: [
                    1,
                    2,
                    3,
                ],
            },
        },
    }

Note that i additionally inserted a `Vec<i32>` into the map to get some
more extra output.
