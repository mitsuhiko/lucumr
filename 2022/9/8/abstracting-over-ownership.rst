public: no
summary: diving into some restrictions of the Rust type system and why GATs are not helping.

You can't Do That: Abstracting over Ownership in Rust with Type Inference (and GATs Don't Help)
===============================================================================================

**Retraction: This post should be disregarded for now as in an attempt to reduce
the problem I made a mistake and in fact, reduced it to something that is in
fact (trivially) solvable.  I will follow up with an replacement post that
hopefully is more accurate.**

-----

A few years ago `I wrote about <https://lucumr.pocoo.org/2018/3/31/you-cant-rust-that/>`__
how to get better at Rust by knowing when what you want to do is impossible.  Sadly in
many ways I don't learn from my own mistakes and I keep running into a
particular issue over and over again: Rust's restrictions about being able to
abstract over the borrow status / ownership of a values.

With the recent talk about stabilization of `GATs
<https://rust-lang.github.io/rfcs/1598-generic_associated_types.html>`__ I tried
diving into the topic again and left quite disappointed.

Let me make this less abstract and let's see what this is about, why it matters,
and why GATs won't help this particular problem that I'm having.

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

    enum Value {
        String(String),
        Number(i64),
    }

This is a very simple example but it's enough to show the problem.  Now let's
say this type implements two utility functions that convert a value into a
string.  We have one which borrows out of ``Value::String`` if the value is
indeed a string, and then we have a second version that stringifies even if the
value is a number:

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
can be used for this purpose:

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

Now we're getting closer.  For the user of the function this is a very nice API
because of one incredibly useful property of ``Cow``: it uses the `Deref
<https://doc.rust-lang.org/std/ops/trait.Deref.html>`__ abstraction from the
standard library and implements many common traits.  This means that the user
for most operations does not need to care about if it's owned or borrowed, it
just happens to work:

.. sourcecode:: rust

    let value = Value::Number(42);
    let s = value.to_str();
    println!("{} ({} chars long)", s, s.len());

Here two things are happening.  The first thing is that ``Cow`` implements some common traits
that automatically dispatch down to the internal values if they implement this.  The above
example leverages the `Display <https://doc.rust-lang.org/std/fmt/trait.Display.html>`__ trait
when used in the ``println!`` macro.  For the call to ``.len()`` the `Deref <https://doc.rust-lang.org/std/ops/trait.Deref.html>`__
trait is internally used by the language.  We could call this a functioning abstraction.

And it was good.

Part 1: The Problem
-------------------

Almost.  We don't want to see the ``Cow`` and similar things.  And with that we are
slowly entering the problematic territory because lifetimes get involved.  There
is quite often the desire to hide things more.  For as long as we are holding on
to the ``Cow`` the language keeps tracks of the lifetime of that object as it
is.  This means that it knows that when I hold a ``Cow::Borrowed`` the lifetime
is bound to the internal value and when I have a ``Cow::Owned`` the lifetime is
bound to the ``Cow`` itself.  This is where things get tricky.  There is quite
often the desire to have something like this:

.. sourcecode:: rust

    // option a: borrow
    let a: &str = convert(&value)?;

    // option b: clone
    let b: String = convert(&value)?;

    // option b2: clone / copy
    let b2: i64 = convert(&value)?;

The above code is not possible and we will go into why in a bit.  However let's pretend for
a second that it was possible.  How would it work?  Let's implement this with an extra layer
of indirection for a second.  We will add a function called ``convert()`` which tries to perform
the intended conversion based on the return value.  Internally we will use our own utility
trait called ``TryConvertValue``:

.. sourcecode:: rust

    trait TryConvertValue: Sized {
        fn try_convert_value(value: &Value) -> Option<Self>;
    }

    fn convert<T: TryConvertValue>(value: &Value) -> Option<T> {
        T::try_convert_value(self)
    }

A keen observer will have spotted an issue here already.  There is no lifetime relationship
defined between ``try_convert_value``'s input value and the resulting value.  The above code
can be implemented for ``i64`` just fine:

.. sourcecode:: rust

    impl TryConvertValue for i64 {
        fn try_convert_value(value: &Value) -> Option<i64> {
            match value {
                Value::Number(n) => Some(*n),
                _ => None,
            }
        }
    }

