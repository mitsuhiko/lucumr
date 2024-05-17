public: yes
tags: [rust]
summary: How MiniJinja's dynamic reference counted objects work.

Using Rust Macros for Custom VTables
====================================

Given that building programming languages and interpreters is the
developer's most favorite hobby, I will never stop writing templating
engines.  About three years ago I first wanted to see if I can make an
implementation of my `Jinja2 template engine
<https://jinja.palletsprojects.com/>`__ for Rust.  It's called `MiniJinja
<https://github.com/mitsuhiko/minijinja/>`__ and very close in behavior to
Jinja2.  Close enought that I have seen people pick it up more than I
thought they would.  For instance the Hugging Face `Text Generation
Inference uses it
<https://github.com/huggingface/text-generation-inference/blob/d8402eaf6723818eec2d8abf7715b9dc42da07df/router/src/infer.rs>`__
for chat templates.

I wrote it primarily just to see how you would introduce dynamic things
into a language that doesn't have much of a dynamic runtime.  A few weeks
ago I released a major new version of the engine that has a very different
internal object model for values and in this post I want to share a bit
how it works, and what you can learn from it.  At the heart of it is a
``type_erase!`` macro originally contributed by Sergio Benitez.  This post
goes into the need and usefulness of that macro.

Runtime Values
--------------

To understand the problem you first need to understand that a template
engine like Jinja2 has requirements for runtime types that are a bit
different from how Rust likes to think about data.  The runtime is
entirely dynamic and requires a form of garbage collection for those
values.  In case of a simple templating engine like Jinja2 you can largely
get away with reference counting.  The way this works in practice is that
MiniJinja has a type called `Value
<https://docs.rs/minijinja/latest/minijinja/value/struct.Value.html>`__
which can be cloned to increment the refcount, and when it's dropped the
refcount is decremented.  The value is the basic type that can hold all
kinds of things (integers, strings, functions, sequences, etc.).  In
MiniJinja you can thus do something like this:

.. sourcecode:: rust

    use minijinja::Value;

    // primitives
    let int_val = Value::from(42);
    let str_val = Value::from("Maximilian");
    let bool_val = Value::from(true);

    // complex objects
    let vec_val = Value::from(vec![1, 2, 3]);

    // reference counting
    let vec_val2 = vec_val.clone();   // refcount = 2
    drop(vec_val);                    // refcount = 1
    drop(vec_val2);                   // refcount = 0 -> gone

Inside the engine these objects have all kinds of behaviors to make
templates like this work:

.. sourcecode:: jinja2

    {{ int_val }}
        42
    {{ str_val|upper }}
        MAXIMILIAN
    {{ not bool_val }}
        false
    {{ vec_val }}
        [1, 2, 3]
    {{ vec_val|reverse }}
        [3, 2, 1]

Some of that functionality is also exposed via Rust APIs.  So for instance
you can iterate over values if they contain sequences:

.. sourcecode:: rust

    let vec_val = Value::from(vec![1, 2, 3]);
    for value in vec_val.try_iter()? {
        println!("{} ({})", value, value.kind());
    }

If you run this, this will print the following::

    1 (number)
    2 (number)
    3 (number)

So each value in this object has itself been “boxed” in a value.  As far
as the engine is concerned, everything is a value.

Objects
-------

But how do you get something interesting into these values that is not
just a basic type that could be hardcoded (such as a vector)?  Imagine you
have a custom object that you want to efficently expose to the engine.
This is in fact even something the engine itself needs to do internally.
For instance Jinja has first class functions in the form of macros so it
needs to expose that into the engine as well.  Additionally Rust functions
passed to the engine also need to be represented.

This is why a `Value` type can hold objects internally.  These objects
also support downcasting:

.. sourcecode:: rust

    // box a vector in a value
    let value = Value::from_object(vec![1i32, 2, 3]);
    println!("{} ({})", value, value.kind());

    // downcast it back into a reference of the original object
    let v: &Vec<i32> = value.downcast_object_ref().unwrap();
    println!("{:?}", value);

In order to do this, MiniJinja provides a trait called `Object
<https://docs.rs/minijinja/latest/minijinja/value/trait.Object.html>`__
which if a type implements can be boxed into a value.  All the dynamic
operations of the value are forwarded into the internal `Object`.  These
operations are the following:

