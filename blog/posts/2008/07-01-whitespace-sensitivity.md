---
tags: ['python', 'ruby']
summary: "Why ruby is more whitespace sensitive than Python."
---

# Whitespace Sensitivity

I was reading a thread on ruby-forum.com about Python that said that the
whitespace-sensitivity of Python is from hell or something. There are
people from every programming language that can rant about Whitespace
sensitivity in Python but clearly not Ruby programmers. Why? Because
Python doesn't care about Whitespace at all. The only thing that
somewhat has to do with whitespace is the indentation that the lexer
convers into indent and outdent tokens. But after that, no whitespace
any more, the parser doesn't know anything about that.

That however is not true for Ruby! `foo[42]` does a completely different
thing than `foo [42]`. The first calls foo without argument and calls
the `[]` method of the return value with 42 as argument, the latter
calls foo with `[42]` as Argument which happens to be an Array with one
element. But there are more examples.

Take this example:

```ruby
foo = 23
def bar
  42
end

puts bar/foo
```

That prints “1”. That prints “1”.However take this minor modification:

```ruby
foo = 23
def bar
  42
end

puts bar /foo
```

Now this gives you an error that the regular Expression literal is
unterminated. That's what I call whitespace sensitivity :)

You're wonderhing why I'm using a method for “bar” and not a locale
variable? Because the parser keeps track of all assigned local variables
or methods (Not sure what exactly it does) and the syntax ambiguities
are resolved that way.
