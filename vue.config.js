const { defineConfig } = require('@vue/cli-service')
module.exports = defineConfig({
    transpileDependencies: true,
    publicPath: '',
    pwa: {
        workboxOptions: {
            skipWaiting : true,
            maximumFileSizeToCacheInBytes: 50000000
        },
        manifestPath: 'manifest.json',
        themeColor: "#0f1312",
        msTileColor: "#0f1312",
        manifestOptions: {
          background_color: "#0f1312",
          theme_color: "#4caf50",
          start_url: "/Nerdle/",
          id: "/Nerdle/",
          display: "standalone",
          name: "Nerdle",
          short_name: "Nerdle",
          description: "A daily numbers game using numerical properties.",
          icons: [
            {
                src: "/web-app-manifest-192x192.png",
                sizes: "192x192",
                type: "image/png",
                purpose: "maskable"
            },
            {
                src: "/web-app-manifest-512x512.png",
                sizes: "512x512",
                type: "image/png",
                purpose: "maskable"
            }
          ]
        },
    },
})