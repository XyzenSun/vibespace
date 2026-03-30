/** app.js — Alpine.js 主应用状态 */

function appState() {
  return {
    currentStep: 1,
    totalSteps: 6,
    steps: [
      { num: 1, title: '宿主机环境', icon: '🌏' },
      { num: 2, title: '基础环境配置', icon: '💻' },
      { num: 3, title: '编程语言', icon: '🛠️' },
      { num: 4, title: 'AI 工具', icon: '🤖' },
      { num: 5, title: '其他工具', icon: '🔧' },
      { num: 6, title: '自定义层', icon: '📝' },
    ],
    outputTab: 'dockerfile',

    /* 配置状态 */
    region: 'china',
  deployPlatform: 'local', // 'local' | 'cnb'
    codeServer: true,
    extensions: DEFAULTS.codeServerExtensions.filter(e => e.checked).map(e => e.id),
    customExtensions: '',
    languages: [],
    languageVersions: {},
    pythonVenv: true,
    aiTools: [],
    aiToolVersions: {},
    claudeMcpServers: [],  // [{name: 'my-server', json: '{"type":"http","url":"..."}', jsonValid: true}]

    /* Claude Code 工作流和输出样式 */
    claudeWorkflows: [],      // 已选中的工作流 ID 数组
    claudeOutputStyle: '',    // 已选中的输出样式 ID
    claudeDisableTelemetry: false, // 禁止遥测与更新
    gitUserName: '',
    gitUserEmail: '',
    rootPassword: '',
    csPassword: '',
    sshPublicKey: '',
    cfTunnel: false,
    cfToken: '',
    frpcEnabled: false,
    frpcConfigUrl: '',
    vibeCommand: false,
    vibeCommandText: DEFAULTS.vibeDefaultCommand,
    volumeMode: 'named',
    generateEnvFileEnabled: false, // 是否生成 .env 文件，默认禁用
    customDockerfile: '',
    currentPreset: '',

    /* OSS 对象存储持久化配置 (仅 CNB 平台) */
    ossEnabled: true,  // 默认启用
    ossEndpoint: '',
    ossAccessKey: '',
    ossSecretKey: '',
    ossBucket: '',
    ossRegion: 'auto',
    ossProject: 'devbox',
    ossPaths: '/root/.claude,/root/.cc-switch,/root/.local/share/code-server/User/globalStorage,/root/.vscode-server/data/User/globalStorage',
    ossKeepCount: 5,
    ossSyncInterval: 5,

    /* 生成结果 */
    generatedDockerfile: '',
    generatedEntrypoint: '',
    generatedCompose: '',
    generatedDeploy: '',
    generatedCnbYml: '',
    generatedEnvFile: '',

    /** 初始化：加载默认预设，监听配置变更自动重新生成 */
    init() {
      this.applyPreset('default');
      const watched = [
        'region', 'deployPlatform', 'codeServer', 'extensions', 'customExtensions',
        'languages', 'languageVersions', 'pythonVenv',
        'aiTools', 'aiToolVersions', 'claudeMcpServers',
        'claudeWorkflows', 'claudeOutputStyle', 'claudeDisableTelemetry',
        'gitUserName', 'gitUserEmail',
        'cfTunnel', 'cfToken', 'frpcEnabled', 'frpcConfigUrl',
        'vibeCommand', 'vibeCommandText',
        'volumeMode', 'generateEnvFileEnabled', 'customDockerfile',
        'ossEnabled', 'ossEndpoint', 'ossAccessKey', 'ossSecretKey', 'ossBucket',
        'ossRegion', 'ossProject', 'ossPaths', 'ossKeepCount', 'ossSyncInterval',
      ];
      watched.forEach(key => this.$watch(key, () => this.generate()));
    },

    /* 步骤导航 */
    goToStep(step) { if (step >= 1 && step <= this.totalSteps) this.currentStep = step; },
    nextStep() { if (this.currentStep < this.totalSteps) this.currentStep++; },
    prevStep() { if (this.currentStep > 1) this.currentStep--; },

    isStepCompleted(step) {
      if (step === 1) return !!this.region;
      return true; // 步骤 2-6 无必填项
    },

    /* 多选 toggle 系列 */
    toggleLanguage(langId) {
      const idx = this.languages.indexOf(langId);
      if (idx >= 0) {
        this.languages.splice(idx, 1);
      } else {
        this.languages.push(langId);
        // 首次选中时填入默认版本
        const lang = DEFAULTS.languages.find(l => l.id === langId);
        if (lang && lang.hasVersion && !this.languageVersions[langId]) {
          this.languageVersions[langId] = lang.defaultVersion;
        }
      }
    },
    hasLanguage(langId) { return this.languages.includes(langId); },

    toggleExtension(extId) {
      const idx = this.extensions.indexOf(extId);
      idx >= 0 ? this.extensions.splice(idx, 1) : this.extensions.push(extId);
    },
    hasExtension(extId) { return this.extensions.includes(extId); },

    toggleAiTool(toolId) {
      const idx = this.aiTools.indexOf(toolId);
      if (idx >= 0) {
        this.aiTools.splice(idx, 1);
        // 取消选中 claude-code 时清空 MCP、工作流、输出样式和遥测配置
        if (toolId === 'claude-code') {
          this.claudeMcpServers = [];
          this.claudeWorkflows = [];
          this.claudeOutputStyle = '';
          this.claudeDisableTelemetry = false;
          // 同时取消依赖 claude-code 的工具
          this.aiTools = this.aiTools.filter(id => {
            const t = DEFAULTS.aiTools.find(a => a.id === id);
            return !t || t.requiresTool !== 'claude-code';
          });
        }
      } else {
        this.aiTools.push(toolId);
        // 首次选中 claude-code 时初始化默认工作流
        if (toolId === 'claude-code' && this.claudeWorkflows.length === 0) {
          this.claudeWorkflows = DEFAULTS.claudeWorkflows.filter(w => w.defaultSelected).map(w => w.id);
          this.claudeOutputStyle = 'default';
        }
      }
    },
    hasAiTool(toolId) { return this.aiTools.includes(toolId); },

    /* Claude Code 工作流管理 */
    toggleClaudeWorkflow(workflowId) {
      const idx = this.claudeWorkflows.indexOf(workflowId);
      if (idx >= 0) {
        this.claudeWorkflows.splice(idx, 1);
      } else {
        this.claudeWorkflows.push(workflowId);
      }
    },
    hasClaudeWorkflow(workflowId) { return this.claudeWorkflows.includes(workflowId); },

    /* Claude MCP 管理 */
    addMcpServer() {
      this.claudeMcpServers.push({ name: '', json: '', jsonValid: true });
    },
    removeMcpServer(index) {
      this.claudeMcpServers.splice(index, 1);
    },
    validateMcpJson(idx) {
      const mcp = this.claudeMcpServers[idx];
      if (!mcp.json.trim()) {
        mcp.jsonValid = true;
        return;
      }
      try {
        JSON.parse(mcp.json);
        mcp.jsonValid = true;
      } catch {
        mcp.jsonValid = false;
      }
    },
    hasMcpPreset(presetId) {
      return this.claudeMcpServers.some(s => s.name === presetId);
    },
    toggleMcpPreset(preset) {
      const idx = this.claudeMcpServers.findIndex(s => s.name === preset.name);
      if (idx >= 0) {
        this.claudeMcpServers.splice(idx, 1);
      } else {
        this.claudeMcpServers.push({ name: preset.name, json: preset.json, jsonValid: true });
      }
    },
    hasMcpJsonError() {
      return this.claudeMcpServers.some(s => s.jsonValid === false);
    },

    /** AI 工具依赖 Node.js */
    needsNodejs() {
      return this.aiTools.length > 0 || this.languages.includes('nodejs');
    },

    /** 汇总所有语言所需的 apt 包 */
    getAptPackages() {
      const pkgs = new Set(['git', 'wget', 'unzip', 'curl', 'ca-certificates', 'openssh-server', 'openssh-client']);
      this.languages.forEach(langId => {
        const lang = DEFAULTS.languages.find(l => l.id === langId);
        if (lang) lang.aptPkgs.forEach(p => pkgs.add(p));
      });
      return [...pkgs];
    },

    /** 应用预设：深拷贝配置并触发生成 */
    applyPreset(presetId) {
      const p = DEFAULTS.presets[presetId];
      if (!p) return;
      this.currentPreset = presetId;
      this.region = p.region;
      this.codeServer = p.codeServer;
      this.extensions = [...p.extensions];
      this.customExtensions = p.customExtensions;
      this.languages = [...p.languages];
      this.languageVersions = { ...p.languageVersions };
      this.pythonVenv = p.pythonVenv;
      this.aiTools = [...p.aiTools];
      this.aiToolVersions = { ...p.aiToolVersions };
      this.claudeMcpServers = p.claudeMcpServers ? p.claudeMcpServers.map(s => ({...s})) : [];
      this.claudeWorkflows = p.claudeWorkflows ? [...p.claudeWorkflows] : [];
      this.claudeOutputStyle = p.claudeOutputStyle || '';
      this.claudeDisableTelemetry = p.claudeDisableTelemetry || false;
      this.gitUserName = p.gitUserName || '';
      this.gitUserEmail = p.gitUserEmail || '';
      this.rootPassword = p.rootPassword || '';
      this.csPassword = p.csPassword || '';
      this.sshPublicKey = p.sshPublicKey || '';
      this.cfTunnel = p.cfTunnel;
      this.cfToken = p.cfToken;
      this.frpcEnabled = p.frpcEnabled || false;
      this.frpcConfigUrl = p.frpcConfigUrl || '';
      this.vibeCommand = p.vibeCommand;
      this.vibeCommandText = p.vibeCommandText;
      this.volumeMode = p.volumeMode || 'named';
      this.customDockerfile = p.customDockerfile || '';
      this.generate();
    },

    /** 调用生成器，刷新语法高亮 */
    generate() {
      const config = this.getConfig();
      // 所有平台都生成 Dockerfile 和 entrypoint.sh
      this.generatedDockerfile = generateDockerfile(config);
      this.generatedEntrypoint = generateEntrypoint(config);

      // 根据部署平台生成不同文件
      switch (this.deployPlatform) {
        case 'cnb': // CNB 云平台
          this.generatedCompose = '';
          this.generatedDeploy = '';
          this.generatedCnbYml = generateCnbYml(config);
          this.generatedEnvFile = '';
          break;
        case 'local': // 本机/Docker
        default:
          this.generatedCompose = generateCompose(config);
          this.generatedDeploy = generateDeploy(config);
          this.generatedCnbYml = '';
          this.generatedEnvFile = this.generateEnvFileEnabled ? generateEnvFile(config) : '';
          break;
      }
      this.$nextTick(() => highlightAll());
    },

    /** 收集当前 UI 状态为生成器配置对象 */
    getConfig() {
      return {
        region: this.region, deployPlatform: this.deployPlatform, baseImage: DEFAULTS.baseImage,
        codeServer: this.codeServer, extensions: this.extensions, customExtensions: this.customExtensions,
        languages: this.languages, languageVersions: this.languageVersions, pythonVenv: this.pythonVenv,
        aiTools: this.aiTools, aiToolVersions: this.aiToolVersions, claudeMcpServers: this.claudeMcpServers,
        claudeWorkflows: this.claudeWorkflows, claudeOutputStyle: this.claudeOutputStyle,
        claudeDisableTelemetry: this.claudeDisableTelemetry,
        gitUserName: this.gitUserName, gitUserEmail: this.gitUserEmail,
        rootPassword: this.rootPassword, csPassword: this.csPassword,
        cfTunnel: this.cfTunnel, cfToken: this.cfToken,
        frpcEnabled: this.frpcEnabled, frpcConfigUrl: this.frpcConfigUrl,
        vibeCommand: this.vibeCommand, vibeCommandText: this.vibeCommandText,
        volumeMode: this.volumeMode,
        generateEnvFileEnabled: this.generateEnvFileEnabled,
        customDockerfile: this.customDockerfile,
        needsNodejs: this.needsNodejs(),
        // OSS 对象存储配置
        ossEnabled: this.ossEnabled,
        ossEndpoint: this.ossEndpoint,
        ossAccessKey: this.ossAccessKey,
        ossSecretKey: this.ossSecretKey,
        ossBucket: this.ossBucket,
        ossRegion: this.ossRegion,
        ossProject: this.ossProject,
        ossPaths: this.ossPaths,
        ossKeepCount: this.ossKeepCount,
        ossSyncInterval: this.ossSyncInterval,
      };
    },

    /** 复制文本到剪贴板，附带按钮反馈 */
    async copyToClipboard(text, btnId) {
      try {
        await navigator.clipboard.writeText(text);
        const btn = document.getElementById(btnId);
        if (btn) {
          btn.classList.add('copied');
          btn.textContent = '已复制!';
          setTimeout(() => { btn.classList.remove('copied'); btn.textContent = '复制'; }, 2000);
        }
      } catch {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
    },

    downloadFile(filename, content) { downloadSingleFile(filename, content); },

    async downloadAllZip() {
      // 所有平台都包含的基础文件
      const files = {
        'Dockerfile': this.generatedDockerfile,
        'entrypoint.sh': this.generatedEntrypoint,
      };

      // 根据部署平台添加不同文件
      switch (this.deployPlatform) {
        case 'cnb': // CNB 云平台
          files['.cnb.yml'] = this.generatedCnbYml;
          break;
        case 'local': // 本机/Docker
        default:
          files['docker-compose.yml'] = this.generatedCompose;
          files['deploy.sh'] = this.generatedDeploy;
          if (this.generatedEnvFile) {
            files['.env'] = this.generatedEnvFile;
          }
          break;
      }
      await downloadAllAsZip(files);
    },
  };
}
