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
    lines.push('# OSS_KEEP_COUNT: 保留快照数量 (默认 5)');
    lines.push('');
    lines.push(`OSS_ENABLED="${ossEnabled ? 'true' : '${OSS_ENABLED:-true}'}"`);
    lines.push('OSS_ENDPOINT="${OSS_ENDPOINT:-}"');
    lines.push('OSS_ACCESS_KEY="${OSS_ACCESS_KEY:-}"');
    lines.push('OSS_SECRET_KEY="${OSS_SECRET_KEY:-}"');
    lines.push('OSS_BUCKET="${OSS_BUCKET:-}"');
    lines.push('OSS_REGION="${OSS_REGION:-auto}"');
    lines.push('OSS_PROJECT="${OSS_PROJECT:-devbox}"');
    lines.push('OSS_PATHS="${OSS_PATHS:-/root/.claude,/root/.ssh,/root/.cc-switch,/root/.local/share/code-server/User/globalStorage,/root/.vscode-server/data/User/globalStorage}"');
    lines.push('OSS_KEEP_COUNT="${OSS_KEEP_COUNT:-5}"');
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

    // 注意: 不再自动同步，仅保留手动上传/下载功能
  }

  // FRPC 函数定义和参数处理（独立于部署平台）
  if (frpcEnabled) {
    lines.push('# ============================================');
    lines.push('# FRPC 内网穿透');
    lines.push('# ============================================');
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
  }

  // --commands 参数（始终生成，方便后期扩展）
  lines.push('# ============================================');
  lines.push('# 支持 --commands 参数（交互式菜单）');
  lines.push('# ============================================');
  lines.push('if [ "$1" = "--commands" ]; then');
  lines.push('    echo "============================================"');
  lines.push('    echo "  Vibespace 管理菜单"');
  lines.push('    echo "============================================"');
  if (isCnb) {
    lines.push('    echo "  1. 上传到对象存储"');
    lines.push('    echo "  2. 从对象存储下载并覆盖本地"');
  }
  if (frpcEnabled) {
    lines.push('    echo "  3. 启动 frpc"');
    lines.push('    echo "  4. 停止 frpc"');
    lines.push('    echo "  5. 重启 frpc"');
    lines.push('    echo "  6. 查看 frpc 状态"');
    lines.push('    echo "  7. 查看 frpc 日志"');
  }
  if (isCnb) {
    lines.push('    echo "  8. 手动同步 (上传快照)"');
  }
  lines.push('    echo "  0. 退出"');
  lines.push('    echo "============================================"');
  lines.push('    read -p "请选择操作 [0-8]: " choice');
  lines.push('');
  lines.push('    case "$choice" in');
  if (isCnb) {
    lines.push('        1)');
    lines.push('            echo "[操作] 上传到对象存储..."');
    lines.push('            upload_snapshot');
    lines.push('            ;;');
    lines.push('        2)');
    lines.push('            echo "[操作] 从对象存储下载并覆盖本地..."');
    lines.push('            # 先清空 syncflag 以允许强制覆盖');
    lines.push('            rm -f /root/syncflag.txt');
    lines.push('            restore_snapshot');
    lines.push('            ;;');
  }
  if (frpcEnabled) {
    lines.push('        3)');
    lines.push('            echo "[操作] 启动 frpc..."');
    lines.push('            start_frpc');
    lines.push('            ;;');
    lines.push('        4)');
    lines.push('            echo "[操作] 停止 frpc..."');
    lines.push('            stop_frpc');
    lines.push('            ;;');
    lines.push('        5)');
    lines.push('            echo "[操作] 重启 frpc..."');
    lines.push('            restart_frpc');
    lines.push('            ;;');
    lines.push('        6)');
    lines.push('            echo "[操作] 查看 frpc 状态..."');
    lines.push('            if [ -f "$FRPC_PID_FILE" ] && kill -0 $(cat "$FRPC_PID_FILE") 2>/dev/null; then');
    lines.push('                echo "[FRPC] frpc 正在运行 (PID: $(cat $FRPC_PID_FILE))"');
    lines.push('            else');
    lines.push('                echo "[FRPC] frpc 未运行"');
    lines.push('            fi');
    lines.push('            ;;');
    lines.push('        7)');
    lines.push('            echo "[操作] 查看 frpc 日志..."');
    lines.push('            if [ -f "$FRPC_LOG_FILE" ]; then');
    lines.push('                echo "--- 最近 50 行日志 ---"');
    lines.push('                tail -50 "$FRPC_LOG_FILE"');
    lines.push('            else');
    lines.push('                echo "[FRPC] 日志文件不存在: $FRPC_LOG_FILE"');
    lines.push('            fi');
    lines.push('            ;;');
  }
  if (isCnb) {
    lines.push('        8)');
    lines.push('            echo "[操作] 手动同步 (上传快照)..."');
    lines.push('            upload_snapshot');
    lines.push('            ;;');
  }
  lines.push('        0)');
  lines.push('            echo "退出"');
  lines.push('            exit 0');
  lines.push('            ;;');
  lines.push('        *)');
  lines.push('            echo "无效选择: $choice"');
  lines.push('            exit 1');
  lines.push('            ;;');
  lines.push('    esac');
  lines.push('    exit 0');
  lines.push('fi');
  lines.push('');

  lines.push('# ============================================');
  lines.push('# 容器启动执行');
  lines.push('# ============================================');
  lines.push('');

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
    lines.push('rm -f /root/syncflag.txt');
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

  // FRPC 内网穿透 - 仅下载二进制，容器启动主流程中再决定是否启动
  if (frpcEnabled) {
    const frpcUrl = isChina ? DEFAULTS.frpc.mirrorUrl : DEFAULTS.frpc.url;
    lines.push('# --- FRPC 内网穿透 ---');
    lines.push('# 下载 frpc 二进制');
    lines.push('if [ -n "$FRPC_CONFIG_URL" ]; then');
    lines.push(`    wget -q -O /usr/local/bin/frpc "${frpcUrl}"`);
    lines.push('    chmod +x /usr/local/bin/frpc');
    lines.push('fi');
    lines.push('');
  }

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