* `repr()`: returns the “representation” of the object.  The
  representation define is how the object is represented (serialized) and
  how it behaves.  Valid representations are `Seq` (the object is a list or
  sequence), `Map` (the object is a struct or map), `Iterable` (the object
  can be iterated over but not indexed), `Plain` (the object is just a plain
  object, for instance used for functions)
* `get_value(key)`: looks up a key in the object
* `enumerate()`: returns the contents of the object if there are any

Additionally there is quite a few extra API (to render them to strings, to
make them callable etc.) but we can ignore this for now.  In addition
there are a few more but some of them just have default implementations.
For instance the “length” of an object by default comes from the length of
the enumerator returned by `enumerate()`.

So how would one design a trait like this?  For sake of keeping this post
brief let's pretend there is only `repr`, `get_value` and `enumerate`.
Remember that we need to reference count, so we might be encouraged to
make a trait like the following:

.. sourcecode:: rust

    pub trait Object: Debug + Send + Sync {
        fn repr(self: &Arc<Self>) -> ObjectRepr {
            ObjectRepr::Map
        }

        fn get_value(self: &Arc<Self>, key: &Value) -> Option<Value> {
            None
        }

        fn enumerate(self: &Arc<Self>) -> Enumerator {
            Enumerator::NonEnumerable
        }
    }

This trait looks pretty appealing.  The `self` receiver type is reference
counted (thanks to `&Arc<Self>`) and the interface is pretty minimal.
`Enumerator` maybe needs a bit of explanation before we go further.  In
Rust usually when you iterate over an object you have something called an
`Iterator`.  Iterators usually borrow and you use traits to give the
iterator additional functionality.  For instance a `DoubleEndedIterator`
can be reversed.  In a template engine like Jinja we however need to do
everything dynamically **and** we also need to ensure that we do not end
up borrowing with lifetimes from the object.  The engine needs to be able
to hold on to the iterator independent of the object that you iterate.  To
simplify this process the engine uses this `Enumerator` type internally.
It looks a bit like the following:

.. sourcecode:: rust

    #[non_exhaustive]
    pub enum Enumerator {
        // object cannot be enumerated
        NonEnumerable,
        // object is empty
        Empty,
        // iterate over static strings
        Str(&'static [&'static str]),
        // iterate over an actual dynamic iterator
        Iter(Box<dyn Iterator<Item = Value> + Send + Sync>),
        // iterate by calling `get_value` in senquence from 0 to `usize`
        Seq(usize),
    }

There are many more versions (for instance for `DoubleEndedIterators`
and a few more) but again, let's keep it simple.

Why Arc Receiver?
-----------------

So why do you need an `&Arc<Self>` as receiver?  Because in a lot of cases
you really need to bump your own refcount to do something useful.  For
instance here is how the iteration of an object is implemented for
sequences:

.. sourcecode:: rust

    fn try_iter(self: &Arc<Self>) -> Option<Box<dyn Iterator<Item = Value> + Send + Sync>>
    where
        Self: 'static,
    {
        match self.enumerate() {
            Enumerator::Seq(l) => {
                let self_clone = self.clone();
                Some(Box::new((0..l).map(move |idx| {
                    self_clone.get_value(&Value::from(idx)).unwrap_or_default()
                })))
            }
            // ...
        }
    }

If we did not have a way to bump our own refcount, we could not implement
something like this.

Boxing Up Objects
-----------------

We can now use this to implement a custom struct for instance (say a 2D
point with two attributes: x and y):

.. sourcecode:: rust

    #[derive(Debug)]
    struct Point(f32, f32);

    impl Object for Point {
        fn repr(self: &Arc<Self>) -> ObjectRepr {
            ObjectRepr::Map
        }

        fn get_value(self: &Arc<Self>, key: &Value) -> Option<Value> {
            match key.as_str()? {
                "x" => Some(Value::from(self.0)),
                "y" => Some(Value::from(self.1)),
                _ => None,
            }
        }

        fn enumerate(self: &Arc<Self>) -> Enumerator {
            Enumerator::Str(&["x", "y"])
        }
    }

Or alternatively as a custom sequence:

.. sourcecode:: rust

    #[derive(Debug)]
    struct Point(f32, f32);

    impl Object for Point {
        fn repr(self: &Arc<Self>) -> ObjectRepr {
            ObjectRepr::Seq
        }

        fn get_value(self: &Arc<Self>, key: &Value) -> Option<Value> {
            match key.as_usize()? {
                0 => Some(Value::from(self.0)),
                1 => Some(Value::from(self.1)),
                _ => None,
            }
        }

        fn enumerate(self: &Arc<Self>) -> Enumerator {
            Enumerator::Seq(2)
        }
    }

