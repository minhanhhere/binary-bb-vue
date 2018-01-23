<template>
<div class="card border-primary mb-3">
    <div class="card-header bg-primary text-white mar__card-header">
        Configure <span v-if="client.loginid">| {{client.loginid}} ({{client.balance | currency}})</span> <span class="float-right" v-if="client.profit">Profit: {{client.profit | currency}}</span>
    </div>
    <div class="card-body">
        <div class="form-group form-row">
            <div class="input-group input-group-sm col-7">
                <div class="input-group-prepend">
                    <span class="input-group-text">Token</span>
                </div>
                <input type="text" class="form-control" id="inputToken" placeholder="Token" v-model="config.token">
            </div>
        </div>
        <div>
            <button @click="authorize()" class="btn btn-primary btn-sm" :disabled="client.status != 'Connected'">{{btnAuthorizeLabel}}</button>
        </div>
    </div>
</div>
</template>
<script>
module.exports = {

    props: ['config', 'client'],

    methods: {

        refreshChart: function () {
            document.querySelector('.tradingview').src = document.querySelector('.tradingview').src;
        },

        authorize: function () {

            var _self = this;
            var client = _self.client;
            var api = client.api;
            var config = _self.config;

            client.status = 'Authorizing';
            Cookies.set('config.token', config.token);

            api.authorize(config.token).then(function(data) {
                client.loginid = data.authorize.loginid;
                client.status = 'Authorized';
                _self.getTodayTradeResult();
                api.subscribeToBalance();
                api.subscribeToAllOpenContracts();
            });
        },

        getTodayTradeResult: function() {
            var client = this.client;
            var api = this.client.api;
            api.getProfitTable({
                description: 1,
                date_from: moment.utc().format('YYYY-MM-DD'),
                date_to: moment.utc().format('YYYY-MM-DD'),
            }).then(function(data) {
                var transactions = data.profit_table.transactions;
                for (var i = 0; i < transactions.length; i++) {
                    var trans = transactions[i];
                    var profit = trans.sell_price - trans.buy_price;
                    client.profit += profit;
                    client.contracts.push({
                        contract_id: trans.contract_id,
                        purchase_time: trans.purchase_time,
                        contract_type: trans.shortcode.includes('PUT') ? 'PUT' : 'CALL',
                        status: profit > 0 ? 'won' : 'lost',
                        payout: trans.payout,
                        buy_price: trans.buy_price
                    });
                }
            });
        },
    },

    computed: {
        isAuthorizing: function () {
            return this.client.status == 'Authorizing';
        },
        isAuthorized: function () {
            return this.client.status == 'Authorized';
        },
        btnAuthorizeLabel: function () {
            if (this.isAuthorizing) {
                return 'Authorizing...';
            }
            if (this.isAuthorized) {
                return 'Authorized';
            }
            return 'Authorize';
        }
    }
}
</script>