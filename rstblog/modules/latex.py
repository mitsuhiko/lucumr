# -*- coding: utf-8 -*-
"""
    rstblog.modules.latex
    ~~~~~~~~~~~~~~~~~~~~~

    Simple latex support for formulas.

    :copyright: (c) 2010 by Armin Ronacher, Georg Brandl.
    :license: BSD, see LICENSE for more details.
"""
from __future__ import absolute_import
import os
import re
import tempfile
import shutil
from hashlib import sha1
from os import path, getcwd, chdir
from subprocess import Popen, PIPE
from werkzeug import escape

from docutils import nodes, utils
from docutils.parsers.rst import Directive, directives, roles

DOC_WRAPPER = r'''
\documentclass[12pt]{article}
\usepackage[utf8x]{inputenc}
\usepackage{amsmath}
\usepackage{amsthm}
\usepackage{amssymb}
\usepackage{amsfonts}
%%\usepackage{mathpazo}
\usepackage{bm}
\usepackage[active]{preview}
\pagestyle{empty}
\begin{document}
\begin{preview}
%s
\end{preview}
\end{document}
'''

_depth_re = re.compile(rb'\[\d+ depth=(-?\d+)\]')


def wrap_displaymath(math):
    ret = []
    for part in math.split('\n\n'):
        ret.append('\\begin{split}%s\\end{split}\\notag' % part)
    return '\\begin{gather}\n' + '\\\\'.join(ret) + '\n\\end{gather}'


def find_depth(stdout):
    for line in stdout.splitlines():
        m = _depth_re.match(line)
        if m:
            return int(m.group(1))


def render_math(context, math):
    relname = '_math/%s.png' % sha1(math.encode('utf-8')).hexdigest()
    full_filename = context.builder.get_full_static_filename(relname)
    url = context.builder.get_static_url(relname)

    # if we rebuild the document, we also want to rebuild the math
    # for it.
    if os.path.isfile(full_filename):
        os.remove(full_filename)

    latex = DOC_WRAPPER % wrap_displaymath(math)

    depth = None
    tempdir = tempfile.mkdtemp()
    try:
        tf = open(path.join(tempdir, 'math.tex'), 'wb')
        tf.write(latex.encode('utf-8'))
        tf.close()

        # build latex command; old versions of latex don't have the
        # --output-directory option, so we have to manually chdir to the
        # temp dir to run it.
        ltx_args = ['latex', '--interaction=nonstopmode', 'math.tex']

        curdir = getcwd()
        chdir(tempdir)

        try:
            p = Popen(ltx_args, stdout=PIPE, stderr=PIPE)
            stdout, stderr = p.communicate()
        finally:
            chdir(curdir)

        if p.returncode != 0:
            raise Exception('latex exited with error:\n[stderr]\n%s\n'
                            '[stdout]\n%s' % (stderr, stdout))

        directory = os.path.dirname(full_filename)
        if not os.path.isdir(directory):
            os.makedirs(directory)
        dvipng_args = ['dvipng', '-o', full_filename, '-T', 'tight', '-z9',
                       '-D', str(int(context.builder.config.root_get(
                            'modules.latex.font_size', 16) * 72.27 / 10)),
                       '-bg', 'Transparent',
                       '--depth', os.path.join(tempdir, 'math.dvi')]
        p = Popen(dvipng_args, stdout=PIPE, stderr=PIPE)
        stdout, stderr = p.communicate()
        if p.returncode != 0:
            raise Exception('dvipng exited with error:\n[stderr]\n%s\n'
                            '[stdout]\n%s' % (stderr, stdout))
        depth = find_depth(stdout)
    finally:
        try:
            shutil.rmtree(tempdir)
        except (IOError, OSError):
            # might happen? unsure
            pass

    return url, depth


def make_imgtag(url, depth, latex):
    bits = ['<img src="%s" alt="%s"' % (escape(url), escape(latex))]
    if depth is not None:
        bits.append(' style="vertical-align: %dpx"' % -depth)
    bits.append('>')
    return ''.join(bits)


class MathDirective(Directive):
    has_content = True
    required_arguments = 0
    optional_arguments = 1
    final_argument_whitespace = True
    option_spec = {
        'label': directives.unchanged,
        'nowrap': directives.flag
    }

    def run(self):
        latex = '\n'.join(self.content)
        if self.arguments and self.arguments[0]:
            latex = self.arguments[0] + '\n\n' + latex
        url, _ = render_math(self.state.document.settings.rstblog_context,
                             latex)
        return [nodes.raw('', u'<blockquote class="math">%s</blockquote>'
                          % make_imgtag(url, None, latex), format='html')]


def math_role(role, rawtext, text, lineno, inliner, options={}, content=[]):
    latex = utils.unescape(text, restore_backslashes=True)
    url, depth = render_math(inliner.document.settings.rstblog_context, latex)
    return [nodes.raw('', u'<span class="math">%s</span>' %
                      make_imgtag(url, depth, latex), format='html')], []


def setup(builder):
    directives.register_directive('math', MathDirective)
    roles.register_local_role('math', math_role)
