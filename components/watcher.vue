<template>
<div class="card border-info mb-3" v-if="isAuthorized">
    <div class="card-header bg-info text-white mar__card-header">
        Watch
    </div>
    <div class="card-body">
        <h2 class="text-center">{{client.second}}</h2>
        <h3 class="text-center" v-if="client.signal">{{client.signal}}</h3>
    </div>
</div>
</template>

<script>
module.exports = {

    props: ['client'],

    computed: {
        isAuthorized: function () {
            return this.client.status == 'Authorized';
        },
    }
}
</script>