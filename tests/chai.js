// Mini implémentation Chai compatible (expect API) pour tests sans CDN
(function (global) {
  'use strict';

  function Assertion(val, msg) {
    this._val = val;
    this._msg = msg || '';
    this._negate = false;
  }

  // Chaînage neutre
  ['to', 'be', 'been', 'is', 'that', 'which', 'and', 'has', 'have', 'with', 'at', 'of', 'same', 'but', 'does', 'still', 'also'].forEach(function (word) {
    Object.defineProperty(Assertion.prototype, word, {
      get: function () { return this; }
    });
  });

  // .not
  Object.defineProperty(Assertion.prototype, 'not', {
    get: function () { this._negate = !this._negate; return this; }
  });

  function assert(expr, positiveMsg, negativeMsg, negate) {
    var pass = negate ? !expr : expr;
    if (!pass) {
      throw new Error(negate ? (negativeMsg || positiveMsg) : positiveMsg);
    }
  }

  // .equal(expected)
  Assertion.prototype.equal = function (expected) {
    assert(this._val === expected,
      'expected ' + JSON.stringify(this._val) + ' to equal ' + JSON.stringify(expected),
      'expected ' + JSON.stringify(this._val) + ' to not equal ' + JSON.stringify(expected),
      this._negate);
    return this;
  };

  // .eql(expected) — deep equal simpliste
  Assertion.prototype.eql = function (expected) {
    assert(JSON.stringify(this._val) === JSON.stringify(expected),
      'expected ' + JSON.stringify(this._val) + ' to deeply equal ' + JSON.stringify(expected),
      'expected ' + JSON.stringify(this._val) + ' to not deeply equal ' + JSON.stringify(expected),
      this._negate);
    return this;
  };

  // .null
  Object.defineProperty(Assertion.prototype, 'null', {
    get: function () {
      assert(this._val === null,
        'expected ' + JSON.stringify(this._val) + ' to be null',
        'expected ' + JSON.stringify(this._val) + ' to not be null',
        this._negate);
      return this;
    }
  });

  // .undefined
  Object.defineProperty(Assertion.prototype, 'undefined', {
    get: function () {
      assert(this._val === undefined,
        'expected ' + JSON.stringify(this._val) + ' to be undefined',
        'expected ' + JSON.stringify(this._val) + ' to not be undefined',
        this._negate);
      return this;
    }
  });

  // .true / .false
  Object.defineProperty(Assertion.prototype, 'true', {
    get: function () {
      assert(this._val === true,
        'expected ' + JSON.stringify(this._val) + ' to be true',
        'expected ' + JSON.stringify(this._val) + ' to not be true',
        this._negate);
      return this;
    }
  });
  Object.defineProperty(Assertion.prototype, 'false', {
    get: function () {
      assert(this._val === false,
        'expected ' + JSON.stringify(this._val) + ' to be false',
        'expected ' + JSON.stringify(this._val) + ' to not be false',
        this._negate);
      return this;
    }
  });

  // .ok
  Object.defineProperty(Assertion.prototype, 'ok', {
    get: function () {
      assert(!!this._val,
        'expected ' + JSON.stringify(this._val) + ' to be truthy',
        'expected ' + JSON.stringify(this._val) + ' to be falsy',
        this._negate);
      return this;
    }
  });

  // .length(n)
  Assertion.prototype.length = function (n) {
    var len = this._val && this._val.length;
    assert(len === n,
      'expected length ' + len + ' to equal ' + n,
      'expected length ' + len + ' to not equal ' + n,
      this._negate);
    return this;
  };

  // .lengthOf(n) alias
  Assertion.prototype.lengthOf = Assertion.prototype.length;

  // .include(str)
  Assertion.prototype.include = function (str) {
    var has = (typeof this._val === 'string')
      ? this._val.includes(str)
      : (Array.isArray(this._val) ? this._val.includes(str) : false);
    assert(has,
      'expected ' + JSON.stringify(this._val) + ' to include ' + JSON.stringify(str),
      'expected ' + JSON.stringify(this._val) + ' to not include ' + JSON.stringify(str),
      this._negate);
    return this;
  };
  Assertion.prototype.includes = Assertion.prototype.include;
  Assertion.prototype.contain  = Assertion.prototype.include;
  Assertion.prototype.contains = Assertion.prototype.include;

  // .instanceof(ctor)
  Assertion.prototype.instanceof = function (ctor) {
    assert(this._val instanceof ctor,
      'expected value to be instance of ' + (ctor.name || ctor),
      'expected value to not be instance of ' + (ctor.name || ctor),
      this._negate);
    return this;
  };

  // .above(n) / .least(n) / .below(n) / .most(n)
  Assertion.prototype.above = function (n) {
    assert(this._val > n, 'expected ' + this._val + ' to be above ' + n, null, this._negate);
    return this;
  };
  Assertion.prototype.least = function (n) {
    assert(this._val >= n, 'expected ' + this._val + ' to be at least ' + n, null, this._negate);
    return this;
  };
  Assertion.prototype.below = function (n) {
    assert(this._val < n, 'expected ' + this._val + ' to be below ' + n, null, this._negate);
    return this;
  };
  Assertion.prototype.most = function (n) {
    assert(this._val <= n, 'expected ' + this._val + ' to be at most ' + n, null, this._negate);
    return this;
  };

  // .property(name[, val])
  Assertion.prototype.property = function (name, val) {
    var hasIt = this._val != null && name in Object(this._val);
    assert(hasIt, 'expected object to have property ' + name, null, this._negate);
    if (arguments.length > 1) {
      assert(this._val[name] === val,
        'expected .' + name + ' to equal ' + JSON.stringify(val), null, false);
    }
    return this;
  };

  // .keys([...])
  Assertion.prototype.keys = function (keys) {
    var objKeys = Object.keys(this._val || {});
    var missing = keys.filter(function (k) { return !objKeys.includes(k); });
    assert(missing.length === 0,
      'expected object to have keys ' + JSON.stringify(keys) + ' (missing: ' + JSON.stringify(missing) + ')',
      null, this._negate);
    return this;
  };

  // .throw()
  Assertion.prototype.throw = function (errOrMsg) {
    var threw = false;
    try { this._val(); } catch(e) { threw = true; }
    assert(threw,
      'expected function to throw', 'expected function to not throw', this._negate);
    return this;
  };
  Assertion.prototype.throws = Assertion.prototype.throw;

  function expect(val, msg) {
    return new Assertion(val, msg);
  }

  var chai = { expect: expect, Assertion: Assertion };

  // Export
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = chai;
  } else {
    global.chai = chai;
  }
}(typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : this));
