#!/bin/bash
set -e

# ============================================
# FRPC 内网穿透
# ============================================
FRPC_CONFIG_URL="${FRPC_CONFIG_URL:-}"
FRPC_PID_FILE="/var/run/frpc.pid"
FRPC_LOG_FILE="/var/log/frpc.log"
FRPC_CONFIG_FILE="/etc/frpc.toml"

# 函数: 启动 frpc
start_frpc() {
    if [ -z "$FRPC_CONFIG_URL" ]; then
        echo "[FRPC] 未配置 FRPC_CONFIG_URL，跳过启动"
        return 1
    fi

    # 检查是否已运行
    if [ -f "$FRPC_PID_FILE" ] && kill -0 $(cat "$FRPC_PID_FILE") 2>/dev/null; then
        echo "[FRPC] frpc 已在运行 (PID: $(cat $FRPC_PID_FILE))"
        return 0
    fi

    # 备份旧配置文件
    if [ -f "$FRPC_CONFIG_FILE" ]; then
        mv "$FRPC_CONFIG_FILE" "$FRPC_CONFIG_FILE.bak.$(date +%s)"
        echo "[FRPC] 已备份旧配置文件"
    fi

    echo "[FRPC] 下载配置文件..."
    if ! wget -q -O "$FRPC_CONFIG_FILE" "$FRPC_CONFIG_URL" ; then
        echo "[FRPC] 配置文件下载失败"
        return 1
    fi

    echo "[FRPC] 启动 frpc..."
    nohup /usr/local/bin/frpc -c "$FRPC_CONFIG_FILE" > "$FRPC_LOG_FILE" 2>&1 &
    local pid=$!
    echo $pid > "$FRPC_PID_FILE"
    echo "[FRPC] frpc 已启动 (PID: $pid)，日志: $FRPC_LOG_FILE"
}

# 函数: 停止 frpc
stop_frpc() {
    if [ -f "$FRPC_PID_FILE" ]; then
        local pid=$(cat "$FRPC_PID_FILE")
        if kill -0 "$pid" 2>/dev/null; then
            kill "$pid" 2>/dev/null || true
            rm -f "$FRPC_PID_FILE"
            echo "[FRPC] frpc 已停止"
        else
            rm -f "$FRPC_PID_FILE"
            echo "[FRPC] frpc 未运行，清理 PID 文件"
        fi
    else
        echo "[FRPC] frpc 未运行"
    fi
}

# 函数: 重启 frpc
restart_frpc() {
    stop_frpc
    sleep 1
    start_frpc
}


# ============================================
# Vibespace 管理菜单
# ============================================
# 支持 --commands 参数（交互式菜单）
if [ "$1" = "--commands" ]; then
    echo "============================================"
    echo "  Vibespace 管理菜单"
    echo "============================================"
    echo "  3. 启动 frpc"
    echo "  4. 停止 frpc"
    echo "  5. 重启 frpc"
    echo "  6. 查看 frpc 状态"
    echo "  7. 查看 frpc 日志"
    echo "  0. 退出"
    echo "============================================"
    read -p "请选择操作 [0-8]: " choice

    case "$choice" in
        3)
            echo "[操作] 启动 frpc..."
            start_frpc
            ;;
        4)
            echo "[操作] 停止 frpc..."
            stop_frpc
            ;;
        5)
            echo "[操作] 重启 frpc..."
            restart_frpc
            ;;
        6)
            echo "[操作] 查看 frpc 状态..."
            if [ -f "$FRPC_PID_FILE" ] && kill -0 $(cat "$FRPC_PID_FILE") 2>/dev/null; then
                echo "[FRPC] frpc 正在运行 (PID: $(cat $FRPC_PID_FILE))"
            else
                echo "[FRPC] frpc 未运行"
            fi
            ;;
        7)
            echo "[操作] 查看 frpc 日志..."
            if [ -f "$FRPC_LOG_FILE" ]; then
                echo "--- 最近 50 行日志 ---"
                tail -50 "$FRPC_LOG_FILE"
            else
                echo "[FRPC] 日志文件不存在: $FRPC_LOG_FILE"
            fi
            ;;
        0)
            echo "退出"
            exit 0
            ;;
        *)
            echo "无效选择: $choice"
            exit 1
            ;;
    esac
    exit 0
fi

# --- DNS ---
echo -e "nameserver 1.1.1.1\nnameserver 114.114.114.114\nnameserver 119.29.29.29" | tee /etc/resolv.conf > /dev/null

# --- 恢复 /root 默认文件 ---
cp -an /root-defaults/root/. /root/ 2>/dev/null || true

# --- Git ---
if [ -n "$GIT_USER_NAME" ]; then
    git config --global user.name "$GIT_USER_NAME"
fi
if [ -n "$GIT_USER_EMAIL" ]; then
    git config --global user.email "$GIT_USER_EMAIL"
fi

# --- SSH authorized_keys ---
if [ -n "$SSH_PUBLIC_KEY" ]; then
    mkdir -p ~/.ssh && chmod 700 ~/.ssh
    echo "$SSH_PUBLIC_KEY" >> ~/.ssh/authorized_keys
    chmod 600 ~/.ssh/authorized_keys
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
    wget -q -O /usr/local/bin/cloudflared "https://gh-proxy.org/https://github.com/cloudflare/cloudflared/releases/download/2026.3.0/cloudflared-linux-amd64"
    chmod +x /usr/local/bin/cloudflared
    nohup /usr/local/bin/cloudflared tunnel run --token "$CF_TUNNEL_TOKEN" > /var/log/cloudflared.log 2>&1 &
fi

# --- FRPC 内网穿透 ---
# 下载 frpc 二进制并启动
if [ -n "$FRPC_CONFIG_URL" ]; then
    wget -q -O /usr/local/bin/frpc "https://gh-proxy.org/https://raw.githubusercontent.com/XyzenSun/vibespace/refs/heads/main/assets/app/frpc_latest"
    chmod +x /usr/local/bin/frpc
    start_frpc
fi

# --- README ---
cat > /workspace/README.md << 'READMEEOF'
# Development Environment

## 已安装的工具

### 编程语言
- Node.js / Ts / npm
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
- Claude Code Router: 将Gemini/Openai格式转换为anthropic格式

### Claude Code 输出样式
- **默认**: Claude Code 默认输出样式

### 快捷命令
输入 `vibe` 即可执行: `IS_SANDBOX=1 claude --dangerously-skip-permissions`

## 环境变量
- `ROOT_PASSWORD`: SSH root 密码 (默认: root123)
- `GIT_USER_NAME`: Git 用户名
- `GIT_USER_EMAIL`: Git 邮箱
- `SSH_PUBLIC_KEY`: SSH 公钥 (用于连接容器)
- `CS_PASSWORD`: Code-Server 密码 (不设置则免密)
- `CF_TUNNEL_TOKEN`: Cloudflare Tunnel Token
- `FRPC_CONFIG_URL`: frpc 配置文件下载地址
READMEEOF

# --- 启动 ---
/usr/sbin/sshd

# 启动时重启 frpc
if [ -n "$FRPC_CONFIG_URL" ] && [ -f /usr/local/bin/frpc ]; then
    restart_frpc
fi

exec code-server --bind-addr 0.0.0.0:12345 $AUTH_ARGS /workspace