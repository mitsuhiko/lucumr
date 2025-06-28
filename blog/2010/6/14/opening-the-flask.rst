public: yes
tags: [flask, python]
summary: |
  First part of a series of articles about how Flaks works internally
  and how you can create micro frameworks with Werkzeug.

Opening The Flask
=================

Howdy everybody. This is the first part of a multi-part blog post about
creating web frameworks based on `Werkzeug
<http://werkzeug.pocoo.org/>`_ and other existing code. This is
obviously based on my `Flask <http://flask.pocoo.org/>`_ microframework.
So it probably makes sense to head over to the documentation first to
look at some example code. But before we get started, let's discuss
first about why you should create your own frameworks. 

Why create your own Framework
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

It is quite unpopular these days to go with building your own framework;
everybody quickly shouts "reinventing the wheel" and points you to one
of the tons of existing web frameworks out there. But it is actually a
really good idea to create a framework for an application and not go
with a stock one. Why? Because you are a lot more flexible and your
application might require something that does not exist yet. For an
application I wrote in the past in the very early Django days the
development process looked a lot like this: 

Step 1: download django, Step 2: get started and feel happy, Step 3:
encounter problems in the framework design and start modifiying the
core, Step 4: phase more and more Django code out and end up with a
completely new package that everybody hates. 

Turns out: Django like every other framework out there is improving
quickly, but often not in the areas you might be interested in. Then you
start modifying it yourself and when Django improves sideways, you
suddenly end up in the situation where it becomes nearly impossible to
upgrade to a newer Django version or it's too painful. Obviously Django
has greatly improved since then, but a few things continue to work
differently than I want them to work. For one I personally don't like
the template engine too much and also would love the ORM to ensure that
objects with the same primary key are actually the same objects and
queries sent less often. These are things that are very unlikely to
change in Django and there are really good reasons why this will not
change which are totally fine, but certainly not what I want. 

Another reason to roll your own framework is that you know everything
and you can fix it quickly yourself. 

End Result
~~~~~~~~~~

This is what should work at the end of the day:

.. sourcecode:: python

    from yourflask import YourFlask
    app = YourFlask()

    @app.route('/')
    def index(request):
        return 'Hello World'

    if __name__ == '__main__':
        app.run()

Looks a lot like a simplified Flask version, which is exactly what it
should be. Not yet as capable, but easier to dive in and to understand
the concepts. 

In a nutshell: 1) create an application, 2) register functions on that
application that listen on a specific path (or URL rule), 3) these
functions return response objects or strings. We also pass the request
object explicitly to the function for now because that's easier to
understand and implement. 

The Code
~~~~~~~~

The following code implements the full framework for this blog post.  As
I said, it's a very simplified Flask but it is capable of producing
simple web applications and to run the example from above:

.. sourcecode:: python

    from werkzeug import Request, Response, run_simple
    from werkzeug.exceptions import HTTPException
    from werkzeug.routing import Map, Rule

    class YourFlask(object):

        def __init__(self):
            self.url_map = Map()
            self.views = {}

        def route(self, string, **options):
            def decorator(f):
                options['endpoint'] = f.__name__
                self.views[f.__name__] = f
                self.url_map.add(Rule(string, **options))
                return f
            return decorator

        def run(self, **options):
            return run_simple('localhost', 5000, self, **options)

        def make_response(self, rv):
            if isinstance(rv, basestring):
                return Response(rv, mimetype='text/html')
            return rv

        def __call__(self, environ, start_response):
            request = Request(environ)
            adapter = self.url_map.bind_to_environ(environ)
            try:
                endpoint, values = adapter.match()
                response = self.make_response(self.views[endpoint](request, **values))
            except HTTPException, e:
                response = e
            return response(environ, start_response)

So how exactly does it work and what does it do? The following list is
the summary of the above code: 

* We create a class called `YourFlask` that implements a WSGI
  application and provides methods to register callback functions and
  binds them to a Werkzeug URL map. 
* The `route()` method can be used as a decorator to register new view
  functions. It does this by accepting a string with the URL rule as
  first argument and accepts some more keyword arguments that are
  forwarded unchanged. The routing system uses an opaque string to
  identify functions. This is called the endpoint. In this example we
  will use the function name as endpoint (something Flask does as well
  for simple setups). 
* The `run()` method just starts the internal development server that
  comes with Werkzeug. That's just a nice shortcut. 
* `make_response()` is called with the return value from the view
  function. If it's a string, we create a response object. That's just a
  nice shortcut. 
* In the `__call__()` method we implement the full WSGI application.
  First a request object is created from the WSGI environment and then
  the URL map is used to create an adapter. This adapter is basically
  bound to the WSGI environment and can be used to match the current
  URL. If a match is found the endpoint and values are returned (the
  values are variable parts in the rule as dictionary). In case nothing
  matched, a `NotFound` exception is raised which incidentally is also
  an `HTTPException`. If all works out we look up the view function and
  pass it the values and the request object. 
* The return value of the function is passed to our `make_response()`
  method so that we can ensure it's a response object. 
* If an `HTTPException` is raised we catch it and use it as response
  object. It's not exactly a response object but close enough to one
  that we can do the same with it. 
* Either way, the response is invoked as WSGI application and the
  application iterator is returned. 

Where WSGI fits in
~~~~~~~~~~~~~~~~~~

So what we created is a WSGI application. How exactly does it work and
where is the WSGI part? The majority of the pain is handled for us by
Werkzeug. WSGI itself looks like this: 

1. There is a thing that can be called. It's passed a WSGI
   environment (which is basically a dict with incoming data) and a
   function that is used to start the response. 
2. What the function returns is an iterable of data send back to the
   browser, it has to call the response starting function first. 

If you look close, we are doing that in our `__call__()` method. Well,
it's not really visible but it happens. When we invoke the response
thingy, internally Werkzeug will call the response starting function and
all for us. We also use the WSGI environment when we create the request
object. 

The request object itself gives us access to all the stuff that is
incoming from the browser: where the request went, what values were
transmitted, what browser is used, the cookies etc. We will focus on
that with the next blog post. 

Coming up Next
~~~~~~~~~~~~~~

Now that all is working fine we should focus on these things next: 

1. explore the concept of thread / context local objects to avoid
   passing the request object (not saying it's necessarily a good idea
   but crucial for understanding web frameworks in general. Even if you
   think Django does not use them, it does. The i18n and database
   system is powered by thread local objects). 
2. add support for a template engine and serving up static files 
3. add more helper functions for URL building, rendering templates
   and aborting requests with errors. 

Stay tuned :)
