'use strict';

var assert = require('assert');

var BufferLogFactory = require('../bufferlog').BufferLogFactory;

describe('BufferLog', function() {
    describe('#append()', function() {
        it('should allow appending of data', function(done) {
            var f = new BufferLogFactory();
            f.create('my_log').then(function(l) {
                return l.write('hello').then(function() {
                    return l.read(0, 5);
                }).then(function(res) {
                    assert.equal('hello', res);
                    return l.length();
                }).then(function(res) {
                    assert.equal(5, res);
                    done();
                });
            }).catch(function(error) {
                done(error);
            });
        });
        it('should allow repeated appending of data', function(done) {
            var f = new BufferLogFactory();
            f.create('my_log').then(function(l) {
                return l.write('hello').then(function() {
                    l.write(' world');
                }).then(function() {
                    return l.read(0, 11);
                }).then(function(res) {
                    assert.equal('hello world', res);
                    done();
                });
            }).catch(function(error) {
                done(error);
            });
        });
        // it('should raise an error on read beyond end')
    });
    describe('#read()', function() {
        it('should read the entire object', function(done) {
            var f = new BufferLogFactory();
            f.create('my_log').then(function(l) {
                return l.write('hello').then(function() {
                    return l.read();
                }).then(function(res) {
                    assert.equal('hello', res);
                    done();
                });
            }).catch(function(error) {
                done(error);
            });
        });
    });
    describe('#read_tail()', function() {
        it('should read the entire object as a tail', function(done) {
            var f = new BufferLogFactory();
            f.create('my_log').then(function(l) {
                return l.write('hello').then(function() {
                    return l.read_tail(100);
                }).then(function(res) {
                    assert.equal('hello', res);
                    done();
                });
            }).catch(function(error) {
                done(error);
            });
        });
        it('should read the last letters', function(done) {
            var f = new BufferLogFactory();
            f.create('my_log').then(function(l) {
                return l.write('hello').then(function() {
                    return l.read_tail(3);
                }).then(function(res) {
                    assert.equal('llo', res);
                    done();
                });
            }).catch(function(error) {
                done(error);
            });
        });
    });
});
