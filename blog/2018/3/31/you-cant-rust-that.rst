public: yes
tags: [rust]
summary: |
  Some tips for how to be more productive in Rust by avoiding situations you
  cannot solve in Rust.

You can't Rust that
===================

The last year has been fun because I could build a lot for really nice
stuff for `Sentry <https://sentry.io/>`_ in Rust and for the first time
the development experience was without bigger roadblocks.  While we have
been using Rust before it now feels different because the ecosystem is so
much more stable and we ran less against language or tooling issues.

However talking to people new to Rust (and even brainstorming APIs with
coworkers) it's hard to get rid of the feeling that Rust can be a mind
bending adventure and that the best way to have a stress free experience
is knowing upfront what you cannot (or should not attempt to) do.  Knowing
that certain things just cannot be done helps putting your mind back back
on the right track.

So here are things not to do in Rust and what to do instead which I think
should be better known.

Things Move
-----------

The biggest difference between Rust and C++ for me is the address-of
operator (`&`).  In C++ (like C) that thing just returns the address of
whatever its applied to and while the language might put some restrictions
on you when doing so is a good idea, there is generally nothing stopping
you from taking an address of a value and then using it.

In Rust this is just usually not useful.  First of all the moment you
take a reference in Rust the borrow checker looms over your code and
prevents you from doing anything stupid.  More importantly however is that
even if it's safe to take a reference it's not nearly as useful as you
might think.  The reason for this is that objects in Rust generally move
around.

Just take how objects are typically constructed in Rust:

.. sourcecode:: rust

    struct Point {
        x: u32,
        y: u32,
    }

    impl Point {
        fn new(x: u32, y: u32) -> Point {
            Point { x, y }
        }
    }

Here the `new` method (not taking `self`) is a static method on the
implementation.  It also returns `Point` here by value.  This is
*generally* how values are constructed.  Because of this taking a
reference in the function does not do anything useful as the value is
potentially moved to a new location on calling.  This is very different to
how this whole thing works in C++:

.. sourcecode:: cpp

    struct Point {
        uint32_t x;
        uint32_t y;
    };

    Point::Point(uint32_t x, uint32_t y) {
        this->x = x;
        this->y = y;
    }

A constructor in C++ is already operating on an allocated piece of memory.
Before the constructor even runs something already provided the memory
where `this` points to (typically either somewhere on the stack or through
the `new` operator on the heap).  This means that C++ code can generally
assume that an instance does not move around.  It's not uncommon that C++
code does really stupid things with the `this` pointer as a result (like
storing it in another object).

This difference might sound very minor but it's one of the most
fundamental ones that has huge consequences for Rust programmers.  In
particular it is one of the reasons you cannot have self referential
structs.  While there is talk about expressing types that cannot be moved
in Rust there is no reasonable workaround for this at the moment (The
future direction `is the pinning system from RFC 2349
<https://github.com/rust-lang/rfcs/pull/2349>`__).

So what do we do currently instead?  This depends a bit on the situation
but generally the answer is to replace pointers with some form of Handle.
So instead of just storing an absolute pointer in a struct one would
instead store the offset to some reference value.  Later if the pointer
is needed it's calculated on demand.

For instance we use a pattern like this to work with memory mapped data:

.. sourcecode:: rust

    use std::{marker, mem::{transmute, size_of}, slice, borrow::Cow};
    
    #[repr(C)]
    struct Slice<T> {
        offset: u32,
        len: u32,
        phantom: marker::PhantomData<T>,
    }
    
    #[repr(C)]
    struct Header {
        targets: Slice<u32>,
    }
    
    pub struct Data<'a> {
        bytes: Cow<'a, [u8]>,
    }
    
    impl<'a> Data<'a> {
        pub fn new<B: Into<Cow<'a, [u8]>>>(bytes: B) -> Data<'a> {
            Data { bytes: bytes.into() }
        }
        pub fn get_target(&self, idx: usize) -> u32 {
            self.load_slice(&self.header().targets)[idx]
        }
    
        fn bytes(&self, start: usize, len: usize) -> *const u8 {
            self.bytes[start..start + len].as_ptr()
        }
        fn header(&self) -> &Header {
            unsafe { transmute(self.bytes(0, size_of::<Header>())) }
        }
        fn load_slice<T>(&self, s: &Slice<T>) -> &[T] {
            let size = size_of::<T>() * s.len as usize;
            let bytes = self.bytes(s.offset as usize, size);
            unsafe { slice::from_raw_parts(bytes as *const T, s.len as usize) }
        }
    }

