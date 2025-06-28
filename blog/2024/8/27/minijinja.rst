public: yes
tags: [rust, jinja]
summary: Learnings from building MiniJinja, a template engine in Rust

MiniJinja: Learnings from Building a Template Engine in Rust
============================================================

Given that I can't stop creating template engines, I figured I might write
a bit about my learnings of creating `MiniJinja
<https://github.com/mitsuhiko/minijinja/>`__ which is an implementation of
my Jinja2 template engine for Rust.  Disclaimer: this post might be a bit
more technical.

There is a good chance you have come across Jinja2 templates before as
they became quite common place in various places over the years.  They
look a bit like this:

.. sourcecode:: jinja

    {% extends "layout.html" %}
    {% block body %}
      <p>Hello {{ name }}!</p>
    {% endblock %}

If you want to play around it yourself, here are some links:

* The `MiniJinja playground <https://mitsuhiko.github.io/minijinja-playground/>`__
  lets you play with a WASM compiled version of MiniJinja.
* The `API Documentation <https://docs.rs/minijinja/>`__ documents all
  APIs, functionality and syntax.
* The `GitHub Project <https://github.com/mitsuhiko/minijinja/>`__ for all
  the code including lots of examples.
* `minijinja <https://crates.io/crates/minijinja>`__ and
  `minijinja-cli <https://crates.io/crates/minijinja-cli>`__ on crates.io

Why MiniJinja?
--------------

Maybe we start with the initial question of why I wrote MiniJinja.  It's
the year 2024 and people don't create a ton of HTML with server side
rendered template engines any more.  While there is some resurgence of
that model thanks to HTMX, hotwire and livewire, I personally use `SolidJS
<https://www.solidjs.com/>`__ for my internal UI needs.  There is however
always a need to generate some form of text and so somehow Jinja2's need
never really went away.  When I originally created it, it was clearly
meant for generating HTML with some JavaScript sprinkled on top, but in
the years since I have encountered Jinja templates in many more places,
primarily for generating YAML and similar formats.  Lately it comes up for
LLM prompt generation.

My personal need for MiniJinja came out of an experiment I built for
infrastructure automation.  Since the templates had to be loaded
dynamically I could not use a system like Askama.  Askama has type-safe
templates that just generate Rust code.  On the other hand most Jinja
inspired template engines that are dynamic in Rust really do not try very
hard to be Jinja compatible.  Because writing template engines is also fun,
I figured I might give it another try.

Over the last two years I kept adding to the engine until it got to the
point where it's at almost feature parity with Jinja2 and quite enjoyable
to use.

Runtime Values
--------------

When building a template engine for Rust you end up building a little
dynamic programming language that is optimized for text generation.
Consequently you pull in most of the challenges of building a dynamic
language.  Particularly when working in Rust the immediate challenge is
memory management and exposing native Rust objects to the embedded
language.  So the interesting bit here is how to create a system that
allows interactions between the template engine and the Rust world around
it.

MiniJinja, unlike Jinja2 does not use code generation but has a basic
stack based VM and a AST based bytecode compiler.  Since MiniJinja follows
Jinja2 it inherits a lot of the realities of the underlying object system
that Jinja2 inherits from Python.  For instance macros (functions) are
first class objects and they can have closures.  This has challenges
because it's easy to create cycles and Rust has no garbage collector that
can help with this problem.

The core object model in MiniJinja is a `Value` type which is represented
by an enum that looks as follows (some less important variants removed):

.. sourcecode:: rust

    #[derive(Clone)]
    pub struct Value(ValueRepr);
    
    #[derive(Clone)]
    pub(crate) enum ValueRepr {
        Undefined,
        None,
        Bool(bool),
        U64(u64),
        I64(i64),
        F64(f64),
        String(Arc<str>, StringType),
        SmallStr(SmallStr),
        Invalid(Arc<Error>),
        Object(DynObject),
    }

Externaly everything is a `Value`.  If you `Clone` it, you usually bump a
reference count or you make a cheap memcopy.  Values are either primitives
such as strings, numbers etc. or objects.

For objects MiniJinja provides a tait called `Object` which can be
implemented by most Rust types.  The engine provides a `DynObject` wrapper
is a fancy `Arc<dyn Object>` which supports borrowing and object safety.
`I wrote about this before </2024/5/16/macro-vtable-magic/>`__.  What you
will notice is that quite a few of the types involved have an `Arc`.
That's because these values are for the most part reference counted.
Since values here are really fat (they are 24 bytes in memory) a
`SmallStr` type is used to hold up to 22 bytes of string data inline.  One
byte is used to encode the length of the string, and another byte is then
used by the `ValueRepr` to mark which enum variant is in use.  In pure
theory this is all wrong.  We never use weak references, so the weak count
in the `Arc` is not used and clever bit hackery could be used to greatly
reduce the size of the value type.  I think one could get the whole thing
down to 16 bytes trivially or even 8 bytes with NaN tagging.  However I
did not want to walk into the world of unsafe code more than feels
appropriate.

