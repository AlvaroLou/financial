/**
 * Memória do Gradle para o build de release. O template do Expo usa
 * `-Xmx2048m -XX:MaxMetaspaceSize=512m`, e o lint e o R8 (minificação) do release
 * estouram o metaspace ("Metaspace"). 4 GB de heap e 1 GB de metaspace bastam.
 */
const { withGradleProperties } = require('expo/config-plugins');

const KEY = 'org.gradle.jvmargs';
const VALUE = '-Xmx4096m -XX:MaxMetaspaceSize=1024m -Dfile.encoding=UTF-8';

module.exports = function withGradleMemory(config) {
  return withGradleProperties(config, (cfg) => {
    const props = cfg.modResults.filter((item) => !(item.type === 'property' && item.key === KEY));
    props.push({ type: 'property', key: KEY, value: VALUE });
    cfg.modResults = props;
    return cfg;
  });
};
