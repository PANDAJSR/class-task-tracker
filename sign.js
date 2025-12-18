/**
 * Electron Builder 代码签名脚本
 * 用于自动签名 Windows 可执行文件
 */

const { execFileSync } = require('child_process');
const path = require('path');

/**
 * 签名配置
 */
const SIGN_CONFIG = {
  // 证书路径（相对项目根目录）
  certificateFile: path.join(__dirname, 'certs', 'codesign.pfx'),

  // 时间戳服务器（用于长期验证）
  timestampServer: 'http://timestamp.digicert.com',

  // 备用时间戳服务器
  backupTimestampServer: 'http://timestamp.sectigo.com',

  // 签名算法
  algorithm: 'SHA256'
};

/**
 * 电子构建器签名函数
 * @param {Object} configuration - 构建配置
 */
exports.default = async function(configuration) {
  const { path: filePath } = configuration;

  console.log('========================================');
  console.log('开始代码签名...');
  console.log(`文件: ${filePath}`);
  console.log(`证书: ${SIGN_CONFIG.certificateFile}`);
  console.log('========================================');

  // 检查证书文件是否存在
  const fs = require('fs');
  if (!fs.existsSync(SIGN_CONFIG.certificateFile)) {
    console.error('❌ 错误: 证书文件未找到！');
    console.error(`请确保证书文件存在: ${SIGN_CONFIG.certificateFile}`);
    console.error('如果你还没有证书，请访问: https://certum.pl/en/');

    // 如果没有证书，跳过签名（用于测试）
    console.warn('⚠️  未找到证书，跳过签名（仅用于测试）');
    return;
  }

  // 从环境变量获取证书密码（推荐方式）
  const certificatePassword = process.env.CODESIGN_PASSWORD;

  if (!certificatePassword) {
    console.error('❌ 错误: 未设置证书密码！');
    console.error('请设置环境变量: set CODESIGN_PASSWORD=你的证书密码');
    console.error('或使用 .env 文件存储密码');

    // 如果没有密码，跳过签名
    console.warn('⚠️  未设置证书密码，跳过签名');
    return;
  }

  try {
    // 构建签名命令参数
    const args = [
      'sign',
      `/fd`, SIGN_CONFIG.algorithm,
      `/f`, SIGN_CONFIG.certificateFile,
      `/p`, certificatePassword,
      `/tr`, SIGN_CONFIG.timestampServer,
      `/td`, SIGN_CONFIG.algorithm,
      `/du`, 'https://github.com/yourusername/class-task-tracker',  // 软件主页
      `/d`, '"班级任务统计助手"',  // 软件描述
      filePath
    ];

    console.log('执行签名命令:');
    console.log(`signtool ${args.join(' ')}`);

    // 执行签名
    execFileSync('signtool', args, {
      stdio: 'inherit'
    });

    console.log('✅ 签名成功！');

    // 验证签名
    await verifySignature(filePath);

  } catch (error) {
    console.error('❌ 签名失败:', error.message);

    // 尝试使用备用时间戳服务器
    console.log('尝试使用备用时间戳服务器...');
    try {
      const backupArgs = [
        'sign',
        `/fd`, SIGN_CONFIG.algorithm,
        `/f`, SIGN_CONFIG.certificateFile,
        `/p`, certificatePassword,
        `/tr`, SIGN_CONFIG.backupTimestampServer,
        `/td`, SIGN_CONFIG.algorithm,
        filePath
      ];

      execFileSync('signtool', backupArgs, {
        stdio: 'inherit'
      });

      console.log('✅ 使用备用服务器签名成功！');
      await verifySignature(filePath);
    } catch (backupError) {
      console.error('❌ 备用服务器也失败了:', backupError.message);
      throw backupError;
    }
  }
};

/**
 * 验证签名
 * @param {string} filePath - 文件路径
 */
async function verifySignature(filePath) {
  console.log('正在验证签名...');

  try {
    execFileSync('signtool', ['verify', '/pa', '/v', filePath], {
      stdio: 'inherit'
    });
    console.log('✅ 签名验证成功！');
  } catch (error) {
    console.error('⚠️  签名验证警告:', error.message);
  }
}

/**
 * 检查系统环境
 */
function checkEnvironment() {
  console.log('检查签名环境...');

  const fs = require('fs');

  // 检查证书
  const certExists = fs.existsSync(SIGN_CONFIG.certificateFile);
  console.log(`证书文件: ${certExists ? '✅ 存在' : '❌ 不存在'}`);

  // 检查密码
  const hasPassword = !!process.env.CODESIGN_PASSWORD;
  console.log(`证书密码: ${hasPassword ? '✅ 已设置' : '❌ 未设置'}`);

  // 检查signtool
  try {
    execFileSync('signtool', ['/?'], { stdio: 'ignore' });
    console.log('签名工具: ✅ 可用');
  } catch (error) {
    console.log('签名工具: ❌ 不可用，请安装Windows SDK');
  }

  console.log('\n环境检查完成！');
}

// 如果直接运行此脚本，检查环境
if (require.main === module) {
  checkEnvironment();
}

module.exports = {
  SIGN_CONFIG,
  checkEnvironment
};