In this case `Data<'a>` only holds a copy-on-write reference to the
backing byte storage (an owned `Vec<u8>` or a borrowed `&[u8]` slice).
The byte slice starts with the bytes from `Header` and they are resolved
on demand when `header()` is called.  Likewise a single slice is resolved
similarly by the call to `load_slice()` which takes a stored slice and
then looks it up by offsetting on demand.

*To recap: instead of storing a pointer to an object itself, store some
information so that you can calculate the pointer later.  This is also
commonly called using “handles”.*

Refcounts are not Dirty
-----------------------

Another quite interesting case that is surprisingly easy to run into also
has to do with the borrow checker.  The borrow checker doesn't let you do
stupid things with data you do not own and sometimes that can feel like
running into a wall because you think you know better.  In many of those
cases the answer is just one `Rc<T>` away however.

To make this less mysterious let's look at the following piece of C++
code:

.. sourcecode:: cpp

    thread_local struct {
        bool debug_mode;
    } current_config;
    
    int main() {
        current_config.debug_mode = true;
        if (current_config.debug_mode) {
            // do something
        }
    }

This seems pretty innocent but it has a problem: nothing stops you from
borrowing a field from `current_config` and then passing it somewhere
else.  This is why in Rust the direct equivalent of that looks
significantly more complicated:

.. sourcecode:: rust

    #[derive(Default)]
    struct Config {
        pub debug_mode: bool,
    }

    thread_local! {
        static CURRENT_CONFIG: Config = Default::default();
    }

    fn main() {
        CURRENT_CONFIG.with(|config| {
            // here we can *immutably* work with config
            if config.debug_mode {
                // do something
            }
        });
    }

This should make it immediately obvious that this API is not fun.  First
of all the config is immutable.  Secondly we can only access the config
object within the closure passed to the `with` function.  Any attempt of
trying to borrow from this config object and have it outlive the closure
will fail (probably with something like “cannot infer an appropriate
lifetime”).  There is no way around it!

This API is clearly objectively bad.  Imagine we want to look up more of
those thread local variables.  So let's look at both of those issues
separately.  As hinted above ref counting is generally a really nice
solution to deal with the underlying issue here: it's unclear who the
owner is.

Let's imagine for a second this config object just happens to be bound to
the current thread but is not really owned by the current thread.  What
happens if the config is passed to another thread but the current thread
shuts down?  This is a typical example where one can think of logically
the config having multiple owners.  Since we might want to pass from one
thread to another we want an atomically reference counted wrapper for our
config: an `Arc<Config>`.  This lets us increase the refcount in the with
block and return it.  The refactored version looks like this:

.. sourcecode:: rust

    use std::sync::Arc;

    #[derive(Default)]
    struct Config {
        pub debug_mode: bool,
    }

    impl Config {
        pub fn current() -> Arc<Config> {
            CURRENT_CONFIG.with(|c| c.clone())
        }
    }

    thread_local! {
        static CURRENT_CONFIG: Arc<Config> = Arc::new(Default::default());
    }

    fn main() {
        let config = Config::current();
        // here we can *immutably* work with config
        if config.debug_mode {
            // do something
        }
    }

The change here is that now the thread local holds a reference counted
config.  As such we can introduce a function that returns an
`Arc<Config>`.  In the closure from the TLS we increment the refcount with
the `clone()` method on the `Arc<Config>` and return it.  Now any caller
to `Config::current` gets that refcounted config and can hold on to it for
as long as necessary.  For as long as there is code holding the Arc, the
config within it is kept alive.  Even if the originating thread died.

