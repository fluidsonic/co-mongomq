co-mongomq
==========

[co](https://github.com/visionmedia/co) wrapper for [mongomq](https://github.com/jdarling/MongoMQ) package.



Quickstart
----------

```javascript
const MongoMQ = require('co-mongomq');

const queue = new MongoMQ();
yield queue.start();

// monitoring process
queue.on('test', function*(error, message) {
	// co context here, so you can yield :)
	console.log(message);
});

// emitting process
yield queue.emit('test', { my: 'message' });
```



Usage
--------

Please refer to the [documentation of MongoMQ](https://github.com/jdarling/MongoMQ#supported-methods).

### Differences to MongoMQ

- `require('co-mongomq')` directly returns the `MongoMQ` property (no need to use `.MongoMQ`).
- `new MongoMQ()` options do not support `autoStart`. Start manually.
- `.emit()` requires a `yield` and returns as soon as the message was added to the database (or failed).
- `.addListener()` (aka `.on()`) takes a generator as handler which is run in a co context so you can use `yield`.
- `.addListener()` (aka `.on()`) does not have the third argument named `next`. It will be called implicitly unless the generator returns with `false` (and only `false` - not something falsey).
- `.broadcast()` requires a `yield` but does always return immediately since MongoMQ does not support a callback here. It's still asynchronous for forward compatibility.


Installation
------------

	$ npm install co-mongomq



Requirements
------------

Node 0.11+, run with `--harmony` flag.



License
-------

MIT
