"use strict";

const azure = require('azure-storage');

module.exports = {
    AzureBlobLogFactory: function(container_name) {
        this.container_name = container_name;
        this.blobSvc = azure.createBlobService();

        this.AzureBlobLog = function (blobSvc, container_name, log_name) {
            this.blobSvc = blobSvc;
            this.container_name = container_name;
            this.log_name = log_name;

            this.write = function(text) {
                return new Promise(function(resolve, reject) {
                    blobSvc.appendFromText(container_name, log_name, text, function(error, result, response) {
                        if (!error) {
                            resolve('success');
                        } else {
                            console.log('failed to append to counter blob', error);
                            reject(Error('error!'));
                        }
                    });
                });
            };

            this.read = function(offset, length) {
                var options = {};
                if (undefined != offset && undefined != length) {
                    options.rangeStart = offset;
                    // TODO are bounds inclusive? should there be a +1 here?
                    options.rangeEnd = offset + length;
                } else if (undefined != offset) {
                    options.rangeStart = offset;
                } else if (undefined != length) {
                    options.rangeStart = 0;
                    options.rangeEnd = length;
                }
                var this_l = this;
                console.log('read called', this_l.container_name, this_l.log_name);
                return new Promise(function(resolve, reject) {
                    console.log('reading from azure',this_l.container_name, this_l.log_name);
                    this_l.blobSvc.getBlobToText(this_l.container_name, this_l.log_name, options,
                        function(error, text, result, response) {
                            if (!error) {
                                resolve(text, result, response);
                            } else {
                                console.log('failure to read blob' + error);
                                reject(Error('error reading'));
                            }
                        }
                    );
                });
            };

            this.length = function() {
                this_l = this;
                return new Promise(function(resolve, reject) {
                    this_l.blobSvc.getBlobProperties(this_l.container_name, this_l.log_name,
                        function(error, text, result, response) {
                            if (!error) {
                                resolve(result.length());
                            } else {
                                console.log("failure to read blob properties");
                                reject(Error('error getting properties'));
                            }
                        }
                    );
                });
            };

            this.read_tail = function(tail_length) {
                this_l = this;
                console.log('read tail top level');
                return new Promise(function(resolve, reject) {
                    console.log('reading tail', tail_length);
                    this_l.length().then(function(log_length) {
                        var read_offset;
                        var read_length;
                        if (tail_length >= log_length) {
                            read_offset = 0;
                            read_length = log_length;
                        } else {
                            read_offset = log_length - tail_length;
                            read_length = tail_length;
                        }
                        return this_l.read(read_offset, read_length);
                    });
                });
            }
        };

        this.create = function(log_name) {
            var this_bf = this;
            return new Promise(function(resolve, reject) {
                console.log("create blob on the container", container_name);
                this_bf.blobSvc.createAppendBlobFromText(container_name, log_name, '', function(error, result, response) {
                    console.log('returned from initialization');
                    if (!error) {
                        console.log('append blob created successfully');
                        var blob_log = new this_bf.AzureBlobLog(this_bf.blobSvc, this_bf.container_name, log_name);
                        resolve(blob_log);
                    } else {
                        console.log('creating append blob');
                        reject(Error('error!'));
                    }
                });
            });
        };

        this.open = function(log_name) {
            console.log('opening log', log_name);
            var this_bf = this;
            return new Promise(function(resolve, reject) {
                var blob_log = new this_bf.AzureBlobLog(this_bf.blobSvc, this_bf.container_name, log_name);
                resolve(blob_log);
            });
        };
    }
};
