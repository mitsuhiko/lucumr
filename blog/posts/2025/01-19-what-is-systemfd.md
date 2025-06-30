---
tags:
  - rust
  - web
summary: "A re-introduction to socket activation with listenfd/systemfd."
---

# Automatic Server Reloading in Rust on Change: What is listenfd/systemfd?

When I developed [Werkzeug](https://werkzeug.palletsprojects.com/) (and
later [Flask](https://flask.palletsprojects.com/)), the most
important part of the developer experience for me was enabling fast, automatic
reloading.  Werkzeug (and with it Flask), this is achieved by using two
procsses at all times.  The parent process holds on to the file descriptor
of the socket on which the server listens, and a subprocess picks up that
file descriptor.  That subprocess restarts when it detects changes.  This
ensures that no matter what happens, there is no window where the browser
reports a connection error.  At worst, the browser will hang until the
process finishes reloading, after which the page loads successfully.  In
case the inner process fails to come up during restarts, you get an error
message.

A few years ago, I wanted to accomplish the same experience for working
with Rust code which is why I wrote [systemfd](https://github.com/mitsuhiko/systemfd) and [listenfd](https://github.com/mitsuhiko/listenfd).  I however realized that I
never really wrote here about how they work and disappointingly I think
those crates, and a good auto-reloading experience in Rust are largely
unknown.

## Watching for Changes

Firstly one needs to monitor the file system for changes.  While in theory
I could have done this myself, there was already a tool that could do
that.

At the time there was [cargo watch](https://crates.io/crates/cargo-watch).  Today one might instead use it
together with the more generic [watchexec](https://github.com/watchexec/watchexec).  Either one monitor your
workspace for changes and then executes a command.  So you can for
instance tell it to restart your program.  One of these will work:

```
watchexec -r -- cargo run
cargo watch -x run
```

You will need a tool like that to do the watching part.  At this point I
recommend the more generic `watchexec` which you can find on [homebrew and
elsewhere](https://github.com/watchexec/watchexec/blob/main/doc/packages.md).

## Passing Sockets

But what about the socket?  The solution to this problem I picked comes
from [systemd](https://en.wikipedia.org/wiki/Systemd).  Systemd has a
“protocol” that standardizes passing file descriptors from one process to
another through environment variables.  In systemd parlance this is called
“socket activation,” as it allows systemd to only launch a program if
someone started making a request to the socket.  This concept was
originally introduced by Apple as part of launchd.

To make this work with Rust, I created two crates:

- [systemfd](https://github.com/mitsuhiko/systemfd) is the command
line tool that opens sockets and passes them on to other programs.

- [listenfd](https://crates.io/crates/listenfd) is a Rust crate that
accepts file descriptors from systemd or `systemfd`.

It's worth noting that systemfd is not exclusivly useful to Rust.  The
systemd protocol can be implemented in other languages as well, meaning
that if you have a socket server written in Go or Python, you can also use
systemfd.

So here is how you use it.

First you need to add `listenfd` to your project:

```
cargo add listenfd
```

Then, modify your server code to accept sockets via listenfd before
falling back to listening itself on ports provided through command-line
arguments or configuration files.  Here is an example using `listenfd` in
axum:

```rust
use axum::{routing::get, Router};
use tokio::net::TcpListener;

async fn index() -> &'static str {
    "Hello, World!"
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let app = Router::new().route("/", get(index));

    let mut listenfd = listenfd::ListenFd::from_env();
    let listener = match listenfd.take_tcp_listener(0)? {
        Some(listener) => TcpListener::from_std(listener),
        None => TcpListener::bind("0.0.0.0:3000").await,
    }?;

    axum::serve(listener, app).await?;
    Ok(())
}
```

The key point here is to accept socket 0 from the environment as a TCP
listener and use it if available.  If the socket is not provided (e.g.
when launched without systemd/`systemfd`), the code falls back to opening a
fixed port.

## Putting it Together

Finally you can use `cargo watch` / `watchexec` together with `systemfd`:

```
systemfd --no-pid -s http::8888 -- watchexec -r -- cargo run
systemfd --no-pid -s http::8888 -- cargo watch -x run
```

This is what the parameters mean:

- `systemfd` needs to be first it's the program that opens the sockets.

- `--no-pid` is a flag prevents the PID from being passed.  This is necessary
for `listenfd` to accept the socket.  This is a departure of the socket
passing protocol from systemd which otherwise does not allow ports to be
passed through another program (like `watchexec`).  In short: when the
PID information is not passed, then listenfd will accept the socket
regardless.  Otherwise it would only accept it from the direct parent
process.

- `-s http::8888` tells `systemfd` to open one TCP socket on port 8888.
Using `http` instead of `tcp` is a small improvement that will cause
systemfd to print out a URL on startup.

- `-- watchexec -r` makes `watchexec` restart the process when something
changes in the current working directory.

- `-- cargo run` is the program that watchexec will start and re-start onm
changes.  In Rust this will first compile the changes and then run the
application.  Because we put `listenfd` in, it will try to first accept
the socket from `systemfd`.

The end result is that you can edit your code, and it will recompile
automatically and restart the server without dropping any requests.  When
you run it, and perform changes, it will look a bit like this:

```
$ systemfd --no-pid -s http::5555 -- watchexec -r -- cargo run
~> socket http://127.0.0.1:5555/ -> fd #3
[Running: cargo run]
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.02s
     Running `target/debug/axum-test`
[Running: cargo run]
   Compiling axum-test v0.1.0 (/private/tmp/axum-test)
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.52s
     Running `target/debug/axum-test`
```

For easier access, I recommend putting this into a `Makefile` or similar
so you can just run `make devserver` and it runs the server in watch mode.

To install `systemfd` you can use curl to bash:

```
curl -sSfL https://github.com/mitsuhiko/systemfd/releases/latest/download/systemfd-installer.sh | sh
```

## What About Windows?

Now how does this work on Windows?  The answer is that `systemfd` and
`listenfd` have a custom, proprietary protocol that also makes socket
passing work on Windows.  That's a more complex system which involves a
local RPC server.  However the system does also support Windows and the
details about how it works are largely irrelevant for you as a user
— unless you want to implement that protocol for another programming
language.

## Potential Improvements

I really enjoy using this combination, but it can be quite frustrating to
require so many commands, and the command line workflow isn't optimal.
Ideally, this functionality would be better integrated into specific Rust
frameworks like axum and provided through a dedicated cargo plugin.  In a
perfect world, one could simply run `cargo devserver`, and everything
would work seamlessly.

However, maintaining such an integrated experience is a much more involved
effort than what I have.  Hopefully, someone will be inspired to further
enhance the developer experience and achieve deeper integration with Rust
frameworks, making it more accessible and convenient for everyone.
