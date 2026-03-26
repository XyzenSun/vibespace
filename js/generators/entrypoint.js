/** entrypoint.js — 容器启动脚本生成器 */

function generateEntrypoint(config) {
  const lines = [];
  const isChina = config.region === 'china';

  lines.push('#!/bin/bash');
  lines.push('set -e');
  lines.push('');

  // DNS (构建阶段 resolv.conf 只读，在运行时配置)
  if (isChina) {
    lines.push('# --- DNS ---');
    const dnsStr = DEFAULTS.chinaMirrors.dns.replace(/\n/g, '\\n');
    lines.push(`echo -e "${dnsStr}" | tee /etc/resolv.conf > /dev/null`);
    lines.push('');
  }

  // 从备份恢复 /root 默认文件 (-n 不覆盖已有)
  lines.push('# --- 恢复 /root 默认文件 ---');
  lines.push('cp -an /root-defaults/root/. /root/ 2>/dev/null || true');
  lines.push('');

  // CNB 持久化目录软连接
  if (config.deployPlatform === 'cnb') {
    const cnbBase = config.cnbProjectName ? `/root/.cnb/${config.cnbProjectName}` : '/root/.cnb/vibespace';
    lines.push('# --- CNB 持久化目录软连接 ---');
    lines.push('# CNB 会自动漫游 ~/.cnb 目录，把需要持久化的目录通过软连接指向这里');
    lines.push('# 注意：~/.cnb 目录最大容量 100MB，只持久化必要的配置文件目录');
    lines.push(`PERSIST_DIR="${cnbBase}"`);
    lines.push('');
    lines.push('# 需要持久化的目录数组（完整路径），按需添加更多目录');
    lines.push('# 例如：/root/.config /root/.local/share 等');
    lines.push('PERSIST_DIRS=("/root/.claude" "/root/.cc-switch" "/root/.local/share/code-server/User/globalStorage" "/root/.vscode-server/data/User/globalStorage")');
    lines.push('');
    lines.push('mkdir -p "$PERSIST_DIR"');
    lines.push('');
    lines.push('for source in "${PERSIST_DIRS[@]}"; do');
    lines.push('    # source: 原始目录路径（如 /root/.claude）');
    lines.push('    # 目录不存在则跳过（工具首次运行创建目录后，下次启动会自动持久化）');
    lines.push('    if [ ! -d "$source" ]; then');
    lines.push('        echo "[CNB] 跳过不存在的目录: $source"');
    lines.push('        continue');
    lines.push('    fi');
    lines.push('');
    lines.push('    # target: 持久化目标目录（保留原路径结构）');
    lines.push('    # 如 /root/.claude → /root/.cnb/vibespace/root/.claude');
    lines.push('    target="${PERSIST_DIR}${source}"');
    lines.push('');
    lines.push('    # 如果持久化目标目录不存在（首次启动），把原始目录内容复制过去');
    lines.push('    if [ ! -d "$target" ]; then');
    lines.push('        echo "[CNB] 首次持久化: $source -> $target"');
    lines.push('        mkdir -p "$target"');
    lines.push('        cp -a "$source/." "$target/"');
    lines.push('    fi');
    lines.push('');
    lines.push('    # 删除原始目录，建立软连接指向持久化目标目录');
    lines.push('    rm -rf "$source"');
    lines.push('    ln -sfn "$target" "$source"');
    lines.push('    echo "[CNB] 已建立软连接: $source -> $target"');
    lines.push('done');
    lines.push('');
  }

  // Git
  lines.push('# --- Git ---');
  lines.push('if [ -n "$GIT_USER_NAME" ]; then');
  lines.push('    git config --global user.name "$GIT_USER_NAME"');
  lines.push('fi');
  lines.push('if [ -n "$GIT_USER_EMAIL" ]; then');
  lines.push('    git config --global user.email "$GIT_USER_EMAIL"');
  lines.push('fi');
  lines.push('');

  // SSH 客户端密钥
  lines.push('# --- SSH 密钥 ---');
  lines.push('if [ -n "$SSH_PRIVATE_KEY" ]; then');
  lines.push('    mkdir -p ~/.ssh && chmod 700 ~/.ssh');
  lines.push('    echo "$SSH_PRIVATE_KEY" > ~/.ssh/id_rsa');
  lines.push('    chmod 600 ~/.ssh/id_rsa');
  lines.push('    if [ -n "$SSH_PUBLIC_KEY" ]; then');
  lines.push('        echo "$SSH_PUBLIC_KEY" > ~/.ssh/id_rsa.pub');
  lines.push('        chmod 644 ~/.ssh/id_rsa.pub');
  lines.push('    fi');
  lines.push('    ssh-keyscan -t rsa github.com gitlab.com gitee.com >> ~/.ssh/known_hosts 2>/dev/null');
  lines.push('    chmod 644 ~/.ssh/known_hosts');
  lines.push('fi');
  lines.push('');

  // SSH 服务端密码
  lines.push('# --- SSH 密码 ---');
  lines.push('echo "root:${ROOT_PASSWORD:-root123}" | chpasswd');
  lines.push('');

  // code-server 认证
  if (config.codeServer) {
    lines.push('# --- code-server 认证 ---');
    lines.push('AUTH_ARGS="--auth none"');
    lines.push('if [ -n "$CS_PASSWORD" ]; then');
    lines.push('    export PASSWORD="$CS_PASSWORD"');
    lines.push('    AUTH_ARGS="--auth password"');
    lines.push('fi');
    lines.push('');
  }

  // Cloudflare Tunnel
  if (config.cfTunnel) {
    const cfUrl = isChina ? DEFAULTS.cloudflared.mirrorUrl : DEFAULTS.cloudflared.url;
    lines.push('# --- Cloudflare Tunnel ---');
    lines.push('if [ -n "$CF_TUNNEL_TOKEN" ]; then');
    lines.push(`    wget -q -O /usr/local/bin/cloudflared "${cfUrl}"`);
    lines.push('    chmod +x /usr/local/bin/cloudflared');
    lines.push('    nohup /usr/local/bin/cloudflared tunnel run --token "$CF_TUNNEL_TOKEN" > /var/log/cloudflared.log 2>&1 &');
    lines.push('fi');
    lines.push('');
  }

  // Vibe 别名
  if (config.vibeCommand && config.vibeCommandText) {
    lines.push('# --- Vibe 快捷命令 ---');
    const escaped = config.vibeCommandText.replace(/'/g, "'\\''");
    lines.push(`echo 'alias vibe="${escaped}"' >> /root/.bashrc`);
    lines.push('source /root/.bashrc');
    lines.push('');
  }

  // 动态生成 README
  lines.push('# --- README ---');
  lines.push('cat > /workspace/README.md << \'READMEEOF\'');
  lines.push('# Development Environment');
  lines.push('');
  lines.push('## 已安装的工具');
  lines.push('');

  if (config.languages.length) {
    lines.push('### 编程语言');
    config.languages.forEach(langId => {
      const lang = DEFAULTS.languages.find(l => l.id === langId);
      if (lang) lines.push(`- ${lang.label}`);
    });
    lines.push('');
  }

  if (config.aiTools.length) {
    lines.push('### AI 工具');
    config.aiTools.forEach(toolId => {
      const tool = DEFAULTS.aiTools.find(t => t.id === toolId);
      if (tool) lines.push(`- ${tool.label}: ${tool.desc}`);
    });
    lines.push('');

    // Claude Code 工作流和输出样式信息
    if (config.aiTools.includes('claude-code')) {
      const workflows = config.claudeWorkflows || [];
      const outputStyle = config.claudeOutputStyle;

      if (workflows.length > 0) {
        lines.push('### Claude Code 工作流');
        workflows.forEach(wfId => {
          const wf = DEFAULTS.claudeWorkflows.find(w => w.id === wfId);
          if (wf) lines.push(`- ${wf.label}: ${wf.desc}`);
        });
        lines.push('');
        lines.push('> 使用方式: 在 Claude Code 中输入 `/zcf:命令名` 调用工作流');
        lines.push('');
      }

      if (outputStyle) {
        const style = DEFAULTS.claudeOutputStyles.find(s => s.id === outputStyle);
        if (style) {
          lines.push('### Claude Code 输出样式');
          lines.push(`- **${style.label}**: ${style.desc}`);
          lines.push('');
        }
      }
    }
  }

  if (config.vibeCommand) {
    lines.push('### 快捷命令');
    lines.push(`输入 \`vibe\` 即可执行: \`${config.vibeCommandText}\``);
    lines.push('');
  }

  lines.push('## 环境变量');
  lines.push('- `ROOT_PASSWORD`: SSH root 密码 (默认: root123)');
  lines.push('- `GIT_USER_NAME`: Git 用户名');
  lines.push('- `GIT_USER_EMAIL`: Git 邮箱');
  lines.push('- `SSH_PRIVATE_KEY`: SSH 私钥');
  lines.push('- `SSH_PUBLIC_KEY`: SSH 公钥');
  if (config.codeServer) lines.push('- `CS_PASSWORD`: Code-Server 密码 (不设置则免密)');
  if (config.cfTunnel) lines.push('- `CF_TUNNEL_TOKEN`: Cloudflare Tunnel Token');
  lines.push('READMEEOF');
  lines.push('');

  // 启动服务
  lines.push('# --- 启动 ---');
  lines.push('/usr/sbin/sshd');
  lines.push('');
  if (config.codeServer) {
    lines.push('exec code-server --bind-addr 0.0.0.0:8080 $AUTH_ARGS /workspace');
  } else {
    lines.push('exec /usr/sbin/sshd -D');
  }

  return lines.join('\n');
}
