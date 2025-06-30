---
tags:
  - rust
summary: "A trick to convert arbitrary values from owned strings."
---

# Bridging the Efficiency Gap Between FromStr and String

Sometimes in Rust, you need to convert a string into a value of a specific
type (for example, converting a string to an integer).

For this, the standard library provides the rather useful [FromStr](https://doc.rust-lang.org/std/str/trait.FromStr.html) trait.  In
short, `FromStr` can convert from a `&str` into a value of any compatible
type.  If the conversion fails, an error value is returned.  It's
unfortunately not guaranteed that this value is an actual [Error](https://doc.rust-lang.org/std/error/trait.Error.html) type, but
overall, the trait is pretty useful.

It has however a drawback: it takes a `&str` and not a
`String` which makes it wasteful in situations where your input is a
`String`.  This means that you will end up with a useless clone if do not
actually need the conversion.  Why would you do that?  Well consider this
type of API:

```rust
let arg1: i64 = parser.next_value()?;
let arg2: String = parser.next_value()?;
```

In such cases, having a conversion that works directly with `String` values
would be helpful.  To solve this, we can introduce a new trait: `FromString`,
which does the following:

- Converts from `String` to the target type.

- If converting from `String` to `String`, bypass the regular logic and make it a no-op.

- Implement this trait for all uses of `FromStr` that return a error that
can be converted into `Box<dyn Error>` upon failure.

We start by defining a type alias for our error:

```rust
pub type Error = Box<dyn std::error::Error + Send + Sync + 'static>;
```

You can be more creative here if you want.  The benefit of using this
directly is that a lot of types can be converted into that error, even if
they are not errors themselves.  For instance a `FromStr` that returns a
bare `String` as error can leverage the standard library's blanket
conversion implementation to `Error`.

Then we define the `FromString` trait:

```rust
pub trait FromString: Sized {
    fn from_string(s: String) -> Result<Self, Error>;
}
```

To implement it, we provide a blanket implementation for all types that
implement `FromStr`, where the error can be converted into our boxed
error.  As mentioned before, this even works for `FromStr` where `Err:
String`.  We also add a special case for when the input and output types
are both `String`, using `transmute_copy` to avoid a clone:

```rust
use std::any::TypeId;
use std::mem::{ManuallyDrop, transmute_copy};
use std::str::FromStr;

impl<T> FromString for T
where
    T: FromStr<Err: Into<Error>> + 'static,
{
    fn from_string(s: String) -> Result<Self, Error> {
        if TypeId::of::<T>() == TypeId::of::<String>() {
            Ok(unsafe { transmute_copy(&ManuallyDrop::new(s)) })
        } else {
            T::from_str(&s).map_err(Into::into)
        }
    }
}
```

Why [transmute_copy](https://doc.rust-lang.org/std/mem/fn.transmute_copy.html)?  We use it
instead of the regular [transmute](https://doc.rust-lang.org/std/mem/fn.transmute.html)?  because Rust
requires both types to have a known size at compile time for transmute to
work.  Due to limitations a generic `T` has an unknown size which would
cause a hypothetical `transmute` call to fail with a compile time error.
There is nightly-only [transmute_unchecked](https://doc.rust-lang.org/std/intrinsics/fn.transmute_unchecked.html)
which does not have that issue, but sadly we cannot use it.  Another, even
nicer solution, would be to have specialization, but sadly that is not
stable either.  It would avoid the use of `unsafe` though.

We can also add a helper function to make calling this trait easier:

```rust
pub fn from_string<T, S>(s: S) -> Result<T, Error>
where
    T: FromString,
    S: Into<String>,
{
    FromString::from_string(s.into())
}
```

The `Into` might be a bit ridiculous here (isn't the whole point not to
clone?), but it makes it easy to test this with static string literals.

Finally here is an example of how to use this:

```rust
let s: String = from_string("Hello World").unwrap();
let i: i64 = from_string("42").unwrap();
```

Hopefully, this utility is useful in your own codebase when wanting to
abstract over string conversions.

If you need it exactly as implemented, I also published it as a [simple
crate](https://crates.io/crates/from-string).

---

**Postscriptum:**

A big thank-you goes to David Tolnay and a few others who [pointed out](https://x.com/davidtolnay/status/1903888625802322195) that this can be
done with `transmute_copy`.

Another note: `TypeId::of` call requires `V` to be `'static`.  This is
okay for this use, but there are some hypothetical cases where this is not
helpful.  In that case there is the excellent [typeid](https://crates.io/crates/typeid) crate which provides a `ConstTypeId`,
which is like `TypeId` but is constructible in const in stable Rust.
