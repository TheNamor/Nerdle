const { defineConfig } = require('@vue/cli-service')
module.exports = defineConfig({
    transpileDependencies: true,
    publicPath: '',
    pwa: {
        workboxOptions: {
            skipWaiting : true,
            maximumFileSizeToCacheInBytes: 50000000
        }
    },
})