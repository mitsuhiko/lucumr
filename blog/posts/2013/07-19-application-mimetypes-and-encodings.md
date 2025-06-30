---
tags: ['thoughts']
summary: "Some quick notes on application mimetypes and how they deal with
encodings."
---

# Application Mimetypes and Encodings

For some reason lots of people are under the impression that each and
every mimetype accepts a charset parameter.  If you think that is the
case: that is incorrect.  If a mimetype accepts a charset parameter
depends on the mimetype and as a rule of thumb, mimetypes that don't start
with “text/” often don't accept one.

There are two mimetypes where I constantly see people putting charset
declarations next to incorrectly, and then causing a lot of confusion, now
to the point where implementations on the server side discard the actual
specification.  These mimetypes are `application/json` and
`application/x-www-form-urlencoded`.  Neither of those accept a charset.
(On the other hand `application/xml` for instance accepts a charset).

So how do you specify a charset for those?  You don't!  You don't have to
or you can't and in both cases for different reasons.

## JSON Mimetype

The JSON mimetype is defined by [RFC 4627](http://tools.ietf.org/html/rfc4627) and it specifies that the mimetype
does not require any parameters and does not provide any optional
parameters.  About the encoding it has the following to say:

```
Encoding considerations: 8bit if UTF-8; binary if UTF-16 or UTF-32

   JSON may be represented using UTF-8, UTF-16, or UTF-32.  When JSON
   is written in UTF-8, JSON is 8bit compatible.  When JSON is
   written in UTF-16 or UTF-32, the binary content-transfer-encoding
   must be used.
```

And a little bit up, it also explains how to keep them apart:

```
Since the first two characters of a JSON text will always be ASCII
characters [RFC0020], it is possible to determine whether an octet
stream is UTF-8, UTF-16 (BE or LE), or UTF-32 (BE or LE) by looking
at the pattern of nulls in the first four octets.

        00 00 00 xx  UTF-32BE
        00 xx 00 xx  UTF-16BE
        xx 00 00 00  UTF-32LE
        xx 00 xx 00  UTF-16LE
        xx xx xx xx  UTF-8
```

Unfortunately, people started sending charset parameters.  And as they
started sending charset parameters, people started accepting those charset
parameters.  The Python requests library for instance will honor the
charset parameter which now makes it possible to send latin1 data to it.
Not just that, it also honors all kinds of BOMs even though they were
never allowed in the mimetype to begin with.

I don't negatively credit requests for that though because it's on the
receiving side and there supporting more than what the standard says is a
common practice.

## URL Encoding Mimetype

`application/x-www-form-urlencoded` does not support a charset either.
This one for a different reason however.  The reason for this is that
browsers don't really follow HTTP much when it comes to text submission
for legacy reasons.  Browsers will usually not tell the server of which
encoding their data is.  That's usually also not necessary, because the
encoding the browser should use is defined by the server (it's either
defaulting to utf-8 or is defined in the accept-charset parameter of the
form).  Since the server already knows that, the web application will just
know in which encoding it comes in.

However this means that for everything else but the browser and the
application the encoding is unknown!  You cannot reliably determine the
encoding from an HTTP proxy for instance, unless you parse the HTML and
reimplement the browser's charset selection logic and remember it.

Basically `application/x-www-form-urlencoded` does not have a charset,
because the encoding is done on a different level.  It's not decoded from
bytes to unicode as part of HTTP, it's decoded as part of the
application's and only the application has enough information to do that.

HTML5 added support for letting you add an empty hidden form tag with the
special name `_charset_` and the browser will fill it with the charset
it used to submit the form, but HTTP proxies and other middleware won't be
able to rely on that unless they know that the application will always
emit that field.

So in short: `application/x-www-form-urlencoded` does not allow charset
definitions.  You will have to check with the application to see which
charset it expects.  Chances are, it's going to be utf-8 these days.

## Why does it Matter?

It matters because if anything we need to get charsets simplified.  And
there is already a lot of complexity in character set handling we will
always need to do.  Adding a whole new set of confusion by adding charset
parameters to things that previously did not have them should not be done
without at least drafting up a spec about what that means.
