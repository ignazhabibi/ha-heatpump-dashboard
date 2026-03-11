import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import terser from '@rollup/plugin-terser';
import { readFileSync } from 'node:fs';

const { version } = JSON.parse(
    readFileSync(new URL('./package.json', import.meta.url), 'utf8')
);

function injectPackageVersion() {
    return {
        name: 'inject-package-version',
        renderChunk(code) {
            return code.replace(/__PACKAGE_VERSION__/g, version);
        }
    };
}

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
        injectPackageVersion(),
        terser({
            format: { comments: false } // Remove comments for smaller file size
        })
    ]
};
