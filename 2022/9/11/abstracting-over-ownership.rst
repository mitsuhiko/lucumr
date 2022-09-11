public: yes
summary: In which I'm diving into some restrictions of the Rust type system involving closures.

You Can't Do That: Abstracting over Ownership in Rust with Higher-Rank Type Bounds. Or Can You?
===============================================================================================

A few years ago `I wrote about <https://lucumr.pocoo.org/2018/3/31/you-cant-rust-that/>`__
how to get better at Rust by knowing when what you want to do is impossible.  Sadly in
many ways I don't learn from my own mistakes and I keep running into a
particular issue over and over again: Rust's restrictions about being able to
abstract over the borrow status / ownership of a values in some hard to discover
situations involving higher-kinded type bounds.

A few days ago I wrote a (now unpublished) article about how you can't express
a certain problem I keep manuvering myself with Rust's lifetimes.  However that
post set in motion a chain of events that lead to a solution that actually works.
Yet at the same time even though I thought it was impossible I don't think the
solution is obvious, I could have found it myself and it does not even work
reliably.  But more about that later.

Let's set the stage first: The problem I'm talking about relates to abstracting
over borrows and owned values when combined with functions or something that
uses higher-kinded trait bounds.  In other words: one wants to create an API
where it's possible to either borrow or clone out of some input value.  Think
of a generic function that can produce both a ``String`` and a ``&str``.

If you are toying around with this sort of stuff, the compiler messages you might
run into look like this::

    implementation of `X` is not general enough
    = note: `X<'0>` would have to be implemented for the type `&str`, for any lifetime `'0`...
    = note: ...but `X<'1>` is actually implemented for the type `&'1 str`, for some specific lifetime `'1`

With the recent talk about stabilization of `GATs
<https://rust-lang.github.io/rfcs/1598-generic_associated_types.html>`__ I tried
diving into one of my issues again and discovered that the problem is really
hard and full of dead ends.  Let me make this less abstract and let's see what
this is about, why it matters, and why GATs won't (necessarily) help this
particular problem that I'm having even though it sounds like it should.

Setup: The Basic Abstraction
----------------------------

Let's take a very basic abstraction layer that wants to expose native Rust types
from some piece of data that sits around somewhere.  Note that the data is already
somewhere, so our mind immediately thinks "borrowing".  Typically this comes up
when reading from a database layer or in some runtime reflection situations
(serialization libraries, template engines that juggle with different types at
runtime and so forth).

Imagine we have an abstract value type such as `serde_json::Value
<https://docs.rs/serde_json/latest/serde_json/enum.Value.html>`__ which can contain
one of multiple different types.  For simplicity reasons let's pretend there are
only two values in there:

.. sourcecode:: rust

    #[derive(Debug)]
    enum Value {
        String(String),
        Number(i64),
    }

This is a very simple example but it's enough to show the problem.  Now let's
say this type wants to be able to stringify itself.  To that end it implements
two utility functions that convert a value into a string.  We have one which
borrows out of ``Value::String`` if the value is indeed a string, and then we
have a second version that stringifies even if the value is a number:

.. sourcecode:: rust

    impl Value {
        fn as_str(&self) -> Option<&str> {
            match self {
                Value::String(s) => Some(s),
                _ => None,
            }
        }

        fn to_string(&self) -> String {
            match self {
                Value::String(s) => s.clone(),
                Value::Number(n) => n.to_string(),
            }
        }
    }

So far, so good.  What's important about this particular piece of code we just wrote is
that a few things are happening that are quite fundamental to the problem.  The first one
is that ``as_str`` is not always able to borrow into the value.  This should be obvious
as not all values are strings.  Even if one were willing to emulate this sort of behavior,
it's very tricky to stringify the value on demand out of a borrowing function
such as `as_str` as there is no mutable place to put this value.  (One could use something
like `memo-map <https://docs.rs/memo-map/latest/memo_map/>`__ for some specific cases)

The above problem is pretty common in Rust.  One wants to leverage borrowing when possible,
and only fall back to some form of transformation or clone when necessary.  There is a
utility type in the standard library called `Cow
<https://doc.rust-lang.org/std/borrow/enum.Cow.html>`__ (Clone on Write) which
can be used for this purpose.

