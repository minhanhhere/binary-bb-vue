<template>
<div class="card border-success mb-3" v-if="isAuthorized">
    <div class="card-header bg-success text-white mar__card-header">
        Trades ({{client.contracts.length}})
    </div>
    <div class="card-body" style="min-height: 240px;">
        <table class="table table-hover" style="font-size: 0.85em;">
            <thead>
            <tr>
                <th>Time</th>
                <th>Contract Id</th>
                <th>Type</th>
                <th class="text-right">Amount</th>
                <th class="text-right">Profit</th>
            </tr>
            </thead>
            <tbody>
            <tr v-for='contract in client.contracts'>
                <td><abbr title="{{formatTime(contract.purchase_time)}}">{{contract.purchase_time}}</abbr></td>
                <td>{{contract.contract_id}}</td>
                <td>{{contract.contract_type}}{{getTimeout(contract)}}</td>
                <td class="text-right">${{contract.buy_price}}</td>
                <td class="text-right text-emphasis">
                    <span :class="[getContractStatusBackground(contract), getContractStatusColor(contract)]">{{getProfit(contract)}}</span>
                </td>
            </tr>
            </tbody>
        </table>
    </div>
</div>
</template>
<script>
module.exports = {

    props: ['config', 'client'],

    methods: {

        formatTime: function (timestamp) {
            return moment.unix(timestamp).format('DD.MM.YYYY HH:mm:ss');
        },

        getTimeout: function (contract) {
            if (contract.status == 'open') {
                return ' (' + (contract.date_expiry - contract.current_spot_time) + ')';
            }
            return '';
        },

        isWinning: function (contract) {
            var type = contract.contract_type == 'CALL' ? 1 : -1;
            var diff = contract.current_spot - contract.barrier;
            return type * diff > 0;
        },

        getContractStatusBackground: function (contract) {
            if (contract.status == 'open') {
                return this.isWinning(contract) ? 'bg-primary' : 'bg-danger';
            } else {
                return '';
            }
        },

        getContractStatusColor: function (contract) {
            if (contract.status == 'open') {
                return 'text-white';
            }
            if (contract.status == 'won') {
                return 'text-success';
            }
            if (contract.status == 'lost') {
                return 'text-danger';
            }
        },

        getProfit: function (contract) {
            if (contract.status == 'lost') {
                return '$' + contract.buy_price;
            }
            if (contract.status == 'won') {
                return '$' + (contract.payout - contract.buy_price).toFixed(2);
            }
            if (contract.status == 'open') {
                //var diff = contract.current_spot - contract.barrier;
                //return '$' + Math.abs(diff).toFixed(2);
                return '$' + Math.abs(contract.bid_price - contract.buy_price).toFixed(2);
            }
        },
    },

    computed: {
        isAuthorized: function () {
            return this.client.status == 'Authorized';
        },
    },
}
</script>