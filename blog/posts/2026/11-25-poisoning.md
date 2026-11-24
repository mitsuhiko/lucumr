---
tags: ['rust', 'thoughts']
summary: "Venenatio claustrorum delenda est"
facets:
  mood: {angry: 0.72, matter_of_fact: 0.21}
  scale: {craft: 0.78, community: 0.22}
  time: {future: 0.54, present: 0.3, past: 0.16}
  ai: {not_ai: 1}
  imagery: {body: 0.65, none: 0.28}
  stance: {advocate: 0.92}
  actor: {idea: 0.56, group: 0.37}
  ending: {practical: 0.98}
  tension: 0.73
  certainty: 0.97
  valence: 0.4
  energy: 0.51
  wander: 0.22
  personal: 0.32
  humor: 0.16
  technical: 0.87
---

# Abolish Lock Poisoning

Rust has a curious feature that I don't think the language would land today,
if it was not there for a long time: mutex poisoning.  When some Rust code
panics while holding a `std::sync::Mutex`, the mutex is *poisoned*.  That means
that any further call to `lock()` returns a `PoisonError`.  The motivation for
this feature is that an object might have some internal invariants that need to
be upheld and panicking in the wrong moment might invalidate reasonable at and leave an
object behind in a broken state.

Personally I absolutely hate this feature as it has bitten me so many times and
I cannot once remember it helping me.  The libs team is
[discussing](https://github.com/rust-lang/rust/issues/149359) making the
non-poisoning locks the default in the next edition but entirely expectedly it
has caused quite a few people to jump to the defence of the feature.

In this post I want to make my personal case why poisoned locks should either
be entirely removed or be made the exception.

Primarily this is because I have yet to come across code in the wild that
handles a poisoned lock correctly.  On the other hand I have come across enough
code that mishandles it and as a result behaves worse than a
[parking_lot](https://docs.rs/parking_lot) lock would which does not support
poisoning.

[Josh Triplett](https://news.ycombinator.com/item?id=46041342) put it quite
strongly in a hackernews comment: "In the entire history of the standard
library, we have never once seen a single report of anyone attempting to recover
from poison."

When a panic happens with a lock held, there are two reasonable reactions: shut
the process down, or carry on and ignore the flag.  With `panic = "abort"` you
get the former and poisoning never comes up.  From all the evidence I have seen,
with unwinding, the idiomatic `lock().unwrap()` picks the worst option of all.

That's because it neither stops the process nor lets it continue as it will turn
every further lock into a panic with sometimes disastrous effects.  But that
is not the only issue with the system today.  So here I want to share some of
the issues and with some references to real world code of how people got bitten.

## The Error Holds the Lock

One subtle aspect to the poisoning is that the `PoisonError` needs to hold the guard.
That's because in order to ignore the poison flag, you need to fetch the guard
from the error object.  Holding on to the error means holding on to the lock!

That can cause common code that does error wrapping / error conversions into a
deadlock hazard.  The innocent looking `m.lock()?` in a function returning
`Box<dyn Error>` or similar keeps the mutex locked for as long as the error
lives ([#159930](https://github.com/rust-lang/rust/issues/159930)).

This can also happen with if let.  For instance in
[cc-switch](https://github.com/farion1231/cc-switch/commit/43077f5539235f0255642ec9aab558d29f3f1b33)
you can see that they had a test hung because a `if let Ok(..) = lock() { .. }
else { .. }` fallback locked the same mutex again while the unnamed
`PoisonError` from the condition still owned the guard.
[PC-AI](https://github.com/David-Martel/PC-AI/pull/273/changes) had the same bug
in a `match` arm.  Another case can be found in
[ox-embed-server](https://github.com/anatolykoptev/ox-embed-server/issues/152).

## Panic To Outage

Deviously poisoning does not fail fast and done wrong, it fails forever.  The
original panic happens once, on one thread, often somewhere unrelated from future
failures.  Every later `lock().unwrap()` on that lock now however panics as
well, and because so much Rust code survives panics (thread pools, request
handlers, tokio tasks, FFI boundaries), the process stays up and becomes
useless:

* In RLS a failed cargo build panicked with `ENV_LOCK` held [which made any
  subsequent runs impossible](https://github.com/rust-lang/rls/pull/492).
* Mozilla's
  [application-services](https://github.com/mozilla/application-services/issues/4661)
  saw `PoisonError` [rise to rank
  5](https://github.com/mozilla/application-services/issues/4658) in crash
  stats and [moved to
  parking_lot](https://github.com/mozilla/application-services/pull/4663) after
  they concluded they did not benefit of poisoning handling.
* A [Neon safekeeper](https://github.com/neondatabase/neon/issues/2200) on
  staging failed every timeline lookup after a panic with a global lock held,
  and the original panic could not even be found in the logs.

While not live services, test suites show the same general issue.  One failing
test poisons a shared static and every test after it fails with `PoisonError`.
This problem showed up for
[cargo](https://github.com/rust-lang/cargo/pull/12264),
[deno](https://github.com/denoland/deno/pull/6567),
[polars](https://github.com/pola-rs/polars/pull/26627) and
[rustc](https://github.com/rust-lang/rust/issues/43155#issuecomment-315535095)
itself.

## Attempt At Recovery

If you recover with `into_inner()`, the flag stays set and every later access
takes the recovery path again.  And remember that for the first nine years of
Rust after the poisoning feature landed, you could not even clear it as
`clear_poison` arrived only in 1.77.  Not clearing the flag means that potentially
expensive side effects will happen from that point onwards:

[goose-in-a-pond](https://github.com/jarida-io/goose-in-a-pond/commit/8c7e7fed06385d3dfd2958ba86ef0bb119d56688)
rebuilt its decoder state on every transcription after a single panic,
[librefang](https://github.com/librefang/librefang/commit/5edca0bfcf856324a6fc3701bf441d87ec7c9cca)
logged the same warning on every access, and a
[pool](https://github.com/anatolykoptev/ox-embed-server/issues/94) threw its
model away on every return.

## Nobody Relies on It, Not Even std

So who is handling poisonings?  I'm really not sure, definitely not the standard library.
Every place where the standard library's own code ignores it.  Standard I/O has done so since [March
2015](https://github.com/rust-lang/rust/commit/2e8e8ab5648), two months before
1.0, because "any poison must have been the result of user code which the lock
isn't protecting".  A common issue with a lot of poisoning errors that never
had anything to do with the mutex that was held.

Same with the [panic output
capture](https://github.com/rust-lang/rust/commit/72e96604c01), the [backtrace
lock](https://github.com/rust-lang/rust/commit/2d2c9e44939) and the [WASI
environment lock](https://github.com/rust-lang/rust/commit/9530ba0fe21).  They
all do the same and unsurprisingly there is an [open
PR](https://github.com/rust-lang/rust/pull/148689) to move std's internal
mutexes to `nonpoison`.

And I would argue the ecosystem has largely come to the same conclusion.  Tokio's own locks don't poison.
Internally it wraps the std one in an [adapter that removes poison](https://github.com/tokio-rs/tokio/blob/master/tokio/src/loom/std/mutex.rs).  When it landed Carl Lerche remarked "[I rather pretend lock poisoning isn't a
thing](https://github.com/tokio-rs/tokio/pull/2814#discussion_r485760722)."  In
one case Eliza Weisman [needed
`into_inner`](https://github.com/tokio-rs/tokio/pull/2828#discussion_r492350077)
to unlink a waiter during drop, or "we'll leave the list with a potentially
dangling pointer".  I want to point to this in particular because this is a case where poisoning stood in the way of memory safety which is commonly argued as a reason you want poisoning.

Wasmtime, crossbeam-channel, tracing-subscriber always ignores lock poisoning.
rust-analyzer [switched to
parking_lot](https://github.com/rust-lang/rust-analyzer/pull/1359) after
cancellation poisoned its solver like RLS did before.  The parking_lot maintainer
[described it](https://github.com/Amanieu/parking_lot/issues/324#issuecomment-1059616487)
as an anti-feature that hurts usability and reliability to which I strongly
concur.

## Why Only Mutex?

Another aspect here is why this is done on `Mutex` but not on `RefCell`.  Surely
if the case for poisoning is that some code temporarily breaks an invariant, panics, and
someone else observes the broken state, then this should apply to more cases.

Take the usual example that argues in favor of poisoning and replace `Mutex`
with `RefCell`, and you have [exactly the same
problem](https://play.rust-lang.org/?version=stable&mode=debug&edition=2024&gist=549fb7c9c0626a0ebd29bfa3a2e97ad4).
Threads are not needed at all and this is not hypothetical either as tokio
catches every task panic.  Paired with a `LocalSet` the panic comes back as a
`JoinError`, the next `borrow()` succeeds and [reads a null
pointer](https://play.rust-lang.org/?version=stable&mode=debug&edition=2024&gist=925975f7d49c10c0d6821cfeb00e1f60)
exactly like the mutex example from the issue.

Given how much panic catching goes on in async code, much of which is `!Send`
for performance reasons, I'm not even convinced that panics get caught more
often in multi-threaded code yet nobody asks for `RefCell` to poison.

The standard library isn't consistent with itself either as `LazyLock` poisons
for good, `OnceLock` never poisons, `Mutex` poisons but lets you recover.

Also remember that poisoning only tracks panics and a more common early return
has the same issue.  The `?` operator (as well as the `try!` macro before) that
returns early from the middle of a critical section leaves the same broken
invariant behind an unpoisoned lock.

Note also that the coupling of poisoning of mutexes [is
historical](https://github.com/rust-lang/rust/issues/134645#issuecomment-3590942770)
and an explicit `Poison<T>` type would allow you to opt into this for any
interior mutability wrapper.

## What I want

Personally I hope the rust team stabilizes `std::sync::nonpoison`, have
`std::sync::Mutex` [resolve to it by
default](https://github.com/rust-lang/libs-team/issues/169).  If someone wants
poisoning add that separate `Poison<T>` wrapper then anyone who believes they
need and can handle it, can opt into it for any type including `RefCell` or
tokio threads.

What I think would be the worst of all outcomes is the counter-proposal is to
keep poisoning but have `lock()` panic instead of returning a `Result`.  That
would only fix the held guard lock semantics, and to a smaller degree the
ergonomics, but it makes the slow outage the only option.  That is what every
`lock().unwrap()` does today, and the issues above should be plenty of evidence
of this being a problematic behavior in light of the existence of `catch_unwind`.

The post [In defense of lock
poisoning](https://sunshowers.io/posts/on-poisoning/) is the best argument for
the other side and worth reading but I believe the evidence all points the other
way, and most of what Oxide ships aborts on panic anyway which is also a
reasonable behavior.
