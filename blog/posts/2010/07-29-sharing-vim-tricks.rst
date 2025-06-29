tags: [vim]
summary: |
  Things I love about vim and that I think are worth sharing.

Sharing Vim Tricks
==================

If you are a Vim user, you probably have your own set of tricks that
make your editing life a more pleasant experience. So here my set of
things I love about Vim and might be worth sharing. 

Some things first: normal mode = mode you enter with ESC, insert mode =
mode you enter with i (or any other insert starting key). 

Searching
~~~~~~~~~

That's probably a no brainer because everybody does it all the time, but
searching in Vim is a pretty cool experience. Standard search is from
normal mode by typing `/searchword`. To go to the next result use `n`.
If you want to search in the reverse direction, use `?` instead of `/`.
If you want to continue the search with the last searchword, just use
`/` or `?`. 

Sometimes you want to search for the word you are just having your
cursor over. That's possible by using `*` in normal mode, which will
search for that words forward, `#` searches for that word backwards. 

When you use `*` you will notice in the status bar that Vim is wrapping
the word in `\<` and `\>`. This marks beginning of word and end of word.
That way if you search for `\<foo\>`, it will match `foo` but not
`foobar`. 

Replacing
~~~~~~~~~

Generally replacing works with the command `:%s/search for/replace
with/g`. For replacing some weird rules exist which are worth knowing.
First of all, the `/` can be replaced with pretty much everything else.
If the slash is part of your searchword, you could also use `:%s#search
for#replace with#g`. The second weird rule is that if you want to insert
a newline, `\n` won't do that, `\r` does. For replacements `\n` is
actually the nullbyte! But don't worry, `\r` inserts the correct newline
sign that is currently in use for this document. The `g` means: “replace
all matches in a line”. Without that, it would only replace the first
occurrence of each line. This is a pretty obscure thing that this is not
the default, but in some cases you might want to remove the `/g`. If you
replace that way, Vim will do replacements for the searchword on each
line in the file without asking. If you add a `c` to the flags, it will
ask for confirmation for each match. 

So far, so good. Now how would you search for the last searchword and
replace this? Just leave out the last search: `:%s//replace with/`. This
is especially useful when combined with `*`. 

Another helpful thing is to only replace in a selection. That's very
easy. Just select the lines you want with visual selection and then
leave out the `%` sign when doing the replacement. The `%` just tells
vim to operate on the whole document, not having anything there would
mean just operating on the current line. 

Ways to Insert
~~~~~~~~~~~~~~

As programmer in most languages it makes a lot of sense to think in
lines. Vim does that. The most common block selection operates on lines
and so do searching and replacing. This line-based thinking also comes
in handy when doing inserts. `o` inserts a new line, `O` creates a new
line in front of the current one. In both cases you will end up in
insert mode. 

But there are cooler ways to insert too by using motion commands! 

Motion Commands
~~~~~~~~~~~~~~~

Vim has a couple of motion commands. These need a bit of explanation but
trust me, they are awesome. First the most common commands that support
motion: `y{motion}` for copying into a register, `c{motion}` for
deleting and stepping into insert mode, `d{motion}` for just deleting
without going to the insert mode and of course `v{motion}` to select
something. 

Now what the hell is `{motion}`? Motion commands are commands that move
the cursor. The probably most awesome motion command is `iCHAR` where
`CHAR` is a special character to search for in both directions. There
the extra rule applies that parentheses are properly inverted for you.
This works for `"`, `'`, `(` and others. Vim is clever enough to adhere
to the escaping rules of the language you are working with. This for
example means that the command `ci"` looks selects everything between
the next two quotes, deletes the contents and goes to insert mode (c =
change). If you want to have it selected instead, you can use `vi"`.
`vi(` will select everything between the current set of parentheses etc
(v = visual selection). 

The following other motion commands exist: `b` moves the cursor to the
beginning of the word, `e` to the end. `{count}j` would go `{count}`
lines down (j = jump I suppose). `f{char}` looks for a character on the
right, `F{char}` to the left. `t` and `T` work like `f` and `F` but go
one character more (before match, after match). Last but not least there
is `{count}w` which moves `{count}` words. 

Awesome File Navigation
~~~~~~~~~~~~~~~~~~~~~~~

There is a little undocumented (or badly documented feature) of Vim
called autochdir. Some people warn about it because it might break
plugins, but I never had any issues with it and I am using it for a
long, long time. To enable it, you just have to add this to the vimrc:
`set autochdir`. 

When enabled, Vim will change into the folder of the file of the buffer.
This is pretty handy because `:e` then works relative to the file. So
for example if you are in `foo/bar.py` and want to edit `foo/baz.py` you
only have to do `:e baz.py`. Thanks to the automatic completion with
`Tab` and `^D` this makes navigating in trees fun. If you have a file
open already it will be put into a buffer. If you then substitute `:e`
with `:b` it will only complete to files that were already open. Because
this also supports partial matches, very often a `:b baz` is enough to
go to the `baz.py` file. 

Why The Hell is this not a Default?
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

There are a couple of things to add to the vimrc where I really wonder
why this is not the default: 

`set title`. When this is on your vimrc, the terminal title will
automatically reflect what buffer you are working in. This also works in
GUI mode, but there it just does nothing. This really should be the
default. 

Steal my Config
~~~~~~~~~~~~~~~

If you want my config, you can download it together with the rest of
my dotfiles from this git repository:
`mitsuhiko/dotfiles <http://github.com/mitsuhiko/dotfiles>`_.

