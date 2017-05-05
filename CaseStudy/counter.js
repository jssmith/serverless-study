"use strict";

const StateMachine = require("./statemachine").SnapshotStateMachine;

module.exports = {

    Counter: function(log_factory, base_name) {
        StateMachine.call(this, log_factory, base_name);

        this.initial_state = function() {
            return { ct: 0 };
        }

        this.apply_command = function(state, command, data) {
            if (command == 'inc') {
                state.ct += 1;
            }
            return state.ct;
        }

        this.inc = function() {
            return this.write('inc');
        };

        this.get = function(terminal_command_id) {
            console.log('invoking get');
            return this.read(terminal_command_id).then(function(res) {
                console.log(res);
                return res.state.ct;
            });
        };

        this.inc_get = function() {
            let this_ctr = this;
            return this.inc().then(function(command_id) {
                console.log('inc_get looking for',command_id)
                return this_ctr.get(command_id);
            });
        };
    },

    BufferLogFactory: function() {
        this._logs = {};

        this.BufferLog = function(log_name) {
            this.buffer = new Buffer(10000);

            this.write = function(text) {
                return new Promise(function(text) {
                    // TODO append to the log
                });
            };

            this.read = function(offset, length) {
                return new Promise(function(resolve, reject) {
                    // TODO read from the log
                });
            };
            this.read_tail = function(tail_length) {
                return new Promise(function(resolve, reject) {
                    // TODO read from the log
                });
            }
            this.length = function() {
                this_l = this;
                return new Promise(function(resolve, reject) {
                    resolve(this_l.buffer.length);
                });
            };
        };

        this.open = function(log_name) {
            this_lf = this;
            return new Promise(function(resolve, reject) {
                resolve(this_lf._logs[log_name]);
            });
        };

        this.create = function(log_name) {
            this_lf = this;
            return new Promise(function(resolve, reject) {
                var log = new this_lf.BufferLog(log_name);
                this_lof._logs[log_name] = log;
                resolve(log);
            });
        };
    }

}
