/** urls.js — 全局远程资源 URL 注册表
 *
 * 项目中所有远程链接统一在此文件中定义，其他文件通过 URLS.* 引用。
 * 模板 URL 使用函数形式，例如: URLS.languages.nodejs.setup('20')
 */

const URLS = {
  /* 项目地址 */
  project: {
    github: 'https://github.com/XyzenSun/vibespace',
  },

  /* CDN 依赖 (index.html 中的 <script>/<link> 标签同步引用) */
  cdn: {
    tailwindcss: 'https://cdn.tailwindcss.com',
    alpinejs: 'https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js',
    prism: {
      theme: 'https://cdn.jsdelivr.net/npm/prismjs@1.29.0/themes/prism-tomorrow.min.css',
      core: 'https://cdn.jsdelivr.net/npm/prismjs@1.29.0/prism.min.js',
      docker: 'https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-docker.min.js',
      yaml: 'https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-yaml.min.js',
      bash: 'https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-bash.min.js',
    },
    jszip: 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js',
  },

  /* 中国镜像源 */
  mirrors: {
    dns: 'nameserver 1.1.1.1\nnameserver 114.114.114.114\nnameserver 119.29.29.29',
    aptScript: 'https://gitee.com/SuperManito/LinuxMirrors/raw/main/ChangeMirrors.sh',
    npmRegistry: 'https://registry.npmmirror.com',
    pipIndex: 'https://pypi.tuna.tsinghua.edu.cn/simple',
    goProxy: 'https://goproxy.cn,direct',
    ghProxy: 'https://gh-proxy.org/',
  },

  /* 语言安装地址 */
  languages: {
    nodejs: {
      /** @param {string} ver — 大版本号，如 '20' */
      setup: (ver) => `https://deb.nodesource.com/setup_${ver}.x`,
    },
    python: {
      getPip: 'https://bootstrap.pypa.io/get-pip.py',
    },
    go: {
      /** @param {string} ver — 完整版本号，如 '1.23.6' 或 Dockerfile 变量 '${GOLANG_VERSION}' */
      download: (ver) => `https://go.dev/dl/go${ver}.linux-amd64.tar.gz`,
      downloadChina: (ver) => `https://golang.google.cn/dl/go${ver}.linux-amd64.tar.gz`,
    },
    rust: {
      rustup: 'https://sh.rustup.rs',
    },
  },

  /* 工具下载地址 */
  tools: {
    codeServer: {
      install: 'https://raw.githubusercontent.com/coder/code-server/main/install.sh',
    },
    cloudflared: {
      url: 'https://github.com/cloudflare/cloudflared/releases/download/2026.3.0/cloudflared-linux-amd64',
    },
    ccSwitch: {
      url: 'https://github.com/SaladDay/cc-switch-cli/releases/latest/download/install.sh',
    },
    frpc: {
      url: 'https://raw.githubusercontent.com/XyzenSun/vibespace/refs/heads/main/assets/app/frpc_latest',
    },
  },

  /* ZCF 工作流 & 输出样式模板 */
  zcf: {
    baseUrl: 'https://raw.githubusercontent.com/UfoMiao/zcf/main/templates',
    /** @param {string} styleId — 样式 ID，如 'engineer-professional' */
    outputStyle: (styleId) =>
      `https://raw.githubusercontent.com/SaladDay/zcf/main/templates/common/output-styles/zh-CN/${styleId}.md`,
  },

  /**
   * 为 URL 添加 GitHub 代理前缀（中国区使用）
   * @param {string} url — 原始 URL
   * @returns {string} 加上 gh-proxy 前缀的 URL
   */
  withGhProxy(url) {
    return `${URLS.mirrors.ghProxy}${url}`;
  },
};
