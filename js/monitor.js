//noinspection JSUnusedGlobalSymbols
new Vue({
    el: '#app',
    components: {
        'configuration': httpVueLoader('components/monitor/configuration.vue'),
        'list-contracts': httpVueLoader('components/monitor/list-contracts.vue'),
    },
    data: {
        config: {},
        client: {
            api: 0,
            contracts: [],
            status: 'Initing',
            profit: 0,
            second: 0,
            balance: 0,
            profitRatio: 0,
        },
    },
    created: function () {
        var _self = this;
        var LiveApi = window['binary-live-api'].LiveApi;
        var client = this.client;
        var contracts = client.contracts;
        var api = this.client.api = new LiveApi({
            appId: '11588'
        });
        api.ping().then(function () {
            client.status = 'Connected';
        });
        var token = Cookies.get('config.token');
        if (token) {
            this.config.token = token;
        }
        api.events.on('balance', function(data) {
            var balance = data.balance;
            client.balance = balance.balance;
            client.loginid = balance.loginid;
        });
        api.events.on('proposal_open_contract', function (data) {
            var contract = data.proposal_open_contract;
            if (contracts.length > 0 && contracts[0].contract_id == contract.contract_id) {
                contracts.shift();
                contracts.unshift(contract);
            } else if (contract.contract_id) {
                contracts.unshift(contract);
                _self.sendNotification(contract.contract_type, contract.contract_type + ' $' + contract.buy_price);
            }
            if (contract.status != 'open') {
                _self.processContractResult(contract);
            }
        });
    },
    computed: {
        isAuto: function () {
            return this.config.auto;
        },
    },
    methods: {

        sendNotification: function(type, body) {
            var client = this.client;
            var image = type == 'PUT' ? 'img/put.png' : 'img/call.png';
            if (!client.notification) {
                client.notification = new Notification('New contract', {
                    icon: 'https://www.binary.com/images/favicons/favicon-96x96.png',
                    image: image,
                    body: body
                });
                client.notification.onclick = function () {
                    window.focus();
                    client.notification.close();
                };
                client.notification.onclose = function () {
                    client.notification = undefined;
                };
                setTimeout(function () {
                    if (client.notification) {
                        client.notification.close();
                    }
                }, 8000);
            }
        },

        processContractResult: function(contract) {
            var client = this.client;
            if (contract.status == 'won') {
                client.profit += contract.payout - contract.buy_price;
            }
            if (contract.status == 'lost') {
                client.profit -= contract.buy_price;
            }
            client.profit = +client.profit.toFixed(2);
        },
    }
});