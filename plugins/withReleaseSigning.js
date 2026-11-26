/**
 * Assina o build de release com a chave de upload da Play Store.
 *
 * A chave e as senhas NUNCA entram no repositório: vêm de propriedades do
 * Gradle, definidas no arquivo do usuário (`%USERPROFILE%\.gradle\gradle.properties`
 * no Windows, `~/.gradle/gradle.properties` no macOS/Linux):
 *
 *   DINHEIRO_UPLOAD_STORE_FILE=C:/Users/<você>/.android-keys/dinheiro-em-dia-upload.jks
 *   DINHEIRO_UPLOAD_STORE_PASSWORD=...
 *   DINHEIRO_UPLOAD_KEY_ALIAS=upload
 *   DINHEIRO_UPLOAD_KEY_PASSWORD=...
 *
 * (Use barras normais no caminho, ou "\\" duplas.)
 *
 * Sem essas propriedades:
 * - `assembleRelease` (APK) continua assinado com a chave de debug, para instalar no celular;
 * - `bundleRelease` (AAB, o que vai para a Play) falha com uma mensagem clara, em vez de gerar
 *   um pacote assinado em modo debug, que a Play recusaria no upload.
 */
const { withAppBuildGradle } = require('expo/config-plugins');

const PROP = 'DINHEIRO_UPLOAD_STORE_FILE';
const MARKER = '// withReleaseSigning';

const SIGNING_CONFIG = `
        release { ${MARKER}
            if (project.hasProperty('${PROP}')) {
                storeFile file(${PROP})
                storePassword DINHEIRO_UPLOAD_STORE_PASSWORD
                keyAlias DINHEIRO_UPLOAD_KEY_ALIAS
                keyPassword DINHEIRO_UPLOAD_KEY_PASSWORD
            }
        }`;

const RELEASE_SIGNING = `signingConfig project.hasProperty('${PROP}') ? signingConfigs.release : signingConfigs.debug`;

const BUNDLE_GUARD = `
${MARKER}: o AAB da Play Store precisa da chave de upload.
gradle.taskGraph.whenReady { graph ->
    if (!project.hasProperty('${PROP}') && graph.allTasks.any { it.name == 'bundleRelease' }) {
        throw new GradleException(
            "Chave de upload ausente: defina ${PROP} e as outras propriedades " +
            "DINHEIRO_UPLOAD_* em ~/.gradle/gradle.properties (veja plugins/withReleaseSigning.js)."
        )
    }
}
`;

function applySigning(src) {
  if (src.includes(MARKER)) return src;

  const signingConfigs = /signingConfigs\s*\{/;
  const releaseBuildType = /(buildTypes\s*\{[\s\S]*?release\s*\{[\s\S]*?)signingConfig signingConfigs\.debug/;
  if (!signingConfigs.test(src) || !releaseBuildType.test(src)) {
    // Falha alto: se o template mudar, é melhor parar do que gerar um release sem a chave certa.
    throw new Error('withReleaseSigning: android/app/build.gradle não tem o formato esperado.');
  }

  return (
    src
      .replace(signingConfigs, (m) => m + SIGNING_CONFIG)
      .replace(releaseBuildType, (_, before) => before + RELEASE_SIGNING) + BUNDLE_GUARD
  );
}

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (cfg) => {
    if (cfg.modResults.language !== 'groovy') {
      throw new Error('withReleaseSigning: só funciona com build.gradle em Groovy.');
    }
    cfg.modResults.contents = applySigning(cfg.modResults.contents);
    return cfg;
  });
};
