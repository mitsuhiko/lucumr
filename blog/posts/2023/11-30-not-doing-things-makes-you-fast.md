---
tags:
  - thoughts
  - javascript
summary: "Ramblings about bundleless JavaScript"
---

# Bundleless: Not Doing Things Makes You Fast

I recently [came across a tweet](https://twitter.com/rauchg/status/1729596031434698774) and one
statement in it really triggered me: the claim that a bundleless dev
server does not work.  The idea here being that you cannot avoid bundling
during development for performance reasons.  This challenges the code
concept and premise of [vite](https://vitejs.dev/)'s design.  Its
dev server primarily operates by serving individual files post-initial
transpiling.

There's some belief that bundleless development isn't feasible, especially
for projects with thousands of modules, due to potential performance
issues.  However, I contend that this thinking overlooks the benefits of
a bundleless approach.

There is obviously some truth to it having issues.  If you have thousands
of modules, that can take a while to load and on contrast if most of those
are bundled up into a single file, that will take less time to load.

I believe this to be the wrong way to think of this issue.  Consider
Python as an illustrative example: Python loads each module as needed from
the file system, without bundling numerous modules into larger files. This
approach has a downside: in large applications, the startup time can
become impractically long due to excessive code execution during import.

The solution isn't to increase bundling but to reduce overall code
execution, particularly at startup.  By optimizing module structure,
minimizing cross-dependencies, and adopting lazy loading, you can
significantly decrease load times and enable hot reloading of components.
Don't forget that in addition to all the bytes you're not loading, you're
also not parsing or executing code.  You become faster by not doing all of
this.

The objective for developers, both end-users and framework creators,
should be to make bundleless development viable and at least in principle
preferred.  This means structuring applications to minimize initial load
requirements, thereby enhancing iteration speeds.  With a focus on doing
less, the elimination of the bundling step becomes an attainable and
beneficial goal.  This is also one of the larger lessons I took from
creating Flask: the many side effects of decorators and imports are a major
frustration for large scale apps.

Then once that has been accomplished, bundleless does away with the last
bit of now not important part: the bundling step which has a lot of other
benefits on its own.

Of course, there are nuances. For instance, rarely changing third-party
libraries with hundreds of internal modules will still benefit from bundling.
Tools like Vite do address this need by optimizing this case.

Therefore, when embarking on a new project or framework, prioritize lazy
loading and effective import management from the outset.  Avoid circular
dependencies and carefully manage code isolation.  This initial effort in
organizing your code will pay dividends as your project expands, making
future development faster and more efficient.

Future you will be happy — and bundleless as evidenced by vite, with the
right project setup works.
