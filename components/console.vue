<template>
<div class="card border-dark mb-3" v-if="isAuthorized">
    <div class="card-header bg-dark text-white mar__card-header">
        {{client.loginid}} <span v-if="client.balance">({{client.balance | currency}})</span> <span class="float-right">Profit: {{client.profit | currency}}</span>
    </div>
    <div class="card-body">
        <div class="form-group row">
            <div class="input-group input-group-sm col">
                <div class="input-group-prepend">
                    <span class="input-group-text">Duration</span>
                </div>
                <input type="number" class="form-control" id="inputDuration" v-model="config.duration">
                <div class="input-group-append">
                    <span class="input-group-text">s</span>
                </div>
            </div>
            <div class="input-group input-group-sm col">
                <div class="input-group-prepend">
                    <span class="input-group-text">$</span>
                </div>
                <input type="text" class="form-control" id="inputStake" placeholder="Stake" v-model="client.stake">
                <div class="input-group-append">
                    <span class="input-group-text text-white bg-success border-success">P: {{potentialProfit | currency}}</span>
                </div>
            </div>
        </div>
        <div class="row">
            <div class="col">
                <img class="d-block mb-3 mx-auto" src="https://www.binary.com/images/pages/trade/fall_1.png"/>
                <button @click="buyContract('PUT')" class="btn btn-block btn-danger">PUT</button>
                <button @click="buyContractInCandle('PUT')" class="btn btn-block btn-danger">PUT CANDLE</button>
            </div>
            <div class="col">
                <img class="d-block mb-3 mx-auto" src="https://www.binary.com/images/pages/trade/rise_1.png"/>
                <button @click="buyContract('CALL')" class="btn btn-block btn-success">CALL</button>
                <button @click="buyContractInCandle('CALL')" class="btn btn-block btn-success">CALL CANDLE</button>
            </div>
        </div>
    </div>
</div>
</template>

<script>
module.exports = {

    props: ['config', 'client'],

    computed: {
        isAuthorized: function () {
            return this.client.status == 'Authorized';
        },
        potentialProfit: function () {
            var client = this.client;
            return (client.profitRatio * client.stake).toFixed(2);
        }
    },

    methods: {
        buyContract: function (type) {
            this.buyContractForDuration(type, this.config.duration);
        },
        buyContractInCandle: function (type) {
            var duration = 59 - 2 - this.client.second;
            if (duration >= 15) {
                this.buyContractForDuration(type, duration);
            }
        },
        buyContractForDuration: function (type, duration) {
            var api = this.client.api;
            api.buyContractParams({
                amount: this.client.stake,
                basis: 'stake',
                contract_type: type,
                currency: 'USD',
                symbol: this.config.symbol,
                duration: duration,
                duration_unit: 's'
            }, this.client.stake).then(function (data) {
                var buy = data.buy;
                api.subscribeToOpenContract(buy.contract_id);
            });
        },
    }
}
</script>