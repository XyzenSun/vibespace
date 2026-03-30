/** envFile.js — .env 文件生成器 (本机部署专用) */

function generateEnvFile(config) {
  const lines = [];
  lines.push('# Vibe Space 环境变量配置');
  lines.push('# 生成时间: ' + new Date().toISOString());
  lines.push('');

  // SSH 密码
  if (config.rootPassword) {
    lines.push(`ROOT_PASSWORD=${config.rootPassword}`);
  } else {
    lines.push('# ROOT_PASSWORD=root123');
  }

  // Git 配置
  if (config.gitUserName) {
    lines.push(`GIT_USER_NAME=${config.gitUserName}`);
  }
  if (config.gitUserEmail) {
    lines.push(`GIT_USER_EMAIL=${config.gitUserEmail}`);
  }

  // SSH 公钥
  if (config.sshPublicKey) {
    lines.push(`SSH_PUBLIC_KEY=${config.sshPublicKey}`);
  }

  // Code-Server 密码
  if (config.codeServer && config.csPassword) {
    lines.push(`CS_PASSWORD=${config.csPassword}`);
  }

  // Cloudflare Tunnel
  if (config.cfTunnel) {
    lines.push('');
    lines.push('# Cloudflare Tunnel Token');
    lines.push('# CF_TUNNEL_TOKEN=your_token_here');
  }

  // FRPC 配置
  if (config.frpcEnabled) {
    lines.push('');
    lines.push('# FRPC 配置文件下载地址 (需为直链)');
    if (config.frpcConfigUrl) {
      lines.push(`FRPC_CONFIG_URL=${config.frpcConfigUrl}`);
    } else {
      lines.push('# FRPC_CONFIG_URL=https://example.com/frpc.toml');
    }
  }

  return lines.join('\n');
}