.. sourcecode:: rust

    use std::borrow::Cow;

    impl Value {
        fn to_str(&self) -> Cow<'_, str> {
            match self {
                Value::String(s) => Cow::Borrowed(s),
                Value::Number(n) => Cow::Owned(n.to_string()),
            }
        }
    }

Part 1: Abstract Conversions
----------------------------

Now let's say we don't want to see the ``Cow`` and similar things.  There is
quite often the desire to have something like this:

.. sourcecode:: rust

    // option a: borrow
    let a: &str = convert(&value)?;

    // option b: clone
    let b: String = convert(&value)?;

How can we make this work?  Let's implement this with an extra layer of
indirection for a second.  We will add a function called ``convert()`` which
tries to perform the intended conversion based on the return value.  Internally
we will use our own utility trait called ``TryConvertValue``:

.. sourcecode:: rust

    trait TryConvertValue<'a>: Sized {
        fn try_convert_value(value: &'a Value) -> Option<Self>;
    }

    fn convert<'a, T: TryConvertValue>(value: &'a Value) -> Option<T> {
        T::try_convert_value(self)
    }

We have a trait with a lifetime that can help us borrow or convert.  We can now
implement this for our types.  For this example let's implement this for
``String`` and ```&str```:

.. sourcecode:: rust

    impl TryConvertValue<'a> for String {
        fn try_convert_value(value: &'a Value) -> Option<String> {
            match value {
                Value::String(s) => Some(s.clone())
                Value::Number(n) => Some(n.to_string()),
            }
        }
    }

    impl<'a> TryConvertValue for &'a str {
        fn try_convert_value(value: &'a Value) -> Option<&'a str> {
            match value {
                Value::String(s) => Some(s),
                _ => None,
            }
        }
    }

This is a functioning API and you will find this type of stuff in a lot of places.
Unfortunately the lifetime in that trait can cause some challenges when trying to
use this with functions and closures.

Part 2: Higher-ranked Stuff
---------------------------

So we now want to use this API (which on the surface works) to abstract over
different types of functions.  We want users to be able to invoke different
functions that all take a single argument that transparently convert.  So
imagine we want to enable this:

.. sourcecode:: rust

    let to_upper = ArgCallback::new(|a: &str| Value::String(a.to_uppercase()));
    let square = ArgCallback::new(|a: i64| a * a);

In this case let's just imagine that if the argument is incompatible, the
invocation of this callback should fail.  How can we define such a callback.
Let's look first at how we would define this ``ArgCallback`` type:

.. sourcecode:: rust

    struct ArgCallback(Box<dyn Fn(&Value) -> Value + Sync + Send + 'static>);

    impl ArgCallback {
        pub fn new<F, Arg>(f: F) -> ArgCallback
        where
            F: CallbackTrait<Arg>,
            Arg: for<'a> TryConvertValue<'a>,
        {
            ArgCallback(Box::new(move |arg| -> Value {
                // since i'm lazy this will just panic for this demo
                f.invoke(convert(arg).unwrap())
            }))
        }

        pub fn invoke(&self, arg: &Value) -> Value {
            (self.0)(arg)
        }
    }

We have a type that can hold a callback called ``ArgCallback``.  The most interesting bit here is
the ``new`` method.  We say we take a ``CallbackTrait<Arg>`` for the function.  This trait does not
exist yet, we will add it in a bit.  The function takes a single argument which is typed ``Arg``
which uses our earlier ``TryConvertValue`` trait.  Because that trait takes a lifetime, we need to
come up with one.  Since we do not have a lifetime we can use here, we can use ``for<'a>`` to
“create” one by using the higher-ranked trait bounds feature.

As for the ``CallbackTrait`` we still need to declare and implement it:

.. sourcecode:: rust

    trait CallbackTrait<Arg>: Send + Sync + 'static {
        fn invoke(&self, args: Arg) -> Value;
    }

    impl<Func, Arg> CallbackTrait<Arg> for Func
    where
        Func: Fn(Arg) -> Value + Send + Sync + 'static,
        Arg: for<'a> TryConvertValue<'a>,
    {
        fn invoke(&self, arg: Arg) -> Value {
            (self)(arg)
        }
    }

This should say that a ``CallbackTrait`` has an ``invoke`` method which takes
one ``Arg`` which is again using out ``TryConvertValue`` trait and we again use
``for<'a>`` for similar reasons as above.

Quick aside: what would happen if we pass in the lifetime instead?  This does not work
as at the time we declare the function that lifetime does not exist yet.  At most we can
make it refer to the lifetime of the function, but that would be quite pointless.  What
we want that lifetime to point to is the lifetime of the value that is passed in when
the function is called.  So ``for<'a>`` is our tool of choice here.

This works beautifully with our ``square`` method.  The following code compiles
and will print ``4``:

.. sourcecode:: rust

    let square = ArgCallback::new(|a: i64| Value::Number(a * a));
    dbg!(square.invoke(&Value::Number(2)));

However when we try to use this with ``&str`` run into a peculiar issue:

.. sourcecode:: rust

    let to_upper = ArgCallback::new(|a: &str| Value::String(a.to_uppercase()));    

It won't compile::

    error: implementation of `TryConvertValue` is not general enough
    --> src/main.rs:21:20
    |
    21 |     let to_upper = ArgCallback::new(|a: &str| Value::String(a.to_uppercase()));
    |                    ^^^^^^^^^^^^^^^^ implementation of `TryConvertValue` is not general enough
    |
    = note: `TryConvertValue<'0>` would have to be implemented for the type `&str`, for any lifetime `'0`...
    = note: ...but `TryConvertValue<'1>` is actually implemented for the type `&'1 str`, for some specific lifetime `'1`

Here we are hitting a roadblock and it seems really puzzling.  Rust basically tells us that
our trait is only implemented for a specific lifetime yet it has to be valid for all lifetimes.

Part 3: Hacking Together A Solution
-----------------------------------

The problem appears to stem from the fact that when higher-ranked trait bounds are involved
things that used to work, stop working.  It's quite tricky to understand why it
doesn't work and in particular it can be hard to understand before you go down the rabbit
hole, why it doesn't.

The root of the issue stems from the first introduction of ``for<'a>`` to ``TryConvertValue<'a>``:

.. sourcecode:: rust

    T: for<'a> TryConvertValue<'a>,

This really says that it's defined for all ``T`` for which ``TryConvertValue<'a>`` holds
for all lifetimes.  Rust calls this `universally quantified
<https://rustc-dev-guide.rust-lang.org/appendix/background.html#quantified>`__.  It also means
that while Rust monomorphizes the function (that means it creates one instance per typed passed)
it does not monomorphize based on lifetimes.  This means the function has the same body no matter
if a static or any other lifetime is passed in.  Unfortunately the above bound cannot be satisfied
for non ``'static`` lifetimes.  This means you would need to be able express something like
``for<'a> impl<'a> TryConvertValue<'a> for &'a str`` which is not valid Rust.

We can however work around this somewhat.  The trick here which was generously shared with me
by David Tolnay involves a small modification to `TryConvertValue<'value>`:

.. sourcecode:: rust 

    trait TryConvertValue<'a> {
        type Output;
        fn try_convert_value(value: &'a Value) -> Option<Self::Output>;
    }

Here we use an associated type (not quite a GAT, but similar idea).  With this we no longer have
the relationship of type implementing the trait to the output value.  The implementation for
``i64`` still looks very familiar:

.. sourcecode:: rust 

    impl<'a> TryConvertValue<'a> for i64 {
        type Output = i64;
        fn try_convert_value(value: &'a Value) -> Option<i64> {
            match value {
                Value::String(_) => None,
                Value::Number(number) => Some(*number),
            }
        }
    }

The implementation for ``&str`` however changes now.  The lifetime of the trait is now only
used in the return value, not in the type it's implemented for.  Note how there are two different
lifetimes being used:

.. sourcecode:: rust 

    impl<'a> TryConvertValue<'a> for &str {
        type Output = &'a str;
        fn try_convert_value(value: &'a Value) -> Option<&'a str> {
            match value {
                Value::String(string) => Some(string),
                Value::Number(_) => None,
            }
        }
    }

However this is only half the trick.  The second change is with how the ``ArgCallback`` is
declearing it's bounds:

.. sourcecode:: rust

    impl ArgCallback {
        pub fn new<Func, Arg>(f: Func) -> Self
        where
            Arg: for<'a> TryConvertValue<'a>,
            Func: CallbackTrait<Arg> + for<'a> Callback<<Arg as TryConvertValue<'a>>::Output>,
        {
            ArgCallback(Box::new(move |arg| {
                f.invoke(Arg::try_convert_value(arg).unwrap())
            }))
        }

        pub fn invoke(&self, arg: &Value) -> Value {
            (self.0)(arg)
        }
    }

Note how the ``Func`` bound is now much more involved.  We now express it be a ``CallbackTrait<Arg>``
which itself doesn't define a lifetime and we constrain it with a HRTB for the ``TryConvertValue<'a>``
behind the trait.  This shockingly enough works.

This also has the benefit that this can now be extended to functions with multiple arguments.  We
can create a trait called ``FunctionArgs<'a>`` and implement it for tuples of different arities
which then dispatch to ``TryConvertValue<'a>`` for each argument:

.. sourcecode:: rust

    trait CallbackArgs<'a> {
        type Output;
        fn convert(values: &'a [Value]) -> Option<Self::Output>;
    }

    // example implementation for a function with two args
    impl<'a, A, B> CallbackArgs<'a> for (A, B)
    where
        A: TryConvertValue<'a>,
        B: TryConvertValue<'a>,
    {
        type Output = (A::Output, B::Output);

        fn convert(values: &'a [Value]) -> Option<Self::Output> {
            Some((
                A::try_convert_value(&values[0])?,
                B::try_convert_value(&values[1])?,
            ))
        }
    }

For some reason unknown to me that requires at least a Rust compiler version of 1.61.0 or higher
as older Rusts refuse to compile the version involving tuples.
If you compile it with an older Rust compiler you are presented with this obscure error::

    error[E0277]: the trait bound `for<'a> [closure@src/main.rs:122:37: 122:91]:
      Callback<<(&str, i64) as CallbackArgs<'a>>::Output>` is not satisfied
    --> src/main.rs:122:18
        |
    122 |     let append = BoxedCallback::new(|s: &str, n: i64| Value::String(format!("{}{}", s, n)));
        |                  ^^^^^^^^^^^^^^^^^^ the trait `for<'a> Callback<<(&str, i64) as
        |        CallbackArgs<'a>>::Output>` is not implemented for `[closure@src/main.rs:122:37: 122:91]`
        |
    note: required by a bound in `BoxedCallback::new`
    --> src/main.rs:101:32
        |
    98  |     pub fn new<Func, Args>(f: Func) -> Self
        |            --- required by a bound in this
    ...
    101 |         Func: Callback<Args> + for<'a> Callback<<Args as CallbackArgs<'a>>::Output>,
        |                                ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
        |                                required by this bound in `BoxedCallback::new`

Why that is I cannot tell.  I was unable at least to find something in the changelog that would obviously
point to some changes here.

You can `play with the complete example on play.rust-lang.org
<https://play.rust-lang.org/?version=stable&mode=debug&edition=2021&gist=c6996d652a14b9ce3d180e95c2888b61>`__.

Why and What Now?
-----------------

So what did we learn?  I at least learned that HRTBs, GATs and all this fancy pantsy stuff is
incredible complex and a very leaky abstraction.  I had plenty of versions involving GATs for
this problem that lead some somewhere which ended up nowhere.  Ultimately the solution turned
out to not require modern language features such as GATs.  Yet at the same time putting more
abstractions on it made the type checker not happy on older Rust versions without a clear indication
of why.

These interaction of obscure features leak up to Rust programmers that don't want to be bothered
with these internals.  Rust is normally quite capable of hiding the complexities of type theory,
but it's completely failing here.

For me the interesting story here is that when I went out to originally write this post, I did
not think this was solvable.  I tried a plenty of times.  I was generally aware I could build a
solution that requires excessive amounts of generated code `based on the solution by @quinedotfrom the forums
<https://users.rust-lang.org/t/problems-matching-up-lifetimes-between-various-traits-and-closure-parameters/71994/7>`__
for a similar issue in gtk-rs.  However even with that, it turned out quite complex and tedious
and inapplicable for my problem.

I also gave this problem to quite a few other Rust programmers and the general sentiment was
that it cannot be solved today.  It wasn't until I wrote about my earlier attempts of solving
this that David Tolnay reached out and came up with a clever solution.

The final solution feels a bit like a hack and weirdly enough it doesn't quite work with older
Rust compilers when held the wrong way.  A lot of this advanced level of hackery runs into all
kinds of weird edge cases and it's never quite clear if what ends up compiling was actually
intended to do so, and if what doesn't compile really shouldn't compile.  As an example some
of the intended changes to the compiler involving this kinds of stuff is on hold, because the
`change would break wasm-bindgen <https://github.com/rust-lang/rust/issues/56105>`__.

But it's not just third party libraries that are noticing limitations in expressiveness
involving lifetimes and hacks are creeping in.  The standard library is also starting to
notice that.  The new `thread::scope also involves some advanced black magic
<https://github.com/rust-lang/rust/issues/93203#issuecomment-1041879025>`__.  And when you
end up googling for the error messages or related error messages from the compiler, you run
into many confused users that encountered similar error messages via normal looking futures
and async/await.  The hidden transformations the compiler is generating, behind the scenes
can cause code to be generated that exhibits the problem just that it's even harder to spot.

In fact, you can get this confusing error message by just using ``Derive`` wrong:

.. sourcecode:: rust

    #[derive(Debug)]
    struct A(fn(&u32));

I originally wanted to try to explain this problem in a way that makes it possible to
understand what is going on, but after multiple attempts I failed doing so.  In fact
I left so confused that I'm not even sure if my attempt of explaining it here is even
correct.  Instead I would like to point you towards some discussions involving
this problem if you are curious about the nitty-gritty bits:

- Rust issue about `HRTBs "implementation is not general enough", but is
  <https://github.com/rust-lang/rust/issues/70263>`__ is an issue in the Rust bug tracker
  which has some discussion about a related problem.  It also shows quite a few workarounds
  which only work in some cases and some of these workarounds almost look like bugs in their
  own way.

- There is a Rust RFC to `Allow using for<'a> syntax when declaring closures
  <https://github.com/rust-lang/rfcs/pull/3216>`__.  I'm also not sure if this would solve
  my particular problem but it has a lot discussion about very related issues and also about
  how it affects ``async`` blocks.

- There is also another RFC with very little activity or participation for
  `Extended HRTBs <https://github.com/rust-lang/rfcs/pull/3261>`__ which again tries to make
  some stabs at solving issues related to type system restrictions today.

- One of the most eye opening texts related to this entire family of issues is the
  explanation of `Early and Late Bound Variables <https://rustc-dev-guide.rust-lang.org/early-late-bound.html>`__
  in the Rust compiler.  It explains a bit how rust substitues generics.

- A `forum thread where @quinedot explains <https://users.rust-lang.org/t/problems-matching-up-lifetimes-between-various-traits-and-closure-parameters/71994/7>`__
  how to implement signal callbacks for ``gtk-rs`` that have exactly the same issue as
  outlined in this blog post.  This together with another post I have since lost to my
  browser history provided some path with a GAT like solution that however ultimately
  ended up not being a realistic choice for me.

Where does this leave us?  Unclear.  If you go down the rabbit hole of reading about all the
issues surrounding GATs and HKTBs you get a strong sense that it's better to avoid creating
APIs that invole abstracting over ownership and borrowing when possible.  You will run into
walls and the workarounds might be ugly and hard to understand.  So I guess a new thing I can
recommend not to try to do: **do not abstact over borrows and ownership if functions are involved**
(unless you really know what you are doing).

If you want to to around with it, you can find a full implementation of this
post's code `on play.rust-lang.org <https://play.rust-lang.org/?version=stable&mode=debug&edition=2021&gist=c6996d652a14b9ce3d180e95c2888b61>`__.

----

.. raw:: html

    <small>

Another note here: in an attempt to reduce the problem to a blog post, I earlier made a
pretty terrible attempt of doing so.  I have since declared teaching bancryptcy on this issue
and instead leave you with a very basic post that explains my own pain and suffering and
does not attempt to explain too much about what is happening.  I also made the mistake to
reduce the problem in an incorrect way which ultimately reduced it so much, that it was
trivially solvable as pointed out by `dtolay on reddit
<https://www.reddit.com/r/rust/comments/x8ztwt/you_cant_do_that_abstracting_over_ownership_in/inld2pt/>`__
which is why I unpublished the first version of this post.

Also a big thank you goes to quinedot on rust-lang users who `helped me understand the problem
better <https://users.rust-lang.org/t/problems-matching-up-lifetimes-between-various-traits-and-closure-parameters/71994/7>`__
and provided solutions that helped me move further.

.. raw:: html

    </small>