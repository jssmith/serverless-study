'use strict';

const assert = require('assert');

const BufferLogFactory = require('../bufferlog').BufferLogFactory;
const banking = require('../banking');


describe('BankAccount', function() {
    describe('#balance()', function() {
        it('should start out with zero balance', function(done) {
            let f = new BufferLogFactory();
            let acct = new banking.BankAccount(f, 'account_1');
            acct.init();
            acct.balance().then(function(value) {
                assert.equal(0, value);
                done();
            }).catch(function(error) {
                done(error);
            });
        });
    });
    describe('#deposit', function() {
        it('should allow a deposit', function(done) {
            let f = new BufferLogFactory();
            let acct = new banking.BankAccount(f, 'account_1');
            acct.init();
            acct.deposit(100).then(function() {
                return acct.balance();
            }).then(function(value) {
                assert.equal(100, value);
                done();
            }).catch(function(error) {
                done(error);
            });
        });
        it('should allow a deposit with balance result', function(done) {
            let f = new BufferLogFactory();
            let acct = new banking.BankAccount(f, 'account_1');
            acct.init();
            acct.deposit_balance(100).then(function(res) {
                assert.equal(100, res);
                return acct.balance();
            }).then(function(value) {
                assert.equal(100, value);
                done();
            }).catch(function(error) {
                done(error);
            });
        });
        it('should allow repeated deposits with balance', function(done) {
            let f = new BufferLogFactory();
            let acct = new banking.BankAccount(f, 'account_1');
            acct.init();
            acct.deposit_balance(100).then(function(res) {
                assert.equal(100, res);
                return acct.deposit_balance(150);
            }).then(function(value) {
                assert.equal(250, value);
                done();
            }).catch(function(error) {
                done(error);
            });
        });
        it('should allow mixed depsits and deposts with balances', function(done) {
            let f = new BufferLogFactory();
            let acct = new banking.BankAccount(f, 'account_1');
            acct.init();
            acct.deposit(100).then(function() {
                return acct.deposit_balance(150);
            }).then(function(value) {
                assert.equal(250, value);
                done();
            }).catch(function(error) {
                done(error);
            });
        });
    });
    describe('#withdraw', function() {
        it('should fail to withdraw with inadequate balance', function(done) {
            let f = new BufferLogFactory();
            let acct = new banking.BankAccount(f, 'account_1');
            acct.init();
            acct.deposit_balance(100).then(function(balance) {
                assert.equal(100, balance);
                return acct.withdraw(150);
            }).then(function(res) {
                assert.equal(100, res.balance);
                assert.equal(false, res.effect.success);
                assert.equal(0, res.effect.amount);
                done();
            }).catch(function(error) {
                done(error);
            });
        });
        it('should succeed with withdrawal with adequate balance', function(done) {
            let f = new BufferLogFactory();
            let acct = new banking.BankAccount(f, 'account_1');
            acct.init();
            acct.deposit_balance(200).then(function(balance) {
                assert.equal(200, balance);
                return acct.withdraw(150);
            }).then(function(res) {
                assert.equal(50, res.balance);
                assert.equal(true, res.effect.success);
                assert.equal(150, res.effect.amount);
                done();
            }).catch(function(error) {
                done(error);
            });
        });
    });
});

describe('TransferManager', function() {
    describe('#move', function() {
        it('sould move funds from one account to another', function(done) {
            let f = new BufferLogFactory();
            let tm = new banking.TransferManager(f, 'tm');
            let acct_a = new banking.BankAccount(f, 'account_a');
            let acct_b = new banking.BankAccount(f, 'account_b');
            tm.init();
            acct_a.init();
            acct_b.init();
            acct_a.deposit_balance(200).then(function(balance) {
                assert.equal(200, balance);
                console.log('finished deposit');
                return tm.transfer(acct_a, acct_b, 150).then(function(res) {
                    console.log('XXX',res);
                    return acct_a.balance().then(function(balance) {
                        assert.equal(50, balance);
                        return acct_b.balance().then(function(balance) {
                            assert.equal(150, balance);
                            done();
                        });
                    });
                });
            }).catch(function(error) {
                done(error);
            });
        });
    });
});
