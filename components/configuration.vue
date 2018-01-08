<template>
<div class="card border-primary mb-3">
    <div class="card-header bg-primary text-white mar__card-header">
        Configure
    </div>
    <div class="card-body">
        <div class="form-group form-row">
            <div class="input-group input-group-sm col-7">
                <div class="input-group-prepend">
                    <span class="input-group-text">Token</span>
                </div>
                <input type="text" class="form-control" id="inputToken" placeholder="Token" v-model="config.token">
            </div>
            <div class="input-group input-group-sm col-5">
                <div class="input-group-prepend">
                    <span class="input-group-text">Symbol</span>
                </div>
                <select class="form-control" id="inputSymbol" v-model="config.symbol">
                    <option value="R_10">R_10</option>
                    <option value="R_25">R_25</option>
                    <option value="R_50">R_50</option>
                    <option value="R_75">R_75</option>
                    <option value="R_100">R_100</option>
                </select>
            </div>
        </div>
        <div class="form-group form-row">
            <div class="input-group input-group-sm col">
                <div class="input-group-prepend">
                    <span class="input-group-text">Init</span>
                </div>
                <input type="text" class="form-control" id="inputInitStake" placeholder="Symbol" v-model="config.initStake">
                <div class="input-group-append">
                    <span class="input-group-text">$</span>
                </div>
            </div>
            <div class="input-group input-group-sm col">
                <div class="input-group-prepend">
                    <span class="input-group-text">Deviation</span>
                </div>
                <input type="number" class="form-control" placeholder="Symbol" v-model="config.dev">
            </div>
            <div class="input-group input-group-sm col">
                <div class="input-group-prepend">
                    <span class="input-group-text">Wait</span>
                </div>
                <input type="text" class="form-control" placeholder="Symbol" v-model="config.wait" ng-disabled="config.auto == false">
                <div class="input-group-append">
                    <span class="input-group-text">m</span>
                </div>
            </div>
        </div>
        <div class="form-group form-row">
            <div class="input-group input-group-sm col">
                <div class="input-group-prepend">
                    <span class="input-group-text">Auto</span>
                </div>
                <label class="mar__switch">
                    <input type="checkbox" v-model="config.auto">
                    <span class="mar__slider"><span class="mar__slider_title"></span></span>
                </label>
            </div>
            <div class="input-group input-group-sm col">
                <div class="input-group-prepend">
                    <span class="input-group-text"><small>DarkCloud</small></span>
                </div>
                <label class="mar__switch">
                    <input type="checkbox" v-model="config.darkcloud">
                    <span class="mar__slider"><span class="mar__slider_title"></span></span>
                </label>
            </div>
            <div class="input-group input-group-sm col">
                <div class="input-group-prepend">
                    <span class="input-group-text">Engulf</span>
                </div>
                <label class="mar__switch">
                    <input type="checkbox" v-model="config.engulfing">
                    <span class="mar__slider"><span class="mar__slider_title"></span></span>
                </label>
            </div>
        </div>
        <div>
            <button @click="refreshChart()" class="btn btn-success btn-sm">Refresh Chart</button>
            <button @click="authorize()" class="btn btn-primary btn-sm" :disabled="client.status != 'Connected'">Authorize</button>
            <span v-if="isAuthorizing">&nbsp;Authorizing...</span>
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
                if (data.authorize.loginid.includes('VRTC')) {
                    config.initStake = 10;
                    config.auto = true;
                }
                client.status = 'Authorized';
                client.stake = +config.initStake;
                _self.getData();
                _self.getTodayTradeResult();
                api.subscribeToBalance();
                api.getPriceProposalForContract({
                    amount: +config.initStake,
                    basis: 'stake',
                    contract_type: 'CALL',
                    currency: 'USD',
                    duration: '60',
                    duration_unit: 's',
                    symbol: config.symbol
                }).then(function (data) {
                    var proposal = data.proposal;
                    client.profitRatio = (proposal.payout - config.initStake) / config.initStake;
                });
            });
        },

        getTodayTradeResult: function() {
            var client = this.client;
            var api = this.client.api;
            api.getProfitTable({
                description: 1,
                date_from: moment().startOf('day').utc().format('YYYY-MM-DD'),
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

        getData: function() {
            var config = this.config;
            var client = this.client;
            var api = this.client.api;
            api.getCandles(config.symbol, {end: 'latest', count: 50, granularity: 60, subscribe: 1}).then(function(data) {
                var candles = data.candles;
                for (var i = 0; i < candles.length; i++) {
                    client.candles.push({
                        open: Number(candles[i].open),
                        close: Number(candles[i].close),
                        high: Number(candles[i].high),
                        low: Number(candles[i].low),
                        time: Number(candles[i].epoch)
                    });
                }
            });
        },
    },

    computed: {
        isAuthorizing: function () {
            return this.client.status == 'Authorizing';
        },
    }
}
</script>