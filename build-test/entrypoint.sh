#!/bin/bash
set -e

# --- 恢复 /root 默认文件 ---
cp -an /root-defaults/root/. /root/ 2>/dev/null || true

# --- Git ---
if [ -n "$GIT_USER_NAME" ]; then
    git config --global user.name "$GIT_USER_NAME"
fi
if [ -n "$GIT_USER_EMAIL" ]; then
    git config --global user.email "$GIT_USER_EMAIL"
fi

# --- SSH 密钥 ---
if [ -n "$SSH_PRIVATE_KEY" ]; then
    mkdir -p ~/.ssh && chmod 700 ~/.ssh
    echo "$SSH_PRIVATE_KEY" > ~/.ssh/id_rsa
    chmod 600 ~/.ssh/id_rsa
    if [ -n "$SSH_PUBLIC_KEY" ]; then
        echo "$SSH_PUBLIC_KEY" > ~/.ssh/id_rsa.pub
        chmod 644 ~/.ssh/id_rsa.pub
    fi
    ssh-keyscan -t rsa github.com gitlab.com gitee.com >> ~/.ssh/known_hosts 2>/dev/null
    chmod 644 ~/.ssh/known_hosts
fi

# --- SSH 密码 ---
echo "root:${ROOT_PASSWORD:-root123}" | chpasswd

# --- code-server 认证 ---
AUTH_ARGS="--auth none"
if [ -n "$CS_PASSWORD" ]; then
    export PASSWORD="$CS_PASSWORD"
    AUTH_ARGS="--auth password"
fi

# --- Cloudflare Tunnel ---
if [ -n "$CF_TUNNEL_TOKEN" ]; then
    wget -q -O /usr/local/bin/cloudflared "https://github.com/cloudflare/cloudflared/releases/download/2026.3.0/cloudflared-linux-amd64"
    chmod +x /usr/local/bin/cloudflared
    nohup /usr/local/bin/cloudflared tunnel run --token "$CF_TUNNEL_TOKEN" > /var/log/cloudflared.log 2>&1 &
fi

# --- Vibe 快捷命令 ---
echo 'alias vibe="IS_SANDBOX=1 claude --dangerously-skip-permissions"' >> /root/.bashrc
source /root/.bashrc

# --- README ---
cat > /workspace/README.md << 'READMEEOF'
# Development Environment

## 已安装的工具

### 编程语言
- Node.js / npm
- Go
- C
- Python
- Rust
- Java
- C++

### AI 工具
- CC-Switch: ClaudeCode/Codex 提供商 MCP Skils管理工具
- Claude Code: Anthropic CLI 开发工具
- CCLine: Claude Code 状态行工具

### Claude Code 工作流
- ZCF 工作流: 来自 UfoMiao/zcf 项目，包含通用工具、六步开发、功能规划、Git 工作流、BMAD 企业级

> 使用方式: 在 Claude Code 中输入 `/zcf:命令名` 调用工作流

### Claude Code 输出样式
- **工程师专业版（UfoMiao/zcf）**: 遵循SOLID、KISS、DRY、YAGNI原则，专业简洁

### 快捷命令
输入 `vibe` 即可执行: `IS_SANDBOX=1 claude --dangerously-skip-permissions`

## 环境变量
- `ROOT_PASSWORD`: SSH root 密码 (默认: root123)
- `GIT_USER_NAME`: Git 用户名
- `GIT_USER_EMAIL`: Git 邮箱
- `SSH_PRIVATE_KEY`: SSH 私钥
- `SSH_PUBLIC_KEY`: SSH 公钥
- `CS_PASSWORD`: Code-Server 密码 (不设置则免密)
- `CF_TUNNEL_TOKEN`: Cloudflare Tunnel Token
READMEEOF

# --- 启动 ---
/usr/sbin/sshd

exec code-server --bind-addr 0.0.0.0:8080 $AUTH_ARGS /workspace