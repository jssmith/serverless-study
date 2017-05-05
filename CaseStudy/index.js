const sprintf = require('sprintf-js').sprintf;
const Counter = require('./counter').Counter;
const banking = require('./banking');

const AzureBlobLogFactory = require('./azureblobstoragelog').AzureBlobLogFactory;

var requestCounter = 0;
const randomId = sprintf("%04x", Math.round(Math.random()*65535));

const container_name = 'mycontainer';

const azure_storage_factory = new AzureBlobLogFactory(container_name);


module.exports = function (context, req) {
    context.log('JavaScript HTTP trigger function processed a request.');
    let on_success = function(str) {
        context.res = {
            body: str
        };
        requestCounter += 1;
        context.done();
    };

    let on_error = function(str) {
        context.res = {
            status: 400,
            body: str
        };
        context.done();
    };

    let catch_error = function(error) {
        on_error(error.stack);
    }

    let counter_test = function(action, ctr_id) {
        let ctr_id_int = parseInt(ctr_id);
        if (!ctr_id_int) {
            on_error('invalid counter id');
            return;
        }
        let blob_prefix = 'ctr_blob_' + ctr_id_int;
        let ctr = new Counter(azure_storage_factory, blob_prefix);
        switch (action) {
            case 'create':
                ctr.init();
                ctr.inc_get().then(function(value) {
                    on_success('created');
                }).catch(catch_error);
                break;
            case 'inc':
                ctr.inc();
                on_success('inc successful')
                break;
            case 'inc_get':
                ctr.inc_get().then(function(value) {
                    on_success('value after inc ' + value);
                }).catch(catch_error);
                break;
            case 'get':
                ctr.get().then(function(value) {
                    on_success('counter value is ' + value);
                }).catch(catch_error);
                break;
            default:
                context.log('unknown counter action ' + action);
                on_error('unknown counter action ' + action)
        }
    };

    let banking_test = function(action, bank_account_id) {
        let bank_account_id_int = parseInt(bank_account_id);
        let other_bank_account_id_int = parseInt(req.query.other_bank_account_id);
        let tm_id_int = parseInt(req.query.tm_id);
        let tm = undefined;

        if (!bank_account_id_int) {
            on_error('invalid bank account id');
            return;
        }
        let blob_prefix = function(id) {
            return 'bank_account_' + id;
        };
        let acct = new banking.BankAccount(azure_storage_factory, blob_prefix(bank_account_id_int));
        let other_acct = undefined;
        if (tm_id_int) {
            tm = new banking.TransferManager(azure_storage_factory, 'tm_' + tm_id_int)
        }
        let amount;
        switch (action) {
            case 'create':
                try {
                    acct.init();
                    on_success('created');
                }
                catch (error) {
                    on_error(error);
                }
                break;
            case 'create_tm':
                try {
                    tm.init();
                    on_success('created tm');
                }
                catch (error) {
                    on_error(error);
                }
                break;
            case 'deposit':
                amount = parseInt(req.query.amount);
                if (!amount) {
                    on_error("must provide valid amount");
                    return;
                }
                acct.deposit_balance(amount).then(function(res) {
                    on_success(res);
                }).catch(catch_error);
                break;
            case 'withdraw':
                amount = parseInt(req.query.amount);
                if (!amount) {
                    on_error("must provide valid amount");
                    return;
                }
                acct.withdraw(amount).then(function(res) {
                    on_success(res);
                }).catch(catch_error);
                break;
            case 'balance':
                acct.balance().then(function(res) {
                    on_success(res);
                }).catch(catch_error);
                break;
            case 'deposit_or_withdraw':
                amount = parseInt(req.query.amount);
                if (!amount) {
                    on_error("must provide valid amount");
                    return;
                }
                if (Math.random() < 0.5) {
                    acct.deposit_balance(amount).then(function(res) {
                        on_success(res);
                    }).catch(catch_error);
                } else {
                    acct.withdraw(amount).then(function(res) {
                        on_success(res);
                    }).catch(catch_error);
                }
                break;
            case 'transfer':
                amount = parseInt(req.query.amount);
                if (!amount) {
                    on_error("must provide valid amount");
                    return;
                }
                other_bank_account_id_int = parseInt(req.query.other_bank_account_id);
                other_acct = new banking.BankAccount(azure_storage_factory, blob_prefix(other_bank_account_id_int));
                tm.transfer(acct, other_acct, amount).then(function(res) {
                    on_success(res);
                }).catch(catch_error);
                break;
            case 'transfer_random':
                amount = parseInt(req.query.amount);
                if (!amount) {
                    on_error("must provide valid amount");
                    return;
                }
                other_bank_account_id_int = parseInt(req.query.other_bank_account_id);
                other_acct = new banking.BankAccount(azure_storage_factory, blob_prefix(other_bank_account_id_int));
                var src_account;
                var dst_account;
                if (Math.random() < 0.5) {
                    src_account = acct;
                    dst_account = other_acct;
                } else {
                    src_account = other_acct;
                    dst_account = acct;
                }
                tm.transfer(src_account, dst_account, amount).then(function(res) {
                    on_success(res);
                }).catch(catch_error);
                break;
            case 'transfer_random_2':
                amount = parseInt(req.query.amount);
                if (!amount) {
                    on_error("must provide valid amount");
                    return;
                }
                let src_account_id = Math.round(5000+Math.random()*1000);
                let dst_account_id = Math.round(5000+Math.random()*1000);
                if (src_account_id == dst_account_id) {
                    dst_account_id += 1;
                }
                let tm_id_rnd = Math.round(5000+2*Math.round(Math.random()*500));
                src_account = new banking.BankAccount(azure_storage_factory, blob_prefix(src_account_id));
                dst_account = new banking.BankAccount(azure_storage_factory, blob_prefix(dst_account_id));

                tm = new banking.TransferManager(azure_storage_factory, 'tm_' + tm_id_rnd)
                tm.transfer(src_account, dst_account, amount).then(function(res) {
                    on_success(res);
                }).catch(catch_error);
                break;
            default:
                context.log('unknown bank account action ' + action);
                on_error('unknown bank account action ' + action)
        }
    };

    if (req.query.test) {
        switch (req.query.test) {
            case 'counter':
                counter_test(req.query.action, req.query.ctr_id);
                break;
            case 'banking':
                banking_test(req.query.action, req.query.bank_account_id);
                break;
            case 'ping':
                context.log('ping');
                on_success('pong');
                break;
            case 'identity':
                on_success(randomId);
                break;
            default:
                on_error('Unknown test: ', req.query.test);
                // error
        }
    } else {
        on_error("Please pass a test on the query string");
    }
};
