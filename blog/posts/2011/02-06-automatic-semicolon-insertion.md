---
tags:
  - javascript
summary: |
  Why automatic semicolon insertion in JavaScript was a bad idea and why
  you should be using explicit semicolons, even if you cannot disable that
  “feature”.
---

# Dealing with JavaScript's Automatic Semicolon Insertion

If you look at the grammar of ECMAScript (or JavaScript for that matter)
you will quickly notice that it requires semicolons as marker for the end
of certain statements.  However if you look a little further you will
find this little gem:

> Certain ECMAScript statements (empty statement, variable statement,
expression statement, `do`-`while` statement, `continue` statement,
`break` statement, `return` statement, and `throw` statement) must be
terminated with semicolons. Such semicolons may always appear
explicitly in the source text. For convenience, however, such
semicolons may be omitted from the source text in certain situations.
These situations are described by saying that semicolons are
automatically inserted into the source code token stream in those
situations.
>

So how are these semicolons inserted for you?  By following these rules
(paraphrased and simplified from ECMA-262 3rd edition, 7.9.1):

- When, as the program is parsed, a token (called the offending token)
is encountered that is not allowed by any production of the grammar,
then a semicolon is automatically inserted before the offending token
if one or more of the following conditions is true:

  1. The offending token is separated from the previous token by
at least one `LineTerminator`.

  1. The offending token is `}`.

- When the end of the input stream of tokens is encountered and the
parser is unable to parse the input token stream as a single complete
program, then a semicolon is automatically inserted at the end of
the input stream.

- A token is a restricted token when it is allowed by some production
of the grammar, but the production is a *restricted production* and
the token would be the first token for a terminal or nonterminal
immediately following the annotation “[no `LineTerminator` here]”
within the production.

If furthermore the restricted token is separated from the previous
token by at least one `LineTerminator`, then a semicolon is
automatically inserted before the restricted token.

There is an additional overriding condition on the above rules: a
semicolon is never inserted automatically if the semicolon would then be
parsed as an empty statement or that semicolon would become one of the two
semicolons in the header of a `for` statement.

What is a restricted production?  The following syntax rules:

```
PostfixExpression ::=
    LeftHandSideExpression [no LineTerminator here] "++"
    LeftHandSideExpression [no LineTerminator here] "--"
ContinueStatement ::=   "continue"  [no LineTerminator here]  Identifieropt ;
BreakStatement ::=      "break"     [no LineTerminator here]  Identifieropt ;
ReturnStatement ::=     "return"    [no LineTerminator here]  Expressionopt ;
ThrowStatement ::=      "throw"     [no LineTerminator here]  Expression ;
```

Alright. But what does this actually mean?

## Virtual Semicolons in Action

The specification also lists a few examples of how semicolons are inserted
into code where semicolons are missing (7.9.2):

```javascript
/* this */
return
a + b

    /* becomes this: */
    return;
    a + b;

/* this */
a = b
++c

    /* becomes this */
    a = b;
    ++c;

/* this */
a = b + c
(d + e).print()

    /* becomes this */
    a = b + c(d + e).print();
```

Except for the return example this seems straight forward and if you are
avoiding linebreaks after the return statement you should be fine.  The
last example stays a function call because the assignment by itself is a
valid sentence.  If however one would add a plus after `c`, the expression
in parentheses would not be the argument for a function call [^1].

Furthermore because automatic semicolon insertion is there and you can't
get rid of it, no harm in not setting semicolons.  Right?  After all,
worst case: you forgot one and JavaScript inserts one for you.  That
however is actually not entirely true unfortunately as there are a few
cases where things can break.  So the rest of this blog article only
covers the cases where adding semicolons would have avoided a problem.  I
am not talking about cases where changes in whitespace would be the
solution to a problem (like removing a newline after the `return`
keyword which is a well known solution to the most common automatic
semicolon insertion problem).

## Array Literals versus Property Operators

Like Python, JavaScript has array literals (`[1, 2, 3, 4]`) and uses a
very similar syntax to access items of objects and arrays
(`foo[index]`).  Unfortunately that particular little pseudo-ambiguity
becomes a problem when you forget to place semicolons.  Take the following
piece of JavaScript code as example:

```javascript
var name = "World"
["Hello", "Goodbye"].forEach(function(value) {
  document.write(value + " " + name + "<br>")
})
```

That is not a syntax error, but it will fail with an odd error.  Why is
that?  The problem is that JavaScript will insert semicolons after the
`document.write()` call and after the `.forEach()` call, but not
before the array literal.  In fact, it will attempt to use the array
literal as indexer operator to the string from the line before.  We can
easily verify that by rewriting the code a bit:

```javascript
var name = {"Goodbye": [1, 2, 3]}
["Hello", "Goodbye"].forEach(function(value) {
  document.write(value + " " + name + "<br>")
})
```

This will print the following output:

