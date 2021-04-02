
const options = {
    publicPath: './',
    configureWebpack: {
        plugins: [

        ]
    },
    pages: {
        index: {
            entry: 'src/main.ts'
        }
    },
    chainWebpack: (config) => {
        // config.module.rule('less')
        //     .test(/\.less?$/)
        //     .use('less-loader')
        //     .loader('less-loader')
        //     .options({
        //         lessOptions: {
        //             strictMath: true,
        //         },
        //     })
        //     .end()
        config.resolve.extensions.add('.ts').add('.tsx')
            .end().end()
            .module

            .rule('typescript')
            .test(/\.tsx?$/)
            .use('babel-loader')
            .loader('babel-loader')
            .end()
            .use('ts-loader')
            .loader('ts-loader')
            .options({
                transpileOnly: true,
                appendTsSuffixTo: [
                    '\\.vue$',
                ],
                happyPackMode: false,
            })
            .end();
    },
    css: {
        loaderOptions: {
            less: {
                // TODO
                javascriptEnabled: true
            }
        }
    },
    devServer: {
        port: 8200
    },
    productionSourceMap: false,
    transpileDependencies: []
};
module.exports = options