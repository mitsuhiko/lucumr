public: yes
tags: [ai, thoughts]
summary: "Due to popular request: my use of LLM explained."

How I AI With A Promptly Hired Model Intern
===========================================

After Musk's acquisition of Twitter, many people I respect and follow
moved to Bluesky.  I `created an account there
<https://bsky.app/profile/mitsuhiko.at>`__ and made an honest attempt of
making it my primary platform.  Sadly I found Bluesky to be surprisingly
hostile towards AI content.  There is an almost religious resistance to AI
on there, at least in whatever corner of the platform I ended up in.

Despite these challenges, some individuals on both Twitter and Bluesky
have shown genuine curiosity about my AI usage.  Here, I want to share how
I use Large Language Models and why I find them so helpful.

Here is an important disclaimer: I am by no means an expert in AI; I'm
mostly an enthusiastic user.  Absolutely nothing here is novel!  What I do
here is pretty boring which to some degree is the point.  I won't be
covering underlying technology or my programmatic experience.  This is
strictly about how I use AI as a “techy consumer”.

Why AI?
-------

In short: AI makes me significantly more productive.  I recently read
`Aaron Francis <https://x.com/aarondfrancis/>`__'s Tweet about how he gets
a week worth of productivity out of a day now thanks to AI.  I'm not
anywhere close to that, but I use AI a lot now.  It has become
indispensable for me for both content writing as well as programming.

A common misconception is that AI is still at the level it was when
ChatGPT first launched.  Many people tried it early, saw its limitations,
and never returned.  However, AI is evolving rapidly. If you haven't kept
up, you risk drawing inaccurate conclusions based on outdated impressions.
In some sense I think people who never used AI yet, are in a better
position to judge than the folks who tried it two years ago and never
returned.

As you are going to read through this article you will probably figure out
rather quickly that the way I use AI — despite being used in part for
content creation — does not really impact intellectual property much.
That said, I'm curious and open to discussions about how we should be
dealing with this problem.  Particularly on Bluesky a lot of the
negativity towards AI is related to watering down of copyrights and human
creation.  I don't know the answers to these things, but I think we need
to have a productive dialog here rather than wishing for the technology
away.

My AI Toolkit
-------------

I work with a variety of AI tools, mostly because of professional
curiosity and to a smaller degree because each tool excels at something
slightly different.  Here are the ones I use most often:

* `Open WebUI <https://openwebui.com/>`__.  In short this is a Python web
  app that offers a chat interface web application similar to ChatGTP.
  Unlike ChatGTP however it lets you talk to different models.  First and
  foremost I used this to talk to local models hosted by Ollama, but also
  other remote services like OpenAI, Anthropic and Deepseek.

* `Simon's llm <https://github.com/simonw/llm>`__.  This is a command line
  tool with plenty of plugins that lets you prompt different models.  Think
  of it as a command line version of Open WebUI.  It's particularly useful
  for quick scripting and basic automation.

* `Ollama <https://ollama.com/>`__.  This allows me to run models locally
  on my MacBook Pro M1 Max.  With the 64GB of RAM it has, it's a pretty
  potent machine for basic inference despite it being three years old.
  I'll explain later why I use local models.

* `Cursor <https://www.cursor.com/>`__.  A fork of Visual Studio Code with AI
  based auto completion and code generation built-in.  It's my go-to for
  programming with AI assistance at the moment.

* `ChatGPT <https://chatgpt.com/>`__.  Like probably most AI users, I use
  ChatGPT, particularly on my phone.  I pay for the Plus subscription
  because I use it enough to get a lot of value out of that.  A
  significant use of this for me is in fact the voice mode, more on that
  later.

You can get most of the benefits of this from just paying for a single AI
tool.  I think as one expands their use, as one gets better at prompting
it, the desire naturally grows to use more tooling.  As for which models
to use day to day (and services) I don't have a particular strong strategy
and preferences change quickly.  For instance since Deepseek's R1 came up,
I'm exploring it quite a bit for programming because of how good a job it
does and as of writing that's just a few days old.

If you want to run models locally, Apple Silicon machines currently offer
some of the best “bang for your buck” in terms of performance, power
usage and money.  With `tailscale <https://tailscale.com/>`__, I can even
access my MacBook's Open WebUI interface from my phone, as long as it is
powered on.

.. raw:: html

    <details>
      <summary>Guide for installing llm and Open WebUI</summary>

This is a bit of a plug for `uv <https://docs.astral.sh/uv/>`__ quite
honestly.  If you have it, it's crazy quick to get Open WebUI and ``llm``
running locally::

    uv tool install -p python3.11 open-webui
    uv tool install --with llm-ollama --with llm-claude-3 --with llm-deepseek llm

Afterwards you can launch `open-webui` and use the llm tool::

    open-webui serve
    llm keys set deepseek
    llm -m deepseek-coder '# write timsort in python'

