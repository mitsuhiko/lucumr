public: yes
summary: More thoughts on supply chain and package managers.

Congratulations: We Now Have Opinions on Your Open Source Contributions
=======================================================================

I wrote plenty `about </2022/1/10/dependency-risk-and-funding/>`__
`supply-chain </2019/7/29/dependency-scaling/>`__ `issues
</2016/3/24/open-source-trust-scaling/>`__ and I'm afraid I
have more opinions I would like to share.  On Friday I along many others
in the Python community "congratulated" me on having created
`a critical package <https://pypi.org/security-key-giveaway/>`__.
Once packages are within a certain level of adoption compared to the
global downloads, they are considered critical.  Currently if you
maintain a "critical" package it means that you need to enroll a multi factor
authenticator.  It appears that the hypothetical consequence of not enrolling
into 2FA is not being able to release new versions.  My visceral reaction to
this email was not positive.

From the package index' point of view increasing the protection for critical
packages makes a lot of sense.  Running a package index is expensive and
the users of the package index really do want to reduce the chance that a
package that they depend on is compromised.  In theory that type of protection
really should apply to every package.  That's not what PyPI did, they decided to
draw a line between “critical” and other packages.

From the index' point of view I really understand this, but as a developer
of Open Source software I'm quite conflicted about this.  The message to
me as a maintainer is quite clear: once a project achieved criticality, then the index
wants to exercise a certain amount of control.  From the index' perspective
it's within the bounds of it's terms of service to put further restrictions on
such a project.

However when I create an Open Source project, I do not chose to create a
“critical” package.  It becomes that by adoption over time.  Right now the
consequence of being a critical package is quite mild: you only need to enable
2FA.  But a line has been drawn now and I'm not sure why it wouldn't be in the
index best interest to put further restrictions in place.

Instead of putting the burden to the user of packages, we're now piling stuff
onto the developer who already puts their own labor and time into it.  From
the index' point of view there is a benefit to not enforce rules on everybody
as some of these rules might make the use of the index burdensome, but putting
the burden only on critical packages does not hurt the adoption just as much.
As mentioned earlier I would not make the case that 2FA is not burdensome,
it's a sensible thing.  But clearly the index considers it burdensome
enough to not enforce it for everybody.  More importantly though is what
could come next.

There is a hypothetical future where the rules tighten.  One could imagine that
an index would like to enforce cryptographic signing of newly released packages.
Or the index wants to enable reclaiming of critical packages if the author does
not respond or do bad things with the package.  For instance a critical package
being unpublished is a problem for the ecosystem.  One could imagine a situation
where in that case the Index maintainers take over the record of that package on
the index to undo the damage.  Likewise it's more than imaginable that an index
of the future will require packages to enforce a minimum standard for critical
packages such as a certain SLO for responding to critical incoming requests
(security, trademark laws etc.).

I think as an Open Source developer who is using the index for free, I can't
demand much from it.  I'm in many ways beholden to the rules and requirements
that the index upholds.  In some ecosystems there is really not much of a choice
because only the primary index is capable of providing packages or alternative
indexes are hard to maintain.  It's also not in the interest of the primary
index to allow packages outside of the index to exist, as then the rules that
the index wants to put in place cannot be enforced.

So if I were to wish for something, then that the index has no policies beyond
immutability of assets, and instead we use an independent layer of the index to
enforce policies.

In the Rust world Mozilla started a project that looks quite promising called
`cargo-vet <https://github.com/mozilla/cargo-vet>`__.  It's based on the idea
that the users of packages can vet dependencies and most importantly individual
versions of them.  You can share your vettings with others or at least within
your organization.  There is an interactive tool that assists you in the
vetting process.  It will help you audit the source code, the diffs between
vetted versions, show you the changelog and more.  After you made a decision about
the individual version you can commit your attestation and others can use it too.
Others typically means same company, but one could imagine that this also turns
into independent companies or others to perform these vettings.

For me the most critical part of vetting is that it's based on versions and not
on the people behind it.  In a sense people don't matter, the code does.  I can
be a perfectly functioning human one day, and the next one i develop a psychological
disorder and do something stupid.  I'm happy to accept specifically vetted
versions but I don't necessarily want to just upgrade to the latest version of a
package anyways.  This also works better if packages transfer from one person to
another.

What I like about the ``cargo-vet`` approach is that it separates the concerns of
running an index from vetting.  It also means that in theory that multiple competing
indexes could be provided and vetting can still be done.  Most importantly it puts
the friction of the vetting to the community that most cares about this: commercial
users.  Instead of Open Source maintainers having to jump through more hoops, the
vetting can be outsourced to others.  Trusted "Notaries" could appear that
provide vetting for the most common library versions and won't approve of a new
release until it undergoes some vetting.  The potential beauty of this system is
also that a version resolver could constrain dependencies within vetted
libraries.  This can greatly reduce the total number of versions of packages in
use in a company or project.  Instead of developers in a commercial setting
updating to the latest version and potentially upgrading to something that contains
a worm, the upgrade would only go to the latest vetted version that the company
already accepted.

Maybe we can find a future for package indexes where maintainers of packages are
not burdened further because the internet started depending on it.  It's not the
fault of the creator that their creation became popular.
