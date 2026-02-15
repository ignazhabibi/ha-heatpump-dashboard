import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import terser from '@rollup/plugin-terser';

export default {
    input: 'src/main.ts',
    output: {
        file: 'dist/heatpump-dashboard.js',
        format: 'es',
        sourcemap: false,
    },
    plugins: [
        resolve(),
        commonjs(),
        json(),
        typescript({
            sourceMap: false,
            inlineSources: false
        }),
        terser({
            format: { comments: false } // Remove comments for smaller file size
        })
    ]
};
