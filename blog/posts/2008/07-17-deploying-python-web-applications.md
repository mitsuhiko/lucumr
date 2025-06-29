---
tags:
  - python
  - fabric
summary: |
---

# Deploying Python Web Applications

Every once in a while I'm really impressed by a library I stumble upon.
A while back that was [virtualenv](http://lucumr.pocoo.org/cogitations/2008/07/05/virtualenv-to-the-rescue/),
now i stumbled upon [fabric](http://www.nongnu.org/fab/). I was using
capistrano for a [project I was working on](http://www.plurk.com/)
which was kinda okay but somehow I wasn't sold to it.

Yesterday however [apollo13](http://djangopeople.net/apollo13/)
stumbled upon fabric which is capistrano just in Python, with a working
put command and less annoying in general.

In combination with a custom virtualenv bootstrapping script Python web
application deployment is a charm. One “fab bootstrap” later the servers
are creating a virtual python environment, compiling all dependencies,
checking out all eggs and initializing the application environment.
Updates are just one “fab production deploy” away.

And the best part is that fabric is not limited to Python. You can use
it to deploy anything you can control over ssh.

Here an example fabfile (the file that controls the deployment)

```python
set(
    fab_hosts = ['srv1.example.com', 'srv2.example.com']
)

def deploy():
    """Deploy the latest version."""
    # pull all changes from mercurial and touch the wsgi file to
    # tell the apache to reload the application.
    run("hg pull -u; touch application.wsgi")

def bootstrap():
    """Asks for a list of servers and bootstrapps the application there."""
    set(fab_hosts=[x.strip() for x in raw_input('Servers: ').split()])
    run("hg clone http://repository.example.com/application")
    local("./generate-wsgi-file.py &gt; /tmp/application.wsgi")
    put("/tmp/application.wsgi", "application.wsgi")
```

Saved as fabfile.py “fab bootstrap” then asks for some servers and
bootstraps the application there, after changes in the repository you
can “fab deploy” the latest version. Of course that's just a very basic
made up example, but it shows how you can use fabric.

I'm using makefiles currently to execute common tasks for various Python
projects (like releasing code, resting unittests and much more), I
suppose fabric could also do that for me. And that would have the
advantage that it works for windows users too.
