public: yes
tags: [thoughts, ai]
summary: A response to Glyph's opting out of AI.

GenAI Criticism and Moral Quandaries
====================================

I've received quite a bit of feedback on the last thing I wrote `about AI
</2025/6/4/changes/>`__, particularly around the idea that I'm too quick to
brush aside criticism.  Given that Glyph — who I respect a lot — `wrote a
lengthy piece
<https://blog.glyph.im/2025/06/i-think-im-done-thinking-about-genai-for-now.html>`__
on why he's largely opting out of AI with some thoughtfully articulated
criticism, I thought is would be a good opportunity to respond.

Focusing on Code
----------------

For this discussion, I'm focusing on AI as a tool for generating text and
code — not images, video, or music.  My perspective is that there’s a clear
difference between utilitarian outputs (code, simple text) and creative
outputs that are meant to evoke emotion (art, music, well articulated
writings, etc.).  For example, when I get an email from a real estate
broker, I expect clear information, not art.  Similarly, when I add
something to a virtual shopping cart, I don’t care how artistic the code
is that makes it work.  In fact, even today without AI, I better not know.

So, like Glyph, I want to focus on code.

Quality of Output and Adoption
------------------------------

If you read my earlier post, you probably picked up that I see a lot of
potential in AI.  That hasn't always been my stance, and I intend to
remain critical, but right now I'm quite positive about its
usefulness.  That is in a stark contrast to Glyph's experience.

He writes:

    My experiences of genAI are all extremely bad, but that is barely even
    anecdata. Their experiences are neutral-to-positive. Little scientific
    data exists. How to resolve this?

I can't judge Glyph's experiences, and I don't want to speculate about why
they differ from mine.  I've certainly had my own frustrations with AI tools.

The difference, I think, is that I've learned over time how to use these
tools more effectively, and that's led to better results.  For me, it's not
just “neutral-to-positive” — it's been astonishingly positive.  As I write
this, my agent is fixing code in another window for me.  I recorded `a
video of it fixing issues in a library
<https://www.youtube.com/watch?v=sQYXZCUvpIc>`__ if you want to see what
this looks like.

Glyph also argues that adoption is being forced by management and that
people would not voluntarily use it:

    Despite this plethora of negative experiences, executives are
    aggressively mandating the use of AI6. It looks like without such
    mandates, most people will not bother to use such tools, so the executives
    will need muscular policies to enforce its use.7

This doesn't match what I've seen. In my experience, people are adopting
AI on their own, often before their companies are even aware.

Even at Sentry the adoption of AI happened by employees before the company
even put money behind it.  In fact my memory is that if anything only at
the point where an exceeding number of AI invoices showed up from IC
expenses did we realize how widespread adoption has been.  This was
entirely grounds up.  For my non techy friends they sometimes need to hide
their AI usage from their employers because some companies try to prevent
the adoption of AI, but they are paying for it themselves to help them
with the work.  Some of them pay for the expensive ChatGPT subscription
even!

Yes, there are companies like Shopify that put AI on their banners and are
mandating this, but there are probably many more companies that leverage
AI via a secret grassroots adoption.

Enjoying Programming
--------------------

Glyph makes the point that LLMs reduce code review to a non enjoyable
part.  For me code review is a fact of life and part of the job.  That's
just what we do as programmers.  I don't do it because I want the person
that wrote the code to grow and become a better programmer, I do it
because I want code to be merged.  That does not mean I do not care about
the career opportunities or skills of the other person, I do!  But that's
an effort all on its own.  Sometimes it takes place in a code review, most
of the time however that's happening in a one-on-one setting.  The reality
is that we're often not in the mindset of wanting personal growth when
receiving review comments either.

Now I admit that I do a lot more code review than I do programming at the
moment, but I also find it quite enjoyable.  On the one hand because the
novelty of an machine programming hasn't worn off yet, on the other hand
because it's a very patient recipient of feedback and change requests.
You just tell it stuff, you don't spend too much time to think about how
the other person is going to respond, if it's a good idea to nitpick a
small thing and put extra load on them.  It's quite freeing really and it
does have a different feeling to me than a regular code review.