We can also trivially implement it for ``String`` if we so desire.  What however will have
a hard time implementing is a conversion into ``&str``.  This becomes obvious the moment we
try to do it:

.. sourcecode:: rust

    impl<'a> TryConvertValue for &'a str {
        fn try_convert_value(value: &Value) -> Option<&str> {
            match value {
                Value::String(s) => Some(s),
                _ => None,
            }
        }
    }

This will fail to compile because the lifetime of the type and the lifetime of the return
value do not fit together:

.. sourcecode:: text

    error: `impl` item signature doesn't match `trait` item signature
      --> src/main.rs:42:5
       |
    23 |     fn try_convert_value(value: &Value) -> Option<Self>;
       |     ---------------------------------------------------- expected `fn(&'1 Value) -> Option<&'a str>`
    ...
    42 |     fn try_convert_value(value: &Value) -> Option<&str> {
       |     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ found `fn(&'1 Value) -> Option<&'1 str>`
       |
       = note: expected `fn(&'1 Value) -> Option<&'a str>`
                  found `fn(&'1 Value) -> Option<&'1 str>`
    help: the lifetime requirements from the `impl` do not correspond to the requirements in the `trait`
      --> src/main.rs:23:51
       |
    23 |     fn try_convert_value(value: &Value) -> Option<Self>;
       |                                                   ^^^^ consider borrowing this type parameter in the trait

And the compiler really tries to be helpful here.  It's offering a solution: we
can borrow the type parameter in the trait.  How do we do this?  Well we can
change the definition of the trait instead:

.. sourcecode:: rust

    trait TryConvertValue: Sized {
        fn try_convert_value(value: &Value) -> Option<&Self>;
    }

Now we are required to borrow.  In that case the implementation for ``i64`` would have to return ``&i64``.
Obviously trivially to do for ``&i64``, it wouldn't work for ``&String`` since we need to allocate there
(for the to-string conversion for numbers) and we have nowhere to point.

Part 2: Using GATs
------------------

So let's go back to the original type we had and implement it again for ``&str``.  But this time we will try
something else which is the new GAT support which is currently in nightly.  What are GATs if you are asking?
GAT stands for Generic Associated Types and it allows us to define a type with an associated generic type.
Partially this is something you are already used from the iterator trait where the iterator has an associated
type called ``Item``.  What's new with GATs is that you can define some bounds on them.

Let's go with an example where we change ``TryConvertValue`` to use a GAT for the output type:

.. sourcecode:: rust

    trait TryConvertValue {
        type Output<'output> where Self: 'output;

        fn try_convert_value<'value>(value: &'value Value) -> Option<Self::Output<'value>>;
    }

This looks quite similar to how you define an iterator.  The only "new" thing here is that our associated
type now has a bound which sets a relationship of the return type to the lifetime of the object.  Let's
implement this for our ``i64`` again:

.. sourcecode:: rust

    impl TryConvertValue for i64 {
        type Output<'output> = i64;

        fn try_convert_value<'value>(value: &'value Value) -> Option<Self::Output<'value>> {
            match value {
                Value::Number(val) => Some(*val),
                _ => None,
            }
        }
    }

This compiles just fine.  Let's use it:

.. sourcecode:: rust

    let val = Value::Number(42);
    let a: i64 = TryConvertValue::try_convert_value(&val).unwrap();
    dbg!(a);

Sadly this will not compile::

    error[E0283]: type annotations needed
    --> src/main.rs:64:18
    |
    64 |     let a: i64 = TryConvertValue::try_convert_value(&val).unwrap();
    |                  ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ cannot infer type
    |
    = note: cannot satisfy `_: TryConvertValue`

The reason for this is that our type inference now is no longer kicking as
before.  Previously Rust knew that we returned ``Self``.  Now that we are using
GATs a type might return completely different type in ``Output``.  Thankfully
this is an easy fix if we change our ``convert`` function from before with a new
constraint:

.. sourcecode:: rust

    fn convert<T>(value: &Value) -> Option<T>
    where
        T: TryConvertValue + for<'a> TryConvertValue<Output<'a> = T>,
    {
        T::try_convert_value(value)
    }

This tells the compiler that the return value of ``convert`` needs to match the ``Output``
type.  Let's try it again:

