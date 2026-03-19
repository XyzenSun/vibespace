FROM ubuntu:24.04

ENV LANG=C.UTF-8 \
    LANGUAGE=C.UTF-8 \
    GOLANG_VERSION=1.23.6 \
    GOPATH=/root/go \
    PATH=$PATH:/usr/local/go/bin:/root/go/bin:/root/.local/bin

# 层1: 系统包 + 基础工具
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        build-essential ca-certificates cmake curl g++ gcc git make openjdk-21-jdk openssh-client openssh-server python3 python3-pip unzip wget \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && apt-get autoremove -y \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# 层2: 语言运行时
RUN wget -q https://go.dev/dl/go${GOLANG_VERSION}.linux-amd64.tar.gz \
    && tar -C /usr/local -xzf go${GOLANG_VERSION}.linux-amd64.tar.gz \
    && rm -f go${GOLANG_VERSION}.linux-amd64.tar.gz \
    && curl --proto "=https" --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y \
    && echo 'source $HOME/.cargo/env' >> /root/.bashrc \
    && apt-get update && apt-get install -y --no-install-recommends python3-venv && apt-get clean && rm -rf /var/lib/apt/lists/*

# 层3: 全局 npm 包
RUN npm install -g typescript ts-node \
    && npm cache clean --force

# 层4: 语言开发工具
RUN go install -v golang.org/x/tools/gopls@latest \
    && go install -v github.com/go-delve/delve/cmd/dlv@latest \
    && go install -v honnef.co/go/tools/cmd/staticcheck@latest \
    && go clean -modcache \
    && go clean -cache

# 层5a: 安装 code-server
RUN curl -fsSL https://raw.githubusercontent.com/coder/code-server/main/install.sh | sh \
    && rm -rf /tmp/*

# 层5b: code-server 扩展
RUN code-server --install-extension MS-CEINTL.vscode-language-pack-zh-hans \
    && code-server --install-extension GitHub.github-vscode-theme \
    && code-server --install-extension DavidAnson.vscode-markdownlint \
    && code-server --install-extension g2developer.browser-in-vscode \
    && code-server --install-extension saltcoreyan.json-format-sortcore \
    && code-server --install-extension redhat.vscode-yaml \
    && code-server --install-extension Anthropic.claude-code \
    && code-server --install-extension golang.go \
    && code-server --install-extension streetsidesoftware.code-spell-checker \
    && code-server --install-extension FittenTech.Fitten-Code \
    && code-server --install-extension RooVeterinaryInc.roo-cline \
    && code-server --install-extension ms-python.python \
    && code-server --install-extension eamodio.gitlens \
    && rm -rf /tmp/* /root/.cache

# 层6: AI 工具
RUN npm install -g @anthropic-ai/claude-code \
    && npm cache clean --force \
    && CC_SWITCH_FORCE=1 curl -fsSL https://github.com/SaladDay/cc-switch-cli/releases/latest/download/install.sh | bash

# 层7: SSH 配置
RUN mkdir -p /run/sshd \
    && sed -i 's/^#*PermitRootLogin.*/PermitRootLogin yes/' /etc/ssh/sshd_config \
    && sed -i 's/^#*PasswordAuthentication.*/PasswordAuthentication yes/' /etc/ssh/sshd_config

# 备份 /root，防止 volume 挂载覆盖镜像内文件
RUN mkdir /root-defaults && cp -a /root /root-defaults

COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

WORKDIR /workspace
EXPOSE 8080 22
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]