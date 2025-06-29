tags: [rust]
summary: |
  Some things you can do with serde that were not in the mind of the
  creator.

Rust Adventures: Abusing Serde
==============================

When programmers point to things they like about Rust they are relatively
quickly pointing out `serde <https://serde.rs/>`__ as an example of something
that is a pleasure to work with.  Serde is a *Ser*\ ialization and *De*\
serialization framework for Rust.  It's relatively format independent and
lets you work with JSON, YAML and a range of different formats.

Despite all of this, there is a lot that can be accomplished with it and
some of the use cases I think are quite interesting and worth sharing.

Abusing Serialization
---------------------

One of the very interesting use cases for serde is to use it as some form
of reflection framework to expose structs to other “environments” that
cannot natively support rust structs.  These are situations where as a
developer you serialize a serializable object just to immediately
deserialize it again in a slightly different format.  Instead of
deserializing one can also get away with just a custom serializer that
"captures" the serialization calls.  For instance this is the pattern one
typically uses for IPC, template engine context or format
conversion.

What does this look like in practice?  Let's have a look at my `MiniJinja
<https://github.com/mitsuhiko/minijinja>`__ template engine from a user's
perspective.  MiniJinja uses serde as a core data model to pass structured
data to the templates so they can evaluate at runtime.  Here is what this
looks like for the developer:

.. sourcecode:: rust

    use minijinja::{context, Environment};
    use serde::Serialize;
    
    #[derive(Serialize, Debug)]
    pub struct User {
        name: String,
    }
    
    fn main() {
        let mut env = Environment::new();
        env.add_template("hello.txt", "Hello {{ user.name }}!")
            .unwrap();
        let template = env.get_template("hello.txt").unwrap();
        let user = User {
            name: "John".into(),
        };
        println!("{}", template.render(context!(user)).unwrap());
    }

As you can see we're defining a struct called `User` here that can be
serialized to serde with the default `Serialize` implementation.  This
object is then passed to the template via ``context!(user)``.  What this
does is creating a map with a single key called `user` and set to the
value of that variable.  The goal here is to allow the template engine to
access “attributes” of this user like `name`.  Now Rust is not dynamic by
nature which means that normally doing something like this at runtime is
not possible.  We can however do this because serde will implement the
`Serialize` trait like this (in pseudocode):

.. sourcecode:: rust

    impl Serialize for User {
        fn serialize(&self, serializer: S) -> Result<S::Ok, S::Error>
            where S: Serializer
        {
            let s = serializer.serialize_struct("User", 1);
            s.serialize_field("name", &self.name)?;
            s.end()
        }
    }

Under normal circumstances the serializer would be something like a JSON
serializer that writes the struct into a string or file, encoding it into
JSON in the process.  However the serde interface does not require this to
happen.  In fact MiniJinja directly encodes the struct into an in-memory
structure which the template engine then knows how to deal with.

This pattern is not particularly novel, in fact that pattern is used even
in serde itself.  When you for instance use the `flatten` feature of serde
(or some enum representations that require it), serde enables an internal
buffering mode where data is stored in an internal `Content` type which
can represent the entirety of the serde data model.  This content then can
in a separate step be again passed to another serializer.

I'm using this pattern not just in `MiniJinja` but also in my `insta
<https://insta.rs/>`__ snapshot testing tool for redactions.  To avoid
instability in snapshots taken from test runs caused by non-deterministic
data I'm first serializing into an internal format, then run a redaction
step on it, to then serialize it to the final preferred format (for
instance YAML).

TLS Shenanigans
---------------

What is however interesting about how MiniJinja uses serde here is that it
allows passing data between serialize and serializer that is serde
incompatible.  As mentioned earlier, serde has a specific data model and
what does not fit into that data model is going to run into issues.  For
instance the largest integer that serde can encode is an i128.  If you
want an arbitrary precision integer in your format you're out of luck.
Well not entirely it turns out, because you can use `in band signalling
<https://en.wikipedia.org/wiki/In-band_signaling>`__ to pass additional
data.  This is for instance how the serde JSON serializer can represent
arbitrary precision integers. It does it by reserving a special key in a
single-value object to indicate to the internal JSON serialize/serializer
combination that an arbitrary precision integer is supposed to be
serialized.  It looks like this:

.. sourcecode:: json

    {"$serde_json::private::Number": "value"}

But as you can tell from this, if one were to craft such a JSON document,
it would be picked up by serde JSON as if it was an arbitrary precision
integer.  Not great.  It also means that the “value” part in itself again
needs to be serde compatible.  For arbitrary precision integers that's
okay because it can be represented as a string.  But what if what you want
to pass between serialize and serializer is not at all serializable?

This is where clever use of thread local state can be a neat workaround.