.. sourcecode:: rust

    let val = Value::Number(42);
    let a: i64 = convert(&val).unwrap();
    dbg!(a);

Great.  So this works again, now let's do the same for ``&str`` which is what we wanted to
enable in the first place.  But again, we won't be able to do this.  In fact GATs are
surprisingly a dead end here.  The reason is that we can't implement the trait for ``&str``
(for the already known lifetime issues) only for ``str``:

.. sourcecode:: rust

    impl TryConvertValue for str {
        type Output<'output> = &'output str;

        fn try_convert_value<'value>(value: &'value Value) -> Option<Self::Output<'value>> {
            match value {
                Value::String(val) => Some(val),
                _ => None,
            }
        }
    }

This sort of works if we would use it like this:

.. sourcecode:: rust

    let val = Value::String("hello".to_string());
    let a: &str = str::try_convert_value(&str_val).unwrap();
    dbg!(a);

However we now broke our ``convert`` contract with this.  We use ``str::try_convert_value``
which returns an ``&str``, not a ``str``.  As such convert will fail to compile since the
types are no longer matching::

    error[E0277]: the trait bound `&str: TryConvertValue` is not satisfied
      --> src/main.rs:79:19
       |
    79 |     let a: &str = convert(&str_val).unwrap();
       |                   ^^^^^^^ the trait `TryConvertValue` is not implemented for `&str`
       |
       = help: the trait `TryConvertValue` is implemented for `str`
    note: required by a bound in `convert`
      --> src/main.rs:42:8
       |
    40 | fn convert<T>(value: &Value) -> Option<T>
       |    ------- required by a bound in this
    41 | where
    42 |     T: TryConvertValue + for<'a> TryConvertValue<Output<'a> = T>,
       |        ^^^^^^^^^^^^^^^ required by this bound in `convert`

So this is a dead end.

And it does not feel satisfying.  We now have GATs but there is still not enough expressiveness
in Rust to allow us to do this.

Why Bother?
-----------

So why would it be nice to do this?  Here are some examples from my own libraries where I would love
to be able to abtract over this.

MiniJinja
~~~~~~~~~

`MiniJinja <https://github.com/mitsuhiko/minijinja/>`__ is a template engine in Rust which is modelled
after Jinja2 from Python.  One of the features that Jinja2 has is that it allows you to define
filter functions.  These can be applied to many different types of values.  It would be incredible
convenient to be able to borrow out of the runtime value type or take ownership, depending on what
the function argument type implements.  For instance I would like to be able to
write things of this nature:

.. sourcecode:: rust

    fn trim(s: &str) -> String {
        s.trim().to_string()
    }

    fn pow(x: i64, y: i64) -> i64 {
        x.pow(y as u32)
    }

    let mut env = Environment::new();
    env.add_filter("trim", trim);
    env.add_filter("pow", pow);

Today I have to make the choice if filters borrow or own.  There is no sensible workaroud for this
problem today so MiniJinja chose to require cloning of filter arguments, incuring a performance hit.

Redis
~~~~~

The redis driver has a similar problem.  It lets you fetch data from the redis server
and convert in one go to a Rust type.  This is done by using the ``FromRedisValue`` trait
behind the scenes:

.. sourcecode:: rust

    let (k1, k2, k3) : (String, String, u32) = con.get(&["k1", "k2", "k3"])?;

This is a very convenient API but again you will notice that the strings are owned which
involves cloning.  It would be super convenient to be able to do something like this
instead:

.. sourcecode:: rust

    let result = con.get(&["k1", "k2", "k3"])?;
    let (k1, k2, k3) : (&str, &str, u32) = result.convert()?;

This way we could directly borrow out of the parse results which would be held in the row
without having to do pointless clones.

Outlook
-------

Where to go from there?  I'm not sure.  GATs are super useful and I'm looking forward to using
them in a lot of places.  However they won't solve the problem where we depend on things like
return type inference as they cannot set up a relationship between the type for the inference
with the associated type.  This from what I can tell would be crucial for a nice API.

I'm not sure what can be done to solve this problem.  It seems hard.  Somehow I
keep running into this wall, even after multiple years of using Rust.  It feels
like it should be possible and because of that I keep wasting time on trying to
make it work.

But it won't budge.
