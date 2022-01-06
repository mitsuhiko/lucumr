public: yes
tags: [rust]
summary: |
  A useful pattern for making common types extensible.

Extension Maps in Rust
======================

Sometimes in Rust you want to design APIs that provide a little bit of
flexibility for the user.  A common approach for this is to introduce a
generic type parameter that can be filled in.  Let's for instance think of
a web application framework.  It might have an application type which is
passed to all kinds of functions.  That application type might want to be
parametrized over the configuration of the application:

.. sourcecode:: rust

    struct App<Config> {
        config: Config
    }

While this works, it quickly becomes complex.  What if in addition to a
config you also want to have custom state there?  It also means all
functions that want to work with that app need to be generic over the
config as well.  Worse: what if you don't even know which parametrizations
are needed?

Enter The Any Type
------------------

A solution for this issue comes in the form of the `Any
<https://doc.rust-lang.org/std/any/trait.Any.html>`_ type.  It lets you
take a ``'static`` type and box it up as a `dyn Any` so you can do
something with it later.  That later is for instance can involve a
downcast to the original type.  This means you can store arbitrary types
somewhere (like on our ``App`` object) and retrieve them later.

So we basically want something like the following API wise:

.. sourcecode:: rust

    let app = App::new();

    // place in extension map
    app.extensions().insert(MyConfig { ... });
    app.extensions().insert(MyDatabase { ... });

    // retrieve from extension map
    let config = app.extensions().get::<Config>();

So we basically want a type which can hold such extensions so we can use
it later.  For now let's look at the most simplest of these options: an
``Extensions`` object which lets you retrieve extensions and insert new
ones.  If an extension does not exist yet, instead of panicking we will
automatically upsert it (eg: the type needs to implement `Default`):


.. sourcecode:: rust

    use std::collections::HashMap;
    use std::any::{Any, TypeId};
    
    #[derive(Default)]
    pub struct Extensions {
        map: HashMap<TypeId, Box<dyn Any>>,
    }
    
    impl Extensions {
        pub fn insert<T: 'static>(&mut self, value: T) {
            self.map.insert(TypeId::of::<T>(), Box::new(value));
        }

        pub fn get<T: Default + 'static>(&self) -> &T {
            self.ensure::<T>();
            self.map.get(&TypeId::of::<T>())
                .and_then(|b| b.downcast_ref())
                .unwrap()
        }
    
        pub fn get_mut<T: Default + 'static>(&mut self) -> &mut T {
            self.ensure::<T>();
            self.map.get_mut(&TypeId::of::<T>())
                .and_then(|b| b.downcast_mut())
                .unwrap()
        }
    
        fn ensure<T: Default + 'static>(&self) {
            if self.map.get(&TypeId::of::<T>()).is_none() {
                self.insert(T::default());
            }
        }
    }

So this is pretty straightforward to use now but leaves one issue behind:
the borrow checker will make your life quite hard.  The above map is quite
useful for the typical setup where you have an object like an application,
you configure it once, and from then on the extension map is frozen as
there are too many shared references to it flying around that nobody will
ever be able to get a `&mut` reference to it any more.

So how does this work?  Basically each rust type has a type ID which you
can retrieve with ``TypeId::of::<T>()``.  It's a unique value that you can
use for comparisons or as a key in a map which is what we're doing here.
Of each type one value is permitted.  We then store this in the map as
``dyn Any`` which lets us use the `downcast_ref` and `downcast_mut` method
to case the value back to what we had originally.  We know that these
casts won't fail in our case so we can safely ``unwrap()`` them.

But what if you need to have some sort of interior mutability?

Interior Mutability Extension Map
---------------------------------

Let's look at a common case of a web framework or template engine.  Take
the `MiniJinja <https://github.com/mitsuhiko/minijinja>`_ template engine
for instance.  It has a ``State`` object which is created once per
template initialization, is not `Send` or `Sync` and holds state the
engine needs for the evaluation.  What if you want to make it possible for
a user to put their own state on it?  In that case one can adapt the type
from above by using `RefCell` internally:

