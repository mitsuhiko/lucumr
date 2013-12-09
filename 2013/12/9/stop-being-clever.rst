public: yes
tags: [thoughts, javascript]
summary: |
  An experience report of using JavaScript with angular for a few days and
  my thoughts on what's wrong with JavaScript libraries.

Stop Being Cute and Clever
==========================

The last few days I spend a bit of my spare time on making a `world time
scheduler <http://timesched.pocoo.org/>`_.  Some of you might recognize
the concept from another website.  The idea was quite simple: build a
clone of worldtime buddy and explore working with third party AngularJS
directives and a few JavaScript libraries and try to reuse as much as
possible.

It was not a fun experience.  I have not raged so much about working with
something in a really long time and that says something, because I'm quite
quick at voicing my unhappiness (I'm so sorry for my Twitter followers).

I'm using JavaScript quite regularly on my own, but I very rarely need to
deal with other people's code.  Normally I pretty much stick to jQuery,
underscore and maybe AngularJS and I stay focused on the browser or
command line utilities.  This time around though I went all-in and used
various libraries.

For this project I obviously used jQuery which is impossible to avoid (and
why would you) but also AngularJS with a bunch of UI components
(angular-ui and some bindings to jQuery UI).  For timezone handling I used
moment.js with moment-timezone.

Let me preface this in that I really don't want to critizise anyone's
individual code here.  More than that, if someone would look at my own
JavaScript code it would not be any better.  If anything it's worse,
because I did not spend much time on it and I'm not very experienced with
JavaScript.

However I do see a worrying trend of absolutely appalling code quality
in JavaScript libraries (at least the selection of the ones I was using)
and I started to do some thinking in why that is.

There are so many problems I have with JavaScript libraries and all of
them are pretty much a result of how the language works and that nobody
seems to care.  Not that you could not write better code, but it seems
like everybody gravitates towards falling into the same traps.

The reason I started actively looking into other people's JavaScript code
was that my naive approach of sending 3MB of city names into the
typeahead.js autocomplete library resulted in a really sluggish UI.  Now
obviously a clever person would not send that much into an autocomplete
field.  A better plan would be to filter the data on the server first, but
it turns out that not the loading was slow, but the filtering of the data.
That made no sense to me, because even if the system did a linear search
through 26.000 cities it should not have been this slow.

Backstory
---------

So the UI was slow — obviously it should be my fault of sending so many
records in.  Interestingly though my performance degraded upon usage of
the typeahead widget.  In very peculiar ways even.  To give you an idea of
how crazy it, this was my reproduction case which I started out with:

1.  Search for San Francisco by typing "san".  Takes ~200ms.
2.  Search for San Francisco by typing "fran".  Takes ~200ms.
3.  Search for San Francisco by typing "san fran".  Takes a second.
4.  Search for San Francisco by typing "san" again.  Takes a second.

What's going on there?  How does the search corrupt by finding more than
one item once?

The first thing I did was using Firefox'es new profiler to see where all
the time is wasted.  Quite quickly I found a whole bunch of stuff in
typeahead that was just overly weird.

The slowness was relatively quickly found: an epic `misuse of data
structures
<https://github.com/twitter/typeahead.js/blob/6e641d30d9e1b75b017e9ed1127b7a882f004488/src/dataset.js#L177>`_
and a weird algorithm.  The whole way of how the library finds matches is
pretty bizarre and includes such amazing things as going over a list of
strings and then checking for each of those strings if it's contained
within any of the other lists including the original list itself.  When
that first list has 6000 items and for each of those you do a linear
search if it's indeed in the list this can indeed get pretty slow.

But mistakes happen and especially if you only test with small data sets
you will not notice that.  Me sending thousands of cities and timezones
into the little thing was too much.  Also not everybody writes search
functions every day, so I don't blame anyone for that.

But because I had to debug this thing I found some of the most bizarre
code I had the pleasure to read.  Upon further investigation, it seems to
be hardly a thing unique to typeahead.

Based on that I'm now pretty convinced now that JavaScript is the Wild
West of software development.  Primarily because it rivals 2003 PHP code
in terms of code quality, but it seems fewer people care because it
runs on the client instead of server.  You don't have to pay for your
slowly running JavaScript code.

“Clever” Code
-------------

The first pain point is people being cute and clever with JavaScript.  And
that makes me reviewing code and hunting for bugs ridiculously paranoid.
Even if you know the idioms applied you will still not be sure if they
side effects are intentional or if someone made a mistake.

To give you an example of such a weird idom, I want to show you some code
from typeahead.js as it exists in the library, just reindented to make it
look nicer:

.. sourcecode:: javascript

    _transformDatum: function(datum) {
        var value = utils.isString(datum) ? datum : datum[this.valueKey],
            tokens = datum.tokens || utils.tokenizeText(value), item = {
            value: value,
            tokens: tokens
        };
        if (utils.isString(datum)) {
            item.datum = {};
            item.datum[this.valueKey] = datum;
        } else {
            item.datum = datum;
        }
        item.tokens = utils.filter(item.tokens, function(token) {
            return !utils.isBlankString(token);
        });
        item.tokens = utils.map(item.tokens, function(token) {
            return token.toLowerCase();
        });
        return item;
    },

This is just one function, but it's one that stuck with me for a wide
range of reasons.  What the function does is converting a datum object
into an item.  What's a datum?  Where here it starts.  It seems like the
library author at one point re-decided his approach.  It must have started
out with accepting a string and then wrapping it in an object that has a
value attribute (which is the string) and a token array which are the
individual tokens.  Then however it got messy and now the return value of
that function is a wrapper around a datum object (or string) that has a
slightly different interface.  It copies a bunch of the input data over,
but then it just renames some attributes.  Assuming the input value is an
object and not a string in this form:

.. sourcecode:: json

    {
        "value": "San Francisco",
        "tokens": ["san", "francisco"],
        "extra": {}
    }

Then a transformation to this happens:

.. sourcecode:: json

    {
        "value": "San Francisco",
        "tokens": ["san", "francisco"],
        "datum": {
            "value": "San Francisco",
            "tokens": ["san", "francisco"],
            "extra": {}
        }
    }

I can totally see why the code ends up doing what it does, but from
looking at a completely different piece of code first it became very
confusing as of why my datum object became a slightly different datum
object containing basically the same information.  Worse: it uses double
the memory because through the array operations it makes copies of the
tokens.  Looking around a bit it turns out that I could just send the
correctly formatted datum objects in and cut down memory consumption by
10MB.

The reason though why I want to point out that code, is that it's quite
idiomatic JavaScript code and that's frustrating.  It's fuzzy and it's
weird, lacks type information and is too clever.

It just sends objects around.  You can't ask the datum: are you a datum.
It's just an object.  Given how similar the input data looked I expected
the return value to be the same object, but it was not.  Looking more into
the implementation though it turned out that you could send a whole bunch
of different types in — and it would still have worked, just done
something else entirely and blown up much, much later.  It's impressive
how much bad input data you can send in and JavaScript will still somehow
come up with results.

But not only does it lack type information, that code also tries to be
really clever with using a mix of operator abuse and functional
programming.  I can't tell you how paranoid I am about this style of
JavaScript nowadays given how weird the map functions works.  Not many
languages manages to implement map in a way that ``["1", "2",
"3"].map(parseInt)`` would result in ``[1, NaN, NaN]``.

Reasoning about JavaScript code is hard.

This however is not the extend of it.  The abuse of language and operators
is widespread.  A bit further down this amazing piece of code can be
found:

.. sourcecode:: javascript

    _processData: function(data) {
        var that = this, itemHash = {}, adjacencyList = {};
        utils.each(data, function(i, datum) {
            var item = that._transformDatum(datum), id = utils.getUniqueId(item.value);
            itemHash[id] = item;
            utils.each(item.tokens, function(i, token) {
                var character = token.charAt(0), adjacency =
                    adjacencyList[character] || (adjacencyList[character] = [ id ]);
                !~utils.indexOf(adjacency, id) && adjacency.push(id);
            });
        });
        return {
            itemHash: itemHash,
            adjacencyList: adjacencyList
        };
    },

To fill in the reader: ``utils.indexOf`` is a linear search in an array
and ``utils.getUniqueId`` returns an ever increasing integer as an actual
integer.

Obviously the writer of this code knew about hash tables having an
``O(1)`` complexity, otherwise why would that person put that string into
the hashmap.  Yet a few lines of code later it does a linear search first
before placing the item in the list.  When throwing 100.000 tokens at this
code, it gets really slow, trust me.

Also I would like to point out this loop:

.. sourcecode:: javascript

    utils.each(item.tokens, function(i, token) {
        var character = token.charAt(0), adjacency =
            adjacencyList[character] || (adjacencyList[character] = [ id ]);
        !~utils.indexOf(adjacency, id) && adjacency.push(id);
    });

I'm pretty sure the author was very proud.  For a start why is it written
like this?  Is ``!~utils.indexOf(...) &&`` really a good replacement over
``if (utils.indexOf(...) >= 0)``?  Let alone the fact that the hashmap
with the adjacency lists is called `adjacencyList` ... Or that the list is
initialized with the ID of the string and then immediately a linear search
is performed over that list to find the item again.  Or that the entry in
the hashmap is created by checking for the boolean-ness of the list and
then using the or operator to invoke an assignment expression to place a
list in the hashmap.

Another common hack I see is to use the unary plus operator (which in any
other programming language is the most pointless operator ever since it's
a noop) to convert a string into an integer.  ``+value`` is pretty much
the same as ``parseInt(value, 10)``.  This is a ridiculous pattern and I wish
it would not exist.

So I have this theory that this whole crazy business with operators is
coming from Ruby.  But in Ruby it made sense as there were only two
objects that are false: `false` and `nil`.  Everything else is true.
Ruby's whole language is based on that concept too.  In JavaScript many
objects are false and then sometimes not.

For instance the empty string ``""`` is false.  Except when it's an
object then it's true.  Strings get promoted to objects by accident
sometimes.  For instance jQuery's ``each`` function passes the current
value of the iterator as `this`.  But because this cannot point to
primitives like numbers and strings, the object needs to get promoted to a
boxed string object.  All the sudden it behaves different in some
situations:

.. sourcecode:: javascript

    > !'';
    true
    > !new String('');
    false
    > '' == new String('');
    true

Being cute with operators makes sense in ruby, but it makes no sense at
all in JavaScript.  It's dangerous.  Not because I don't trust the
developer to test his code and know what he's doing, but because later on
someone else will have to look at the code and he will no longer know if
the behavior was intentional or not.

To use the ``~`` operator to check the return value of an `indexOf`
function that returns ``-1`` for a missing match is just crazy business.
And please don't come with the argument that it's faster.


We're Doing it Live!
--------------------

Questionable use of operators and fuzzy typing is one thing, but the real
killer is that people take the dynamic nature of JavaScript to the max.
For me Python is already too much of a dynamic language, but at least
Pythonistas are pretty reasonable with keeping runtime modification of
classes and namespaces to a minimum.  But no, not so in JavaScript, and
especially not in the angular world.

Classes do not exist, in JavaScript you're doing objects and sometimes
they might have prototypes.  More often than not it's a big frack you to
prototypes though and everybody just puts functions on objects.  Sometimes
also functions to functions for good measure.  Weird object cloning is
then par of the course except when it's not and state is just mutated left
and right.  The singleton is god.

You find an angular directive that's pretty good but does one thing
differently than you wanted?  There is a damn good chance it's monolithic
though and the only way to modify is, is to attach a second directive at a
higher priority that patches around in the scope of the other.  I wouldn't
even be unhappy if subclassing was a thing of the past, and composition
was the way forward, but this monkeypatching business is just not my
style.

The dynamic nature of everything makes code evolve very, very quickly into
some unmanageable mess where nobody quite knows any more what something
does any more.

It's not just the lack of classes and types though.  The whole environment
feels so much like a thing that is held together by duct tape on top of
some layer of grease and paste.

Angular for instance uses this system of watching models and DOM for
changes to automatically synchronize them.  Except it's so damn slow at
it, that people write weird workarounds to attempt to stop handlers from
firing.  This fuzzy logic quickly gets ridiculously confusing.


What is Immutability
--------------------

The higher level a programming language goes, the more immutable things
get.  At least that was my feeling so far.  Not so in JavaScript.  APIs
are littered with stateful concepts.  Maybe it's misplaced performance
thing but it gets annoying quickly.  Some of the most annoying bugs I had
to deal with in my scheduler app was the mutable nature of moment (date)
objects.  Instead of ``foo.add('minutes', 1)`` returning a new object, it
modifies `foo` in place.  It's not that I did not know about that, the API
is quite clear about it.  But unfortunately some code accidentally passed
a reference out and it got modified.

Admittedly JavaScript should in theory be amazing for building APIs that
use immutable objects considering you can freeze objects at will.  This is
something that Python unfortunately lacks.  However at the same time
Python has many more tools for making immutable objects interesting.  For
instance it supports operator overloading and has first class support for
using immutable objects as hash keys.  JavaScript has neither.


“Useful Magic”
--------------

I love angular, very much so.  It's one of the sanest systems out there
for UI design in JavaScript but the magic in it frightens me.  It starts
with the simple things where the library renames directives.  If you make
a directive called `fooBar` you will use it as `foo-bar` in the DOM.  Why?
I suppose consistency with the ``style`` DOM API which did something
similar in the past.  This makes looking for code really confusing because
you might not quite know how the directive is exactly called.  It also
completely abolishes the idea of namespaces.  If you have two directives
with the same name in two different angular applications they will clash.

It does make the code more concise but also super confusing.  It also
subverts the rules of the language in parts.  Dependency injection in
angular happens by default through converting the JavaScript function back
into a string (which yields the code) and then to use a regular expression
to parse the function arguments.  If you come new to Angular that makes no
sense at all and even now I find the whole idea of doing it like this just
inherently wrong.  For a start, it subverts what JavaScript people have
been doing for quite a while and that is treating local variables as
basically anonymous.  The name does not matter.  This is something that
minimizers have been taking advantage for ages.  Obviously that does not
fare well with Angular so it provides an alternative to explicitly declare
dependencies.


What are Layers?
----------------

One of the biggest oddities coming from a Python environment to client
side JavaScript is the apparent entire lack of abstractions.  As an
example for this Angular provides a way to access the current URL's query
parameters as dictionary.  What however it does not provide is a way to
parse arbitrary query strings.  Why?  Because the internal parsing
function is hidden away behind layers of closures and someone did not
think that would be useful.

And it's not just Angular, it's everywhere.  JavaScript for instance lacks
a function to properly escape HTML.  But the DOM internally obviously
needs to do this in places.  So here is what I see people seriously
suggesting as HTML escape function:

.. sourcecode:: javascript

    function escapeHTML(string) {
        var el = document.createElement('span');
        el.appendChild(document.createTextNode(string));
        return el.innerHTML;
    }

And it's not just parsing HTML that people do this way.  Obverse how to
use the DOM for link parsing:

.. sourcecode:: javascript

    function getQueryString(url) {
        var el = document.createElement('a');
        el.href = url;
        return el.search;
    }

I find this insane, but it's absolutely everywhere.

In some ways I can understand that developers don't necessarily want to
expose low-level functions but the end result is that users hack around in
weird ways or duplicate the function for their own use.  It's not uncommon
to have half a dozen implementations of the same functionality in a larger
JavaScript application.


“But it runs”
-------------

PHP got big because it just worked and it took no time to get started.  A
whole generation of developers started working with it and together that
group of developers rediscovered years of prior experience in very painful
ways.  There was a group mentality where one person copied the next
person's code and did not think much about how it works.  I remember
how plugin systems were just crazy talk and the common way for
extensibility for PHP applications where `mod files
<https://www.phpbb.com/kb/article/how-to-install-mods/>`_.  Some misguided
fool started that way and all the sudden everybody did it.  I'm pretty
sure that's exactly how we ended up with register globals everywhere,
weird manual SQL escaping (if there was escaping at all), the whole
concept of sanitizing input instead of proper escaping etc.

JavaScript is largely the same.  While it's a different generation of
developers and different problems, the whole mentality of copying together
concepts found in one library into the next feels similar.  Worse: because
it's running in a sandbox and on people's computers nobody seems to give a
thought about security at all.  With the complete absence of escaping
functions, HTML is concatenated with input strings left and right.

And unlike PHP performance does not matter because client side JavaScript
“scales linearly with the number of users” running the application.

Angular is not inherently slow, but it's just so easy to make slow Angular
directives and there are too many out there (and it's too easy to make your
own slow ones).  Since you don't pay for the CPU time it is not even a
consideration.


The Future?
-----------

I'm not super pessimistic about JavaScript.  It's definitely improving but
I think it will go through the same phase of emancipation as PHP where
people from other languages and environments are forced to work with it
and slowly introduce sanity into the community.  There will be a time
after which the monkey patching of prototypes will stop, where stronger
type systems will be introduced, people will start thinking about
concurrency, where there will be a backlash over crazy meta programming
and more.

Over the last few years you could see similar things happening in the
Python community.  A few years ago meta classes were the hot new thing and
now that people write bigger and bigger applications some sanity returned.
When Django came out the developers had to defend the use of functions
instead of classes.  Now nobody talks much about that any more.

I just hope it will take the JavaScript community less time to adjust than
others before them.
