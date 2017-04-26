var webpack = require("webpack");

module.exports = {
    module: {
        loaders: [
            // Raw text.
            { test: /\.html$/, loader: 'raw-loader' },
            { test: /\.hbs$/, loader: 'raw-loader' },
            { test: /\.txt$/, loader: 'raw-loader' },

            // TypeScript.
            { test: /\.tsx?$/, loader: 'ts-loader' },

            // JSON
            { test: /\.json$/, loader: 'json-loader' },

            // CSS, Stylus and Less.
            { test: /\.css$/, loader: 'style-loader!css-loader' },
            { test: /\.styl$/, loader: 'style-loader!css-loader!stylus-loader' },
            { test: /\.less$/, loader: 'style-loader!css-loader!less-loader' },

            // Images
            { test: /\.svg$/, loader: 'url-loader' },
            { test: /\.png$/, loader: 'url-loader' }
        ],
    },

    // Write to src/built as bundle.js
    output: {
        path: './src/built',
        filename: 'bundle.js',
        publicPath: '/built/'
    },

    resolve: {
        // Resolve typescript and stylus files
        extensions: ['', '.webpack.js', '.web.js', '.ts', '.tsx', '.js', '.styl', '.hbs', '.json']
    },

    devtool: 'inline-source-map',
    entry: [
        './src/main.ts'
    ],

    plugins: [
        new webpack.optimize.UglifyJsPlugin({
            compress: {
                warnings: false
            }
        }),
        function() { // This makes it so the Travis CI build will fail if there are errors
            this.plugin("done", function(stats) {
                if (stats.compilation.errors && stats.compilation.errors.length && process.argv.indexOf("--watch") === -1) {
                    console.log(stats.compilation.errors);
                    process.exit(1);
                }
            })
        }
    ]
};