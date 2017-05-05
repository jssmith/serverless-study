'use strict';

const assert = require('assert');

const BufferLogFactory = require('../bufferlog').BufferLogFactory;
const Counter = require('../counter').Counter;


describe('Counter', function() {
    describe('#inc()', function() {
        it('should start out with value 0', function(done) {
            let f = new BufferLogFactory();
            let ctr = new Counter(f, 'counter_1');
            ctr.init();
            ctr.get().then(function(value) {
                assert.equal(0, value);
                done();
            }).catch(function(error) {
                done(error);
            });
        });
        it('should increment once', function(done) {
            let f = new BufferLogFactory();
            let ctr = new Counter(f, 'counter_1');
            ctr.init();
            ctr.inc_get().then(function(value) {
                assert.equal(1, value);
                return ctr.get();
            }).then(function(value) {
                assert.equal(1, value);
                done();
            }).catch(function(error) {
                done(error);
            });
        });
        it('should increment repeatedly', function(done) {
            let f = new BufferLogFactory();
            let ctr = new Counter(f, 'counter_1');
            ctr.init();
            ctr.inc_get().then(function(value) {
                assert.equal(1, value);
                return ctr.inc_get();
            }).then(function(value) {
                assert.equal(2, value);
                done();
            }).catch(function(error) {
                done(error);
            });
        });
    });
});