Now that we have the object, we need to box it up into an `Arc`.
Unfortunatley this is where we hit a hurdle::

    error[E0038]: the trait `Object` cannot be made into an object
       --> src/main.rs:29:15
        |
    29  |     let val = Arc::new(Point(1.0, 2.5)) as Arc<dyn Object>;
        |               ^^^^^^^^^^^^^^^^^^^^^^^^^ `Object` cannot be made into an object
        |
    note: for a trait to be "object safe" it needs to allow building a
          vtable to allow the call to be resolvable dynamically

The reason it cannot be made into an object is because we declare the
receiver as `&Arc<Self>` instead of `&Self`.  This is a limitation because
Rust is not capable of building a vtable for us.  A vtable is nothing more
than a struct that holds a field with a function pointer for each method
on the trait.  So our plan of using `Arc<dyn Object>` won't work, but we
can in fact build out own version of this.  To accomplish this we just
need to build something like a `DynObject` which internally implements
trampolines to call into the original methods and to manage the
refcounting for us.

Macro Magic
-----------

Since this requires a lot of unsafe code, and we want to generate all the
necessary trampolines to put into the vtable automatically, we will use a
macro.  The invocation of that macro which generates the final type looks
like this:

.. sourcecode:: rust

    type_erase! {
        pub trait Object => DynObject {
            fn repr(&self) -> ObjectRepr;
            fn get_value(&self, key: &Value) -> Option<Value>;
            fn enumerate(&self) -> Enumerator;
        }
    }

You can read this as “map trait Object into a DynObject smart pointer”.
The actual macro has a few extra things (it also supports building the
necessary vtable entries for `fmt::Debug` and other traits) but let's
focus on the simple pieces.  This macro generates some pretty wild output.

I cleaned it up and added some comments about what it does.  Later I will
show you the macro that generates it.  First let's start with the
definition of the fat pointer:

.. sourcecode:: rust

    use std::sync::Arc;
    use std::mem::ManuallyDrop;
    use std::any::{type_name, TypeId};

    pub struct DynObject {
        /// ptr points to the payload of the Arc<T>
        ptr: *const (),
        /// this points to our vtable.  The actual type is hidden
        /// (`VTable`) in a local scope.
        vtable: *const (),
    }

And this is the implementation of the vtable and the type:

.. sourcecode:: rust

    // this is a trick that is useful for generated macros to hide a type
    // at a local scope
    const _: () = {
        /// This is the actual vtable.
        struct VTable {
            // regular trampolines
            repr: fn(*const ()) -> ObjectRepr,
            get_value: fn(*const (), key: &Value) -> Option<Value>,
            enumerate: fn(*const ()) -> Enumerator,
            // method to return the type ID of the internal type for casts
            __type_id: fn() -> TypeId,
            // method to return the type name of the internal type
            __type_name: fn() -> &'static str,
            // method used to drop the refcount by one
            __drop: fn(*const ()),
        }

        /// Utility function to return a reference to the real vtable.
        fn vt(e: &DynObject) -> &VTable {
            unsafe { &*(e.vtable as *const VTable) }
        }

        impl DynObject {

            /// Takes ownership of an Arc<T> and boxes it up.
            pub fn new<T: Object + 'static>(v: Arc<T>) -> Self {
                // "shrinks" an Arc into a raw pointer.  This returns the
                // address of the payload it carries, just behind the
                // refcount.
                let ptr = Arc::into_raw(v) as *const T as *const ();

                let vtable = &VTable {
                    // example trampoline that is generated for each method
                    repr: |ptr| unsafe {
                        // now take ownership of the ptr and put it in a
                        // ManuallyDrop so we don't have to manipulate the
                        // reference count.
                        let arc = ManuallyDrop::new(Arc::<T>::from_raw(ptr as *const T));
                        // and invoke the original method via the arc
                        <T as Object>::repr(&arc)
                    },
                    get_value: |ptr, key| unsafe {
                        let arc = ManuallyDrop::new(Arc::<T>::from_raw(ptr as *const T));
                        <T as Object>::get_value(&arc, key)
                    },
                    enumerate: |ptr| unsafe {
                        let arc = ManuallyDrop::new(Arc::<T>::from_raw(ptr as *const T));
                        <T as Object>::enumerate(&arc)
                    },
                    // these are pretty trivial, they are modelled after
                    // rust's `Any` type.
                    __type_id: || TypeId::of::<T>(),
                    __type_name: || type_name::<T>(),
                    // on drop take ownership of the pointer (decrements
                    // refcount by one)
                    __drop: |ptr| unsafe {
                        Arc::from_raw(ptr as *const T);
                    },
                };
                Self {
                    ptr,
                    vtable: vtable as *const VTable as *const (),
                }
            }

            /// DynObject::repr() just calls via the vtable into the
            /// original type.
            pub fn repr(&self) -> ObjectRepr {
                (vt(self).repr)(self.ptr)
            }

            pub fn get_value(&self, key: &Value) -> Option<Value> {
                (vt(self).get_value)(self.ptr, key)
            }

            pub fn enumerate(&self) -> Enumerator {
                (vt(self).enumerate)(self.ptr)
            }
        }

    };

