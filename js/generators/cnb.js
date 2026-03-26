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

  // services
  lines.push('      services:');
  lines.push('        - docker');
  lines.push('        - name: vscode');
  lines.push('          #这里为容器存活时间，当超过此时间且无操作，容器自动关闭，请根据需要自行修改');
  lines.push('          options:');
  lines.push('            keepAliveTimeout: 60m');

  return lines.join('\n');
}