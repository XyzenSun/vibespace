/** compose.js — docker-compose.yml 生成器 */

function generateCompose(config) {
  const lines = [];
  const isBindMount = config.volumeMode === 'bind';

  lines.push('services:');
  lines.push('  devbox:');
  lines.push('    build: .');
  lines.push('    container_name: devbox');
  lines.push('    restart: unless-stopped');

  // 端口
  lines.push('    ports:');
  lines.push('      - "22:22"');
  if (config.codeServer) lines.push('      - "12345:12345"');

  // 持久化
  lines.push('    volumes:');
  if (isBindMount) {
    lines.push('      - ./workspace:/workspace');
    lines.push('      - ./root-data:/root');
  } else {
    lines.push('      - workspace:/workspace');
    lines.push('      - root-data:/root');
  }

  // 环境变量
  lines.push('    environment:');
  lines.push(`      - ROOT_PASSWORD=${config.rootPassword || '${ROOT_PASSWORD:-root123}'}`);
  if (config.gitUserName) {
    lines.push(`      - GIT_USER_NAME=${config.gitUserName}`);
  } else {
    lines.push('      - GIT_USER_NAME=${GIT_USER_NAME:-}');
  }
  if (config.gitUserEmail) {
    lines.push(`      - GIT_USER_EMAIL=${config.gitUserEmail}`);
  } else {
    lines.push('      - GIT_USER_EMAIL=${GIT_USER_EMAIL:-}');
  }
  if (config.sshPublicKey) {
    lines.push(`      - SSH_PUBLIC_KEY=${config.sshPublicKey}`);
  } else {
    lines.push('      - SSH_PUBLIC_KEY=${SSH_PUBLIC_KEY:-}');
  }
  if (config.codeServer) {
    if (config.csPassword) {
      lines.push(`      - CS_PASSWORD=${config.csPassword}`);
    } else {
      lines.push('      - CS_PASSWORD=${CS_PASSWORD:-}');
    }
  }
  if (config.cfTunnel) lines.push('      - CF_TUNNEL_TOKEN=${CF_TUNNEL_TOKEN:-}');
  if (config.frpcEnabled) lines.push('      - FRPC_CONFIG_URL=${FRPC_CONFIG_URL:-}');

  // 命名卷声明（仅卷挂载模式需要）
  if (!isBindMount) {
    lines.push('');
    lines.push('volumes:');
    lines.push('  workspace:');
    lines.push('    driver: local');
    lines.push('  root-data:');
    lines.push('    driver: local');
  }

  return lines.join('\n');
}
