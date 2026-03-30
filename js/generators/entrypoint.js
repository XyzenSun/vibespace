/** entrypoint.js — 容器启动脚本生成器 */

function generateEntrypoint(config) {
  const lines = [];
  const isChina = config.region === 'china';
  const isCnb = config.deployPlatform === 'cnb';
  const ossEnabled = isCnb && config.ossEnabled;
  const frpcEnabled = config.frpcEnabled;

  lines.push('#!/bin/bash');
  lines.push('set -e');
  lines.push('');

  // ============================================
  // OSS 对象存储持久化配置 (仅 CNB 平台)
  // ============================================
  if (isCnb) {
    lines.push('# ============================================');
    lines.push('# 对象存储持久化配置 (环境变量)');
    lines.push('# ============================================');
    lines.push('# OSS_ENABLED: 是否启用持久化 (默认 true)');
    lines.push('# OSS_ENDPOINT: S3 endpoint (如 https://oss-cn-beijing.aliyuncs.com)');
    lines.push('# OSS_ACCESS_KEY: Access Key ID');
    lines.push('# OSS_SECRET_KEY: Secret Access Key');
    lines.push('# OSS_BUCKET: 桶名');
    lines.push('# OSS_REGION: 区域 (默认 auto)');
    lines.push('# OSS_PROJECT: 项目名，用于快照文件命名前缀 (默认 devbox)');
    lines.push('# OSS_PATHS: 要持久化的目录列表 (逗号分隔)');
    lines.push('# OSS_KEEP_COUNT: 保留快照数量 (默认 3)');
    lines.push('# OSS_SYNC_INTERVAL: 同步间隔分钟 (默认 30)');
    lines.push('');
    lines.push(`OSS_ENABLED="${ossEnabled ? 'true' : '${OSS_ENABLED:-true}'}"`);
    lines.push('OSS_ENDPOINT="${OSS_ENDPOINT:-}"');
    lines.push('OSS_ACCESS_KEY="${OSS_ACCESS_KEY:-}"');
    lines.push('OSS_SECRET_KEY="${OSS_SECRET_KEY:-}"');
    lines.push('OSS_BUCKET="${OSS_BUCKET:-}"');
    lines.push('OSS_REGION="${OSS_REGION:-auto}"');
    lines.push('OSS_PROJECT="${OSS_PROJECT:-devbox}"');
    lines.push('OSS_PATHS="${OSS_PATHS:-/root/.claude,/root/.cc-switch,/root/.local/share/code-server/User/globalStorage,/root/.vscode-server/data/User/globalStorage}"');
    lines.push('OSS_KEEP_COUNT="${OSS_KEEP_COUNT:-5}"');
    lines.push('OSS_SYNC_INTERVAL="${OSS_SYNC_INTERVAL:-5}"');
    lines.push('');
    lines.push('# rclone 内联配置字符串');
    lines.push('RCLONE_REMOTE=":s3,provider=Other,access_key_id=\'${OSS_ACCESS_KEY}\',secret_access_key=\'${OSS_SECRET_KEY}\',region=\'${OSS_REGION}\',endpoint=\'${OSS_ENDPOINT}\'"');
    lines.push('');
    lines.push('# 快照命名格式: 项目名-cnb-YYYYMMDD-HHMMSS.tar.zst');
    lines.push('SNAPSHOT_NAME="${OSS_PROJECT}-cnb-$(date +%Y%m%d-%H%M%S).tar.zst"');
    lines.push('');

    // upload_snapshot 函数
    lines.push('# ============================================');
    lines.push('# 函数: 上传快照到对象存储');
    lines.push('# ============================================');
    lines.push('upload_snapshot() {');
    lines.push('    if [ "$OSS_ENABLED" != "true" ] || [ -z "$OSS_ENDPOINT" ] || [ -z "$OSS_ACCESS_KEY" ]; then');
    lines.push('        echo "[OSS] 持久化未配置，跳过上传"');
    lines.push('        return 0');
    lines.push('    fi');
    lines.push('    if [ ! -f /root/syncflag.txt ]; then');
    lines.push('        echo "[OSS] 警告：未检测到 /root/syncflag.txt 标记！"');
    lines.push('        echo "[OSS] 原因：本次容器启动时未能成功恢复云端数据。"');
    lines.push('        echo "[OSS] 动作：已拦截本次上传，以保护云端数据不被覆盖。"');
    lines.push('        return 1');
    lines.push('    fi');
    lines.push('');
    lines.push('    echo "[OSS] 开始上传快照..."');
    lines.push('    local staging_dir="/tmp/oss-staging-$(date +%s)"');
    lines.push('    local snapshot_file="/tmp/${SNAPSHOT_NAME}"');
    lines.push('    local copy_failed=0');
    lines.push('');
    lines.push('    # 1. 复制目标目录到 staging');
    lines.push('    mkdir -p "$staging_dir"');
    lines.push('    IFS=, read -ra PATHS <<< "$OSS_PATHS"');
    lines.push('    for path in "${PATHS[@]}"; do');
    lines.push('        if [ -d "$path" ]; then');
    lines.push('            # 保持相对路径结构');
    lines.push('            local rel_path="${path#/}"');
    lines.push('            local target_dir="$staging_dir/$rel_path"');
    lines.push('            mkdir -p "$target_dir"');
    lines.push('            if ! cp -a "$path/." "$target_dir/"; then');
    lines.push('                echo "[OSS] 复制失败: $path"');
    lines.push('                copy_failed=1');
    lines.push('            else');
    lines.push('                echo "[OSS] 已复制: $path"');
    lines.push('            fi');
    lines.push('        fi');
    lines.push('    done');
    lines.push('');
    lines.push('    # 复制失败则中止，不上传，不清理旧快照');
    lines.push('    if [ $copy_failed -eq 1 ]; then');
    lines.push('        echo "[OSS] 复制阶段失败，中止上传"');
    lines.push('        rm -rf "$staging_dir"');
    lines.push('        return 1');
    lines.push('    fi');
    lines.push('');
    lines.push('    # 2. 打包为 tar.zst');
    lines.push('    echo "[OSS] 打包压缩..."');
    lines.push('    if ! tar -I zstd -cf "$snapshot_file" -C "$staging_dir" .; then');
    lines.push('        echo "[OSS] 打包失败，中止上传"');
    lines.push('        rm -rf "$staging_dir" "$snapshot_file"');
    lines.push('        return 1');
    lines.push('    fi');
    lines.push('');
    lines.push('    # 3. 上传到对象存储');
    lines.push('    local remote_path="${OSS_BUCKET}/${SNAPSHOT_NAME}"');
    lines.push('    echo "[OSS] 上传到: $remote_path"');
    lines.push('    if ! rclone copyto "$snapshot_file" "${RCLONE_REMOTE}:${remote_path}" -P --quiet >> /var/log/vibespace-rclone.log 2>&1; then');
    lines.push('        echo "[OSS] 上传失败"');
    lines.push('        rm -rf "$staging_dir" "$snapshot_file"');
    lines.push('        return 1');
    lines.push('    fi');
    lines.push('');
    lines.push('    # 4. 清理本地临时文件');
    lines.push('    rm -rf "$staging_dir" "$snapshot_file"');
    lines.push('');
    lines.push('    # 5. 清理旧快照，保留最近 N 份');
    lines.push('    echo "[OSS] 清理旧快照，保留 ${OSS_KEEP_COUNT} 份..."');
    lines.push('    rclone lsf "${RCLONE_REMOTE}:${OSS_BUCKET}/" --files-only 2>> /var/log/vibespace-rclone.log | \\');
    lines.push('        grep "^${OSS_PROJECT}-cnb-" | sort -r | \\');
    lines.push('        tail -n +$((OSS_KEEP_COUNT + 1)) | \\');
    lines.push('        while IFS= read -r snap; do');
    lines.push('            if [ -n "$snap" ]; then');
    lines.push('                echo "[OSS] 删除旧快照: $snap"');
    lines.push('                rclone delete "${RCLONE_REMOTE}:${OSS_BUCKET}/$snap" --quiet >> /var/log/vibespace-rclone.log 2>&1 || true');
    lines.push('            fi');
    lines.push('        done');
    lines.push('');
    lines.push('    echo "[OSS] 上传完成"');
    lines.push('}');
    lines.push('');

    // restore_snapshot 函数
    lines.push('# ============================================');
    lines.push('# 函数: 从对象存储恢复快照');
    lines.push('# ============================================');
    lines.push('restore_snapshot() {');
    lines.push('    if [ "$OSS_ENABLED" != "true" ] || [ -z "$OSS_ENDPOINT" ] || [ -z "$OSS_ACCESS_KEY" ]; then');
    lines.push('        echo "[OSS] 持久化未配置，跳过恢复"');
    lines.push('        return 0');
    lines.push('    fi');
    lines.push('');
    lines.push('    echo "[OSS] 开始恢复快照..."');
    lines.push('');
    lines.push('    # 1. 查找最新快照');
    lines.push('    local latest_snapshot');
    lines.push('    latest_snapshot=$(rclone lsf "${RCLONE_REMOTE}:${OSS_BUCKET}/" --files-only 2>> /var/log/vibespace-rclone.log | grep "^${OSS_PROJECT}-cnb-" | sort -r | head -1)');
    lines.push('');
    lines.push('    if [ -z "$latest_snapshot" ]; then');
    lines.push('        echo "[OSS] 未找到快照，视为首次运行，允许同步"');
    lines.push('        touch /root/syncflag.txt');
    lines.push('        return 0');
    lines.push('    fi');
    lines.push('');
    lines.push('    echo "[OSS] 最新快照: $latest_snapshot"');
    lines.push('');
    lines.push('    # 2. 下载快照');
    lines.push('    local snapshot_file="/tmp/${latest_snapshot}"');
    lines.push('    local remote_path="${OSS_BUCKET}/${latest_snapshot}"');
    lines.push('    echo "[OSS] 下载快照..."');
    lines.push('    if ! rclone copyto "${RCLONE_REMOTE}:${remote_path}" "$snapshot_file" --quiet >> /var/log/vibespace-rclone.log 2>&1; then');
    lines.push('        echo "[OSS] 下载失败，跳过恢复"');
    lines.push('        return 1');
    lines.push('    fi');
    lines.push('');
    lines.push('    # 3. 备份当前目录 (防止恢复失败导致数据丢失)');
    lines.push('    echo "[OSS] 备份当前目录..."');
    lines.push('    local backup_dir="/tmp/pre-restore-backup-$(date +%s)"');
    lines.push('    mkdir -p "$backup_dir"');
    lines.push('    IFS=, read -ra PATHS <<< "$OSS_PATHS"');
    lines.push('    for path in "${PATHS[@]}"; do');
    lines.push('        if [ -d "$path" ]; then');
    lines.push('            local rel_path="${path#/}"');
    lines.push('            mkdir -p "$backup_dir/$rel_path"');
    lines.push('            cp -a "$path/." "$backup_dir/$rel_path/" 2>/dev/null || true');
    lines.push('        fi');
    lines.push('    done');
    lines.push('');
    lines.push('    # 4. 清空目标目录');
    lines.push('    echo "[OSS] 清空目标目录..."');
    lines.push('    for path in "${PATHS[@]}"; do');
    lines.push('        if [ -d "$path" ]; then');
    lines.push('            rm -rf "$path"/* 2>/dev/null || true');
    lines.push('            rm -rf "$path"/.[!.]* 2>/dev/null || true');
    lines.push('            rm -rf "$path"/..?* 2>/dev/null || true');
    lines.push('        fi');
    lines.push('    done');
    lines.push('');
    lines.push('    # 5. 解包恢复');
    lines.push('    echo "[OSS] 解包恢复..."');
    lines.push('    local staging_dir="/tmp/oss-restore-$(date +%s)"');
    lines.push('    mkdir -p "$staging_dir"');
    lines.push('    if ! tar -I zstd -xf "$snapshot_file" -C "$staging_dir"; then');
    lines.push('        echo "[OSS] 解包失败，恢复备份..."');
    lines.push('        for path in "${PATHS[@]}"; do');
    lines.push('            local rel_path="${path#/}"');
    lines.push('            if [ -d "$backup_dir/$rel_path" ]; then');
    lines.push('                cp -a "$backup_dir/$rel_path/." "$path/" 2>/dev/null || true');
    lines.push('            fi');
    lines.push('        done');
    lines.push('        rm -rf "$snapshot_file" "$staging_dir" "$backup_dir"');
    lines.push('        return 1');
    lines.push('    fi');
    lines.push('');
    lines.push('    # 6. 复制恢复的文件到目标位置');
    lines.push('    for path in "${PATHS[@]}"; do');
    lines.push('        local rel_path="${path#/}"');
    lines.push('        if [ -d "$staging_dir/$rel_path" ]; then');
    lines.push('            mkdir -p "$path"');
    lines.push('            cp -a "$staging_dir/$rel_path/." "$path/" 2>/dev/null || true');
    lines.push('            echo "[OSS] 已恢复: $path"');
    lines.push('        fi');
    lines.push('    done');
    lines.push('');
    lines.push('    # 7. 清理临时文件');
    lines.push('    rm -rf "$snapshot_file" "$staging_dir" "$backup_dir"');
    lines.push('    touch /root/syncflag.txt');
    lines.push('    echo "[OSS] 恢复完成"');
    lines.push('}');
    lines.push('');

    // setup_periodic_sync 函数
    lines.push('# ============================================');
    lines.push('# 函数: 定时同步 (cron)');
    lines.push('# ============================================');
    lines.push('setup_periodic_sync() {');
    lines.push('    if [ "$OSS_ENABLED" != "true" ]; then');
    lines.push('        return 0');
    lines.push('    fi');
    lines.push('');
    lines.push('    # 使用 /etc/cron.d/ 目录，避免覆盖其他 cron 任务');
    lines.push('    cat > /etc/cron.d/oss-sync << \'CRON_EOF\'');
    lines.push('# OSS 定时同步任务');
    lines.push('*/OSS_SYNC_INTERVAL * * * * root /usr/local/bin/entrypoint.sh --sync >> /var/log/oss-sync.log 2>&1');
    lines.push('');
    lines.push('CRON_EOF');
    lines.push('');
    lines.push('    # 替换间隔变量');
    lines.push('    sed -i "s/OSS_SYNC_INTERVAL/${OSS_SYNC_INTERVAL}/g" /etc/cron.d/oss-sync');
    lines.push('');
    lines.push('    # 设置正确权限');
    lines.push('    chmod 644 /etc/cron.d/oss-sync');
    lines.push('');
    lines.push('    # 启动 cron 服务');
    lines.push('    service cron start 2>/dev/null || cron 2>/dev/null || true');
    lines.push('');
    lines.push('    echo "[OSS] 定时同步已启用，间隔 ${OSS_SYNC_INTERVAL} 分钟"');
    lines.push('}');
    lines.push('');

    // 主流程 --sync 参数支持
    lines.push('# ============================================');
    lines.push('# 主流程');
    lines.push('# ============================================');
    lines.push('');
    lines.push('# 支持 --sync 参数，仅执行上传（用于 cron 定时任务）');
    lines.push('if [ "$1" = "--sync" ]; then');
    lines.push('    # cron 无法继承容器环境变量，从 PID 1 (容器主进程) 读取');
    lines.push('    eval $(cat /proc/1/environ | tr \'\\0\' \'\\n\' | grep -E \'^OSS_\' | sed \'s/^/export /\')');
    lines.push('    upload_snapshot');
    lines.push('    exit $?');
    lines.push('fi');

    // FRPC 函数定义和 --frp 参数处理 (移到 restore_snapshot 之前)
    if (frpcEnabled) {
      const frpcUrl = isChina ? DEFAULTS.frpc.mirrorUrl : DEFAULTS.frpc.url;
      lines.push('');
      lines.push('# FRPC 相关变量');
      lines.push('FRPC_CONFIG_URL="${FRPC_CONFIG_URL:-}"');
      lines.push('FRPC_PID_FILE="/var/run/frpc.pid"');
      lines.push('FRPC_LOG_FILE="/var/log/frpc.log"');
      lines.push('FRPC_CONFIG_FILE="/etc/frpc.toml"');
      lines.push('');
      lines.push('# 函数: 启动 frpc');
      lines.push('start_frpc() {');
      lines.push('    if [ -z "$FRPC_CONFIG_URL" ]; then');
      lines.push('        echo "[FRPC] 未配置 FRPC_CONFIG_URL，跳过启动"');
      lines.push('        return 1');
      lines.push('    fi');
      lines.push('');
      lines.push('    # 检查是否已运行');
      lines.push('    if [ -f "$FRPC_PID_FILE" ] && kill -0 $(cat "$FRPC_PID_FILE") 2>/dev/null; then');
      lines.push('        echo "[FRPC] frpc 已在运行 (PID: $(cat $FRPC_PID_FILE))"');
      lines.push('        return 0');
      lines.push('    fi');
      lines.push('');
      lines.push('    # 备份旧配置文件');
      lines.push('    if [ -f "$FRPC_CONFIG_FILE" ]; then');
      lines.push('        mv "$FRPC_CONFIG_FILE" "$FRPC_CONFIG_FILE.bak.$(date +%s)"');
      lines.push('        echo "[FRPC] 已备份旧配置文件"');
      lines.push('    fi');
      lines.push('');
      lines.push('    echo "[FRPC] 下载配置文件..."');
      lines.push('    if ! wget -q -O "$FRPC_CONFIG_FILE" "$FRPC_CONFIG_URL" ; then');
      lines.push('        echo "[FRPC] 配置文件下载失败"');
      lines.push('        return 1');
      lines.push('    fi');
      lines.push('');
      lines.push('    echo "[FRPC] 启动 frpc..."');
      lines.push('    nohup /usr/local/bin/frpc -c "$FRPC_CONFIG_FILE" > "$FRPC_LOG_FILE" 2>&1 &');
      lines.push('    local pid=$!');
      lines.push('    echo $pid > "$FRPC_PID_FILE"');
      lines.push('    echo "[FRPC] frpc 已启动 (PID: $pid)，日志: $FRPC_LOG_FILE"');
      lines.push('}');
      lines.push('');
      lines.push('# 函数: 停止 frpc');
      lines.push('stop_frpc() {');
      lines.push('    if [ -f "$FRPC_PID_FILE" ]; then');
      lines.push('        local pid=$(cat "$FRPC_PID_FILE")');
      lines.push('        if kill -0 "$pid" 2>/dev/null; then');
      lines.push('            kill "$pid" 2>/dev/null || true');
      lines.push('            rm -f "$FRPC_PID_FILE"');
      lines.push('            echo "[FRPC] frpc 已停止"');
      lines.push('        else');
      lines.push('            rm -f "$FRPC_PID_FILE"');
      lines.push('            echo "[FRPC] frpc 未运行，清理 PID 文件"');
      lines.push('        fi');
      lines.push('    else');
      lines.push('        echo "[FRPC] frpc 未运行"');
      lines.push('    fi');
      lines.push('}');
      lines.push('');
      lines.push('# 函数: 重启 frpc');
      lines.push('restart_frpc() {');
      lines.push('    stop_frpc');
      lines.push('    sleep 1');
      lines.push('    start_frpc');
      lines.push('}');
      lines.push('');
      lines.push('# 支持 --frp 参数（在 restore_snapshot 之前）');
      lines.push('if [ "$1" = "--frp" ]; then');
      lines.push('    case "$2" in');
      lines.push('        start)   start_frpc; exit $? ;;');
      lines.push('        stop)    stop_frpc; exit $? ;;');
      lines.push('        restart) restart_frpc; exit $? ;;');
      lines.push('        *)       echo "用法: $0 --frp [start|stop|restart]"; exit 1 ;;');
      lines.push('    esac');
      lines.push('fi');
    }

    lines.push('');
    lines.push('rm -f /root/syncflag.txt');
    lines.push('');
  }

  // DNS (构建阶段 resolv.conf 只读，在运行时配置)
  if (isChina) {
    lines.push('# --- DNS ---');
    const dnsStr = DEFAULTS.chinaMirrors.dns.replace(/\n/g, '\\n');
    lines.push(`echo -e "${dnsStr}" | tee /etc/resolv.conf > /dev/null`);
    lines.push('');
  }

  // 从对象存储恢复 (仅 CNB)
  if (isCnb) {
    lines.push('# --- 从对象存储恢复 ---');
    lines.push('restore_snapshot');
    lines.push('');
  }

  // 从备份恢复 /root 默认文件 (-n 不覆盖已有)
  lines.push('# --- 恢复 /root 默认文件 ---');
  lines.push('cp -an /root-defaults/root/. /root/ 2>/dev/null || true');
  lines.push('');

  // Git
  lines.push('# --- Git ---');
  lines.push('if [ -n "$GIT_USER_NAME" ]; then');
  lines.push('    git config --global user.name "$GIT_USER_NAME"');
  lines.push('fi');
  lines.push('if [ -n "$GIT_USER_EMAIL" ]; then');
  lines.push('    git config --global user.email "$GIT_USER_EMAIL"');
  lines.push('fi');
  lines.push('');

  // SSH authorized_keys (允许他人通过私钥连接本机)
  lines.push('# --- SSH authorized_keys ---');
  lines.push('if [ -n "$SSH_PUBLIC_KEY" ]; then');
  lines.push('    mkdir -p ~/.ssh && chmod 700 ~/.ssh');
  lines.push('    echo "$SSH_PUBLIC_KEY" >> ~/.ssh/authorized_keys');
  lines.push('    chmod 600 ~/.ssh/authorized_keys');
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

  // FRPC 内网穿透 - 仅下载二进制和启动（函数定义已移至 restore_snapshot 之前）
  if (frpcEnabled) {
    const frpcUrl = isChina ? DEFAULTS.frpc.mirrorUrl : DEFAULTS.frpc.url;
    lines.push('# --- FRPC 内网穿透 ---');
    lines.push('# 下载 frpc 二进制并启动');
    lines.push('if [ -n "$FRPC_CONFIG_URL" ]; then');
    lines.push(`    wget -q -O /usr/local/bin/frpc "${frpcUrl}"`);
    lines.push('    chmod +x /usr/local/bin/frpc');
    lines.push('    start_frpc');
    lines.push('fi');
    lines.push('');
  }

  // 设置定时同步 (仅 CNB)
  if (isCnb) {
    lines.push('# --- 设置定时同步 ---');
    lines.push('setup_periodic_sync');
    lines.push('');
  }

  // 动态生成 README
  lines.push('# --- README ---');
  lines.push('cat > /workspace/README.md << \'READMEEOF\'');
  lines.push('# Development Environment');
  lines.push('');

  if (config.languages.length) {
    lines.push('## 已安装的工具');
    lines.push('');
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
  lines.push('- `SSH_PUBLIC_KEY`: SSH 公钥 (用于连接容器)');
  if (config.codeServer) lines.push('- `CS_PASSWORD`: Code-Server 密码 (不设置则免密)');
  if (config.cfTunnel) lines.push('- `CF_TUNNEL_TOKEN`: Cloudflare Tunnel Token');
  if (config.frpcEnabled) lines.push('- `FRPC_CONFIG_URL`: frpc 配置文件下载地址');

  // OSS 环境变量说明 (仅 CNB)
  if (isCnb) {
    lines.push('');
    lines.push('### 对象存储持久化');
    lines.push('- `OSS_ENABLED`: 启用持久化 (true/false)');
    lines.push('- `OSS_ENDPOINT`: S3 endpoint');
    lines.push('- `OSS_ACCESS_KEY`: Access Key ID');
    lines.push('- `OSS_SECRET_KEY`: Secret Access Key');
    lines.push('- `OSS_BUCKET`: 桶名');
    lines.push('- `OSS_REGION`: 区域 (默认 auto)');
    lines.push('- `OSS_PROJECT`: 项目名，用于快照文件命名前缀 (默认 devbox)');
    lines.push('- `OSS_PATHS`: 持久化目录列表 (逗号分隔)');
    lines.push('- `OSS_KEEP_COUNT`: 保留快照数 (默认 5)');
    lines.push('- `OSS_SYNC_INTERVAL`: 同步间隔分钟 (默认 5)');
  }

  lines.push('READMEEOF');
  lines.push('');

  // 启动服务
  lines.push('# --- 启动 ---');
  lines.push('/usr/sbin/sshd');
  lines.push('');

  // FRPC 重启 (容器启动时自动调用)
  if (frpcEnabled) {
    lines.push('# 启动时重启 frpc');
    lines.push('if [ -n "$FRPC_CONFIG_URL" ] && [ -f /usr/local/bin/frpc ]; then');
    lines.push('    restart_frpc');
    lines.push('fi');
    lines.push('');
  }

  if (config.codeServer) {
    // CNB 平台会自动注入 code-server 进程，需要检测并复用
 if (isCnb) {
 lines.push('# --- code-server (CNB 平台) ---');
 lines.push('# CNB 会自动注入 code-server 进程，检测是否已运行');
 lines.push('if pgrep -f \'(^|/)code-server( |$)\' >/dev/null || pgrep -f \'/usr/lib/code-server/lib/node /usr/lib/code-server\' >/dev/null; then');
 lines.push(' echo "[code-server] 检测到 CNB 注入的进程，跳过启动"');
 lines.push('else');
 lines.push(' exec code-server --bind-addr 0.0.0.0:12345 $AUTH_ARGS /workspace');
 lines.push('fi');
 } else {
 lines.push('exec code-server --bind-addr 0.0.0.0:12345 $AUTH_ARGS /workspace');
 }
  } else {
    lines.push('exec /usr/sbin/sshd -D');
  }

  return lines.join('\n');
}