.. sourcecode:: rust

    use std::collections::HashMap;
    use std::any::{Any, TypeId};
    use std::cell::{Ref, RefCell, RefMut};
    
    #[derive(Default)]
    pub struct Extensions {
        map: RefCell<HashMap<TypeId, Box<dyn Any>>>,
    }
    
    impl Extensions {
        pub fn insert<T: 'static>(&self, value: T) {
            self.map.borrow_mut().insert(TypeId::of::<T>(), Box::new(value));
        }

        pub fn get<T: Default + 'static>(&self) -> Ref<'_, T> {
            self.ensure::<T>();
            Ref::map(self.map.borrow(), |m| {
                m.get(&TypeId::of::<T>())
                    .and_then(|b| b.downcast_ref())
                    .unwrap()
            })
        }
    
        pub fn get_mut<T: Default + 'static>(&self) -> RefMut<'_, T> {
            self.ensure::<T>();
            RefMut::map(self.map.borrow_mut(), |m| {
                m.get_mut(&TypeId::of::<T>())
                    .and_then(|b| b.downcast_mut())
                    .unwrap()
            })
        }
    
        fn ensure<T: Default + 'static>(&self) {
            if self.map.borrow().get(&TypeId::of::<T>()).is_none() {
                self.insert(T::default());
            }
        }
    }

From the end user's perspective not much has changed.  The main difference
is now that yo can call `get_mut` even if you do not have a mutable
reference to the extension map.  This feat is accomplished by `RefCell`
having the ability to move the necessary checks to runtime.  When a
`RefMut` is given out Rust will panic if there are any shared loans out or
already another mutable reference.  For the users here this is not much of
a concern as we can easily ensure that there is only ever one mutable
reference in use.  What makes `RefCell` particularly great here is that
the `Ref` and `RefMut` types have a static `map` method that lets you
derive another `Ref` or `RefMut` that holds on to the original loan, but
transforms the value.

Going Sync
----------

Alright.  But what if we want to do the same trick as above but with
`Send` and `Sync`?  Well in that case we need a locking type.  Sadly the
`Mutex` or `RwLock` from the standard library does not provide a way to
hold on to the loan and map it, so we need to use something else.  You can
use the `parking_lot <https://crates.io/crates/parking_lot>`_ crate
instead which provides the necessary functionality:

.. sourcecode:: rust

    use parking_lot::{
        MappedRwLockReadGuard,
        MappedRwLockWriteGuard,
        RwLock,
        RwLockReadGuard,
        RwLockWriteGuard,
    };
    use std::any::{Any, TypeId};
    use std::collections::HashMap;

    #[derive(Default)]
    pub struct Extensions {
        map: RwLock<HashMap<TypeId, Box<dyn Any>>>,
    }

    impl Extensions {
        pub fn insert<T: 'static>(&self, value: T) {
            self.map.write().insert(TypeId::of::<T>(), Box::new(value));
        }

        pub fn get<T: Default + 'static>(&self) -> MappedRwLockReadGuard<'_, T> {
            self.ensure::<T>();
            RwLockReadGuard::map(self.map.read(), |m| {
                m.get(&TypeId::of::<T>())
                    .and_then(|b| b.downcast_ref())
                    .unwrap()
            })
        }

        pub fn get_mut<T: Default + 'static>(&self) -> MappedRwLockWriteGuard<'_, T> {
            self.ensure::<T>();
            RwLockWriteGuard::map(self.map.write(), |m| {
                m.get_mut(&TypeId::of::<T>())
                    .and_then(|b| b.downcast_mut())
                    .unwrap()
            })
        }

        fn ensure<T: Default + 'static>(&self) {
            if self.map.read().get(&TypeId::of::<T>()).is_none() {
                self.insert(T::default());
            }
        }
    }

Happy extending!
