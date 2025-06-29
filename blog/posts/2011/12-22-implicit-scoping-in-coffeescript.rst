tags: [javascript, thoughts]
summary: |
  A longer explanation of why I think that the CoffeeScript scoping is
  problematic and should be changed.

The Problem with Implicit Scoping in CoffeeScript
=================================================

I love JavaScript and more than that I do love CoffeeScript quite a bit.
It's beautiful, it follows largely the Ruby and Python design patterns
that make sense and on top of all that is the code it generates really,
really well done.  However I do have a major problem with it, and that's
unfortunately part of the language design and cannot be fixed unless you
fork off the project.

Closures and Scoping
--------------------

Generally when you want to have a language that supports closures that are
not only readable but also reassignable you need to express the difference
in intention of creating a new variable in the current scope or overriding
the one in the top level scope.

In JavaScript the ``var`` keyword explicitly specifies that you want a new
variable.  If it's missing you reassign a variable of the same name in a
higher scope:

.. sourcecode:: javascript

    function makeCounter() {
      var counter = 0;             /* new variable here */
      return function inc() {
        counter = counter + 1;     /* reassign higher level variable */
        return counter;
      }
    }

In Python (Python 3 to be exact) the logic is inversed.  You need a
keyword to express the intent of reassigning from an outer scope:

.. sourcecode:: python3

    def make_counter():
        counter = 0                 # new variable here
        def inc():
            nonlocal counter
            counter = counter + 1   # reassign higher level variable
            return counter
        return inc

CoffeeScript does a third thing which is “always reassign unless unknown
from higher scope”.  In this case it looks like this:

.. sourcecode:: coffeescript

    makeCounter = ->
      counter = 0                   # new variable here
      return ->
        counter = counter + 1       # reassign higher level variable
        return counter

Why is CoffeeScript's Method Bad?
---------------------------------

Now if you look at the code above the CoffeeScript one is the shortest.
And you could even further simplify it.  However there is a huge problem
with it: it makes maintenance of large code much harder than it has to be
and because the problem can be entirely silent you won't notice until it's
too late.

I had the problem for the first time where I was introducing a helper
function in the same file that was named like a local helper variable.

The original code looked like this:

.. sourcecode:: coffeescript

    shaderFromSource = (ctx, type, source, filename) ->
      shader = ctx.createShader ctx[type]
      source = '#define ' + type + '\n' + source
      ctx.shaderSource shader, source
      ctx.compileShader shader
      if ctx.getShaderParameter shader, ctx.COMPILE_STATUS
        return shader
      log = ctx.getShaderInfoLog shader
      console.error describeShaderLog log, filename

Later I added this line on the top of the file:

.. sourcecode:: coffeescript

   {log, sin, cos, tan} = Math

The purpose of that line is to “import” a bunch of functions from the
``Math`` “namespace”.  The end result is that in that file you can then
use ``tan(x)`` instead of ``Math.tan(x)``.  However adding that line now
lets ``shaderFromSource`` fail.  Why?  Because it assigns to a variable
named ``log`` which previously was local and just became global.

And the function will continue to work.  I was able to use the code for a
while until I spotted that.  I did spot it late because of two reasons.
One was that the ``log`` statement only ocurred if a shader failed loading
and I had no shader errors for a while, secondly even after the function
finished execution the code still worked up to the point where I called
into the matrix calculation function again that needed the math imports.

At that point you get ``log`` is not a function and you wonder what
happened.  Considering there are 400 lines of code in that module it took
me a bit to figure out what happened.  Coupled with the race condition
that it was this totally annoyed me.

Adding an import or writing a new function / global variable should never,
ever affect local code in a function!

The Simple Solution
-------------------

The simple solution is to either add a ``nonlocal`` keyword like Python
has or to introduce a ``:=`` parameter that works like ``=`` but
explicitly overrides a higher level variable:

.. sourcecode:: coffeescript

    makeCounter = ->
      counter = 0                   # new variable here
      return ->
        counter := counter + 1       # reassign higher level variable
        return counter

This could even be implicit for ``+=`` and other compound parameters since
those will already assume that something from a higher scoped is assigned.

Inconsistencies
---------------

Jeremy Ashkenas (who is the developer behind CoffeeScript) told me on
Twitter the following after proposing to fix this:

    @mitsuhiko Not gonna happen ;) Forbidding shadowing altogether is a
    huge win, and a huge conceptual simplification.

Now here is the next problem.  CoffeeScript does not even forbid
shadowing.  For instance function parameters shadow as show in this code
(which works):

.. sourcecode:: coffeescript

    updateVBO: (x, y, z) ->
      chunk = this.getChunk x, y, z
      maker = new webglmc.CubeMaker 10
  
      addPlane = (side, block) ->
        maker.addSide side, getBlockTexture(block)
  
      isAir = (cx, cy, cz) =>
        if (cx >= 0 && cx < CHUNK_SIZE &&
            cx >= 0 && cx < CHUNK_SIZE &&
            cx >= 0 && cx < CHUNK_SIZE)
          return chunk[cx + cy * CHUNK_SIZE + cz * CHUNK_SIZE * CHUNK_SIZE]
        return this.getBlock x * CHUNK_SIZE + cx,
                             y * CHUNK_SIZE + cy,
                             z * CHUNK_SIZE + cz
  
      for cz in [0...CHUNK_SIZE]
        for cy in [0...CHUNK_SIZE]
          for cx in [0...CHUNK_SIZE]
            block = chunk[cx + cy * CHUNK_SIZE + cz * CHUNK_SIZE * CHUNK_SIZE]
            continue if block == 0
            if isAir cx - 1, cy, cz then addPlane('left', block)
            if isAir cx + 1, cy, cz then addPlane('right', block)
            if isAir cx, cy - 1, cz then addPlane('bottom', block)
            if isAir cx, cy + 1, cz then addPlane('top', block)
            if isAir cx, cy, cz - 1 then addPlane('far', block)
            if isAir cx, cy, cz + 1 then addPlane('near', block)

The local ``isAir`` helper function uses the same parameters as the loop
below.  Since it's a function parameter and CoffeeScript does not touch
them they are automatically shadowing the loop and the code works.
Exactly as expected and wanted.

Shadowing is Good for You
-------------------------

Shadowing is good for you, seriously.  With proper explicit scoping you
only have to look on the code of the screen to see what it affects.  From
the assignment you automatically know if it will be changing something
from a higher scope or not.

CoffeeScript obviously gets a lot of inspiration from Ruby which suffers
from the same problem, but with a much smaller impact.  In Ruby scoping
ends at the next method.  Global variables are prefixed with ``$`` and
classes and modules use a separate lookup which is determined by starting
with a capital letter which is enforced.

As it stands right now, I consider the CoffeeScript scoping rules the
worst of all possible scoping rules and it makes me feel uncomfortable
using the language, now that I was bitten already.

Considering we won't see this changed since the author has already closed
the issue and expressed his satisfaction with the current rules this
article should at least serve as a reminder for errors not to repeat with
the next language someone designs.