* By default, Open WebUI only connects to OpenAI or Ollama. If you want to
  add Anthropic or Deepseek, you need to create a custom function in the
  “Functions” section of Open WebUI's admin panel.

* Import the functions and configure your API keys, and you’re ready to go.

Functions you can import to the WebUI:

* `anthropic_manifold_pipeline.py <https://openwebui.com/f/justinrahb/anthropic>`__
* `Deepseek <https://openwebui.com/f/xgawatt/DeepseekAPI>`__

.. raw:: html

    </details>

AI Affordances
--------------

A frequent concern I hear is “you cannot trust LLMs” as they tend to
hallucinate.  I hear this in particular when I explain that I use this as
a replacement for Google a lot!  I approach this the same way I would when
seeking advice from another human.  People can and are routinely wrong,
and you learn to cross-check selectively.

I treat AI as a collaborator or a pretty good intern.  You remain
responsible for the final outcome.  The intern also happens to get better
month by month as models improve.  And a bit like a human that digital
intern has morals and wants to be argued with.  Except some of those AI
interns `don't want to talk about China
<https://www.reddit.com/r/LocalLLaMA/comments/187oidh/deepseek_coder_7b_33b_thinks_its_trained_by_openai/>`__,
others get a stroke `if you talk about certain people
<https://www.reddit.com/r/ChatGPT/comments/1h3rz4l/david_mayer_is_not_the_only_one_jonathan_zittrain/>`__.
But regardless of how good they get, in the end, it's your fault and your
fault alone if you do the wrong thing.  You can't blame the AI and you
need to spot check.

However the logical conclusion of this is not that it's wrong all the time
and you need to check everything, or that you cannot trust it at all.
It's similar to how you engage in a technical discussion with others about
a problem.  I have seen more than one situation where the conventional
wisdom in the room is just wrong for a few minutes, until someone points
out that we had it wrong.

Another major advantage is that AI tools are relatively open.  You can run
models locally and integrate them with scripts.  Even the famous OpenAI
which is not at all open is much more open than a Google search is.  For
instance, you can create a simple script for grammar checking right from
your command line.

You *can* integrate it locally and nobody stops you.  Many, many years ago
I had a tool on my computer that allowed me to issue web searches and
extract text from results.  That has stopped working such a long time ago
that I almost forgot about it.  It has stopped working because there is
basically no competition in search, and Google does not want you to use it
like that.

For instance, you can create a simple script for grammar checking right
from your command line:

.. sourcecode:: bash

    #!/bin/sh
    MODEL=phi4:latest
    if ping -q -c1 google.com &>/dev/null; then
      MODEL=claude-3-5-sonnet-latest
    fi
    OLD_TEXT="$(cat)"
    llm -m $MODEL "$OLD_TEXT" -s "fix spelling and grammar in the given text,
        and reply with the improved text and no extra commentary.
        Use double spacing."

This script can automatically switch between a local model (``phi4`` via
Ollama) and a remote one (``claude-3-5-sonnet-latest``) based on internet
connectivity.  With a command like ``!llm-spell`` in Vim, I can fix up
sentences with a single step.

Or you can manipulate the contents of the clipboard like this::

    pbpaste | llm-spell | pbcopy && say "AI is done"

Writing with AI
---------------

I don't let AI write my articles.  As a non-native Speaker, mistakes and
linguistic quirks are part of me.  That said, I do rely on AI tools for
helping me write.

Usually after I have made my first pass through a page I ask an LLM to
read through it and give me comments.  I have a Apple Note with various
prompts I can use or I just come up with what I need in the moment.  The
process is not particularly scripted out.  I basically talk to the LLM to
figure out what it thinks of the text etc.

Here are some of the things I use AI for when writing:

*   **Grammar checking:** I compare the AI’s suggested revisions side by
    side with my original text and pick the changes I prefer.

*   **Restructuring:** AI often helps me see when my writing is too wordy.
    In the days before AI, I often ended up with super long articles that
    did not read well and that I did not publish.  Models like o1 are very
    helpful in identifying things that don't need to be said.

*   **Writing Notes and finding key points:** I ask the AI to read through
    a draft “like a Computer Science 101 student” and take notes. This
    helps me see if what it absorbed matches what I intended to convey.

*   **Roast my Article:**  I have a few prompts that asks the AI to
    “roast” or criticize my article, as if commenting on Reddit, Twitter,
    or Hacker News.  Even though these critiques seem shallow, they can
    sting, but they often highlight weaknesses in my argument or clarity.
    Even if they don't necessarily impact the writing, they prime me for
    some of the feedback.

*   **Identifying jargon:** If I worry there's too much jargon, I use AI to
    resolve acronyms and point out technical terms I've used without
    explanation, helping me make the text more accessible.

Programming with AI
-------------------

This is probably the bulk of what I do and it falls into three major
categories.

