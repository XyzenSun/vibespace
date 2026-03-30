/** deploy.js — deploy.sh 部署脚本生成器 */

function generateDeploy(config) {
  const lines = [];

  lines.push('#!/bin/bash');
  lines.push('set -e');
  lines.push('');
  lines.push('# ============================================');
  lines.push('# DIY Vibe Space — 一键部署脚本');
  lines.push('# ============================================');
  lines.push('');

  // 颜色定义
  lines.push('GREEN="\\033[0;32m"');
  lines.push('YELLOW="\\033[1;33m"');
  lines.push('CYAN="\\033[0;36m"');
  lines.push('NC="\\033[0m"');
  lines.push('');

  lines.push('SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"');
  lines.push('cd "$SCRIPT_DIR"');
  lines.push('');

  // 检查文件
  lines.push('echo -e "${GREEN}[1/3] 检查文件...${NC}"');
  lines.push('for f in Dockerfile entrypoint.sh docker-compose.yml; do');
  lines.push('  if [ ! -f "$f" ]; then');
  lines.push('    echo "错误: 缺少 $f，请确保在解压后的目录中运行此脚本"');
  lines.push('    exit 1');
  lines.push('  fi');
  lines.push('done');
  lines.push('echo "  Dockerfile, entrypoint.sh, docker-compose.yml ✓"');
  lines.push('');

  // 检查 Docker
  lines.push('if ! command -v docker &> /dev/null; then');
  lines.push('  echo "错误: 未安装 Docker，请先安装 Docker"');
  lines.push('  exit 1');
  lines.push('fi');
  lines.push('echo "  Docker ✓"');
  lines.push('');

  // 构建镜像
  lines.push('echo -e "${GREEN}[2/3] 构建镜像（首次构建可能需要较长时间）...${NC}"');
  lines.push('docker compose build');
  lines.push('');

  // 完成提示
  lines.push('echo ""');
  lines.push('echo -e "${GREEN}[3/3] 构建完成!${NC}"');
  lines.push('echo ""');
  lines.push('echo -e "${YELLOW}================================================${NC}"');
  lines.push('echo -e "${YELLOW} 请先编辑 .env 配置环境变量：${NC}"');
  lines.push('echo -e "${YELLOW}================================================${NC}"');
  lines.push('echo ""');

  // 列出需要配置的环境变量
  lines.push('echo -e "${CYAN}  必要配置:${NC}"');
  lines.push('echo "    ROOT_PASSWORD  — SSH root 密码 (默认: root123)"');
  lines.push('echo ""');
  lines.push('echo -e "${CYAN}  可选配置:${NC}"');
  lines.push('echo "    GIT_USER_NAME  — Git 用户名"');
  lines.push('echo "    GIT_USER_EMAIL — Git 邮箱"');
  lines.push('echo "    SSH_PRIVATE_KEY— SSH 私钥 (用于 git 操作)"');
  lines.push('echo "    SSH_PUBLIC_KEY — SSH 公钥"');

  if (config.codeServer) {
    lines.push('echo "    CS_PASSWORD    — Code-Server 密码 (不设置则免密)"');
  }
  if (config.cfTunnel) {
    lines.push('echo "    CF_TUNNEL_TOKEN— Cloudflare Tunnel Token"');
  }

  lines.push('echo ""');
  lines.push('echo -e "${YELLOW}================================================${NC}"');
  lines.push('echo -e "${YELLOW} 常用命令：${NC}"');
  lines.push('echo -e "${YELLOW}================================================${NC}"');
  lines.push('echo ""');
  lines.push('echo -e "${CYAN}  启动容器:${NC}"');
  lines.push('echo "    docker compose up -d"');
  lines.push('echo ""');
  lines.push('echo -e "${CYAN}  停止容器:${NC}"');
  lines.push('echo "    docker compose down"');
  lines.push('echo ""');
  lines.push('echo -e "${CYAN}  查看日志:${NC}"');
  lines.push('echo "    docker compose logs -f"');
  lines.push('echo ""');
  lines.push('echo -e "${CYAN}  重新构建并启动:${NC}"');
  lines.push('echo "    docker compose up -d --build"');
  lines.push('echo ""');
  lines.push('echo -e "${CYAN}  进入容器:${NC}"');
  lines.push('echo "    docker exec -it devbox bash"');
  lines.push('echo ""');

  // 端口提示
  const portHints = ['SSH: 端口 22'];
  if (config.codeServer) portHints.push('Code-Server: 端口 8080');
  lines.push('echo -e "${CYAN}  暴露端口:${NC}"');
  portHints.forEach(h => lines.push(`echo "    ${h}"`));
  lines.push('echo ""');

  return lines.join('\n');
}
