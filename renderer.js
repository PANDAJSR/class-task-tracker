// 使用全局模块（从其他文件中加载）
// 这些模块通过脚本标签在HTML中加载
const BubbleGenerator = window.BubbleGeneratorModule;
const LayoutAlgorithm = window.LayoutModule;
const AnimationController = window.AnimationModule;
const Utils = window.UtilsModule;

// Electron API（通过preload脚本暴露）
const electronAPI = window.electronAPI;

// ============================================================================
// DOM元素引用
// ============================================================================
const studentNamesTextarea = document.getElementById('student-names');
const generateBtn = document.getElementById('generate-btn');
const clearBtn = document.getElementById('clear-btn');
const resetBtn = document.getElementById('reset-btn');
const bubblesContainer = document.getElementById('bubbles-container');
const inputSection = document.getElementById('input-section');
const bubblesSection = document.getElementById('bubbles-section');

// 统计信息显示元素
const totalCount = document.getElementById('total-count');
const completedCount = document.getElementById('completed-count');
const remainingCount = document.getElementById('remaining-count');

// ============================================================================
// 应用初始化
// ============================================================================

/**
 * 初始化应用
 * 绑定所有事件监听器并初始化状态
 */
function init() {
  console.log('应用初始化中...');

  // 绑定事件监听器
  generateBtn.addEventListener('click', handleGenerateBubbles);
  clearBtn.addEventListener('click', () => {
    Utils.clearInput(studentNamesTextarea);
  });
  resetBtn.addEventListener('click', handleResetApp);

  // 绑定键盘快捷键
  document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + R - 重置应用
    if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
      e.preventDefault();
      handleResetApp();
    }

    // Escape - 返回输入界面（当在有泡泡的界面时）
    if (e.key === 'Escape' && bubblesSection.style.display !== 'none') {
      const bubbles = BubbleGenerator.bubbles();
      if (bubbles.length > 0) {
        const confirmed = confirm('确定要返回输入界面吗？当前进度将会丢失。');
        if (confirmed) {
          handleResetApp();
        }
      }
    }
  });

  // 监听窗口大小变化事件（带防抖）
  let resizeTimer = null;
  if (electronAPI) {
    electronAPI.onWindowResize((size) => {
      if (bubblesSection.style.display !== 'none') {
        if (resizeTimer) {
          clearTimeout(resizeTimer);
        }

        resizeTimer = setTimeout(() => {
          console.log('窗口大小变化，开始重新布局...');
          const dims = Utils.updateContainerSize(bubblesContainer);
          BubbleGenerator.setContainerSize(dims.width, dims.height);
          handleRedistributeBubbles();
          resizeTimer = null;
        }, 300);
      }
    });
  } else {
    console.warn('electronAPI 未定义，窗口大小变化监听将不可用');
  }

  // 初始化容器大小
  updateContainerSizeInternal();

  console.log('应用初始化完成');
}

// ============================================================================
// 事件处理函数
// ============================================================================

/**
 * 生成泡泡按钮点击处理
 */
async function handleGenerateBubbles() {
  console.log('开始生成泡泡...');

  const result = await BubbleGenerator.generateBubbles(
    studentNamesTextarea,
    bubblesContainer,
    handleMarkAsCompleted  // 传递点击处理函数
  );

  if (!result) {
    console.error('生成泡泡失败');
    return;
  }

  // 切换显示界面
  inputSection.style.display = 'none';
  bubblesSection.style.display = 'flex';

  // 更新统计信息
  updateStatsInternal();

  // 延迟一段时间后进行初始布局
  setTimeout(() => {
    console.log('执行初始布局算法...');
    handleDistributeBubbles();
  }, 300);
}

/**
 * 分布所有泡泡（初始布局）
 * 第一次布局时确保所有泡泡都有合理的大小和位置
 */
async function handleDistributeBubbles() {
  const bubbles = BubbleGenerator.bubbles();
  if (!bubbles || bubbles.length === 0) return;

  console.log(`开始初始布局，泡泡数量: ${bubbles.length}`);

  // 更新容器大小
  updateContainerSizeInternal();

  // 执行智能布局
  handleRandomLayout();
}

/**
 * 自适应布局算法执行
 */