In case of MiniJinja the internal representation of runtime values is a
type called `Value
<https://docs.rs/minijinja/0.8.2/minijinja/value/struct.Value.html>`__.
As you would expect it can hold integers, floating point values, strings,
lists, objects and a bunch of more things.  It can however also hold data
that serde does not know anything about.  In particular it can hold
a special type of string called a “safe” string which is a string that
holds safe HTML that does not need escaping or what's called “dynamic”
values.  The latter are particularly interesting because they cannot be
serialized.

What are dynamic values?  They are effectively handles to stateful
objects that should be passed to the template directly.  An example for
this is the loop variable in a MiniJinja template:

.. sourcecode:: html+jinja

    <ul>
    {% for item in seq %}
        <li>{{ loop.index }}: {{ item }}</li>
    {% endfor %}
    </ul>

MiniJinja (like Jinja2) provides the special `loop` variable to access the
state of the loop itself.  For instance you can access `loop.index` to get
access to the current loop iteration number.  The way this works in
MiniJinja is that the “loop controller” is passed directly to the template
and stored in the value itself as reference counted value.   Effectively
this is what is happening internally:

.. sourcecode:: rust

    pub struct LoopState {
        len: AtomicUsize,
        idx: AtomicUsize,
    }

    let controller = Rc::new(LoopState {
        idx: AtomicUsize::new(!0usize),
        len: AtomicUsize::new(len),
    });

When the loop iterates, it bumps the index on the controller:

.. sourcecode:: rust

   controller.idx.fetch_add(1, Ordering::Relaxed);

The controller itself gets added to the context directly through something
like this:

.. sourcecode:: rust

    let template_side_controller = Value::from_object(controller);

For this to work the controller needs to implement the MiniJinja internal
`Object` trait.  Here is the minimal implementation of this:

.. sourcecode:: rust

    impl Object for LoopState {
        fn attributes(&self) -> &[&str] {
            &["index", "length"][..]
        }
    
        fn get_attr(&self, name: &str) -> Option<Value> {
            let idx = self.idx.load(Ordering::Relaxed) as u64;
            let len = self.len.load(Ordering::Relaxed) as u64;
            match name {
                "index" => Some(Value::from(idx + 1)),
                "length" => Some(Value::from(len)),
                _ => None,
            }
        }
    }

On the template engine side the system knows that when the ``index``
attribute is looked up, that ``get_attr()`` needs to be invoked.

So far the theory, but how does this pass through serde?  When
``Value::from_object`` is called the passed value is directly moved into
the value object.  That works fine and does not require special handling,
particularly because refcounts are already in use.  However now the
question is how does the value serialize for something like a `LoopState`
which itself does not implement `Serialize`?  The answer involves thread
local storage and a co-operating serializer and deserializer.

Out of Bound State
------------------

So hidden in the value implementation in `MiniJinja` this piece of code
lives:

.. sourcecode:: rust

   const VALUE_HANDLE_MARKER: &str = "\x01__minijinja_ValueHandle";

   thread_local! {
        static INTERNAL_SERIALIZATION: AtomicBool = AtomicBool::new(false);
        static LAST_VALUE_HANDLE: AtomicUsize = AtomicUsize::new(0);
        static VALUE_HANDLES: RefCell<BTreeMap<usize, Value>> = RefCell::new(BTreeMap::new());
    }

    fn in_internal_serialization() -> bool {
        INTERNAL_SERIALIZATION.with(|flag| flag.load(atomic::Ordering::Relaxed))
    }

The idea here is that value knows when a special form of internal
serialization is used.  This internal serialization is a special form of
serialization where we know that the recipient of our serialized data is
a deserializer that also understands this.  Instead of then serializing
the data directly, we stash it into TLS and just serialize a handle into
the serde serializer.  The deserializer then deserializes the handle and
picks the value from TLS again.

So our loop controller from above serializers something like this:

.. sourcecode:: rust

    impl Serialize for Value {
        fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
        where
            S: Serializer,
        {
            // enable round tripping of values
            if in_internal_serialization() {
                use serde::ser::SerializeStruct;
                let handle = LAST_VALUE_HANDLE.with(|x| x.fetch_add(1, atomic::Ordering::Relaxed));
                VALUE_HANDLES.with(|handles| handles.borrow_mut().insert(handle, self.clone()));
                let mut s = serializer.serialize_struct(VALUE_HANDLE_MARKER, 1)?;
                s.serialize_field("handle", &handle)?;
                return s.end();
            }

            // ... here follows implementation for serializing to JSON etc.
        }
    }

If this were to be written to JSON we would see something like this:

.. sourcecode:: json

    {"\u0001__minijinja_ValueHandle": 1}

