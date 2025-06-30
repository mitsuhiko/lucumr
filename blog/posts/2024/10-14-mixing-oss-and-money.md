---
tags:
  - thoughts
summary: Thoughts on funding maintainers through the pledge, WordPress'
---

# The Inevitability of Mixing Open Source and Money

This year, one of the projects I was involved in at Sentry was the launch
of [The Open Source Pledge](https://opensourcepledge.com/).  The idea
behind it is simple: companies pledge an amount proportional to the number
of developers they employ to fund the Open Source projects they depend on.
I [have written about this before](/2024/9/19/open-source-tax/).

Since then, I've had the chance to engage in many insightful discussions
about Open Source funding and licensing.  In the meantime we have
officially launched the pledge, and almost simultaneously [WordPress
entered a crisis](https://techcrunch.com/2024/10/10/wordpress-vs-wp-engine-drama-explained/).
At the heart of that crisis is a clash between Open Source ideals and
financial interests by people other than the original creators.

You might have a lot of opinions on David Heinemeier Hansson, but I
encourage you to read two of his recent posts on that very topic.
In [Automattic is doing open source dirty](https://world.hey.com/dhh/automattic-is-doing-open-source-dirty-b95cf128)
David is laying out the case that Automattic has no right to impose moral
obligations on beyond the scope of the license.  This has been followed by
[Open source royalty and mad kings](https://world.hey.com/dhh/open-source-royalty-and-mad-kings-a8f79d16)
in which he goes deeper into the fallout that Matt Mullenweg (the creator
of WordPress) is causing with his fight.

I'm largely in agreement with the posts.  However I want to talk a bit
about some pretty significant difference between David's opinions on Open
Source funding (on which these posts appear to be based): the money
element.  In 2013 David [wrote the following about money and Open Source](https://dhh.dk/2013/the-perils-of-mixing-open-source-and-money.html):

> […] it's tempting to cash in on goodwill earned. […] It's a cliché,
but once you've sold out, the goodwill might well be spent for good.
>
> […] part of the reason much of open source is so good, and often
so superior to closed-source commercial projects, is the natural
boundary of constraints.  If you are not being paid or otherwise
compensated directly for your work, you're less likely to needlessly
embellish it. […]
>
David Heinemeier Hansson, [The perils of mixing open source and
money](https://dhh.dk/2013/the-perils-of-mixing-open-source-and-money.html)

At face value, this suggests that Open Source and money shouldn’t mix,
and that the absence of monetary rewards fosters a unique creative
process.  There's certainly truth to this, but in reality, Open Source and
money often mix quickly.

If you look under the cover of many successful Open Source projects you
will find companies with their own commercial interests supporting
them (eg: Linux via contributors), companies outright leading projects
they are also commercializing (eg: MariaDB, redis) or companies funding
Open Source projects primarily for marketing / up-sell purposes (uv,
next.js, pydantic, …).  Even when money doesn't directly fund an Open
Source project, others may still profit from it, yet often those are not
the original creators.  These dynamics create stresses and moral dilemmas.

I’ve said this before, but it’s no coincidence that Rails has a
foundation, large conferences, a strong core team, and a trademark, while
Flask has none of it.  There are barriers and it takes a lot of energy and
determination to push a project to a level where it can sustain itself.

Rails pushed through this barrier.  I never did with any of my projects
and I'm at peace with that.  I got to learn a lot through my Open Source
work, I achieved a certain level of popularity that I benefit from.  I built
a meaningful career by leveraging my work and I even met my wonderful wife
that way.  All are consequences of my Open Source contributions.  There
were clear and indisputable benefits to it and by all accounts I'm a happy
and grateful person.

But every now and then [doubts creep in](/2023/2/9/everybody-is-complex/) and I wonder if I should have done
something more commercial with Flask, or if I should have pushed Rye
further.  As much as I love listening to Charlie talking about uv, there
is also an unavoidable doubt lingering there what could have been if I
dared to [build out Rye](/2024/8/21/harvest-season/) with funding on my
own.

Over the years, I have seen too many of my colleagues and acquaintances
struggle one way or another.  Psychological, mentally and professionally.
Midlife crises, burnout, health, and dealing with a strong feeling of
dread and disappointment.  Many of this as a indirect or even direct
result of their Open Source work.  While projects like Rails and Laravel
are great examples of successful open source stewardship, they are also
outliers.  Many others don't survive or grow to that level.

And yet even some of those lighthouse projects can become fallen stars and
face challenges.  WordPress by all accounts is a massive success.
WordPress is in the top 1% of open source projects in terms of impact,
success, and financial return for its creator.  Yet despite that — and it
finding an actual business model to commercialize it — its creator
suffers from the same fate as many small Open Source libraries: a feeling
of being wronged.

This is where the lines between law and morality blur.  Matt feels
mistreated, especially by a private equity firm, but neither trademarks
nor license terms can resolve the issue for him.  It’s a moral question,
and sadly, Matt’s actions have alienated many who would otherwise support
him.  He's turning into a “mad king” and behaving immoral in his own ways.

The reality is that we humans are messy and unpredictable.  We don't quite
know how we will behave until we have been throw into a particular
situation.  Open Source walks a very fine line, and anyone claiming to have
all the answers probably doesn't.  I certainly don't.

Is it a wise to mix Open Source and money?  Maybe not.  Yet I also believe
it's something that is just a reality we need to navigate.  Today there
are some projects too small to get any funding ([xz](https://en.wikipedia.org/wiki/XZ_Utils_backdoor)) and there are
projects large enough to find some way to sustain by funneling money to it
(Rails, WordPress).

We target with the Pledge small projects in particular.  It's our
suggestion of how to give to projects for which the barrier to attract
funding is too high.  At the same time I recognize all the open questions
it leaves.  There are questions about tax treatments, there are questions
about sustainabilty and incentives, questions about distribution and
governance.

I firmly believe that the current state of Open Source and money is
inadequate, and we should strive for a better one.  Will the Pledge help?
I hope for some projects, but WordPress has shown that we need to drive
forward that conversation of money and Open Source regardless of thes size
of the project.