So how do we make it mutable like in the C++ version?  We need something
that provides us with interior mutability.  There are two options for
this.  One is to wrap the `Config` in something like an `RwLock`.  The
second one is to have the `Config` use locking internally.  For instance
one *might* want to do this:

.. sourcecode:: rust

    use std::sync::{Arc, RwLock};

    #[derive(Default)]
    struct ConfigInner {
        debug_mode: bool,
    }

    struct Config {
        inner: RwLock<ConfigInner>,
    }

    impl Config {
        pub fn new() -> Arc<Config> {
            Arc::new(Config { inner: RwLock::new(Default::default()) })
        }
        pub fn current() -> Arc<Config> {
            CURRENT_CONFIG.with(|c| c.clone())
        }
        pub fn debug_mode(&self) -> bool {
            self.inner.read().unwrap().debug_mode
        }
        pub fn set_debug_mode(&self, value: bool) {
            self.inner.write().unwrap().debug_mode = value;
        }
    }

    thread_local! {
        static CURRENT_CONFIG: Arc<Config> = Config::new();
    }

    fn main() {
        let config = Config::current();
        config.set_debug_mode(true);
        if config.debug_mode() {
            // do something
        }
    }

If you do not need this type to work with threads you can also replace
`Arc` with `Rc` and `RwLock` with `RefCell`.

*To recap: when you need to borrow data that outlives the lifetime of
something you need refcounting.  Don't be afraid of using `Arc` but be
aware that this locks you to immutable data.  Combine with interior
mutability (like `RwLock`) to make the object mutable.*

Kill all Setters
----------------

But the above pattern of effectively having `Arc<RwLock<Config>>` can be a
bit problematic and swapping it for `RwLock<Arc<Config>>` can be
significantly better.

Rust done well is a liberating experience because if programmed well it's
shockingly easy to parallelize your code after the fact.  Rust encourages
immutable data and that makes everything so much easier.  However in the
previous example we just introduced interior mutability.  Imagine we have
multiple threads running, all referencing the same config but one flips a
flag.  What happens to concurrently running code that now is not expecting
the flag to randomly flip?  Because of that interior mutability should be
used carefully.  Ideally an object once created does not change its state
in such a way.  In general I think such a type of setter should be an anti
pattern.

So instead of doing this what about we take a step back to where we were
earlier where configs were not mutable?  What if we never mutate the
config after we created it but we add an API to promote another config to
current.  This means anyone who is currently holding on to a config can
safely know that the values won't change.

.. sourcecode:: rust

    use std::sync::{Arc, RwLock};

    #[derive(Default)]
    struct Config {
        pub debug_mode: bool,
    }

    impl Config {
        pub fn current() -> Arc<Config> {
            CURRENT_CONFIG.with(|c| c.read().unwrap().clone())
        }
        pub fn make_current(self) {
            CURRENT_CONFIG.with(|c| *c.write().unwrap() = Arc::new(self))
        }
    }

    thread_local! {
        static CURRENT_CONFIG: RwLock<Arc<Config>> = RwLock::new(Default::default());
    }

    fn main() {
        Config { debug_mode: true }.make_current();
        if Config::current().debug_mode {
            // do something
        }
    }

Now configs are still initialized automatically by default but a new
config can be set by constructing a `Config` object and calling
`make_current`.  That will move the config into an `Arc` and then bind it
to the current thread.  Callers to `current()` will get that `Arc` back
and can then again do whatever they want.

Likewise you can again switch `Arc` for `Rc` and `RwLock` for `RefCell` if
you do not need this to work with threads.  If you are just working with
thread locals you can also combine `RefCell` with `Arc`.

*To recap: instead of using interior mutability where an object changes
its internal state, consider using a pattern where you promote new state
to be current and current consumers of the old state will continue to hold
on to it by putting an `Arc` into an `RwLock`.*

In Conclusion
-------------

Honestly I wish I would have learned the above three things earlier than I
did.  Mostly because even if you know the patterns you might not
necessarily know when to use them.  So I guess the following mantra is now
what I want to print out and hang somewhere:

* Handles, not self referential pointers
* Reference count your way out of lifetime / borrow checker hell
* Consider promoting new state instead of interior mutability
