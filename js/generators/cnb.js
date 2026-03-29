/** cnb.js — .cnb.yml 生成器（CNB 云开发平台配置） */

function generateCnbYml(config) {
  const lines = [];

  lines.push('$:');
  lines.push('  vscode:');
  lines.push('    - runner:');
  lines.push('        #在这里指定使用的CNB开发核心数，内存为核心数的2倍，最大64核心');
  lines.push('        cpus: 6');
  lines.push('      docker:');
  lines.push('        build:');
  lines.push('          dockerfile: Dockerfile');
  lines.push('          by:');
  lines.push('            - entrypoint.sh');

  // 环境变量 — CNB 使用 env 而非 environment
  lines.push('      env:');
  if (config.rootPassword) {
    lines.push(`        ROOT_PASSWORD: ${config.rootPassword}`);
  } else {
    lines.push('        ROOT_PASSWORD: root123');
  }
  lines.push('        GIT_USER_NAME: ' + (config.gitUserName || ''));
  lines.push('        GIT_USER_EMAIL: ' + (config.gitUserEmail || ''));
  if (config.sshPrivateKey) {
    const escaped = config.sshPrivateKey.replace(/\n/g, '\\n');
    lines.push(`        SSH_PRIVATE_KEY: "${escaped}"`);
  }
  if (config.sshPublicKey) {
    lines.push(`        SSH_PUBLIC_KEY: ${config.sshPublicKey}`);
  }
  if (config.codeServer && config.csPassword) {
    lines.push(`        CS_PASSWORD: ${config.csPassword}`);
  }
  if (config.cfTunnel) {
    lines.push('        #请在此填入您的Cloudflare Tunnel Token');
    lines.push('        CF_TUNNEL_TOKEN: ' + (config.cfToken || ''));
  }

  // OSS 对象存储持久化配置
  if (config.ossEnabled) {
    lines.push('        # ===== 对象存储持久化配置 =====');
    lines.push('        OSS_ENABLED: "true"');
    if (config.ossEndpoint) {
      lines.push(`        OSS_ENDPOINT: ${config.ossEndpoint}`);
    } else {
      lines.push('        OSS_ENDPOINT: # 请填入 S3 endpoint，如 https://oss-cn-beijing.aliyuncs.com');
    }
    if (config.ossAccessKey) {
      lines.push(`        OSS_ACCESS_KEY: ${config.ossAccessKey}`);
    } else {
      lines.push('        OSS_ACCESS_KEY: # 请填入 Access Key ID');
    }
    if (config.ossSecretKey) {
      lines.push(`        OSS_SECRET_KEY: ${config.ossSecretKey}`);
    } else {
      lines.push('        OSS_SECRET_KEY: # 请填入 Secret Access Key');
    }
    if (config.ossBucket) {
      lines.push(`        OSS_BUCKET: ${config.ossBucket}`);
    } else {
      lines.push('        OSS_BUCKET: # 请填入桶名');
    }
    lines.push(`        OSS_REGION: ${config.ossRegion || 'auto'}`);
    lines.push(`        OSS_PROJECT: ${config.ossProject || 'devbox'}`);
    lines.push(`        OSS_PATHS: "${config.ossPaths || '/root/.claude:/root/.cc-switch:/root/.local/share/code-server/User/globalStorage'}"`);
    lines.push(`        OSS_KEEP_COUNT: "${config.ossKeepCount || 5}"`);
    lines.push(`        OSS_SYNC_INTERVAL: "${config.ossSyncInterval || 5}"`);
  }

  // services
  lines.push('      services:');
  lines.push('        - docker');
  lines.push('        - name: vscode');
  lines.push('          #这里为容器存活时间，当超过此时间且无操作，容器自动关闭，请根据需要自行修改');
  lines.push('          options:');
  lines.push('            keepAliveTimeout: 60m');

  return lines.join('\n');
}