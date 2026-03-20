/** defaults.js — 全局配置常量 */

const DEFAULTS = {
  /* 基础镜像 — 固定使用 Ubuntu 24.04 LTS */
  baseImage: 'ubuntu:24.04',

  /* code-server 扩展 (checked: 预设默认选中) */
  codeServerExtensions: [
    { id: 'MS-CEINTL.vscode-language-pack-zh-hans', label: '中文语言包', checked: true },
    { id: 'GitHub.github-vscode-theme', label: 'GitHub 主题', checked: true },
    { id: 'DavidAnson.vscode-markdownlint', label: 'Markdown Lint', checked: true },
    { id: 'golang.go', label: 'Go', checked: false },
    { id: 'streetsidesoftware.code-spell-checker', label: '拼写检查', checked: false },
    { id: 'ms-python.python', label: 'Python', checked: false },
    { id: 'g2developer.browser-in-vscode', label: '内置浏览器', checked: true },
    { id: 'FittenTech.Fitten-Code', label: 'Fitten Code', checked: false },
    { id: 'saltcoreyan.json-format-sortcore', label: 'JSON 格式化', checked: true },
    { id: 'redhat.vscode-yaml', label: 'YAML 支持', checked: true },
    { id: 'RooVeterinaryInc.roo-cline', label: 'Roo Cline', checked: false },
    { id: 'Anthropic.claude-code', label: 'Claude Code', checked: false },
    { id: 'eamodio.gitlens', label: 'GitLens', checked: false },
  ],

  /* 编程语言 — aptPkgs: 通过 apt 安装; devTools: 额外开发工具
   *   hasVersion: 是否支持版本选择
   *   versions: 可选版本列表
   *   installNote: 安装方式说明，提示用户确认版本可用性
   */
  languages: [
    {
      id: 'go', label: 'Go', icon: '🐹',
      hasVersion: true, defaultVersion: '1.23.6',
      versions: ['1.24.1', '1.23.6', '1.22.12'],
      installNote: '通过官方二进制包安装，版本号需与 go.dev/dl 一致',
      aptPkgs: [],
      devTools: [
        { cmd: 'go install -v golang.org/x/tools/gopls@latest', label: 'gopls' },
        { cmd: 'go install -v github.com/go-delve/delve/cmd/dlv@latest', label: 'dlv' },
        { cmd: 'go install -v honnef.co/go/tools/cmd/staticcheck@latest', label: 'staticcheck' },
      ],
    },
    {
      id: 'c', label: 'C', icon: '🔧',
      hasVersion: true, defaultVersion: 'system',
      versions: ['system', '14', '13', '12'],
      installNote: 'system 使用系统默认 gcc；指定版本通过 apt 安装 gcc-{version}，需确认源中包含对应版本',
      aptPkgs: ['make', 'build-essential'], devTools: [],
    },
    {
      id: 'cpp', label: 'C++', icon: '⚙️',
      hasVersion: true, defaultVersion: 'system',
      versions: ['system', '14', '13', '12'],
      installNote: 'system 使用系统默认 g++；指定版本通过 apt 安装 g++-{version}，需确认源中包含对应版本',
      aptPkgs: ['make', 'build-essential', 'cmake'], devTools: [],
    },
    {
      id: 'java', label: 'Java', icon: '☕',
      hasVersion: true, defaultVersion: '21',
      versions: ['21', '17', '11', '8'],
      installNote: '通过 apt 安装 OpenJDK，请确认基础镜像源中包含对应版本',
      aptPkgs: [], devTools: [],
    },
    {
      id: 'nodejs', label: 'Node.js / npm', icon: '🟢',
      hasVersion: true, defaultVersion: '20',
      versions: ['22', '20', '18'],
      installNote: '通过 NodeSource 脚本安装，版本号为大版本号',
      aptPkgs: [], isNodejs: true, devTools: [],
    },
    {
      id: 'python', label: 'Python', icon: '🐍',
      hasVersion: true, defaultVersion: 'system',
      versions: ['system', '3.12', '3.11', '3.10'],
      installNote: 'system 使用系统自带版本 (apt)；指定版本通过 deadsnakes PPA 安装，仅 Ubuntu 支持',
      aptPkgs: ['python3', 'python3-pip'], hasVenv: true, venvDefault: true, devTools: [],
    },
    { id: 'rust', label: 'Rust', icon: '🦀', hasVersion: false, installNote: '通过 rustup 安装最新稳定版', aptPkgs: [], devTools: [] },
  ],

  /* AI 工具 — npmPkg: npm 包名; isScript: 脚本安装; requiresTool: 依赖其他工具 */
  aiTools: [
    { id: 'cc-switch', label: 'CC-Switch', desc: 'ClaudeCode/Codex 提供商 MCP Skils管理工具', hasVersion: false, isScript: true },
    { id: 'claude-code', label: 'Claude Code', desc: 'Anthropic CLI 开发工具', hasVersion: true, defaultVersion: 'latest', npmPkg: '@anthropic-ai/claude-code', hasMcp: true },
    { id: 'ccline', label: 'CCLine', desc: 'Claude Code 状态行工具', hasVersion: false, npmPkg: '@cometix/ccline', requiresTool: 'claude-code' },
  ],

  /* 中国镜像源 */
  chinaMirrors: {
    dns: 'nameserver 1.1.1.1\nnameserver 114.114.114.114\nnameserver 119.29.29.29',
    aptScript: 'curl -sSL https://gitee.com/SuperManito/LinuxMirrors/raw/main/ChangeMirrors.sh | bash -s -- --source mirrors.pku.edu.cn --protocol http --use-intranet-source false --backup false --upgrade-software false --clean-cache false --ignore-backup-tips',
    npm: 'https://registry.npmmirror.com',
    pip: 'https://pypi.tuna.tsinghua.edu.cn/simple',
    goProxy: 'https://goproxy.cn,direct',
    ghProxy: 'https://gh-proxy.org/',
  },

  /* 工具下载地址 — url: 官方源, mirrorUrl: gh-proxy 镜像 */
  cloudflared: {
    url: 'https://github.com/cloudflare/cloudflared/releases/download/2026.3.0/cloudflared-linux-amd64',
    mirrorUrl: 'https://gh-proxy.org/https://github.com/cloudflare/cloudflared/releases/download/2026.3.0/cloudflared-linux-amd64',
  },
  ccSwitch: {
    url: 'https://github.com/SaladDay/cc-switch-cli/releases/latest/download/install.sh',
    mirrorUrl: 'https://gh-proxy.org/https://github.com/SaladDay/cc-switch-cli/releases/latest/download/install.sh',
  },

  /* MCP Server 预设 */
  mcpPresets: [
    {
      id: 'context7',
      label: 'Context7',
      desc: '自动获取最新文档上下文',
      name: 'context7',
      json: '{"command":"npx","args":["-y","@upstash/context7-mcp@latest"]}',
    },
    {
      id: 'mcp-deepwiki',
      label: 'DeepWiki',
      desc: '查询开源项目 Wiki 知识库',
      name: 'mcp-deepwiki',
      json: '{"command":"npx","args":["-y","mcp-deepwiki@latest"]}',
    },
  ],

  /* Claude Code 工作流预设
   * 来自 github.com/UfoMiao/zcf 项目
   * ZCF 工作流包含: 通用工具、六步开发流程、功能规划、Git 工作流、BMAD 企业级
   */
  claudeWorkflows: [
    {
      id: 'zcf',
      label: 'ZCF 工作流',
      desc: '来自 UfoMiao/zcf 项目，包含通用工具、六步开发、功能规划、Git 工作流、BMAD 企业级',
      defaultSelected: false,
      // ZCF 工作流安装时包含的所有子模块
      subModules: ['commonTools', 'sixStepsWorkflow', 'featPlanUx', 'gitWorkflow', 'bmadWorkflow'],
    },
  ],

  /* Claude Code 输出样式预设
   * isCustom: 是否需要模板文件
   * - true: 需要复制模板文件到 ~/.claude/output-styles/
   * - false: 内置样式，直接设置 outputStyle 配置
   */
  claudeOutputStyles: [
    {
      id: 'default',
      label: '默认',
      desc: 'Claude Code 默认输出样式',
      isCustom: false,
    },
    {
      id: 'engineer-professional',
      label: '工程师专业版（UfoMiao/zcf）',
      desc: '遵循SOLID、KISS、DRY、YAGNI原则，专业简洁',
      isCustom: true,
    },
    {
      id: 'nekomata-engineer',
      label: '猫又工程师（UfoMiao/zcf）',
      desc: '可爱但专业的工程师风格',
      isCustom: true,
    },
    {
      id: 'laowang-engineer',
      label: '老王工程师（UfoMiao/zcf）',
      desc: '资深工程师风格，经验丰富',
      isCustom: true,
    },
    {
      id: 'ojousama-engineer',
      label: '大小姐工程师（UfoMiao/zcf）',
      desc: '优雅专业的工程师风格',
      isCustom: true,
    },
    {
      id: 'rem-engineer',
      label: '雷姆工程师（UfoMiao/zcf）',
      desc: '温柔专业的工程师风格',
      isCustom: true,
    },
    {
      id: 'leibus-engineer',
      label: '雷布斯工程师（UfoMiao/zcf）',
      desc: '极客风格的工程师',
      isCustom: true,
    },
    {
      id: 'explanatory',
      label: '解释型（UfoMiao/zcf）',
      desc: '详细解释每一步操作',
      isCustom: false,
    },
    {
      id: 'learning',
      label: '学习型（UfoMiao/zcf）',
      desc: '适合学习新技术的风格',
      isCustom: false,
    },
  ],

  vibeDefaultCommand: 'IS_SANDBOX=1 claude --dangerously-skip-permissions',

  /* 预设模板 — 每个预设是一份完整的配置快照 */
  presets: {
    default: {
      label: '默认', desc: 'Node.js + Claude Code',
      region: 'international',
      codeServer: true,
      extensions: ['MS-CEINTL.vscode-language-pack-zh-hans', 'GitHub.github-vscode-theme', 'DavidAnson.vscode-markdownlint', 'g2developer.browser-in-vscode', 'saltcoreyan.json-format-sortcore', 'redhat.vscode-yaml', 'Anthropic.claude-code'],
      customExtensions: '',
      languages: ['nodejs'], languageVersions: { nodejs: '20' }, pythonVenv: true,
      aiTools: ['cc-switch', 'claude-code'], aiToolVersions: {},
      claudeWorkflows: [],
      claudeOutputStyle: 'default',
      cfTunnel: false, cfToken: '', volumeMode: 'named',
      vibeCommand: true, vibeCommandText: 'IS_SANDBOX=1 claude --dangerously-skip-permissions',
      customDockerfile: '',
    },
  },
};