And the loop controller would be stored at handle `1` in `VALUE_HANDLES`.
Now how does one get the value out of there?  In case of MiniJinja
deserialization in fact never happens.  Instead there is only
serialization and the serializer just assembles the in-memory objects.  So
all that is needed is that the serializer understands the in-band
signalled handle to find the out-of-band value:

.. sourcecode:: rust

    impl ser::SerializeStruct for SerializeStruct {
        type Ok = Value;
        type Error = Error;
    
        fn serialize_field<T: ?Sized>(&mut self, key: &'static str, value: &T) -> Result<(), Error>
        where
            T: Serialize,
        {
            let value = value.serialize(ValueSerializer)?;
            self.fields.insert(key, value);
            Ok(())
        }
    
        fn end(self) -> Result<Value, Error> {
            match self.name {
                VALUE_HANDLE_MARKER => {
                    let handle_id = self.fields["handle"].as_usize();
                    Ok(VALUE_HANDLES.with(|handles| {
                        let mut handles = handles.borrow_mut();
                        handles
                            .remove(&handle_id)
                            .expect("value handle not in registry")
                    }))
                }
                _ => /* regular struct code */
            }
        }
    }

Ser-to-De
---------

Now the above example is one way in which you can abuse this, but the same
pattern can also be utilized when actual serialization _and_
deserialization is used.  In MiniJinja I can get away with serialization
only because I'm effectively using the serialization code to transform
from one in-memory format into another in-memory format.  The situation
gets slightly tricker if one wants to pass data between processes where
actual serialization is necessary.  For instance imagine you want to build
an IPC system to exchange data between processes.  The challenge here is
that for efficiency reasons it can be necessary to use shared memory for
large memory segments or to pass open files in the form of file
descriptors (as these files might be sockets etc.).  In my experimental
`unix-ipc <https://github.com/mitsuhiko/unix-ipc>`__ crate this is exactly
what I did.

What I'm doing there is establishing a secondary stash area where the
serializer can place file descriptors.  Again, TLS has to be used here.

API wise it looks something like this:

.. sourcecode:: rust

    pub fn serialize<S: Serialize>(s: S) -> io::Result<(Vec<u8>, Vec<RawFd>)> {
        let mut fds = Vec::new();
        let mut out = Vec::new();
        enter_ipc_mode(|| bincode::serialize_into(&mut out, &s), &mut fds)
            .map_err(bincode_to_io_error)?;
        Ok((out, fds))
    }

From the user's perspective this is all transparent.  When a `Serialize`
implementation encounters a file object it can check if serialization for
IPC should be used and in that case it can stash away the FD.
`enter_ipc_mode` basically binds the `fds` to a thread local variable and
`register_fd` then registers it.  For instance this is how the internal
handle type serializes:

.. sourcecode:: rust

    impl<F: IntoRawFd> Serialize for Handle<F> {
        fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
        where
            S: ser::Serializer,
        {
            if is_ipc_mode() {
                // effectively a weird version of `into_raw_fd` that does
                // consume
                let fd = self.extract_raw_fd();
                let idx = register_fd(fd);
                idx.serialize(serializer)
            } else {
                Err(ser::Error::custom("can only serialize in ipc mode"))
            }
        }
    }

And on the other side:

.. sourcecode:: rust

    impl<'de, F: FromRawFd + IntoRawFd> Deserialize<'de> for Handle<F> {
        fn deserialize<D>(deserializer: D) -> Result<Handle<F>, D::Error>
        where
            D: de::Deserializer<'de>,
        {
            if is_ipc_mode() {
                let idx = u32::deserialize(deserializer)?;
                let fd = lookup_fd(idx).ok_or_else(|| de::Error::custom("fd not found in mapping"))?;
                unsafe { Ok(Handle(Mutex::new(Some(FromRawFd::from_raw_fd(fd))))) }
            } else {
                Err(de::Error::custom("can only deserialize in ipc mode"))
            }
        }
    }

From the user's perspective one just passes a ``Handle::new(my_file)`` between
through the IPC channel and it just works.

State of Serde
--------------

Unfortunately all of this relies on both the use of thread local storage
and in-band signalling.  That's all not great and if we ever get a serde
2.0 I wish there were better ways to accomplish the above things in a
better way.

There are in fact quite a few issues with serde today that are related to
the above hacks:

* `serde requires in-band signalling <https://github.com/serde-rs/serde/issues/1463>`__
* `Internal buffering disrupts format-specific deserialization features <https://github.com/serde-rs/serde/issues/1183>`__
* `serde_json's arbitrary precision feature incompatible with flatten <https://github.com/serde-rs/json/issues/721>`__

With that said, there is definitely a lot of further abuse that can be
done with serde before we need to go and rewrite it but it might be time
to slowly start thinking about what a hypothetical future version of
serde looks like that is a bit more friendly to extensions to the data
model that could get away with fewer hacks.
