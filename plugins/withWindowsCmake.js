/**
 * Build Android no Windows: o CMake padrão do Android Gradle Plugin (3.22.1)
 * traz um Ninja sem suporte a caminhos longos. Bibliotecas com código C++ fora
 * da pasta `android` (gesture-handler, reanimated, worklets e o codegen da nova
 * arquitetura) geram caminhos de objeto acima de 260 caracteres, e o build falha
 * com "ninja: error: mkdir(...)" ou "Filename longer than 260 characters".
 *
 * O Expo já sobe o limite do CMake (`CMAKE_OBJECT_PATH_MAX` = 1024) e lê a
 * propriedade `android.cmakeVersion` para trocar a versão do CMake em todos os
 * módulos. Este plugin fixa uma versão cujo Ninja (1.12+) aceita caminhos
 * longos. Requisitos no Windows: caminhos longos habilitados
 * (`LongPathsEnabled` = 1) e o pacote "CMake 3.31.6" no SDK Manager — o Gradle
 * tenta baixá-lo sozinho se faltar.
 *
 * Só vale quando o `expo prebuild` roda no Windows: em macOS/Linux (e no EAS)
 * nada muda.
 */
const { withGradleProperties } = require('expo/config-plugins');

const KEY = 'android.cmakeVersion';
const CMAKE_VERSION = '3.31.6';

module.exports = function withWindowsCmake(config) {
  if (process.platform !== 'win32') return config;
  return withGradleProperties(config, (cfg) => {
    const props = cfg.modResults.filter((item) => !(item.type === 'property' && item.key === KEY));
    props.push({ type: 'property', key: KEY, value: CMAKE_VERSION });
    cfg.modResults = props;
    return cfg;
  });
};
