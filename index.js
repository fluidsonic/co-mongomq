'use strict';

const assert = require('assert');
const co = require('co');
const OriginalClass = require('mongomq').MongoMQ;


const Class = module.exports = function MongoMQ(options) {
	options = options || {};

	assert(!options.autoStart, 'options.autoStart is not supported. Start manually.');
	options.autoStart = false;

	const original = new OriginalClass(options);

	const originalOnce = original.once;
	original.once = function once(event, options, callback) {
		if (typeof(options) === 'function') {
			callback = options;
			options = {};
		}
		else {
			options = options || {};
		}

		// We change the logic of emit() to return as soon as the message was inserted to the database.
		if (callback && options.listenerType === 'responseListener') {
			callback();
			return;
		}

		originalOnce.apply(this, arguments);
	};

	this._mappedCallbacks = {};
	this._original = original;
};


Class.options = OriginalClass.options;
Class.MongoMQ = Class;  // for backward-compatibility to MongoMQ itself


Class.prototype.addListener = function addListener(event, options, callback) {
	if (typeof(options) === 'function') {
		callback = options;
		options = {};
	}

	if (!callback) {
		return;
	}
	assert(typeof callback === 'function', '"callback" must be a function.');

	const mappedCallbacks = this._mappedCallbacks[event] || (this._mappedCallbacks[event] = new Map());

	let handler = mappedCallbacks.get(callback);
	if (!handler) {
		handler = createHandler(event, callback);
		mappedCallbacks.set(callback, handler);
	}

	this._original.on(event, options, handler);
};


Class.prototype.broadcast = function broadcast(event, message) {
	const original = this._original;
	return function callback() {
		original.broadcast(event, message);

		// MongoMQ.broadcast doesn't support a success/failure callback yet. We make this function async anyway to provide forward compatibility when this changes.
		callback();
	};
};


Class.prototype.checkConnection = function checkConnection() {
	return this._original.checkConnection.bind(this._original);
};


// Different from MongoMQ, we return as soon as the message was added to the database or throw if it fails.
Class.prototype.emit = function emit(event, message) {
	return this._original.emit.bind(this._original, event, message);
};


Class.prototype.listeners = function listeners(event) {
	return this._original.listeners(event);
};


Class.prototype.on = Class.prototype.addListener;


Class.prototype.once = function once(event, options, callback) {
	if (typeof(options) === 'function') {
		callback = options;
		options = {};
	}

	if (!callback) {
		return;
	}
	assert(typeof callback === 'function', '"callback" must be a function.');

	this._original.on(event, options, createHandler(event, callback));
};


Class.prototype.onAny = function onAny(options, callback) {
	// will call this.on() internally
	this._original.onAny.call(this, options, callback);
};


Class.prototype.removeAllListeners = function removeAllListeners(event) {
	delete this._mappedCallbacks[event];
	return this._original.removeAllListeners(event);
};


Class.prototype.removeListener = function removeListener(event, callback) {
	const mappedCallbacks = this._mappedCallbacks[event];
	if (!mappedCallbacks) {
		return;
	}

	const handler = mappedCallbacks.get(callback);
	if (!handler) {
		return;
	}

	mappedCallbacks.delete(callback);
	this._original.removeListener(event, handler);
};


Class.prototype.start = function start() {
	return this._original.start.bind(this._original);
};


Class.prototype.status = function status() {
	return this._original.status.bind(this._original);
};


Class.prototype.stop = function stop() {
	return this._original.stop.bind(this._original);
};



function createHandler(event, callback) {
	const runner = co(callback);

	return function handler(error, message, next) {
		runner(error, message, function(runnerError, runnerResult) {
			if (runnerError) {
				console.error('Failed executing MongoMQ callback for event "%s": %s', event, runnerError.stack || runnerError);
			}

			if (runnerResult !== false && next) {
				next();
			}
		});
	};
}
