"use strict";

const StateMachine = require('./statemachine.js').SnapshotStateMachine;

module.exports = {

    BankAccount: function(log_factory, base_name) {
        StateMachine.call(this, log_factory, base_name);

        this._deposit = function(amount, txn_id) {
            return this.write('deposit', {amount: amount, txn_id: txn_id});
        };

        this.name = function() {
            return base_name;
        }

        this.begin = function(txn_id) {
            return this.write('begin', {txn_id: txn_id});
        };

        this.prepare = function(txn_id) {
            let this_sm = this
            return this.write('prepare', {txn_id: txn_id}).then(function(command_id) {
                return this_sm.read(command_id).then(function(res) {
                    return res.effect;
                });
            });
        };

        this.commit = function(txn_id) {
            let this_sm = this;
            return this.write('commit', {txn_id: txn_id}).then(function(command_id) {
                return this_sm.read(command_id).then(function(res) {
                    return res.effect;
                });
            });
        };

        this.deposit = function(amount, txn_id) {
            return this._deposit(amount, txn_id).then(function() {
                return true;
            });
        };

        this.deposit_balance = function(amount, txn_id) {
            let this_sm = this;
            return this._deposit(amount, txn_id).then(function(command_id) {
                return this_sm.read(command_id).then(function(res) {
                    return res.state.balance;
                });
            });
        }

        this.balance = function() {
            return this.read().then(function(res) {
                return res.state.balance;
            });
        };

        this.withdraw = function(amount, txn_id) {
            let this_sm = this;
            return this.write('withdraw', {amount: amount, txn_id: txn_id}).then(function(command_id) {
                return this_sm.read(command_id).then(function(res) {
                    return {balance: res.state.balance, effect: res.effect};
                });
            });
        };

        this.initial_state = function() {
            return { balance: 0, seq: 0, pending_txn: {}, prepared: undefined };
        };

        this.apply_command = function(state, command, data) {
            // console.log('apply', state, command, data);
            let txn_id = undefined;
            try {
                switch (command) {
                    case 'deposit':
                        txn_id = data.txn_id;
                        if (undefined != txn_id) {
                            state.pending_txn[txn_id].commands.push({ command: command, data:data });
                        } else {
                            state.seq += 1;
                            state.balance += data.amount;
                        }
                        break;
                    case 'withdraw':
                        txn_id = data.txn_id;
                        if (undefined != txn_id) {
                            state.pending_txn[txn_id].commands.push({ command: command, data:data });
                        } else {
                            state.seq += 1;
                            if (state.balance >= data.amount) {
                                state.balance -= data.amount;
                                return {success: true, amount: data.amount};
                            } else {
                                return {success: false, amount: 0};
                            }
                        }
                        break;
                    case 'begin':
                        state.pending_txn[data.txn_id] = { commands: [], seq: state.seq };
                        return { success: true };
                        break;
                    case 'prepare':
                        txn_id = data.txn_id;
                        console.log('in prepare', state.prepared, state.pending_txn[txn_id].seq, state.seq);
                        if (undefined == state.prepared && state.pending_txn[txn_id].seq == state.seq) {
                            console.log('prepare successful');
                            state.prepared = data.txn_id;
                            return { success: true };
                        } else {
                            console.log('prepare unsuccessful');
                            delete state.pending_txn[txn_id];
                            return { success: false };
                        }
                        break;
                    case 'commit':
                        txn_id = data.txn_id;
                        if (state.prepared != txn_id) {
                            return { success: false };
                        } else {
                            let last_apply_result;
                            let this_ = this;
                            state.pending_txn[txn_id].commands.forEach(function(x) {
                                delete x.data['txn_id'];
                                last_apply_result = this_.apply_command(state, x.command, x.data);
                            });
                            delete state.pending_txn[txn_id];
                            state.prepared = undefined;
                            return { success: true, last_result: last_apply_result };
                        }
                        break;
                    default:
                        // TODO assignment to reference??
                        state = undefined;
                };
            }
            catch (e) {
                console.log(e.stack);
                throw e;
            }
        };
    },

    TransferManager: function(log_factory, base_name) {
        StateMachine.call(this, log_factory, base_name);

        this._check_success = function(res) {
            return new Promise(function(resolve, reject) {
                if (!res.success) {
                    reject(Error('operation failed'));
                } else {
                    resolve(res);
                }
            });
        }

        this.transfer = function(src_account, dst_account, amount) {
            let this_tm = this;
            return this.write('begin', {src_account: src_account.name(), dst_account: dst_account.name(), amount: amount}).then(function(txn_id) {
                return this_tm.read(txn_id).then(function() {
                    let src_begin = src_account.begin(txn_id);
                    let dst_begin = dst_account.begin(txn_id);
                    return Promise.all([src_begin, dst_begin]).then(function() {
                        let src_op = src_account.withdraw(amount, txn_id);
                        let dst_op = dst_account.deposit_balance(amount, txn_id);
                        return Promise.all([src_op, dst_op]).then(function() {
                            return this_tm.write('prepare', {txn_id: txn_id}).then(function() {
                                let src_prepare = src_account.prepare(txn_id).then(this_tm._check_success);
                                let dst_prepare = dst_account.prepare(txn_id).then(this_tm._check_success);
                                return Promise.all([src_prepare, dst_prepare]).then(function() {
                                    this_tm.write('commit', {txn_id: txn_id}).then(function() {
                                        let src_commit = src_account.commit(txn_id).then(this_tm._check_success);
                                        let dst_commit = dst_account.commit(txn_id).then(this_tm._check_success);
                                        return Promise.all([src_commit, dst_commit]).then(function() {
                                            return this_tm.write('complete', {txn_id: txn_id});
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
        };

        this.initial_state = function() {
            return {};
        };

        this.apply_command = function(state, command, data) {
            // TODO - transaction manager logic for implementing fault recovery
        };
    }
};
