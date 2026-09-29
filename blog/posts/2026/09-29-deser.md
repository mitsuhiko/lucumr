---
tags: ['rust']
summary: "Rethinking Rust Serialization"
---

# Deser: Rethinking Rust Serialization

[Serde](https://serde.rs/) is an amazing serialization library for Rust and it
has been a huge reason why I felt productive with it for years.  However already
while at Sentry I got quite frustrated with some of the limitations with it but
actually replacing Serde is tricky because of the might that it has in the
ecosystem.  Also because it's quite hard to actually do better without also
making some potentially painful compromises.

Here are three examples of Serde corner cases that show poor interactions of
Serde features or unexpected limitations:

<details><summary>A number that is a map</summary>

An internally tagged enum, with `serde_json`'s `arbitrary_precision` feature
turned on:

```rust
#[derive(Deserialize)]
#[serde(tag = "type")]
enum Shape {
    Circle { radius: f64 },
}

serde_json::from_str::<Shape>(r#"{"type": "Circle", "radius": 1.5}"#)
// error: invalid type: map, expected f64
```

Serde's data model has no place for arbitrary precision numbers, so `serde_json`
uses in-band signalling with a map with a magic key.  The enum has to buffer the
fields until it has seen the tag, and the buffer does not know about the magic
key.  Because Cargo features are unified, it's enough for any crate in your
dependency graph to turn the feature on.

</details>

<details><summary>Flattening breaks integer keys</summary>

```rust
#[derive(Deserialize)]
struct Stats {
    scores: HashMap<u32, u32>,
}

#[derive(Deserialize)]
struct Report {
    name: String,
    #[serde(flatten)]
    stats: Stats,
}

serde_json::from_str::<Report>(r#"{"name": "x", "scores": {"42": 23}}"#)
// error: invalid type: string "42", expected u32 at line 1 column 35
```

`Stats` on its own parses `{"scores": {"42": 23}}` just fine.  JSON keys are
always strings, and `serde_json` only turns them into integers if the type asks
for one.  However once `flatten` buffers the value, `"42"` is just a string.
The error also points at the end of the document rather than at the key.

</details>

<details><summary>Adapters do not compose</summary>

```rust
fn from_hex<'de, D: Deserializer<'de>>(d: D) -> Result<u32, D::Error> { ... }

#[derive(Deserialize)]
struct Theme {
    #[serde(deserialize_with = "from_hex")]
    primary: u32,
    #[serde(deserialize_with = "from_hex")]
    accent: Option<u32>,
}

//error[E0308]: `?` operator has incompatible types
//  |
//  |     #[serde(deserialize_with = "from_hex")]
//  |                                ^^^^^^^^^^ expected `Option<u32>`, found `u32`
//  |
//help: try wrapping the expression in `Some`
//  |
//  |     #[serde(deserialize_with = Some("from_hex"))]
//  |                                +++++          +
```

A function cannot be passed as a type parameter, so there is no way to apply
`from_hex` to the inside of an `Option`, a `Vec` or a map.  You write another
function for every wrapper, and once you have `from_opt_hex` the field is no
longer optional unless you also remember to add `#[serde(default)]`.

</details>

None of these are bugs that are easy to fix in Serde.  They fall out of its
design, and that design is protected by Serde's stability guarantees.

Back in 2022 I started an experiment called
[Deser](https://github.com/mitsuhiko/deser).  It's a serialization library for
Rust that takes the user experience of [Serde](https://serde.rs/) and puts it on
top of a completely different architecture inspired by
[miniserde](https://github.com/dtolnay/miniserde).  I never really finished it
and it sat around for a few years.  I picked it back up, and it has now reached
a point where I think it's worth looking at.  Even just to inspire others to
see if they want to explore the space.

## The Name And Idea

The name is Serde with its two halves swapped.  Deser is Serde but the other way
around.  In Serde, a type drives the deserialization process: a `Deserialize`
impl asks the deserializer for the kind of value it expects, the format calls
back into a visitor.  Every nested value is handled by recursion which makes
Serde deserialization inherently grow the stack with each level of nesting.

Deser on the other hand turns this around and the format tells the type of the
next value and pushes events into a sink.  When a sink hits the start of a
nested value, it doesn't call into it but hands back a new sink to a driver,
which keeps all state on the heap (in fact, in an arena).  On the way out,
emitters return their nested values instead of recursing into them.

That also means that Deser cannot support formats like protobuf that are not
self describing.  They are in fact quite intentionally left out of the design
entirely.  Which is one way to say: if you want to "fix" Serde, you need to
make some other compromises.

Most of the reasons for Deser's ideas go back to [Sentry
Relay](https://github.com/getsentry/relay), which processes enormous amounts of
untrusted JSON.  Over the years when I was at Sentry we ran into the same set of
problems again and again, and many of them are not really bugs in Serde but
consequences of its design.  Serde's stability guarantees mean that a lot of
them cannot be fixed without breaking every format and every hand written
implementation.  Most of these problems come from three decisions:

1. **One set of traits for all formats.**  Serde serves both self describing
   formats (JSON, YAML, TOML, …) and formats where the reader has to know the
   type upfront (postcard, bincode, protobuf, …).  That is incredibly useful,
   but it means that some features only work with some formats, and you find out
   at runtime.  In case of Serde it also has some odd wrinkles where a derived
   struct quietly accepts an array in place of an object in JSON for instance.

2. **A fixed data model that loses information when buffering.**  Internally
   tagged enums, untagged enums and `flatten` need to buffer values before
   they know what to do with them.  The buffer can't hold everything the format
   knew, errors lose their location and extensions to the ecosystem rely on
   in-band signalling to express things such as arbitrary precision numbers.

3. **Recursion on the call stack.**  Every level of nesting uses stack space.
   Formats protect against this with a recursion limit, but the moment you go
   through a code path that doesn't have one (writing, dynamic values), deeply
   nested data can take down your process.  It also means that a
   deserialization cannot be paused while you wait for more input.

Many of the corresponding Serde issues have been open for years, and I wrote
about [abusing Serde](/2021/11/14/abusing-serde/) before.  People have tried
different angles on this over the years.  Some went minimal and dropped most
features to get fast compiles and no recursion.  dtolnay's own
[miniserde](https://github.com/dtolnay/miniserde) is the best example of that,
and deser's trait design was originally modelled after it.  Other recent
attempts went for runtime reflection, or for a new data model with a focus on
binary formats.

If you want to read up on all of the collected challenges with Serde's design,
I maintain [a lengthy list here](https://github.com/mitsuhiko/deser/blob/main/SERDE.md).

## Dethroning Serde

First of all I don't think it's likely that one can replace Serde.  [The orphan
rule](https://smallcultfollowing.com/babysteps/blog/2022/04/17/coherence-and-crate-level-where-clauses/)
entrenches Serde incredibly well in the ecosystem.  But some things are within
the reach of a crate author's control.  In case of Deser it's completeness.

Deser today implements all important self describing formats from YAML, JSON,
TOML, CBOR, JSON5 and the likes, but also XML and plist to really close the gap.
XML in particular is something Serde has declined to support, and it shows
(more on that below).  At the very least format support should not be the
reason not to use Deser.

The second problem usually is that actually solving Serde's issues comes at a
significant cost in compile time and/or runtime performance.  Deser is no
different.  While Deser's compile times are a bit better than Serde's, the
binary bloat is quite a bit worse and the runtime performance is mixed.  It's
roughly comparable if you look at the numbers but depending on the format
structure you are losing significantly from some of the tradeoffs.

That said, it's now in a state where it's at least in principle a drop-in
replacement where the tradeoffs might work well for users.

## Deser's Design

Deser does not try to be significantly different than Serde on the surface
level.  For most uses you derive `Serialize` and `Deserialize` and then start
using it with your format implementing crate of choice.  Most attributes are
very similar, though they are taking Rust expressions instead of strings.

```rust
use deser::{Serialize, Deserialize};

#[derive(Debug, Serialize, Deserialize)]
#[deser(rename_all = "camelCase")]
pub struct Account {
    id: u64,
    account_holder: String,
    #[deser(default)]
    is_deactivated: bool,
}

let account: Account = deser_json::from_str(json)?;
```

The difference in the design would become more apparent if you implement a
serializer or deserializer yourself.  Instead of visitors that call into each
other recursively, deserializing a type creates a
*sink* which receives events that are directly emitted by the parser, and
*serializing produces emitters* that hand out values.  Nested sinks and emitters
are handed back to a driver, which keeps them on the heap.  This design, which is
entirely stolen from miniserde, gives some interesting consequences:

* **No stack overflows.**  You can arbitrarily nest structures without issues.
  For untrusted input you set limits with a layer, and you pick the number
  that you are comfortable with, which is independent of your stack space.
* **Suspendable.**  Because the state lives in the driver, a deserialization
  can be fed input as it arrives.  It's also `Send`, so it can move between
  threads while you wait on IO which makes it much nicer to use with tokio.
  Formats like JSON, CBOR and MessagePack can be parsed as a stream if you
  so desire.
* **An extensible data model.**  The core data model is small and made of atoms,
  maps and sequences.  For all else, there are extension values (`DateTime`,
  `Uuid`, etc.) that also all carry a fallback for formats that don't understand
  them.  Unlike Serde this means it does not rely on in-band signalling of
  objects with magic keys to smuggle values through.
* **Lossless buffering.**  When a value has to be buffered (for instance because
  the tag of an internally tagged enum comes last), Deser records the events
  together with everything the format knew about them.  Protocol specific
  extension types or error locations all survive.
* **Layers** are a middleware system that sit between the format and your types
  and can track things like paths, enforce safety limits, rename keys or redact
  values without having to touch specific code paths.
* **Native flattening** that doesn't buffer at all.

On top of that are a lot of things that I just wanted to have:

* Allow enum tags to be of any type, not just strings
* Adapters that compose (`as = Option<Vec<DisplayFromStr>>`)
* Enabling validation as an adapter
* derive attributes that are real Rust expressions instead of strings
* bytes as a core functionality in the data model
* duplicate keys rejected by default and errors that point at the problem

Here is a small configuration type that shows a few of these together:

```rust
use deser::adapters::DisplayFromStr;
use deser::de::Recording;
use deser::{Deserialize, Serialize};
use deser_encoding::Hex;
use deser_validate::{Check, NonEmpty, Range};
use ipnet::IpNet;

#[derive(Debug, Serialize, Deserialize)]
pub struct Config {
    // at least one 256-bit key, each written as hex
    #[deser(as = Check<NonEmpty, Vec<Hex>>)]
    secret_keys: Vec<[u8; 32]>,
    // `IpNet` knows nothing about deser, but has `FromStr` and `Display`
    #[deser(as = Option<Vec<DisplayFromStr>>)]
    allowed_networks: Option<Vec<IpNet>>,
    listeners: Vec<Listener>,
}

#[derive(Debug, Serialize, Deserialize)]
#[deser(tag = "type", rename_all = "snake_case")]
pub enum Listener {
    Unix { path: PathBuf },
    Tcp {
        host: IpAddr,
        #[deser(as = Check<Range<1, 65535>>)]
        port: u16,
    },
    // types this version does not know are kept and written back
    #[deser(other)]
    Other(#[deser(tag)] String, Recording),
}
```

Adapters are types, so `Hex` can go inside a `Vec`, and `DisplayFromStr` inside
a `Vec` inside an `Option`.  Validators are adapters too, so
`Check<NonEmpty, Vec<Hex>>` decodes the keys and then checks that there is at
least one.  The catch-all variant keeps the tag and a recording of everything
else in case someone wants to process it later.

Errors are something I care a lot about, so here is what happens when a value
is wrong:

```toml
secret_keys = ["9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08"]
allowed_networks = ["10.0.0.0/8", "fd00::/8"]

[[listeners]]
type = "unix"
path = "/run/app.sock"

[[listeners]]
host = "127.0.0.1"
port = 0
type = "tcp"

[[listeners]]
type = "quic"
host = "::1"
alpn = ["h3"]
```

```rust
let config: Config = deser_toml::Deserializer::from_str(input)
    .deserialize_with(|driver| driver.push_layer(PathLayer::new()))?;
```

Note that here the tag of the internally tagged enum comes last which means that
the values have to be buffered until the tag is known.  In Serde this is tricky
and we would lose the location if we used some tricks to add it.  With Deser
however, with the path layer enabled Deser you where in the structure the
problem is:

```
Unexpected: invalid value: must be between 1 and 65535 at line 10 column 8 (path: listeners[1].port)
```

## Deser Meta Data

Deser really wants to be extensible, and XML is a more extreme example of the
differences between Deser and Serde.  Here is an Atom entry that mixes in Dublin
Core for the authors:

```rust
use chrono::{DateTime, Utc};
use deser::Deserialize;
use deser_value::Value;
use deser_xml::DeserializerConfig;

deser_xml::namespace!(
    atom = "http://www.w3.org/2005/Atom",
    dc = "http://purl.org/dc/elements/1.1/",
);

#[derive(Debug, Deserialize)]
struct Entry {
    #[deser(rename = atom!("title"))]
    title: String,
    #[deser(rename = dc!("creator"))]
    creators: Vec<String>,
    #[deser(rename = atom!("updated"))]
    updated: DateTime<Utc>,
}

// entries we understand, and everything else is kept as it is
#[derive(Debug, Deserialize)]
#[deser(untagged)]
enum Item {
    Entry(Entry),
    Other(Value),
}

let item: Item = DeserializerConfig::new()
    .resolve_namespaces(true)
    .from_str(r#"
        <entry xmlns="http://www.w3.org/2005/Atom"
               xmlns:d="http://purl.org/dc/elements/1.1/">
          <title>Deser</title>
          <d:creator>John</d:creator>
          <updated>2026-09-29T21:00:00Z</updated>
          <d:creator>Jane</d:creator>
        </entry>
    "#)?;
```

XML uses namespaces which means that names need to be matched by their namespace,
not by the prefix the document happens to use.  Here the document says `d:` and
the type says `dc!`.  `atom!("title")` is just the string
`{http://www.w3.org/2005/Atom}title`, which works because attributes are
expressions.  The two creators are collected into one `Vec` even though there is
another element between them, and the text of `updated` goes straight into a
`chrono` datetime.  Because the enum is untagged, the entry has to be buffered
before a variant is picked, and deser's buffer keeps both creators.  So the
result is an `Entry` with John and Jane.

quick-xml, the most popular XML crate for Serde, drops the prefixes and ignores
namespaces entirely, so a `<x:title>` from some other namespace is happily
accepted as the title of the entry.  The split list part though is considerably
worse.  A plain `Entry` fails with a duplicate field error for `creator`, unless
you turn on the `overlapped-lists` feature (which, remember, is a global
additive flag that any crate could set).  That feature makes quick-xml read
ahead to the end of the element and buffer everything in between, without a
limit unless you set one.

But the feature only helps when quick-xml is hooked up to the struct directly
and no buffering is taking place.  Wrap the struct in the untagged enum and
Serde buffers the entry itself.  Read from that buffer, `Entry` sees `creator`
twice and fails again.  The fallback is a map, which keeps only the last
`creator`, and there is no error.  With or without the feature you get this:

```rust
Other({"creator": {"$text": "Jane"}, "title": {"$text": "Deser"}, ...})
```

Notice how John is gone.

Format specific extension types such as TOML datetimes are another case.  TOML
has them natively, Serde's data model does not, so the `toml` crate passes them
on as a map with a magic key.  In Deser a datetime is an extension value, which
formats that know it keep and all others write as a string:

```rust
let value: Value = deser_toml::from_str("released = 2026-09-29T21:00:00+02:00")?;

deser_json::to_string(&value)?;
// {"released":"2026-09-29T21:00:00+02:00"}
deser_toml::to_string(&value)?;
// released = 2026-09-29T21:00:00+02:00
```

The same with `serde_json::Value` gives you
`{"released":{"$__toml_private_datetime":"2026-09-29T21:00:00+02:00"}}`, and
reading the value into a `chrono::DateTime` fails outright with `invalid type:
map, expected an RFC 3339 formatted date and time string`.

## The Cost

So now that you know Deser is at least in theory cool, at what cost?

It is not free.  The design relies on dynamic dispatch and on sinks and emitters
that live on the heap, and that has considerable runtime overhead.  In my own
measurements for JSON, Deser reads somewhere between 33% faster and 60% slower
than `serde_json depending` on the data.  On average it's about 10% slower for
reading.  Writes are between three times as fast and 70% slower and a wash on
average.  For YAML and TOML it's noticeably faster than the Serde based crates,
but that is more about the format implementations than the architecture.

Compile times slightly are better, but not dramatically so.  Because it doesn't
monomorphize everything, release builds of derived code are about 2.3 times as
fast as with Serde and that get a tiny bit better in practice for your own code
as less recompilation is necessary.

To make Deser's design work at all, it also uses `unsafe` internally.  Most of
this is to keep the chain of borrowed sinks on the heap.  I feel like this is
fine in the days of Miri and agents, but I know it makes some folks uneasy.

And well, the biggest cost is that it's just not Serde.

## How Much Is There?

Quite a lot actually which might be surprising.  In addition to the core
there is support for [derive](https://github.com/mitsuhiko/deser/tree/main/deser-derive).

It supports all flavorts of JSON you can think of:
[JSON](https://github.com/mitsuhiko/deser/tree/main/deser-json),
[JSONC](https://github.com/mitsuhiko/deser/tree/main/deser-jsonc),
[JSON5](https://github.com/mitsuhiko/deser/tree/main/deser-json5) and 
[HJSON](https://github.com/mitsuhiko/deser/tree/main/deser-hj).  (Fun fact here:
they are all generated out of [one shared parser template](https://github.com/mitsuhiko/deser/tree/main/deser-template-json))
For binary handling it supports
[CBOR](https://github.com/mitsuhiko/deser/tree/main/deser-cbor) and
[MessagePack](https://github.com/mitsuhiko/deser/tree/main/deser-msgpack).
Additionally it does
[YAML](https://github.com/mitsuhiko/deser/tree/main/deser-yaml) 1.1 and 1.2,
[TOML](https://github.com/mitsuhiko/deser/tree/main/deser-toml),
[XML](https://github.com/mitsuhiko/deser/tree/main/deser-xml) and all three
flavors of Apple's [plist](https://github.com/mitsuhiko/deser/tree/main/deser-plist)
as well as [CSV/TSV](https://github.com/mitsuhiko/deser/tree/main/deser-csv),
[urlencoded data](https://github.com/mitsuhiko/deser/tree/main/deser-urlencoded) and
[environment variables](https://github.com/mitsuhiko/deser/tree/main/deser-env).
For more crazy contraptions you can
[attach path info](https://github.com/mitsuhiko/deser/tree/main/deser-path) or
[capture location data](https://github.com/mitsuhiko/deser/tree/main/deser-location)
as well as support for
[debug printing](https://github.com/mitsuhiko/deser/tree/main/deser-debug).
You can perform [validation](https://github.com/mitsuhiko/deser/tree/main/deser-validate)
as you parse, opt into different
[binary encodings](https://github.com/mitsuhiko/deser/tree/main/deser-encoding)
in addition to base64, you can
[bridge to serde](https://github.com/mitsuhiko/deser/tree/main/deser-serde) or
capture
[dynamic values](https://github.com/mitsuhiko/deser/tree/main/deser-value),
[transcode](https://github.com/mitsuhiko/deser/tree/main/deser-transcode)
between formats or hook it up with
[tokio](https://github.com/mitsuhiko/deser/tree/main/deser-tokio).

For documentation see [docs.rs/deser](https://docs.rs/deser/latest/deser/)
and the code itself is [on GitHub](https://github.com/mitsuhiko/deser).
