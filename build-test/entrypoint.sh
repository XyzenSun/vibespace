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

# --- Vibe 快捷命令 ---
echo 'alias vibe="IS_SANDBOX=1 claude --dangerously-skip-permissions"' >> /root/.bashrc

# --- Claude MCP Servers ---
claude mcp add-json -s user 'context7' '{"command":"npx","args":["-y","@upstash/context7-mcp@latest"]}' || true
claude mcp add-json -s user 'mcp-deepwiki' '{"command":"npx","args":["-y","mcp-deepwiki@latest"]}' || true

# --- Claude Code 输出样式 ---
mkdir -p ~/.claude/output-styles
claude config set outputStyle "default" -g 2>/dev/null || true

# --- Claude Code 工作流 (来自 UfoMiao/zcf) ---
mkdir -p ~/.claude/commands/zcf
mkdir -p ~/.claude/agents/zcf
curl -sSL "https://raw.githubusercontent.com/UfoMiao/zcf/main/templates/claude-code/zh-CN/workflow/common/commands/init-project.md" -o ~/.claude/commands/zcf/init-project.md 2>/dev/null || true
mkdir -p ~/.claude/agents/zcf/common
curl -sSL "https://raw.githubusercontent.com/UfoMiao/zcf/main/templates/claude-code/zh-CN/workflow/common/agents/init-architect.md" -o ~/.claude/agents/zcf/common/init-architect.md 2>/dev/null || true
curl -sSL "https://raw.githubusercontent.com/UfoMiao/zcf/main/templates/claude-code/zh-CN/workflow/common/agents/get-current-datetime.md" -o ~/.claude/agents/zcf/common/get-current-datetime.md 2>/dev/null || true
curl -sSL "https://raw.githubusercontent.com/UfoMiao/zcf/main/templates/common/workflow/sixStep/zh-CN/workflow.md" -o ~/.claude/commands/zcf/workflow.md 2>/dev/null || true
curl -sSL "https://raw.githubusercontent.com/UfoMiao/zcf/main/templates/claude-code/zh-CN/workflow/plan/commands/feat.md" -o ~/.claude/commands/zcf/feat.md 2>/dev/null || true
mkdir -p ~/.claude/agents/zcf/plan
curl -sSL "https://raw.githubusercontent.com/UfoMiao/zcf/main/templates/claude-code/zh-CN/workflow/plan/agents/planner.md" -o ~/.claude/agents/zcf/plan/planner.md 2>/dev/null || true
curl -sSL "https://raw.githubusercontent.com/UfoMiao/zcf/main/templates/claude-code/zh-CN/workflow/plan/agents/ui-ux-designer.md" -o ~/.claude/agents/zcf/plan/ui-ux-designer.md 2>/dev/null || true
curl -sSL "https://raw.githubusercontent.com/UfoMiao/zcf/main/templates/common/workflow/git/zh-CN/git-commit.md" -o ~/.claude/commands/zcf/git-commit.md 2>/dev/null || true
curl -sSL "https://raw.githubusercontent.com/UfoMiao/zcf/main/templates/common/workflow/git/zh-CN/git-worktree.md" -o ~/.claude/commands/zcf/git-worktree.md 2>/dev/null || true
curl -sSL "https://raw.githubusercontent.com/UfoMiao/zcf/main/templates/common/workflow/git/zh-CN/git-rollback.md" -o ~/.claude/commands/zcf/git-rollback.md 2>/dev/null || true
curl -sSL "https://raw.githubusercontent.com/UfoMiao/zcf/main/templates/common/workflow/git/zh-CN/git-cleanBranches.md" -o ~/.claude/commands/zcf/git-cleanBranches.md 2>/dev/null || true
curl -sSL "https://raw.githubusercontent.com/UfoMiao/zcf/main/templates/claude-code/zh-CN/workflow/bmad/commands/bmad-init.md" -o ~/.claude/commands/zcf/bmad-init.md 2>/dev/null || true

# --- Claude Code settings.json ---
mkdir -p ~/.claude
cat > ~/.claude/settings.json << 'SETTINGSEOF'
{
  "env": {
    "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC": "1",
    "DISABLE_AUTOUPDATER": "1"
  }
}
SETTINGSEOF

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
- C++
- Java

### AI 工具
- Claude Code: Anthropic CLI 开发工具
- CC-Switch: ClaudeCode/Codex 提供商 MCP Skils管理工具

### Claude Code 工作流
- ZCF 工作流: 来自 UfoMiao/zcf 项目，包含通用工具、六步开发、功能规划、Git 工作流、BMAD 企业级

> 使用方式: 在 Claude Code 中输入 `/zcf:命令名` 调用工作流

### Claude Code 输出样式
- **默认**: Claude Code 默认输出样式

### 快捷命令
输入 `vibe` 即可执行: `IS_SANDBOX=1 claude --dangerously-skip-permissions`

## 环境变量
- `ROOT_PASSWORD`: SSH root 密码 (默认: root123)
- `GIT_USER_NAME`: Git 用户名
- `GIT_USER_EMAIL`: Git 邮箱
- `SSH_PRIVATE_KEY`: SSH 私钥
- `SSH_PUBLIC_KEY`: SSH 公钥
- `CS_PASSWORD`: Code-Server 密码 (不设置则免密)
READMEEOF

# --- 启动 ---
/usr/sbin/sshd

exec code-server --bind-addr 0.0.0.0:8080 $AUTH_ARGS /workspace