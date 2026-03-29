/**
 * dockerfile.js — Dockerfile 生成器
 *
 * 分层策略 (按变更频率排列，优化构建缓存):
 *   0. FROM + ENV       — 极少变动
 *   1. 系统包 + 镜像源  — 极少变动
 *   2. 语言运行时       — 版本变动
 *   3. 全局 npm 包      — 偶尔
 *   4. 语言开发工具     — 偶尔
 *   5. code-server      — 偶尔
 *   6. AI 工具          — 频繁
 *   7. SSH + entrypoint — 极少变动
 */

function generateDockerfile(config) {
  const lines = [];
  const isChina = config.region === 'china';
  const mirrors = DEFAULTS.chinaMirrors;

  // --- 层0: FROM + ENV ---
  lines.push(`FROM ${config.baseImage}`);
  lines.push('');

  const envVars = ['LANG=C.UTF-8', 'LANGUAGE=C.UTF-8'];
  if (config.languages.includes('go')) {
    const goVer = config.languageVersions.go || DEFAULTS.languages.find(l => l.id === 'go').defaultVersion;
    envVars.push(`GOLANG_VERSION=${goVer}`, 'GOPATH=/root/go');
    if (isChina) envVars.push(`GOPROXY=${mirrors.goProxy}`);
  }
  const pathParts = ['$PATH'];
  if (config.languages.includes('go')) pathParts.push('/usr/local/go/bin', '/root/go/bin');
  pathParts.push('/root/.local/bin');
  if (config.languages.includes('rust')) pathParts.push('/root/.cargo/bin');
  envVars.push(`PATH=${pathParts.join(':')}`);
  lines.push('ENV ' + envVars.join(' \\\n    '));
  lines.push('');

  // --- 层1: 系统包 ---
  const layer1 = [];
  // 中国 apt 镜像源 (DNS 在 entrypoint 运行时配置，构建阶段 resolv.conf 只读)
  if (isChina) layer1.push(mirrors.aptScript);
  layer1.push('apt-get update');

  const aptPkgs = new Set(['git', 'wget', 'unzip', 'curl', 'ca-certificates', 'openssh-server', 'openssh-client', 'vim', 'nano', 'rclone', 'zstd', 'cron']);
  config.languages.forEach(langId => {
    const lang = DEFAULTS.languages.find(l => l.id === langId);
    if (!lang) return;
    // 先添加语言定义中的基础 apt 包（make, build-essential, cmake 等）
    lang.aptPkgs.forEach(p => aptPkgs.add(p));
    // Java: 根据版本选择 openjdk 包名
    if (langId === 'java') {
      const javaVer = config.languageVersions.java || '21';
      aptPkgs.add(`openjdk-${javaVer}-jdk`);
    }
    // C: 根据版本选择 gcc 包名
    if (langId === 'c') {
      const cVer = config.languageVersions.c || 'system';
      aptPkgs.add(cVer === 'system' ? 'gcc' : `gcc-${cVer}`);
    }
    // C++: 根据版本选择 g++ 包名
    if (langId === 'cpp') {
      const cppVer = config.languageVersions.cpp || 'system';
      aptPkgs.add(cppVer === 'system' ? 'g++' : `g++-${cppVer}`);
    }
  });
  // Python 指定版本时通过 deadsnakes PPA 安装，不走 apt 默认包
  const pythonVer = config.languageVersions.python || 'system';
  if (config.languages.includes('python') && pythonVer !== 'system') {
    aptPkgs.delete('python3');
    aptPkgs.delete('python3-pip');
    aptPkgs.add('software-properties-common');
  }
  layer1.push(`apt-get install -y --no-install-recommends \\\n        ${[...aptPkgs].sort().join(' ')}`);

  if (config.needsNodejs) {
    const nodeVer = config.languageVersions.nodejs || '20';
    layer1.push(`curl -fsSL ${URLS.languages.nodejs.setup(nodeVer)} | bash -`);
    layer1.push('apt-get install -y --no-install-recommends nodejs');
  }
  // Python: 指定版本通过 deadsnakes PPA 安装
  if (config.languages.includes('python') && pythonVer !== 'system') {
    layer1.push('add-apt-repository -y ppa:deadsnakes/ppa');
    layer1.push('apt-get update');
    layer1.push(`apt-get install -y --no-install-recommends python${pythonVer} python${pythonVer}-distutils`);
    layer1.push(`update-alternatives --install /usr/bin/python3 python3 /usr/bin/python${pythonVer} 1`);
    layer1.push(`curl -sS ${URLS.languages.python.getPip} | python3`);
  }
  if (config.languages.includes('python') && isChina) {
    layer1.push(`pip3 config set global.index-url ${mirrors.pip}`);
  }
  layer1.push('apt-get autoremove -y', 'apt-get clean', 'rm -rf /var/lib/apt/lists/*');
  lines.push('# 层1: 系统包 + 基础工具');
  lines.push('RUN ' + layer1.join(' \\\n    && '));
  lines.push('');

  // --- 层2: 语言运行时 ---
  const runtime = [];
  if (config.languages.includes('go')) {
    const goUrl = isChina
      ? URLS.languages.go.downloadChina('${GOLANG_VERSION}')
      : URLS.languages.go.download('${GOLANG_VERSION}');
    runtime.push(`wget -q ${goUrl}`, 'tar -C /usr/local -xzf go${GOLANG_VERSION}.linux-amd64.tar.gz', 'rm -f go${GOLANG_VERSION}.linux-amd64.tar.gz');
  }
  if (config.languages.includes('rust')) {
    runtime.push(`curl --proto "=https" --tlsv1.2 -sSf ${URLS.languages.rust.rustup} | sh -s -- -y`);
    runtime.push('echo \'source $HOME/.cargo/env\' >> /root/.bashrc');
  }
  if (config.languages.includes('python') && config.pythonVenv) {
    const pyVenvPkg = pythonVer !== 'system' ? `python${pythonVer}-venv` : 'python3-venv';
    runtime.push(`apt-get update && apt-get install -y --no-install-recommends ${pyVenvPkg} && apt-get clean && rm -rf /var/lib/apt/lists/*`);
  }
  if (runtime.length) {
    lines.push('# 层2: 语言运行时');
    lines.push('RUN ' + runtime.join(' \\\n    && '));
    lines.push('');
  }

  // --- 层3: 全局 npm 包 (不含 AI 工具) ---
  if (config.needsNodejs) {
    const npm = [];
    if (isChina) npm.push(`npm config set registry ${mirrors.npm}`);
    if (config.languages.includes('nodejs')) npm.push('npm install -g typescript ts-node');
    if (npm.length) {
      npm.push('npm cache clean --force');
      lines.push('# 层3: 全局 npm 包');
      lines.push('RUN ' + npm.join(' \\\n    && '));
      lines.push('');
    }
  }

  // --- 层4: 语言开发工具 ---
  const devTools = [];
  config.languages.forEach(langId => {
    const lang = DEFAULTS.languages.find(l => l.id === langId);
    if (lang && lang.devTools.length) lang.devTools.forEach(t => devTools.push(t.cmd));
  });
  if (config.languages.includes('go') && devTools.length) {
    devTools.push('go clean -modcache', 'go clean -cache');
  }
  if (devTools.length) {
    lines.push('# 层4: 语言开发工具');
    lines.push('RUN ' + devTools.join(' \\\n    && '));
    lines.push('');
  }

  // --- 层5: code-server + 扩展 ---
  if (config.codeServer) {
    lines.push('# 层5a: 安装 code-server');
    lines.push(`RUN curl -fsSL ${URLS.tools.codeServer.install} | sh \\`);
    lines.push('    && rm -rf /tmp/*');
    lines.push('');

    // 合并默认扩展 + 自定义扩展
    const allExt = [...config.extensions];
    if (config.customExtensions) {
      config.customExtensions.split(/[\n,]/).map(s => s.trim()).filter(Boolean).forEach(ext => {
        if (!allExt.includes(ext)) allExt.push(ext);
      });
    }
    if (allExt.length) {
      const cmds = allExt.map(ext => `code-server --install-extension ${ext}`);
      cmds.push('rm -rf /tmp/* /root/.cache');
      lines.push('# 层5b: code-server 扩展');
      lines.push('RUN ' + cmds.join(' \\\n    && '));
      lines.push('');
    }
  }

  // --- 层6: AI 工具 ---
  if (config.aiTools.length) {
    const cmds = [];
    // npm 安装
    const pkgs = [];
    config.aiTools.forEach(toolId => {
      const tool = DEFAULTS.aiTools.find(t => t.id === toolId);
      if (tool && tool.npmPkg) {
        const ver = config.aiToolVersions[toolId] || (tool.hasVersion ? tool.defaultVersion : '');
        pkgs.push(ver && ver !== 'latest' ? `${tool.npmPkg}@${ver}` : tool.npmPkg);
      }
    });
    if (pkgs.length) {
      cmds.push(`npm install -g ${pkgs.join(' ')}`, 'npm cache clean --force');
    }
    // CC-Switch 脚本安装
    if (config.aiTools.includes('cc-switch')) {
      const url = isChina ? DEFAULTS.ccSwitch.mirrorUrl : DEFAULTS.ccSwitch.url;
      cmds.push(`CC_SWITCH_FORCE=1 curl -fsSL ${url} | bash`);
    }
    // Vibe 快捷命令（创建脚本方式，比 alias 更可靠）
    if (config.vibeCommand && config.vibeCommandText) {
      const vibeCmd = config.vibeCommandText.replace(/'/g, "'\\''");
      cmds.push(`echo '#!/bin/bash' > /usr/local/bin/vibe`, `echo '${vibeCmd} "\$@"' >> /usr/local/bin/vibe`, 'chmod +x /usr/local/bin/vibe');
    }
    if (cmds.length) {
      lines.push('# 层6: AI 工具');
      lines.push('RUN ' + cmds.join(' \\\n    && '));
      lines.push('');
    }
  }

  // --- 层6b: Claude Code 配置（MCP + 工作流 + 输出风格模板）---
  if (config.aiTools.includes('claude-code')) {
    const claudeCmds = [];

    // Claude Code settings.json（遥测禁用 + CCLine statusLine）
    const hasCcline = config.aiTools.includes('ccline');
    const hasTelemetryDisable = config.claudeDisableTelemetry;
    if (hasCcline || hasTelemetryDisable) {
      claudeCmds.push('mkdir -p ~/.claude');
      const settings = {};
      if (hasCcline) {
        settings.statusLine = { type: 'command', command: 'ccline', padding: 0 };
      }
      if (hasTelemetryDisable) {
        settings.env = {
          CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1',
          DISABLE_AUTOUPDATER: '1',
        };
      }
      const settingsJson = JSON.stringify(settings);
      // 使用 printf 写入，避免 heredoc 在 RUN && 链中断链
      const escaped = settingsJson.replace(/\\/g, '\\\\').replace(/'/g, "'\\''");
      claudeCmds.push(`printf '%s' '${escaped}' > ~/.claude/settings.json`);
    }

    // 输出样式配置（必须在 settings.json 写入之后，claude config set 会智能合并）
    const outputStyle = config.claudeOutputStyle;
    if (outputStyle) {
      const style = DEFAULTS.claudeOutputStyles.find(s => s.id === outputStyle);
      if (style) {
        claudeCmds.push('mkdir -p ~/.claude/output-styles');
        if (style.isCustom) {
          const rawStyleUrl = URLS.zcf.outputStyle(style.id);
          const styleUrl = isChina ? URLS.withGhProxy(rawStyleUrl) : rawStyleUrl;
          claudeCmds.push(`(curl -sSL "${styleUrl}" -o ~/.claude/output-styles/${style.id}.md 2>/dev/null || true)`);
        }
        claudeCmds.push(`(claude config set outputStyle "${outputStyle}" -g 2>/dev/null || true)`);
      }
    }

    // MCP Servers
    const mcpServers = (config.claudeMcpServers || []).filter(s => s.name && s.json);
    mcpServers.forEach(mcp => {
      const safeName = mcp.name.replace(/'/g, "'\\''");
      const safeJson = mcp.json.replace(/'/g, "'\\''");
      claudeCmds.push(`(claude mcp add-json -s user '${safeName}' '${safeJson}' || true)`);
    });

    // 工作流安装
    const workflows = config.claudeWorkflows || [];
    if (workflows.includes('zcf')) {
      claudeCmds.push('mkdir -p ~/.claude/commands/zcf');
      claudeCmds.push('mkdir -p ~/.claude/agents/zcf');

      const baseUrl = isChina ? URLS.withGhProxy(URLS.zcf.baseUrl) : URLS.zcf.baseUrl;

      const zcfModules = [
        { commands: ['init-project.md'], agents: ['init-architect.md', 'get-current-datetime.md'], category: 'common' },
        { commands: ['workflow.md'], agents: [], category: 'sixStep' },
        { commands: ['feat.md'], agents: ['planner.md', 'ui-ux-designer.md'], category: 'plan' },
        { commands: ['git-commit.md', 'git-worktree.md', 'git-rollback.md', 'git-cleanBranches.md'], agents: [], category: 'git' },
        { commands: ['bmad-init.md'], agents: [], category: 'bmad' },
      ];

      zcfModules.forEach(mod => {
        mod.commands.forEach(cmd => {
          let cmdUrl;
          if (mod.category === 'git') {
            cmdUrl = `${baseUrl}/common/workflow/git/zh-CN/${cmd}`;
          } else if (mod.category === 'sixStep') {
            cmdUrl = `${baseUrl}/common/workflow/sixStep/zh-CN/${cmd}`;
          } else {
            cmdUrl = `${baseUrl}/claude-code/zh-CN/workflow/${mod.category}/commands/${cmd}`;
          }
          claudeCmds.push(`(curl -sSL "${cmdUrl}" -o ~/.claude/commands/zcf/${cmd} 2>/dev/null || true)`);
        });
        if (mod.agents.length > 0) {
          claudeCmds.push(`mkdir -p ~/.claude/agents/zcf/${mod.category}`);
          mod.agents.forEach(agent => {
            const agentUrl = `${baseUrl}/claude-code/zh-CN/workflow/${mod.category}/agents/${agent}`;
            claudeCmds.push(`(curl -sSL "${agentUrl}" -o ~/.claude/agents/zcf/${mod.category}/${agent} 2>/dev/null || true)`);
          });
        }
      });
    }

    if (claudeCmds.length) {
      lines.push('# 层6b: Claude Code 配置');
      lines.push('RUN ' + claudeCmds.join(' \\\n    && '));
      lines.push('');
    }
  }

  // --- 自定义层 (插入于层6与层7之间) ---
  if (config.customDockerfile && config.customDockerfile.trim()) {
    lines.push('# 自定义层');
    lines.push(config.customDockerfile.trim());
    lines.push('');
  }

  // --- 层7: SSH + /root 备份 + entrypoint ---
  lines.push('# 层7: SSH 配置');
  lines.push('RUN mkdir -p /run/sshd \\');
  lines.push('    && sed -i \'s/^#*PermitRootLogin.*/PermitRootLogin yes/\' /etc/ssh/sshd_config \\');
  lines.push('    && sed -i \'s/^#*PasswordAuthentication.*/PasswordAuthentication yes/\' /etc/ssh/sshd_config');
  lines.push('');
  lines.push('# 备份 /root，防止 volume 挂载覆盖镜像内文件');
  lines.push('RUN mkdir /root-defaults && cp -a /root /root-defaults');
  lines.push('');
  lines.push('COPY entrypoint.sh /usr/local/bin/entrypoint.sh');
  lines.push('RUN chmod +x /usr/local/bin/entrypoint.sh');
  lines.push('');
  lines.push('WORKDIR /workspace');

  const ports = [];
  if (config.codeServer) ports.push('8080');
  ports.push('22');
  lines.push(`EXPOSE ${ports.join(' ')}`);
  lines.push('ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]');

  return lines.join('\n');
}
