import resolve from 'rollup-plugin-node-resolve'
import terser from "@rollup/plugin-terser"
const config = {
  input: './src/index.js',
  output: [
    {
      file: './dist/wxtrack-es.js',
      format: 'es'
     }, 
    {
      file: './dist/wxtrack.min.js',
      format: 'umd',
      name: 'wxtrack',
      strict: false,
    }
  ],
  plugins: [
    resolve({
      customResolveOptions: {
        moduleDirectory: 'node_modules' // 仅处理node_modules内的库
      } 
    })
  ],
};
if (process.env.terser) {
  config.plugins.push(terser());//使用rollupuglify插件
}
export default config;
