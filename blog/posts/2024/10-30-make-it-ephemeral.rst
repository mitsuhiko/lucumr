tags: [thoughts]
summary: Make software that is capable to forget and decay information.

Make It Ephemeral: Software Should Decay and Lose Data
======================================================

Most software that exists today does not forget.  Creating software that
remembers is easy, but designing software that deliberately “forgets” is
a bit more complex.  By “forgetting,” I don't mean losing data because it
wasn’t saved or losing it randomly due to bugs.  I'm referring to making a
deliberate design decision to discard data at a later time.  This ability
to forget can be an incredibly benefitial property for many applications.
Most importantly software that forgets enables different user experiences.

I'm willing to bet that your cloud storage or SaaS applications likely
serve as dumping grounds for outdated, forgotten files and artifacts.
This doesn’t have to be the case.

Older computer software often aimed to replicate physical objects and
experiences.  This approach (skeuomorphism) was about making digital
interfaces feel familiar to older physical objects.  They resembled the
appearance and behavior even though they didn't need to.  Ironically
though skeuomorphism despite focusing on look and feel, rarely considers
some of the hidden affordances of the physical world.  Critically, rarely
does digial software feature degradation.  Yes, the trash bin was created
as an appoximation of this, but the bin seemingly did not make it farther
than file or email management software.  It also does not go far enough.

In the physical world, much of what we create has a natural tendency to
decay and that is really useful information.  A sticky note on a monitor
gathers dust and fades.  A notebook fills with notes and random scribbles,
becomes worn, and eventually ends up in a cabinet to finally end its
life discarded in a bin.  We probably all clear out our desk every couple
of months, tossing outdated items to keep the space manageable.  When I do
that, a key part of this is quickly judging how “old” some paper looks.
But even without regular cleaning, things are naturally lost or discarded
over time on my desk.  Yet software rarely behaves this way.  I think
that’s a problem.

When data is kept indefinitely by default, it changes our relationship
with that software.  People sometimes may hesitate to create anything in
shared spaces for fear of cluttering them, while others might
indiscriminately litter them.  In file-based systems, this may be
manageable, but in shared SaaS applications, everything created
(dashboards, notebooks, diagrams) lingers indefinitely and remains
searchable and discoverable.  This persistence seems advantageous but can
quickly lead to more and more clutter.

Adding new data to software is easy.  Scheduling it for automatic deletion
is a bit harder.  Simulating any kind of “visual decay” to hint at age or
relevance is rarely seen in today's software though it wouldn't be all
that hard to add.  I'm not convinced that the work required to implement
any of those things is why it does not exist, I think it's more likely
that there is a belief that keeping stuff around forever is a benefit over
the limitations of the real world.

The reality is that even though the entities we create are sticking around
forever, the information contained within them ages badly.  Of the 30 odd
"test" dashboards that are in our Datadog installation, most of them don't
show data any more.  The same is true for hundreds of notebooks.  We have
a few thousand notebooks and quite a few of them at this point are
anchored to data that is past the retention period or are referencing
metrics that are gone.

In shared spaces with lots of users, few things are intended to last
forever.  I hope that it will become more popular for software to take age
more intentional into account.  For instance one can start fading out old
documents that are rarely maintained or refreshed.  I want software to hide
old documents, dashboards etc. and that includes most critically not
showing up in search.  I don't want to accidentally navigate to old and
unused dashboards in the mids of an incident.

Sorting by frequency of use is insufficient to me.  Ideally software
embraced an “ephemeral by default” approach.  While there’s some risk of
data loss, you can make the deletion purely virtual (at least for a
while).  Imagine dashboard software with built-in “garbage collection”:
everything created starts with a short time-to-live (say, 30 days), after
which it moves to a “to sort” folder.  If it’s not actively sorted and
saved within six months, it's moved to a trash and eventually deleted.

This idea extends far beyond dashboards!  Wiki and innformation management
software like Notion could benefit from decaying notes, as the information
they hold often becomes outdated quickly.  I routinely encounter more
outdated pages than current ones.  While outright deletion may not be the
solution, irrelevant notes and documents showing up in searches add to the
clutter and make finding useful information harder.  “But I need my data
sometimes years later” I hear you say.  What about making it intentional?
Archive them in year books.  Make me intentionally “dig into the archives”
if I really have to.  There are many very intentional ways of dealing with
this problem.

And even if software does not want to go down that path I would at least
wish for scheduled deletion.  I will forget to delete, and I'm lazy and
given the tools available I rarely clean up.  Yet many of the things I
create I already know I really only need for a week or to.  So give me a
button I can press to schedule deletion.  Then I don't have to remember to
clean up after myself a few months later, but I can make that call already
today when I create my thing.
