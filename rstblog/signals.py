# -*- coding: utf-8 -*-
"""
rstblog.signals
~~~~~~~~~~~~~~~

Blinker signals for the modules and other hooks.

:copyright: (c) 2010 by Armin Ronacher.
:license: BSD, see LICENSE for more details.
"""

from __future__ import absolute_import
from blinker import Namespace


signals = Namespace()

#: before the file is processed.  The context is already prepared and if
#: the given program was able to extract configuration from the file, it
#: will already be stored on the context.
before_file_processed = signals.signal("before_file_processed")

#: after the file was prepared
after_file_prepared = signals.signal("after_file_prepared")

#: after the file was published (public: yes)
after_file_published = signals.signal("after_file_published")

#: fired the moment before a template is rendered with the context object
#: that is about to be passed to the template.
before_template_rendered = signals.signal("before_template_rendered")

#: fired right before the build finished.  This is the perfect place to
#: write some more files to the build folder.
before_build_finished = signals.signal("before_build_finished")

#: emitted right before a file is actually built.
before_file_built = signals.signal("before_file_built")