function handleRandomLayout() {
  const bubbles = BubbleGenerator.bubbles();
  const containerWidth = window.containerWidth;
  const containerHeight = window.containerHeight;

  if (!bubbles || bubbles.length === 0) return;

  console.log('执行自适应布局算法...');

  // 第1步：计算每个泡泡的大小
  const bubbleSizes = BubbleGenerator.calculateBubbleSizes(containerWidth, containerHeight);

  // 第2步：应用泡泡大小
  bubbleSizes.forEach(({ index, size }) => {
    const bubble = bubbles[index];
    if (!bubble || !bubble.element) return;

    bubble.size = size;
    const fontSize = Math.max(12, size / 4);

    bubble.element.style.transition = 'none';
    bubble.element.style.width = `${size}px`;
    bubble.element.style.height = `${size}px`;
    bubble.element.style.fontSize = `${fontSize}px`;

    setTimeout(() => {
      bubble.element.style.transition =
        'left 0.6s cubic-bezier(0.4, 0, 0.2, 1), top 0.6s cubic-bezier(0.4, 0, 0.2, 1), ' +
        'transform 0.3s ease, box-shadow 0.3s ease, opacity 0.5s ease';
    }, 50);
  });

  console.log('泡泡大小已分配，开始智能布局...');

  // 第3步：智能放置泡泡
  const positions = LayoutAlgorithm.placeBubblesIntelligently(
    bubbles,
    bubbleSizes,
    containerWidth,
    containerHeight,
    ({ animations, movingBubbleIds }) => {
      console.log(`准备执行${animations.length}个泡泡的批量动画`);

      // 使用动画控制器执行批量动画
      AnimationController.applyBatchAnimations(
        animations,
        movingBubbleIds,
        () => {
          console.log('所有泡泡布局动画完成');
        }
      );
    }
  );

  return positions;
}

/**
 * 重新分布所有泡泡（响应窗口大小变化）
 */
function handleRedistributeBubbles() {
  const bubbles = BubbleGenerator.bubbles();

  if (!bubbles || bubbles.length === 0) {
    console.log('没有泡泡需要重新排列');
    return;
  }

  console.log('开始重新排列泡泡...');
  handleRandomLayout();
}

/**
 * 处理学生完成（点击泡泡）
 * @param {number} studentId - 学生ID
 */
async function handleMarkAsCompleted(studentId) {
  const bubbles = BubbleGenerator.bubbles();

  await AnimationController.markAsCompleted(
    studentId,
    bubbles,
    // 动画完成回调
    () => {
      const remainingBubbles = BubbleGenerator.bubbles();
      if (remainingBubbles.length > 0) {
        updateContainerSizeInternal();
        handleRandomLayout();
      }
    },
    // 泡泡移除回调
    (removedStudentId) => {
      BubbleGenerator.removeBubble(removedStudentId);
    }
  );

  // 更新统计信息（立即更新，不等待动画）
  updateStatsInternal();
}

/**
 * 重置应用
 */
async function handleResetApp() {
  await Utils.resetApp(
    {
      bubblesSection,
      inputSection,
      studentNamesTextarea,
      bubblesContainer,
      statElements: {
        totalCount,
        completedCount,
        remainingCount
      }
    },
    BubbleGenerator,
    AnimationController
  );
}

// ============================================================================
// 内部辅助函数
// ============================================================================

/**
 * 更新容器大小（内部调用）
 */
function updateContainerSizeInternal() {
  const dims = Utils.updateContainerSize(bubblesContainer);
  BubbleGenerator.setContainerSize(dims.width, dims.height);
  return dims;
}

/**
 * 更新统计信息（内部调用）
 */
function updateStatsInternal() {
  Utils.updateStats(BubbleGenerator.students(), {
    totalCount,
    completedCount,
    remainingCount
  });
}

// ============================================================================
// 测试函数（在控制台使用）
// ============================================================================

/**
 * 手动触发泡泡重新排列（测试用）
 */
window.adjustWindowSize = function() {
  const bubbles = BubbleGenerator.bubbles();
  if (!bubbles || bubbles.length === 0) {
    console.log('请先创建一些泡泡！');
    return;
  }

  console.log('\n=== 手动触发泡泡重新排列 ===');
  updateContainerSizeInternal();
  handleRedistributeBubbles();
};

/**
 * 查看当前泡泡的大小信息（测试用）
 */
window.testBubbleSizes = function() {
  console.log('\n=== 泡泡大小信息 ===');

  const bubbles = BubbleGenerator.bubbles();

  if (!bubbles || bubbles.length === 0) {
    console.log('没有泡泡可以显示');
    return;
  }

  bubbles.forEach(bubbleData => {
    const { element, student, size } = bubbleData;
    const width = element.style.width;
    const height = element.style.height;

    console.log(`学生: ${student.name}`);
    console.log(`  - 当前大小: ${size}px`);
    console.log(`  - DOM width: ${width}, height: ${height}`);
    console.log('');
  });
};

// ============================================================================
// 应用启动
// ============================================================================

// 在DOM加载完成后初始化应用
document.addEventListener('DOMContentLoaded', init);

// 页面卸载时清理
window.addEventListener('beforeunload', () => {
  if (electronAPI) {
    electronAPI.removeAllListeners('window-resize');
  }
});

// 全局导出一些函数供测试使用
window.BubbleApp = {
  init,
  handleGenerateBubbles,
  handleMarkAsCompleted,
  handleResetApp,
  getStudents: () => BubbleGenerator.students(),
  getBubbles: () => BubbleGenerator.bubbles(),
  updateStats: updateStatsInternal,
  distributeBubbles: handleDistributeBubbles
};