At this point the object is functional, but it's kind of problematic
because it does not yet have memory management so we would just leak
memory.  So we need to add that:

Memory management:

.. sourcecode:: rust

    /// Clone just increments the strong refcount of the Arc.
    impl Clone for DynObject {
        fn clone(&self) -> Self {
            unsafe {
                Arc::increment_strong_count(self.ptr);
            }
            Self { ptr: self.ptr, vtable: self.vtable }
        }
    }

    /// Drop decrements the refcount via a method in the vtable.
    impl Drop for DynObject {
        fn drop(&mut self) {
            (vt(self).__drop)(self.ptr);
        }
    }

Additionally to make the object useful, we need to add support for
downcasting which is surprisingly easy at this point.  If the type ID
matches we're good to cast:

.. sourcecode:: rust

    impl DynObject {
        pub fn downcast_ref<T: 'static>(&self) -> Option<&T> {
            if (vt(self).__type_id)() == TypeId::of::<T>() {
                unsafe {
                    return Some(&*(self.ptr as *const T));
                }
            }
            None
        }

        pub fn downcast<T: 'static>(&self) -> Option<Arc<T>> {
            if (vt(self).__type_id)() == TypeId::of::<T>() {
                unsafe {
                    Arc::<T>::increment_strong_count(self.ptr as *const T);
                    return Some(Arc::<T>::from_raw(self.ptr as *const T));
                }
            }
            None
        }

        pub fn type_name(&self) -> &'static str {
            (vt(self).__type_name)()
        }
    }

The Macro
---------

So now that we know what we want, we can actually use a Rust macro to
generate this stuff for us.  I will leave most of this undocumented given
that you know now what it expands to.  Here just some notes to better
understand what is going on:

1. The ``const _:() = { ... }`` trick is useful as macros today cannot
   generate custom identifiers.  Unlike with C macros where you can
   concatenate identifiers to create temporary names, that is unavailable
   in Rust.  But you can use that to hide a type in a local scope as we
   are doing with the ``VTable`` struct.

2. Since we cannot prefix identifiers, there is a potential conflict with
   the names in the struct for the methods and the internal names
   (``__type_id`` etc.)  To reduce the likelihood of collision the
   internal names are prefixed with two underscores.

3. All names are fully canonicalized (eg: ``std::sync::Arc`` instead of
   ``Arc``) to make the macro work without having to bring types into
   scope.

The macro is surprisingly only a bit awful:

