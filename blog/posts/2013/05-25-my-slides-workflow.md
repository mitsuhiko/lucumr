---
tags:
  - talks
summary: |
---

# My Slides Workflow

I was asked multiple times in the past in regards to how I do my slide
design, how my workflow looks like and what applications and tools I use
to get them done.  I'm very glad to hear that people seem to like my
slides and I'm more than happy to share how I do that stuff.

I think the most disappointing answer is probably: trial and error, a lot
of time and practice.  There is no silver bullet in this blog post that
which will instantly create a nice slide.  The reason for this is that I
generally do things by hand and stay away from templates.

## The Workflow

I think my workflow of doing slides is a bit strange but it seems to work
for me.  At first I think about what the presentation is going to be about
and roughly how to structure it.  I usually write that stuff down in a
text file or moleskine and do some revisions on it.

After that I think what kind of visual identity can go with the slides and
if they should be structured as bullet points or more abstract.  When I
have decided on something I pick colors and fonts.

Once I am done with that I spend quite some time making the slides with
Keynote and putting things into place.  For some presentations I use
Inkscape to make some vector art that goes with it.

Lastly (and in fact after I have done my slides) I will roughly go through
the timing of the slides.  Due to how I do my presentations these timings
are never accurate so I don't waste too much time on it.  Times will be
off when presenting anyways.  Primarily because what I say to the slides
might be different depending on how people in the audience seem to
respond.

## Colors

This is the part where I waste most of the time.  I have yet to find
something that makes my life easier there but in many ways finding colors
is try and error for me.  For many presentations I just surrendered at one
point and picked black/white + one or two colors.  When I do presentations
with strong background colors however this might take me multiple hours to
feel happy with the end result.

I generally use [Colourlovers](http://www.colourlovers.com/palettes) for
a basic inspiration for colors that work together.  The initial color I
generally pick from the topic of the presentation.  For instance for my
MongoDB presentation I decided on an earthy brown due to the official
MongoDB art guidelines.  But my color choices sometimes just don't seem to
make much sense for anyone but myself.  For instance for my “Happiness
Through Ignorance” presentation I had two things to guide me.  One was the
location of where I gave the presentation (Japan), the other one was the
general topic of the presentation which was discussing the idea of
“ignorance is bliss”.  Both of these things made me go with pink as color
due to the association of pink and light blue with young children and a
blossoming cherry tree which I then also used as abstract art on the
slides.

Nobody really cares about that stuff but it helps me personally with
achieving some sort of consistent appearance.  The only reason my slides
look like something is because I have an external guideline to go by.
I am not an artist and I don't have the time to create something new,
instead I get inspired by my surroundings.

## Fonts

Once I have the colors I try to find fonts that go with it.  Unlike
colors, fonts are usually not free.  Because my only use for fonts are
presentations I typically try to stay within the choices provided by
[Google Webfonts](http://www.google.com/webfonts) and
[Font Squirrel](http://www.fontsquirrel.com/).

Before I pick fonts I go through my notes and decide on how many I want
and of which category.  At the bare minimum I pick one for headlines and
one for text.  If there is code on the slides I also pick a monospace
font.  If there are random notes on there I also decide on if I want a
separate font for that.  Sometimes I do slides which have chapter
markings, then I pick one for that as well.

If there is code on the slides I also pick a monospace font.  If there are
random notes on there I also decide on if I want a separate font for that.
Sometimes I do slides which have chapter markings, then I pick one for
that as well.

In some rare cases I go crazy with fonts and build chapter slides with
different fonts.  In those cases it's hard to give a general
recommendation.  I usually pick those fonts by the text that goes with
them.

First question I ask myself for the fonts is the obvious sans-serif vs
serif choice.  Fonts for headlines are easy because even if they don't
look that nice out of the box, there is a bit of flexibility you get by
changing the tracking or capitalization.  On body text you don't have that
much choice really because of how the text is laid out.  Sometimes it
happens you find a nice font on Google Webfonts but once you set text in
it, it shows kerning problems or just otherwise does not look good.

This can be quite a frustrating experience unfortunately.  Depending on
how you value your time it might be a better idea to just get Linotype
FontExplorer X which from what I gathered, lets you preview fonts
directly in the app and then purchase them.  Personally I am quite happy
with the selection of good free fonts.  Since I value Open Source a lot I
like sticking to that.

Some fonts I used on recent presentations:

- [Dosis](http://www.google.com/fonts/specimen/Dosis) as a general
sans-serif headline and body font.  Comes in different weights from
very light to very heavy.

- [Monofur](http://www.dafont.com/monofur.font) as a monospace font.
It's very light but also only comes in one weight.

- [Nanum Pen Script](http://www.whatfontis.com/Nanum-Pen-Script-OTF.font) as a font for
notes.  It looks like nice but messy handwriting.

- [Overlook](http://www.fontsquirrel.com/fonts/overlock) as a sans
serif font for headlines.

## Applications

So which applications do I use?  This mostly depends on your choice I
suppose.  For me Keynote is irreplaceable.  It's not at all aimed towards
programmers and it's impossible to script and limited in so many ways, but
it has a few things over all alternatives:

- What you see is actually what you get.  I can't tell you how much
HTML5 presentation tools annoy me because depending on where you open
them, your formatting is all over the place.  Presentations are not
websites.  You pick an aspect ratio and then you put your stuff in.
Reflowing is something you don't want in your slides.

Yes, you can get the same thing with Powerpoint and OpenOffice
Whatever as well, but every once in a while your presentation will
just look different.  The worst offender is Powerpoint in that regard
that just randomly moves elements around (OS X version).

- Excellent font rendering.  I love fonts and no other application shows
fonts this nicely on OS X.  It also beats the PDF rendering from
Preview.app.  When I export my slides to PDF I can easily see the
degradation in font quality.

- Nice presenter display.  Being able to see notes, the next slide and
current clock on your secondary display is very useful.  From all of
the alternatives I have used so far, nothing came close to Keynote.

- Lag free.  Keynote has an indicator in the presenter display when the
next slide has loaded.  This is huge.  You press the button and the
slide loads.  I am a person that gets out of flow really quickly if
things don't go as intended and a hanging slide kills that flow
quickly.  (Did I just press that button?  Let's press again.  Oh, I
just skipped a slide, let's go back etc.)

Aside from Keynote I use Inkscape and Gimp.  Inkscape is awful on OS X
because it requires X11 but still the best vector editor I have used so
far.  Gimp is horrible but the prize for Photoshop is a dealbreaker.

## Source Code Highlighting

I now try to keep the amount of source on the slides to the absolute
minimum.  In that case I usually just hand colorize them or just set
keywords in bold face.  If you want to automate this you can try the
`pygmentize` command from Pygments and let it generate RTF.  That's
something you can copy/paste into keynote and it will show up correctly.

## Artwork

Where to get artwork?  Images are simple as flickr has a [Creative Commons
Search](http://www.flickr.com/search/?l=cc&mt=all&adv=1&w=all&q=searchword+here&m=text).
Vector art is harder.  One of the reasons I stick to lineart for many
presentations and websites is that that one is easy to create.  Inkscape
has awesome vectorization support.  Just draw something and make a
photograph or prepare a picture with gimp, then vectorize it and fix up
some issues.  Sometimes I just trace photos, gets the job done just as
well.