*   **Debugging and summarizing:** Throwing stack traces and errors at an
    AI is usually a good first step in finding out where I should look,
    what might be wrong.  Sometimes it fixes a problem entirely by itself.
    I also sometimes just throw a long bug report or issue at the thing to
    try to reason through it.

*   **Fuzzy parsing:** sometimes you have an output, but you don't
    have the input.  As an example I have a little side project to write a
    command line tool help generator and AI is really good at taking the
    output, “parsing“ it and creating a structure as input.  That is a
    good first step to then generate out the code that should again match
    that output.

*   **Code generation:** lastly it just programs really well.  It can do
    single code snippets, it can generate complex stuff.  Particularly for
    prototyping it's amazing.

Now it's not great at all languages.  I find it exceptionally well at
Python, somewhat okay at JavaScript and horrible at Rust.  However
particularly if you wanna solve an algorithmic problem you can often
iterate in Python until you have what you want, then ask it to translate
it to Rust.  That's from my experience at least a decent way to get going
quickly on some harder problems.

Talking to Her
--------------

Pair programming is fantastic, but not always possible if you're
programming alone at home.  An LLM can serve as a stand-in discussion
partner — a poor man's interlocutor.  Thankfully it's actually not all
that poor, because it's really good at telling you what stuff is called.
This is most fun if you do it with voice mode, but it also works quite
well in text.

Here a motivating example from voice mode:

    **A:** So, do you remember if you have, like, ``strcat``, it always copies from
    the start, but if you keep concatenating to the same buffer, it's really
    inefficient. So, remember what the Big-O of that is if you do it in a loop,
    and wasn't there, like, a humorous name for this kind of algorithm?

    **AI:** You’re thinking of the “Schlemiel the Painter’s algorithm.” It’s a
    humorous way of describing the inefficiency of repeatedly appending to a
    string using operations like ``strcat``, which copies from the start each
    time. The Big O complexity for this operation is O(n^2) if done repeatedly
    in a loop, since each ``strcat`` operation takes time proportional to the
    current length of the string.

It's also fun and educational for my kids.  They ask a lot of questions,
and ChatGPT can tailor its explanations to their age level.  If the
explanation is still too advanced, I can immediately ask it to simplify
further or also go the other way.  Now again, there is always a risk that
it gets it wrong, but if you teach them the idea that we need to validate
it, if we're not sure, you're off to a pretty good start.  It's very
enjoyable because it keeps the conversation going and has state.  Answered
in large metric numbers?  Can always ask it to scale to elephants or
soccer fields.

ChatGPT is also incredibly helpful when having to work with multiple
languages.  Recent example: my kids have Greek friends and we tried to
understand the difference between some Greek words that came up.  I have
no idea how to write it, Google translate does not understand my attempts
of pronouncing it either.  However ChatGPT does.  If I ask it in voice
mode what “pa-me-spee-tee” in Greek means it knows what I tried to mumble
and replies in a helpful manner.

Lastly the use on the go.  Sometimes I'm just not in a position where I
can actually write it down on a keyboard, but if I basically talk to
ChatGPT, it can transcribe it down and it will also remove some of my
“um's” and it will just be there and I can copy-paste it later and edit
it.  (To prove a point, I transcribed the previous sentence with the
mobile app).  This is a very different experience than transcribing on iOS
natively.  It understands enough context of what I'm babbling that it will
start and stop transcribing.  Now this is not perfect, but pretty damn
good and incredibly helpful.

The multilingual aspect is particularly helpful because our family is
multilingual.  Being able to fluidly switch between German, Russian and
English is such a refreshing experience.

No Slop
-------

I mentioned earlier that I don't let LLM write my texts.  I also don't use
AI to make illustrations though I have in the past.  The reason is that
there is a certain style that goes with this, which is just incredibly
off-putting.  This noticeably AI generated, and typically quite
low-quality content, is called “AI slop” and I personally respond really
badly to it.  When someone throws me a pull request, an email or a text
message that is obviously AI generated without disclosing this, I
immediately have a very low opinion on them.

Slop like hallucinations are a problem, but they are only a problem if you
don't use your brain.  Even the worst slop can be the foundation of
really good content.  I'm a horrible artist, but I can use Illustrator.
Even an AI slop image can help me trace the person in the pose I wanted.
Likewise you can throw your notes into a document and let the AI imagine a
story around it.  You probably can't use that story right away, but you
can use it as potential inspiration.

Final Thoughts
--------------

AI tools, at their best, feel less like disruptive and dark magic and more
like a natural extension of the creative process.  At least if you see it
as a curious collaborator.  My approach isn't about outsourcing thinking,
but augmenting it: using LLMs to accelerate grunt work, untangle mental
knots, and prototype ideas faster.  Skepticism is healthy, but dismissing
AI outright risks missing its potential as a multiplier for those willing
to engage critically.
