/** cnb.js — .cnb.yml 生成器（CNB 云开发平台配置） */

function generateCnbYml() {
  const lines = [];

  lines.push('$:');
  lines.push('  vscode:');
  lines.push('    - runner:');
  lines.push('        #这里填入需要的CPU核心数，内存固定为CPU核心数的两倍，建议使用2-6核心，免费时长足以覆盖');
  lines.push('        cpus: 6');
  lines.push('      docker:');
  lines.push('        build:');
  lines.push('          dockerfile: Dockerfile');
  lines.push('          by:');
  lines.push('            - entrypoint.sh');
  lines.push('        # 此处根据您配置的工具选择，建议挂载如下目录以持久化数据，CNB禁止挂载整个ROOT目录，workspace目录会自动挂载');
  lines.push('        # 因作者不熟悉不同语言是否会在ROOT目录做更改，如果需要持久化数据，请按照下面的示例自行填写');
  lines.push('        volumes:');
  lines.push('          #claude code 的配置目录');
  lines.push('          - /root/.claude');
  lines.push('          #code-server 的配置目录');
  lines.push('          - /root/.vscode-server');
  lines.push('          #code-server 的插件的配置目录');
  lines.push('          - /root/.local/share/code-server/extensions');
  lines.push('          #cc-switch-cli的配置目录，如果您使用cc-switch，请保留');
  lines.push('          - /root/.cc-switch');
  lines.push('      services:');
  lines.push('        - vscode');
  lines.push('        - docker');

  return lines.join('\n');
}