MiniJinjia is also `plenty fast <https://github.com/mitsuhiko/minijinja/tree/main/benchmarks>`__.

One variant that is worth calling out is `Invalid`.  That's a value that
can exist in the system but it carries an error.  When you're trying to
interact with it in most cases it will propagate this error.  That's used
in the engine in places where the API assumes infallability (particularly
during iteration) but it needs a way to emit an error.  This concept is
quite common when writing an engine in C though typically the actual error
is carried out of bounds.  For instance in QuickJS there is a marker value
that indicates a failure, but the actual error is held on the interpreter
runtime.

The trait definition for objects looks like this:

.. sourcecode:: rust

    pub trait Object: Debug + Send + Sync {
        fn repr(self: &Arc<Self>) -> ObjectRepr { ... }
        fn get_value(self: &Arc<Self>, key: &Value) -> Option<Value> { ... }
        fn enumerate(self: &Arc<Self>) -> Enumerator { ... }
        fn enumerator_len(self: &Arc<Self>) -> Option<usize> { ... }
        fn is_true(self: &Arc<Self>) -> bool { ... }
        fn call(
            self: &Arc<Self>,
            state: &State<'_, '_>,
            args: &[Value],
        ) -> Result<Value, Error> { ... }
        fn call_method(
            self: &Arc<Self>,
            state: &State<'_, '_>,
            method: &str,
            args: &[Value],
        ) -> Result<Value, Error> { ... }
        fn render(self: &Arc<Self>, f: &mut Formatter<'_>) -> Result
           where Self: Sized + 'static { ... }
    }

Some of these methods are implemented automatically.  For instance many of
the methods such as `is_true` or `enumerator_len` have a default
implementation that is based on object `repr` and the return value from
`enumerate`.  But they can be overridden to change the default behavior or
to add some potential optimizations.

One of the most important types in Jinja is a map as it holds the template
context.  They are implemented as you can imagine as `Object`.  The
implementation is in fact pretty trivial:

.. sourcecode:: rust

    impl<V> Object for BTreeMap<Value, V>
    where
        V: Into<Value> + Clone + Send + Sync + fmt::Debug + 'static,
    {
        fn get_value(self: &Arc<Self>, key: &Value) -> Option<Value> {
            self.get(key).cloned().map(|v| v.into())
        }

        fn enumerate(self: &Arc<Self>) -> Enumerator {
            self.mapped_enumerator(|this| Box::new(this.keys().cloned()))
        }
    }

This reveals two interesting aspects of the object model: First that
`Value` implements `Hash`.  That means any value can be used as the key in
a value.  While this is untypical for Rust and even not what happens in
Python, it simplifies the system greatly.  When in the template engine you
write `{{ object.key }}`, behind the scenes
`object.get_value(Value::from("key"))` is called.  Since most keys are
typically less than 22 characters, creating a dummy `Value` wrapper around
is not too problematic.

The second and probably more interesting part here is that you can sort of
borrow out of an object for the enumerator.  The `mapped_enumerator`
helper takes a reference to self and invokes a closure which itself can
borrow from self.  This adjacent borrowing is implemented with unsafe code
as there is no other way to make it work.  The combination of `repr`
(defaults to `Map`), `get_value` and `enumerate` gives the object the
behavior, shape and contents.

Vectors look quite similar:

.. sourcecode:: rust

    impl<T> Object for Vec<T>
    where
        T: Into<Value> + Clone + Send + Sync + fmt::Debug + 'static,
    {
        fn repr(self: &Arc<Self>) -> ObjectRepr {
            ObjectRepr::Seq
        }

        fn get_value(self: &Arc<Self>, key: &Value) -> Option<Value> {
            self.get(key.as_usize()?).cloned().map(|v| v.into())
        }

        fn enumerate(self: &Arc<Self>) -> Enumerator {
            Enumerator::Seq(self.len())
        }
    }

Enumerators and Object Behaviors
--------------------------------

Enumeration in MiniJinja is a way to allow an object to describe what's
inside of it.  In combination with the return values from `repr()` the
engine changes how iteration is performed.  These are possible
enumerators:

.. sourcecode:: rust

    pub enum Enumerator {
        NonEnumerable,
        Empty,
        Iter(Box<dyn Iterator<Item = Value> + Send + Sync>),
        Seq(usize),
        Values(Vec<Value>),
    }

It's probably easier to explain how enumerators turn into iterators by
showing you the `try_iter` method in the engine:

.. sourcecode:: rust

    impl DynObject {
        fn try_iter(self: &Self) -> Option<Box<dyn Iterator<Item = Value> + Send + Sync>>
        where
            Self: 'static,
        {
            match self.enumerate() {
                Enumerator::NonEnumerable => None,
                Enumerator::Empty => Some(Box::new(None::<Value>.into_iter())),
                Enumerator::Seq(l) => {
                    let self_clone = self.clone();
                    Some(Box::new((0..l).map(move |idx| {
                        self_clone.get_value(&Value::from(idx)).unwrap_or_default()
                    })))
                }
                Enumerator::Iter(iter) => Some(iter),
                Enumerator::Values(v) => Some(Box::new(v.into_iter())),
            }
        }
    }

Some of the trivial enumerators are quick to explain:
`Enumerator::NonEnumerable` just does not support iteration and
`Enumerator::Empty` does but won't yield any values.  The more interesting
one is `Enumerator::Seq(n)` which basically tells the engine to call
`get_value` from 0 to `n` to yield items from the object.  This is how
sequences are implemented.  The rest are enumerators that just directly
yield values.

So when you want to iterate over a map, you will usually use something
like `Enumerator::Iter` and iterate over all the keys in the map.

The engine then uses `ObjectRepr` to figure out what to do with it.  For
a value marked as `ObjectRepr::Seq` it will display like a sequence, you
can index it with integers, and that it iterates over the values in the
sequence.  If the repr is `ObejctRepr::Map` then the expectation is that
it will be indexable by key and it will iterate over the keys when used in
a loop.  Its default rendering also is a key-value pair list wrapped in
curly braces.

Now quite frankly I don't like that iteration protocol.  I think it's more
sensible for maps to naturally iterate over the key-value pairs, but since
MiniJinja follows Jinja2 and Jinja2 follows Python emulating was
important.

Enumerators are a bit different than iterators because they might only
define how iteration is performed (see: `Enumerator::Seq`).  To actually
create an iterator, the object is then passed to it.  They are also asked
to provide a length.  When an enumerator provides a length it's an
indication to the engine that the object can be iterated over more than
once (you can re-create the enumerator).  This is why objects land in a
MiniJinja template that looks like a list, but is actually just an
iterable object with a known length.  For this MiniJinja uses a trick
where it will inspect the size hint of the iterator to make assumptions
about it.  Internally every enumerator allows the engine to query the
length of it:

.. sourcecode:: rust

    impl Enumerator {
        fn query_len(&self) -> Option<usize> {
            Some(match self {
                Enumerator::Empty => 0,
                Enumerator::Values(v) => v.len(),
                Enumerator::Iter(i) => match i.size_hint() {
                    (a, Some(b)) if a == b => a,
                    _ => return None,
                },
                Enumerator::RevIter(i) => match i.size_hint() {
                    (a, Some(b)) if a == b => a,
                    _ => return None,
                },
                Enumerator::Seq(v) => *v,
                Enumerator::NonEnumerable => return None,
            })
        }
    }

The important part here is the call to `size_hint`.  If the upper bound is
known, and the lower bound matches the upper bound then MiniJinja will
assume the iterator will always have that length (for as long as not
iterated).  As a result it will change the way the object is interacted
with.  This for instance means that if you run `range(10)` in a template
it looks like a list when printed even though iteration and number
creation is lazy.  On the other hand if you use the
`Value::make_one_shot_iterator` API the length hint will always be
disabled and MiniJinja will not attempt to interact with the iterator when
printing it:

.. sourcecode:: jinja

    {{ range(4) }}         -> prints [0, 1, 2, 3]
    {{ a_real_iterator }}  -> prints <iterator>

Building a VM
-------------

Lexing and parsing I think is not too puzzling in Rust, but making an AST
and making a VM is kinda unusual.  The first thing is that Rust is just
not particularly amazing at tree structures.  In MiniJinja I really wanted
to avoid having the AST at all, but it does come in in handy to implement
some of the functionality that Jinja2 requires.  For instance to establish
closures it will just walk the AST to figure out which names are looked up
within a function.  I tried a few things to improve how memory allocations
work with the AST.  There are great crates out there for doing this, but
I really wanted MiniJinja to be light on dependencies so I ended up opting
against all of them.

For the AST design I went with large enums that hold `Spanned<T>` values:

.. sourcecode:: rust

    pub enum Expr<'a> {
        Var(Spanned<Var<'a>>),
        Const(Spanned<Const>),
        ...
    }

    pub struct Var<'a> {
        pub id: &'a str,
    }

    pub struct Const {
        pub value: Value,
    }