```
1 undefined
2 undefined
3 undefined
```

If you add a semicolon after the assignment to `name` it would print this
instead:

```
Hello [object Object]
Goodbye [object Object]
```

If you are ever in that situation where you use `.forEach` or something
similar on an array literal in a new line you will need a semicolon in the
line before.  If you are all about consistency, that's a situation where
you will have to use a semicolon to use your code.  Normally programming
languages would allow you to put things into parentheses to avoid such
ambiguities, but not so in JavaScript, because the same problem exists
with parentheses.

## Function Calls versus Grouping

Same problem exists with function calls and parentheses for expression
grouping unfortunately.  That's especially fun when you are concatenating
JavaScript files and forget to add semicolons in between.  Imagine you
have a JavaScript file `counter.js` with this content:

```javascript
namespace.makeCounter = function() {
  var counter = 0
  return function() {
    return counter++
  }
}
```

And then you have a file called `complex.js` which declares some complex
library inside a closure:

```javascript
(function() {
  namespace.exportedObject = function() {
    ...
  }
})()
```

So what happens when you concatenate the files with just a newline is that
the following will happen: `namespace.makeCounter` is called with the
anonymous function from `complex.js` in parentheses and the return value
(which happens to be another function) will then be called without
arguments.

After that `namespace.exportedObject` will not be assigned at all and
`namespace.makeCounter` will be `0` instead of a function.  Again, this
problem would not be a problem if one would have used a semicolon after
the function expression in `counter.js`.

That's also especially annoying when adding parentheses around an
expression at the begin of a line.  That might cause the line above to
suddenly become a function call:

```javascript
/* this works */
var foo = 1 + 2
something.method(foo) + 42

/* this does not work, will try to call 2(...) */
var foo = 1 + 2
(something.method(foo) + 42).print()
```

## Consistency and Simplicity

If we ignore for a moment that the ambiguity between the division operator
and the regular expression literal in JavaScript is a little bit tricky,
JavaScript as a language is easy to parse.  It has a grammar which you can
drop into your favorite parsing tool and it should be able to generate
yourself a parser.  However with the extra rule of these weird semicolons
it becomes a lot harder to implement.

The logical conclusion here is that people will get it wrong.  For
instance JavaScript says that if there is a newline in the multiline
comment (`/* ... */`) it counts as a `LineTerminator`.  At least one
JavaScript engine is ignoring that.  Also JavaScript engines are actively
breaking ECMA compatibility to cover some real world cases and are
introducing virtual semicolons in places where they should not be allowed
([Mozilla Bug #238945](https://bugzilla.mozilla.org/show_bug.cgi?id=238945)).

Why would this be relevant?  Because there are a lot of tools that are
operating on JavaScript source:

- First and foremost there are different browsers implementing
JavaScript.  Because automatic semicolon insertion has shown to be
handled differently in browsers it wouldn't be too unlikely that you
will encounter some differences there.  Though I would argue that the
chances that current browsers differ in interpretation will be low.

However there are certainly ECMAScript implementations out there that
are less in sync with how browsers are interpreting it (Flash, various
scripting languages like Unity Script, .NET's ECMA script
implementation and many more.)

- Documentation tools will have to parse your JavaScript to figure out
where comments and function signatures are.  While for most of these
tools some fuzziness is okay and semicolons shouldn't be much of a
problem some edge cases might throw the parser into a state where it
cannot continue parsing.  For instance because it expects an
expression between a property operator (`foo[(expression here)]`)
when the programmer was writing an array literal.

- Many i18n libraries are parsing JavaScript code to find strings marked
as translatable.  The “parser” I wrote for  [Babel](http://babel.edgewall.org/) for instance is basically just trying
to infer all that from the tokens instead of properly parsing the
code.  This does give some wrong matches from time to time but I was
too lazy to write a proper JavaScript parser from scratch for that.

- Compression libraries have to parse JavaScript to figure out what is
a local identifier, what is a global one etc.  [Packer](http://dean.edwards.name/packer/) for instance destroys code that
does not have semicolons after function expressions:

```javascript
var x = function() {
  /* blafasel */
}
var y = function() {
  /* blafasel */
}
```

Will be compressed into invalid JavaScript:

```javascript
var x=function(){}var y=function(){}
```

[Are Semicolons Necessary in Javascript?](http://aresemicolonsnecessaryinjavascript.com/)  Despite popular
belief the answer is “sometimes” and not “no”.  But to save yourself time
and troubles, just place them all the time.  Not only will it save
yourself some headaches, your code will also look more consistent.
Because there will be situations where a semicolon becomes necessary to
resolve ambiguities.

[^1]: This example was incorrect earlier.  I since fixed it and
updated the section about function calls to also cover the mistake I
made.  This was pointed out via mail and Twitter by [Chris Leary](http://twitter.com/cdleary).  Another reason to explicitly set
semicolons :-)
