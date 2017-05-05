"use strict";

const uuidV4 = require('uuid/v4');

function get_uuid() {
    var buffer = new Buffer(16);
    uuidV4(null, buffer, 0);
    return buffer.toString('base64');
}

function StateMachine(log_factory, base_name) {
    this.log_factory = log_factory;
    this.base_name = base_name;

    this.init = function() {
        this.log = log_factory.create(base_name);
    };

    this._get_log = function() {
        console.log('get log called');
        if (undefined == this.log) {
            console.log('log not defined so opening');
            this.log = log_factory.open(this.base_name);
        }
        return this.log;
    }

    this.write = function(command, data) {
        var this_sm = this;
        var command_id = get_uuid();
        console.log('write called on', this.base_name);
        return new Promise(function(resolve, reject) {
            this_sm._get_log().then(function(log) {
                var msg_bytes = JSON.stringify({command: command, command_id: command_id, data: data}) + '\0';
                return log.write(msg_bytes).then(function() {
                    resolve(command_id);
                });
            }).catch(function(error) {
                console.log('unable to write', error.stack);
                reject(error);
            });
        });
    };

    this.read = function(terminal_command_id) {
        var this_sm = this;
        console.log('read called on', this.base_name);
        return new Promise(function(resolve, reject) {
            console.log('read promise executing');
            this_sm._get_log().then(function(log) {
                console.log('now have a log', log.log_name);
                return log.read().then(function(text, result, response) {
                    // console.log(this_sm.base_name, 'read finished with length', text.length);
                    let state = this_sm.initial_state();
                    let last_command_id = undefined;
                    let effect;
                    let a = text.split('\0').
                        filter(function(x) {return x.length > 0}).
                        map(function(x) {return JSON.parse(x)});
                    console.log(a);
                    a.some(function(element) {
                        effect = this_sm.apply_command(state, element.command, element.data);
                        console.log('effect is', effect);
                        last_command_id = element.command_id;
                        return undefined != terminal_command_id && element.command_id == terminal_command_id;
                    });
                    if (undefined != terminal_command_id && last_command_id != terminal_command_id) {
                        reject(Error('mismatched command:' + last_command_id + ' ' + terminal_command_id));
                    } else {
                        console.log('get finished and returning', state, effect);
                        resolve({state: state, effect: effect});
                    }
                });
            }).catch(function(error) {
                console.log('unable to read', error.stack);
                reject(error);
            });
        });
    };
};

function SnapshotStateMachine(log_factory, base_name) {
    StateMachine.call(this, log_factory, base_name);

    this.init = function() {
        this.log = log_factory.create(base_name);
        this.snapshot_log = log_factory.create(base_name + '-snap');
    };

    this._need_log = function() {
        if (undefined == this.log) {
            this.log = log_factory.open(this.base_name);
        }
        if (undefined == this.snapshot_log) {
            this.snapshot_log = log_factory.open(base_name + '-snap');
        }
    };

    this._get_log = function() {
        this._need_log();
        return this.log;
    }

    this._get_snapshot_log = function() {
        this._need_log();
        return this.snapshot_log;
    }

    this.read = function(terminal_command_id) {
        var this_sm = this;
        return new Promise(function(resolve, reject) {
            console.log('executing read');
            this_sm._get_snapshot_log().then(function(snapshot_log) {
                return new Promise(function(resolve, reject) {
                    // console.log('reading snapshot', snapshot_log);
                    // snapshot_log.read_tail(1000).then(function(text, result, response) {
                    snapshot_log.read().then(function(text, result, response) {
                        console.log('handling result');
                        var commands = text.split('\0');
                        var last_command;
                        if (commands.length > 2) {
                            var last_command = JSON.parse(commands[commands.length - 2]);
                        }
                        console.log('resolving snapshot read with', last_command);
                        resolve(last_command);
                    });
                }).then(function(last_command) {
                    var state;
                    var read_offset;
                    if (undefined == last_command) {
                        state = this_sm.initial_state();
                        read_offset = 0;
                    } else {
                        state = last_command.state;
                        read_offset = last_command.offset;
                    }
                    this_sm._get_log().then(function(log) {
                        console.log('reading from offset', read_offset);
                        log.read(read_offset).then(function(text, result, response) {
                            console.log('processing read');
                            let processed_ct = 0;
                            let processed_length = 0;
                            let last_command_id = undefined;
                            console.log('C');
                            let a = text.split('\0').
                                filter(function(x) {return x.length > 0});
                            console.log('C.1', a.length);
                            let effect = undefined;
                            a.some(function(element) {
                                var command_json = JSON.parse(element);
                                effect = this_sm.apply_command(state, command_json.command, command_json.data);
                                console.log('effect is', effect);
                                processed_ct += 1;
                                processed_length += element.length + 1;
                                last_command_id = command_json.command_id;
                                return undefined != terminal_command_id && command_json.command_id == terminal_command_id;
                            });
                            if (undefined != terminal_command_id && last_command_id != terminal_command_id) {
                                reject(Error('mismatched command:' + last_command_id + ' ' + terminal_command_id));
                            } else {
                                console.log('get finished and returning', state);
                                if (processed_length > 4000) {
                                    console.log('processed enough:', processed_length);
                                    var msg_bytes = JSON.stringify({offset: processed_length + read_offset, state: state}) + '\0';
                                    snapshot_log.write(msg_bytes).then(function() {
                                        console.log('snapshot write completed');
                                    });
                                }
                                resolve({state: state, effect: effect});
                            }
                        });
                    });
                });
            });
        });
    };
};

module.exports = {
    StateMachine: StateMachine,
    SnapshotStateMachine: SnapshotStateMachine
}