.. sourcecode:: rust

    macro_rules! type_erase {
        ($v:vis trait $t:ident => $erased_t:ident {
            $(fn $f:ident(&self $(, $p:ident: $t:ty $(,)?)*) $(-> $r:ty)?;)*
        }) => {
            $v struct $erased_t {
                ptr: *const (),
                vtable: *const (),
            }

            const _: () = {
                struct VTable {
                    $($f: fn(*const (), $($p: $t),*) $(-> $r)?,)*
                    $($($f_impl: fn(*const (), $($p_impl: $t_impl),*) $(-> $r_impl)?,)*)*
                    __type_id: fn() -> std::any::TypeId,
                    __type_name: fn() -> &'static str,
                    __drop: fn(*const ()),
                }

                fn vt(e: &$erased_t) -> &VTable {
                    unsafe { &*(e.vtable as *const VTable) }
                }

                impl $erased_t {
                    $v fn new<T: $t + 'static>(v: std::sync::Arc<T>) -> Self {
                        let ptr = std::sync::Arc::into_raw(v) as *const T as *const ();
                        let vtable = &VTable {
                            $(
                                $f: |ptr, $($p),*| unsafe {
                                    let arc = std::mem::ManuallyDrop::new(
                                        std::sync::Arc::<T>::from_raw(ptr as *const T));
                                    <T as $t>::$f(&arc, $($p),*)
                                },
                            )*
                            __type_id: || std::any::TypeId::of::<T>(),
                            __type_name: || std::any::type_name::<T>(),
                            __drop: |ptr| unsafe {
                                std::sync::Arc::from_raw(ptr as *const T);
                            },
                        };
                        Self { ptr, vtable: vtable as *const VTable as *const () }
                    }

                    $(
                        $v fn $f(&self, $($p: $t),*) $(-> $r)? {
                            (vt(self).$f)(self.ptr, $($p),*)
                        }
                    )*

                    $v fn type_name(&self) -> &'static str {
                        (vt(self).__type_name)()
                    }

                    $v fn downcast_ref<T: 'static>(&self) -> Option<&T> {
                        if (vt(self).__type_id)() == std::any::TypeId::of::<T>() {
                            unsafe {
                                return Some(&*(self.ptr as *const T));
                            }
                        }

                        None
                    }

                    $v fn downcast<T: 'static>(&self) -> Option<Arc<T>> {
                        if (vt(self).__type_id)() == std::any::TypeId::of::<T>() {
                            unsafe {
                                std::sync::Arc::<T>::increment_strong_count(self.ptr as *const T);
                                return Some(std::sync::Arc::<T>::from_raw(self.ptr as *const T));
                            }
                        }

                        None
                    }
                }

                impl Clone for $erased_t {
                    fn clone(&self) -> Self {
                        unsafe {
                            std::sync::Arc::increment_strong_count(self.ptr);
                        }

                        Self {
                            ptr: self.ptr,
                            vtable: self.vtable,
                        }
                    }
                }

                impl Drop for $erased_t {
                    fn drop(&mut self) {
                        (vt(self).__drop)(self.ptr);
                    }
                }
            };
        };
    }

The full macro that is in MiniJinja is a bit more feature rich.  It also
generates documentation and implementations for other traits.  If you want
to see the full one look here: `type_erase.rs
<https://github.com/mitsuhiko/minijinja/blob/main/minijinja/src/value/type_erase.rs>`__.

Putting it Together
-------------------

So now that we have this `DynObject` internally it's trivially possible to
use it in the internals of our value type:

.. sourcecode:: rust

    #[derive(Clone)]
    pub(crate) enum ValueRepr {
        Undefined,
        Bool(bool),
        U64(u64),
        I64(i64),
        F64(f64),
        None,
        String(Arc<str>, StringType),
        Bytes(Arc<Vec<u8>>),
        Object(DynObject),
    }

    #[derive(Clone)]
    pub struct Value(pub(crate) ValueRepr);

And make the downcasting and construction of such types directly
available:

.. sourcecode:: rust

    impl Value {
        pub fn from_object<T: Object + Send + Sync + 'static>(value: T) -> Value {
            Value::from(ValueRepr::Object(DynObject::new(Arc::new(value))))
        }

        pub fn downcast_object_ref<T: 'static>(&self) -> Option<&T> {
            match self.0 {
                ValueRepr::Object(ref o) => o.downcast_ref(),
                _ => None,
            }
        }

        pub fn downcast_object<T: 'static>(&self) -> Option<Arc<T>> {
            match self.0 {
                ValueRepr::Object(ref o) => o.downcast(),
                _ => None,
            }
        }
    }

What do we learn from this?  Not sure.  I at least learned that just
because Rust tells you that you cannot make something into an object does
not mean that you actually can't.  It just requires some creativity and
the willingness to actually use unsafe code.  Another thing is that this
yet again makes a pretty good argument in favor of `compile time
introspection
<https://soasis.org/posts/a-mirror-for-rust-a-plan-for-generic-compile-time-introspection-in-rust/>`__.
Zig programmers will laugh / cry about this since comptime is a much more
powerful system to make something like this work compared to the
ridiculous macro abuse necessary in Rust.

Anyways.  Maybe this is useful to you.