So is programming still enjoyable if I don't hit the keys?  For me, yes. I
still write code, just less of it, and it doesn't diminish the
satisfaction at all.  I'm still in control, and the quality still depends
on the effort I put into guiding the tool.

Energy, Climate and Stealing
----------------------------

Glyph doesn't talk too much about the economics and the climate impact,
but he does mention it.  My stance on this is rather simple: margins will
erode, there will be a lot of competition and we all will pay for the
inference necessary and someone will make money.  Energy usage will go up
but we need more energy even without AI as we're electrifying our cars.
AI might change this trajectory slightly, but we had a climate problem
before all of this and we have give or take the same climate problem until
we shift towards more renewable energy.  In fact, this new increased
energy consumption might actually do us a great service here.  Solar is
already the cheapest energy solution [1]_ on the market and if we need
more, that's quite likely the source that we will build more of.
Particularly now that cost of energy storage is also going down quickly.

As for copyright and “stealing”: I've always felt that copyright terms are
too long, scraping is beneficial, and sharing knowledge is a net positive
for humanity.  That's what drew me to Open Source in the first place.  Glyph
argues that scrapers are more aggressive now, but I'm not sure if that is
actually true.  I think there are just more of them.  We got so used that
it was mostly a handful of search engines scraping lowering the cost of it
to all.  I tend to think that more competition is good here and we might
just have to accept it for a little while.

Educational Impact
------------------

I addressed this in my previous article, but I believe LLMs have
significant potential to improve learning.  Glyph disagrees, partly because
of concerns about cheating and that it will make it worse:

    LLMs are making academic cheating incredibly rampant. […] For learning,
    genAI is a forklift at the gym. […] But it was within those
    inefficiencies and the inconveniences of the academic experience that real
    learning *was*, against all odds, still happening in schools.

I disagree strongly here.  This is where I have the most first-hand
experience, considering time spent with AI.  Since the early days of
ChatGPT, I've used LLMs extensively for learning.  That's because I'm not
great at learning from books, and I have found LLMs to make the process
much more enjoyable and helpful to me.

To give you some ideas of how useful this can be, here is an excellent
prompt that `Darin Gordon shared
<https://x.com/darin_gordon/status/1931281773490557021>`__ for getting a
GPT to act as a teacher of algorithms that uses the Socratic method:
`socratic_fp_learning.md
<https://gist.github.com/Dowwie/5a66cd8df639e4c98043fc7f507dab9e>`__.  It
works even super well if you dumb it down.  I had this explain to my son
how hash tables work and I did a modification to the prompt to help him
understand entropy.  It's surprisingly effective.

Now, that does not do much about the cheating part.  But surely in a
situation where students cheat, it wasn't about learning in the first
case, it was about passing a test.  That has not much to do with learning,
but with performance assessment.  When you feel the need to cheat, you
probably did not learn something properly in the first place.  AI might
just make these pre-existing problems more visible, and even Glyph
acknowledged that.

AI may complicate things for educators in the near team, but it can also
offer real improvements.  Either way, education needs reform to adapt to
present realities.

Fatigue and Surrender
---------------------

Glyph concludes by sharing that the pace of change is overwhelming him and
opting out feels like the only sane response.   I understand that.  The
pace of AI advancement can make anyone feel like they're falling behind
and I too feel like that sometimes.

I offer a different view: just assume AI will win out and we will see
agents!  Then the path that takes us to that future is less relevant.
Many of the things that are currently asking for people's attention are
going to look different in a few years — or might not even exist any
longer.  I initially used GitHub Copilot just to move to Cursor, now to
mostly move to Claude Code, maybe I will be back with Cursor's background
agents in a month.  First there was v0, then there was lovable, who knows
what there be in a year.  But the path for me is pretty clear: it's going
towards *me working together with the machine*.  I find that thought very
calming and it takes out the stress.  Taking a positive view gives you a
form of an excited acceptance of the future.

In Closing
----------

I really don't want to dismiss anyone's concerns.  I just feel that, for
me, the utility of these tools has become obvious enough that I don't feel
the need to argue or justify my choices anymore.

.. [1] https://en.wikipedia.org/wiki/Cost_of_electricity_by_source
