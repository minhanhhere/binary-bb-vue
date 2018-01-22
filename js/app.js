var windowHeight = $(window.top).height();
window.$('#tradingview').height(windowHeight - 20);
window.$('#tradingview').attr('src', 'https://tradingview.binary.com/v1.3.10/main.html');

//noinspection JSUnusedGlobalSymbols
new Vue({
    el: '#app',
    components: {
        'configuration': httpVueLoader('components/configuration.vue'),
        'list-contracts': httpVueLoader('components/list-contracts.vue'),
        'watcher': httpVueLoader('components/watcher.vue'),
        'console': httpVueLoader('components/console.vue'),
    },
    data: {
        config: {
            symbol: 'R_100',
            initStake: 1,
            duration: 59,
            auto: false,
            wait: 9,
            darkcloud: true,
            bbSignal: false,
            dev: 2.5,
        },
        client: {
            api: 0,
            bb: {},
            bb2Array: [],
            contracts: [],
            candles:[],
            level: 1,
            status: 'Initing',
            stake: 1,
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
                //contracts[0] = contract;
                contracts.shift();
                contracts.unshift(contract);
            } else if (contract.contract_id) {
                contracts.unshift(contract);
            }
            if (contract.status != 'open') {
                _self.processContractResult(contract);
            }
        });
        api.events.on('ohlc', _self.handleOHLC);
    },
    computed: {
        isAuto: function () {
            return this.config.auto;
        },
        canTrade: function () {
            var contracts = this.client.contracts;
            if (contracts.length == 0 || contracts[0].status == 'won') {
                return true;
            }
            var now = new Date().getTime() / 1000;
            return (contracts[0].status == 'lost' && now - contracts[0].purchase_time >= this.config.wait * 60);
        },
        lastCandle: function() {
            return this.client.candles.slice(-1)[0];
        },
        prevCandle: function() {
            return this.client.candles.slice(-2)[0];
        },
    },
    methods: {

        isRed: function (candle) {
            return candle.close < candle.open;
        },

        isGreen: function (candle) {
            return candle.close > candle.open;
        },

        candleBodyCenter: function (candle) {
            return candle.open + (candle.close - candle.open) / 2;
        },

        candleBody: function (candle) {
            return Math.abs(candle.close - candle.open);
        },

        checkSignal: function (second, candle) {
            if (!this.config.bbSignal) {
                return;
            }
            var client = this.client;
            var bb = this.client.bb;
            if (second == 58) {
                var tradeType = '';
                if (candle.close > bb[1]) {
                    client.signal = (candle.close - bb[1]).toFixed(2);
                    tradeType = 'PUT';
                }
                if (bb[2] > candle.close) {
                    client.signal = (bb[2] - candle.close).toFixed(2);
                    tradeType = 'CALL';
                }
                if (tradeType != '' && this.isAuto && this.canTrade) {
                    console.log(candle.time, ' - Over BollingBands signal: ', tradeType);
                    this.buyContractForDuration(tradeType, 59);
                }
                setTimeout(function () {
                    if (client.signal) {
                        client.signal = undefined;
                    }
                }, 8000);
            }
        },

        checkDarkCloud: function (second, candle) {
            if (!this.config.darkcloud || this.client.bb2Array.length < 2) {
                return;
            }
            if (second == 58) {
                var prevCandle = this.prevCandle;
                var prevBB = this.client.bb2Array.slice(-2)[0];
                var tradeType = '';
                if (this.candleBody(prevCandle) < 1.5) {
                    return;
                }
                if (this.isGreen(prevCandle) && this.isRed(candle) &&
                    (prevCandle.high > prevBB[1]) &&
                    (candle.open - prevCandle.close >= -0.2) && (candle.close <= this.candleBodyCenter(prevCandle))) {
                    tradeType = 'PUT';
                }
                if (this.isRed(prevCandle) && this.isGreen(candle) &&
                    prevCandle.low < prevBB[2] &&
                    (prevCandle.close - candle.open >= -0.2) && (candle.close >= this.candleBodyCenter(prevCandle))) {
                    tradeType = 'CALL';
                }
                if (tradeType != '' && this.isAuto && this.canTrade) {
                    console.log(candle.time, ' - Darkcloud signal: ', tradeType);
                    this.buyContractForDuration(tradeType, 57);
                }
            }
        },

        sendNotification: function(second, candle, delta) {
            if (!this.config.bbSignal) {
                return;
            }
            var client = this.client;
            var bb = this.client.bb;
            var config = this.config;
            var body = second + 's --> ' + (Math.abs(candle.close - bb[1]) <= delta ? 'PUT' : 'CALL');
            var image = Math.abs(candle.close - bb[1]) <= delta ? 'img/put.png' : 'img/call.png';
            if (!client.notification) {
                client.notification = new Notification('Notification for ' + config.symbol, {
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

        processContractResult: function(contract) {
            var client = this.client;
            if (contract.status == 'won') {
                client.profit += contract.payout - contract.buy_price;
                client.level = 1;
            }
            if (contract.status == 'lost') {
                client.profit -= contract.buy_price;
                client.level++;
                if (client.level > 4) {
                    client.level = 1;
                }
            }
            client.profit = +client.profit.toFixed(2);
            if (client.level == 1) {
                client.stake = +this.config.initStake;
            }
            // if (client.level == 2 || client.level == 3) {
            //     client.stake = +(contract.payout / client.profitRatio).toFixed(2);
            // }
        },

        handleOHLC: function(data) {
            var delta = 1;
            var candles = this.client.candles;
            var ohlc = data.ohlc;
            var candle = {
                open: Number(ohlc.open),
                close: Number(ohlc.close),
                high: Number(ohlc.high),
                low: Number(ohlc.low),
                time: Number(ohlc.open_time)
            };
            var second = ohlc.epoch - ohlc.open_time;

            if (candle.time == this.lastCandle.time) {
                candles[candles.length - 1] = candle;
            } else {
                candles.push(candle);
            }
            var bb = this.client.bb = calculateBB(candles, {
                periods: 20,
                pipSize: 4,
                stdDevUp: +this.config.dev,
                stdDevDown: +this.config.dev,
                field: 'close',
            });
            var bb2 = calculateBB(candles, {
                periods: 20,
                pipSize: 4,
                stdDevUp: 2,
                stdDevDown: 2,
                field: 'close',
            });
            if (second == 58) {
                this.client.bb2Array.push(bb2);
                if (this.client.bb2Array.length > 100) {
                    this.client.bb2Array.shift();
                }
            }
            if (Math.abs(candle.close - bb[1]) <= delta || Math.abs(candle.close - bb[2]) <= delta) {
                if (second >= 40) {
                    this.sendNotification(second, candle, delta);
                }
            }
            this.checkDarkCloud(second, candle);
            //this.checkSignal(second, candle);
            this.client.second = second;
        }
    }
});