You might now be curious what `Spanned<T>` is.  It's a wrapper type that
does two things: it boxes the inner node and it stores and adjacent `Span`
which is basically the code location in the original input template for
debugging:

.. sourcecode:: rust

    pub struct Spanned<T> {
        node: Box<T>,
        span: Span,
    }

It implements `Deref` like a smart pointer so you can poke right through
it to interact with the node.  The code generator just walks the AST and
`emits instructions
<https://github.com/mitsuhiko/minijinja/blob/main/minijinja/src/compiler/codegen.rs>`__
for it.

The instructions themselves are a large enum but the number of arguments
to the variants is kept rather low to not waste too much memory.  The base
size of the instruction is dominated by it being able to hold a `Value`
which as we have established is a pretty hefty thing:

.. sourcecode:: rust

    pub enum Instruction<'source> {
        EmitRaw(&'source str),
        StoreLocal(&'source str),
        Lookup(&'source str),
        LoadConst(Value),
        Jump(usize),
        JumpIfFalse(usize),
        JumpIfFalseOrPop(usize),
        JumpIfTrueOrPop(usize),
        ...
    }

The VM keeps most of the runtime state on a `State` object that is passed
to a few places.  For instance you have already seen this in the `call`
signature further up.  The state for instance holds the loaded
instructions or the template context.  The VM itself maintains a stack of
values and then just steps through a list of instructions on the state in
a loop.  Since there are a lot of instructions you can `have a look on
GitHub to see it
<https://github.com/mitsuhiko/minijinja/blob/b327a8c41ae869bb71452e7b645126ff6966e2ef/minijinja/src/vm/mod.rs#L216>`__
in its entirety.  Here however is a small part that shows roughly how this
works:

.. sourcecode:: rust

    let mut pc = 0;
    loop {
        let instr = state.instructions.get(pc) {
            Some(instr) => instr,
            None => break,
        };

        let a;
        let b;

        match instr {
            Instruction::EmitRaw(val) => {
                out.write_str(val).map_err(Error::from)?;
            }
            Instruction::Emit => {
                self.env.format(&stack.pop(), state, out)?;
            }
            Instruction::StoreLocal(name) => {
                state.ctx.store(name, stack.pop());
            }
            Instruction::Lookup(name) => {
                stack.push(assert_valid!(state
                    .lookup(name)
                    .unwrap_or(Value::UNDEFINED)));
            }
            Instruction::GetAttr(name) => {
                a = stack.pop();
                stack.push(match a.get_attr_fast(name) {
                    Some(value) => value,
                    None => undefined_behavior.handle_undefined(a.is_undefined())?,
                });
            }
            Instruction::LoadConst(value) => {
                stack.push(value.clone());
            }
            Instruction::Jump(jump_target) => {
                pc = *jump_target;
                continue;
            }
            Instruction::JumpIfFalse(jump_target) => {
                a = stack.pop();
                if !undefined_behavior.is_true(&a)? {
                    pc = *jump_target;
                    continue;
                }
            }
            // ...
        }
        pc += 1;
    }

Basically the current instruction is held in `pc` (short for program
counter), normally it's advanced by one but jump instructions can change
the `pc` to any other location.  If you run out of instructions the
evaluation ends.

One piece of complexity in the VM comes down to macros.  That's because
lifetimes make that really tricky.  A macro is just a `Value` that holds a
`Macro` `Object` internally.  So how can that macro reference the
instructions, if the instructions themselves have a lifetime to the
template `'source`?  The answer is that they can't (at least I have not
found a reasonable way).  So instead a macro has an ID which acts as a
handle to look up the instructions dynamically from the execution state.
Additionally each state has a unique ID so the engine can assert that
nothing funny was happening.  The downside of this is that a macro cannot
be "returned" from a template.  They can however be imported from one
template into another.

Here is what a macro object looks like in code (abbreviated):

.. sourcecode:: rust

    pub(crate) struct Macro {
        pub name: Value,
        pub arg_spec: Vec<Value>,
        pub macro_ref_id: usize,  // id of the macro
        pub state_id: isize,
        pub closure: Value,
        pub caller_reference: bool,
    }

    impl Object for Macro {
        fn call(self: &Arc<Self>, state: &State<'_, '_>, args: &[Value]) -> Result<Value, Error> {
            // we can only call macros that point to loaded template state.
            // if a template would be returned from a template this will
            // fail.
            if state.id != self.state_id {
                return Err(Error::new(
                    ErrorKind::InvalidOperation,
                    "cannot call this macro. template state went away.",
                ));
            }

            // ... argument parsing
            let arg_values = ...;

            // find referenced instructions
            let (instructions, offset) = &state.macros[self.macro_ref_id];

            // created a nested vm and evaluate the macro
            let vm = Vm::new(state.env());
            let mut rv = String::new();
            let mut out = Output::with_string(&mut rv);
            let closure = self.closure.clone();
            ok!(vm.eval_macro(
                instructions,
                *offset,
                self.closure.clone(),
                state.ctx.clone_base(),
                caller,
                &mut out,
                state,
                arg_values
            ));

            // return rendered template as string from the call
            Ok(if !matches!(state.auto_escape(), AutoEscape::None) {
                Value::from_safe_string(rv)
            } else {
                Value::from(rv)
            })
        }
    }

Additionally the closure is a good source of cycles.  For that reason the
engine keeps track of all closures during the execution and breaks cycles
caused by closures manually by clearning them out.

Cool APIs
---------

The last part that I want to go over is the magic that makes this work:

.. sourcecode:: rust

    fn slugify(value: String) -> String {
        value.to_lowercase().split_whitespace().collect::<Vec<_>>().join("-")
    }

    fn timeformat(state: &State, ts: f64) -> String {
        let configured_format = state.lookup("TIME_FORMAT");
        let format = configured_format
            .as_ref()
            .and_then(|x| x.as_str())
            .unwrap_or("HH:MM:SS");
        format_unix_timestamp(ts, format)
    }

    let mut env = Environment::new();
    env.add_filter("slugify", slugify);
    env.add_filter("timeformat", timeformat);

You might have seem something like this in Rust before, but it's still a
bit magical.  How can you make functions with seemingly different
signatures register with the `add_filter` function?  How does the engine
perform the type conversions (as we know the engine has `Value` types, so
where does the `String` conversion take place?).  This is a topic for a
blog post on its own but the answer behind this lies in a a lot of clever
trait hackery.  The `add_filter` function reveals a bit of that hackery:

.. sourcecode:: rust

    pub fn add_filter<N, F, Rv, Args>(&mut self, name: N, f: F)
    where
        N: Into<Cow<'source, str>>,
        F: Filter<Rv, Args> + for<'a> Filter<Rv, <Args as FunctionArgs<'a>>::Output>,
        Rv: FunctionResult,
        Args: for<'a> FunctionArgs<'a>,
    {
        let filter = BoxedFilter(Arc::new(move |state, args| -> Result<Value, Error> {
            f.apply_to(Args::from_values(Some(state), args)?).into_result()
        }));
        self.filters.insert(name.into(), filter);
    }

Hidden behind this rather complex set of traits are some basic ideas:

1. `FunctionArgs` is a helper trait for type conversions.  It's
   implemented for tuples of different sizes made of `ArgType` values.
   These tuples represent the signature of the function.  It has a method
   called `from_values` which performs that conversion via `ArgType`.
2. `ArgType` which you can't really see in the code above, is a trait that
   knows how to convert a `Value` into whatever the function desires as
   argument.
3. `Filter` is a trait implemented for function with qualifying
   `FunctionArgs` signatures returning a `FunctionResult`.
4. A `FunctionResult` is a trait that represents potential return values
   from the function such as a `Value`, something that can be converted into
   a `Value` or a `Result`.
5. The `BoxedFilter` type is what converts the passed closure into a
   reference counted object that is held in the environment.

Conclusion
----------

I think a lot of the patterns in MiniJinja are useful for projects
outside of MiniJinja.  Quite is quite a bit more hidden in it that I have
talked about before such as how `MiniJinja is abusing serde
</2021/11/14/abusing-serde/>`__.  If you have a need for a Jinja2
compatible template engine I would love if you get some use out of it.  If
you're curious about how to build a runtime and object system in Rust, you
might also find some utility in the codebase.

I myself learned quite a bit about what creative API design can look like
in Rust by building it.  At this point I am incredibly happy with how the
public API of the engine shaped out to be.  The engine is extensively
documented both internally and publicly and you can `read all about it in
the API docs <https://docs.rs/minijinja/latest/minijinja/>`__.
