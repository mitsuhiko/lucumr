---
tags: ['rust', 'http', 'rest', 'api']
summary: "Lessons learned from implementing a restful HTTP client for Rust."
---

# Rust and Rest

A few months back I decided to write a command line client for [Sentry](http://www.getsentry.com/) because manually invoking the Sentry API for
some common tasks (such as dsym or sourcemap management is just no fun).
Given the choice of languages available I went with Rust.  The reason for
this is that I want people to be able to download a single executable that
links everything in statically.  The choice was between C, C++, Go and
Rust.  There is no denying that I really like Rust so it was already a
pretty good choice for me.  However what made it even easier is that Rust
quite a potent ecosystem for what I wanted.  So here is my lessons learned
from this.

## Libraries for HTTP

To make an HTTP request you have a choice of libraries.  In particular
there are two in Rust you can try: [hyper](http://hyper.rs/) and
[rust-curl](https://crates.io/crates/curl).  I tried both and there are
some releases with the former but I settled in rust-curl in the end.  The
reason for this is twofold.  The first is that curl (despite some of the
oddities in how it does things) is very powerful and integrates really
well with the system SSL libraries.  This means that when I compile the
executable I get the native TLS support right away.  rust-curl also
(despite being not a pure rust library) compiles really well out of the
box on Windows, macOS and Linux.  The second reason is that Hyper is
currently undergoing a major shift in how it's structured and a bit in
flux.  I did not want to bet on that too much.  When I started it also did
not have proxy support which is not great.

For JSON parsing and serializing I went with [serde](https://crates.io/crates/serde).  I suppose that serde will eventually
be the library of choice for all things serialization but right now it's
not.  It depends on compiler plugins and there are two ways to make it
work right now.  One is to go with nightly Rust (which is what I did) the
other is to use the build script support in Rust.  This is similar to what
you do in Go where some code generation happens as part of the build.  It
definitely works but it's not nearly as nice as using serde with nightly
Rust.

## API Design

The next question is what a good API design for a Rust HTTP library is.  I
struggeld with this quite a bit and it took multiple iterations to end up
with something that I think is a good pattern.  What I ended up is a
collection of multiple types:

- `Api`: I have a basic client object which I call `Api` internally.
it manages the curl handles (right now it just caches one) and also
exposes convenience methods to perform certain types of HTTP requests.
On top of that it provides high level methods that send the right HTTP
requests and handle the responses.

- `ApiRequest`: basically your request object.  It's mostly a builder
for making requests and has a method to send the request and get a
response object.

- `ApiResponse`: contains the response from the HTTP request.  This also
provides various helpers to convert the response into different things.

- `ApiResult<T>`: this is a result object which is returned from most
methods.  The error is a special API error that converts from all the
APIs we call into.  This means it can hold curl errors, form errors,
JSON errors, IO errors and more.

To give you an idea how this looks like I want to show you one of the
high level methods that use most of the API:

```rust
pub fn list_releases(&self, org: &str, project: &str)
    -> ApiResult<Vec<ReleaseInfo>>
{
    Ok(self.get(&format!("/projects/{}/{}/releases/",
                         PathArg(org), PathArg(project)))?.convert()?)
}
```

(Note that I'm using the new question mark syntax `?` instead of the
more familiar `try!` macro here)

So what is happening here?

1. This is a method on the `Api` struct.  We use the `get()`
shorthand method to make an HTTP `GET` request.  It takes one argument
which is the URL to make the request to.  We use standard string
formatting to create the URL path here.

1. The `PathArg` is a simple wrapper that customizes the formatting so
that instead of just stringifying a value it also percent encodes it.

1. The return value of the `get` method is a `ApiResult<ApiResponse>`
which provides a handy `convert()` method which does both error
handling and deserialization.

How does the JSON handling take place here?  The answer is that
`convert()` can do that.  Because `Vec<ReleaseInfo>` has an automatic
deserializer implemented.

## The Error Onion

The bulk of the complexity is hidden behind multiple layers of error
handling.  It took me quite a long time to finally come up with this
design which is why I'm particularly happy with finally having found one I
really like.  The reason error handling is so tricky with HTTP requests is
because you want to have both the flexibility of responding to specific
error conditions as well as automatically handling all the ones you are
not interested in.

The design I ended up with is that I have an `ApiError` type.  All the
internal errors that the library could encounter (curl errors etc.) are
automatically converted into an `ApiError`.  If you send a request the
return value is as such `Result<ApiResponse, ApiError>`.  However the
trick here is that at this level no HTTP error (other than connection
errors) is actually stored as `ApiError`.  Instead also a failed
response (because for instance of a 404) is stored as the actual response
object.

On the response object you can check the status of the response with these
methods:

```rust
pub fn status(&self) -> u32 { self.status }
pub fn failed(&self) -> bool { self.status >= 400 && self.status <= 600 }
pub fn ok(&self) -> bool { !self.failed() }
```

However what's nice is that most of the time you don't have to do any of
this.  The response method also provides a method to conver non successful
responses into errors like this:

```rust
pub fn to_result(self) -> ApiResult<ApiResponse> {
    if self.ok() {
        return Ok(self);
    }
    if let Ok(err) = self.deserialize::<ErrorInfo>() {
        if let Some(detail) = err.detail {
            return Err(ApiError::Http(self.status(), detail));
        }
    }
    Err(ApiError::Http(self.status(), "generic error".into()))
}
```

This method consumes the response and depending on the condition of the
response returns different results.  If everything was fine the response
is returned unchanged.  However if there was an error we first try to
deserialize the body with our own `ErrorInfo` which is the JSON response
our API returns or otherwise we fall back to a generic error message and
the status code.

What's deserialize?  It just invokes serde for deserialization:

```rust
pub fn deserialize<T: Deserialize>(&self) -> ApiResult<T> {
    Ok(serde_json::from_reader(match self.body {
        Some(ref body) => body,
        None => &b""[..],
    })?)
}
```

One thing you can see here is that the body is buffered into memory
entirely.  I was torn on this in the beginning but it actually turns out
to make the API significantly nicer because it allows you to reason about
the response better.  Without buffering up everything in memory it becomes
much harder to do conditional things based on the body.  For the cases
where we cannot deal with this limitation I have extra methods to stream
the incoming data.

On deserialization we match on the body.  The body is an `Option<Vec<u8>>`
here which we convert into a `&[u8]` which satisfies the `Read`
interface which we can then use for deserialization.

The nice thing about the aforementioned `to_result` method is that it
works just so nice.  The common case is to convert something into a result
and to then deserialize the response if everything is fine.  Which is why
we have this `convert` method:

```rust
pub fn convert<T: Deserialize>(self) -> ApiResult<T> {
    self.to_result().and_then(|x| x.deserialize())
}
```

## Complex Uses

There are some really nice uses for this.  For instance here is how we
check for updates from the GitHub API:

```rust
pub fn get_latest_release(&self) -> ApiResult<Option<(String, String)>>
{
    let resp = self.get("https://api.github.com/repos/getsentry/sentry-cli/releases/latest")?;
    if resp.status() != 404 {
        let info : GitHubRelease = resp.to_result()?.convert()?;
        for asset in info.assets {
            if asset.name == REFERENCE_NAME {
                return Ok(Some((
                    info.tag_name,
                    asset.browser_download_url
                )));
            }
        }
    }
    Ok(None)
}
```

Here we silently ignore a 404 but otherwise we parse the response as
`GitHubRelease` structure and then look through all the assets.  The call
to `to_result` does nothing on success but it will handle all the other
response errors automatically.

To get an idea how the structures like `GitHubRelease` are defined, this
is all that is needed:

```rust
#[derive(Debug, Deserialize)]
struct GitHubAsset {
    browser_download_url: String,
    name: String,
}

#[derive(Debug, Deserialize)]
struct GitHubRelease {
    tag_name: String,
    assets: Vec<GitHubAsset>,
}
```

## Curl Handle Management

One thing that is not visible here is how I manage the curl handles.  Curl
is a C library and the Rust binding to it is quite low level.  While it's
well typed and does not require unsafe code to use, it still feels very
much like a C library.  In particular there is a curl "easy" handle object
you are supposed to keep hanging around between requests to take advantage
of keepalives.  However the handles are stateful.  Readers of this blog
are aware that there are few things I hate as much as unnecessary stateful
APIs.  So I made it as stateless as possible.

The "correct" thing to do would be to have a pool of "easy" handles.
However in my case I never have more than one request outstanding at the
time so instead of going with something more complex I stuff away the
"easy" handle in a `RefCell`.  A `RefCell` is a smart pointer that
moves the borrow semantics that rust normally requires at compile time to
runtime.  This is rougly how this looks:

```rust
pub struct ApiRequest<'a> {
    handle: RefMut<'a, curl::easy::Easy>
}

pub struct Api {
    shared_handle: RefCell<curl::easy::Easy>,
    ...
}

impl Api {
    pub fn request(&self, method: Method, url: &str)
        -> ApiResult<ApiRequest<'a>>
    {
        let mut handle = self.shared_handle.borrow_mut();
        ApiRequest::new(handle, method, &url)
    }
}
```

This way if you call `request` twice you will get a runtime panic if the
last request is still outstanding.  This is fine for what I do.  The
`ApiRequest` object itself implements a builder like pattern where you
can modify the object with chaining calls.  This is roughly how this looks
like when used for a more complex situation:

```rust
pub fn send_event(&self, event: &Event) -> ApiResult<String> {
    let dsn = self.config.dsn.as_ref().ok_or(Error::NoDsn)?;
    let event : EventInfo = self.request(Method::Post, &dsn.get_submit_url())?
        .with_header("X-Sentry-Auth", &dsn.get_auth_header(event.timestamp))?
        .with_json_body(&event)?
        .send()?.convert()?;
    Ok(event.id)
}
```

## Lessons Learned

My key takeaways from doing this in Rust so far have been:

- Rust is definitely a great choice for building command line utilities.
The ecosystem is getting stronger by the day and there are so many
useful crates already for very common tasks.

- The cross platform support is superb.  Getting the windows build going
was easy cake compared to the terror you generally go through with
other languages (including Python).

- serde is a pretty damn good library.  It's a shame it's not as nice to
use on stable rust.  Can't wait for this stuff to get more stable.

- Result objects in rust are great but sometimes it makes sense to not
immediately convert data into a result object.  I originally converted
failure responses into errors immediately and that definitely hurt the
convenience of the APIs tremendously.

- Don't be afraid of using C libraries like `curl` instead of native
Rust things.  It turns out that Rust's build support is pretty
magnificent which makes installing the rust curl library
straightforward.  It even takes care of compiling curl itself on
Windows.

If you want to see the code, the entire git repository of the client can
be found online: [getsentry/sentry-cli](http://github.com/getsentry/sentry-cli).
