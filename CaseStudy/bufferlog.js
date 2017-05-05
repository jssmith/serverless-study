"use strict";

module.exports = {
    BufferLogFactory: function() {
        this._logs = {};

        this.BufferLog = function(log_name) {
            this.log_name = log_name;
            this.buffer = new Buffer(10000);
            this.position = 0;

            this.write = function(text) {
                const this_l = this;
                return new Promise(function(resolve, reject) {
                    var src;
                    if (Buffer.isBuffer(text)) {
                        src = text;
                    } else {
                        src = new Buffer(text);
                    }
                    src.copy(this_l.buffer, this_l.position);
                    this_l.position += src.length;
                    resolve();
                });
            };

            this.read = function(offset, length) {
                var this_l = this;
                return new Promise(function(resolve, reject) {
                    if (offset > this_l.position) {
                        reject(Error('start out of bounds'));
                    } else if (offset + length > this_l.position) {
                        console.log(offset, length, this_l.position);
                        reject(Error('end out of bounds'));
                    }
                    if (undefined == offset) {
                        offset = 0;
                    }
                    if (undefined == length) {
                        length = this_l.position - offset;
                    }
                    var b = new Buffer(length);
                    this_l.buffer.copy(b, 0, offset, offset + length);
                    resolve(b.toString());
                });
            };

            this.read_tail = function(tail_length) {
                if (tail_length >= this.position) {
                    return this.read(0, this.position);
                } else {
                    return this.read(this.position - tail_length, tail_length);
                }
            }

            this.length = function() {
                var this_l = this;
                return new Promise(function(resolve, reject) {
                    resolve(this_l.position);
                });
            };
        };

        this.open = function(log_name) {
            var this_lf = this;
            return new Promise(function(resolve, reject) {
                resolve(this_lf._logs[log_name]);
            });
        };

        this.create = function(log_name) {
            var this_lf = this;
            return new Promise(function(resolve, reject) {
                var log = new this_lf.BufferLog(log_name);
                this_lf._logs[log_name] = log;
                resolve(log);
            });
        };
    }
};
