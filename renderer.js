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
  console.log('Initializing application...');

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
        const confirmed = confirm('Return to input interface? Current progress will be lost.');
        if (confirmed) {
          handleResetApp();
        }
      }
    }
  });

  // 等待electronAPI准备好
  console.log('Waiting for electronAPI to be available...');
  const checkElectronAPI = setInterval(() => {
    if (window.electronAPI && window.electronAPI.onWindowResize) {
      console.log('electronAPI is available, registering window resize listener');
      clearInterval(checkElectronAPI);

      // 监听窗口大小变化事件（带防抖）
      let resizeTimer = null;
      try {
        window.electronAPI.onWindowResize((size) => {
          console.log('Received window resize event:', size);
          if (bubblesSection.style.display !== 'none') {
            if (resizeTimer) {
              clearTimeout(resizeTimer);
            }

            resizeTimer = setTimeout(() => {
              console.log('Window resized, starting relayout...');
              const dims = Utils.updateContainerSize(bubblesContainer);
              console.log('Updated container dimensions:', dims);
              BubbleGenerator.setContainerSize(dims.width, dims.height);
              handleRedistributeBubbles();
              resizeTimer = null;
            }, 300);
          }
        });
        console.log('Window resize listener registered (electronAPI method)');
      } catch (error) {
        console.error('注册窗口监听失败:', error);
      }
    } else {
      console.log('electronAPI not ready yet, continue waiting...');
    }
  }, 100);
  setTimeout(() => clearInterval(checkElectronAPI), 5000); // 5秒后停止检查

  // 备用方案：使用原生JS监听窗口大小变化
  console.log('Registering backup window resize listener (resize event)');
  let nativeResizeTimer = null;
  window.addEventListener('resize', () => {
    if (bubblesSection.style.display !== 'none') {
      console.log('Received native resize event');
      if (nativeResizeTimer) {
        clearTimeout(nativeResizeTimer);
      }

      nativeResizeTimer = setTimeout(() => {
        console.log('Native resize event triggered, starting relayout...');
        const dims = Utils.updateContainerSize(bubblesContainer);
        console.log('Updated container dimensions (native method):', dims);
        BubbleGenerator.setContainerSize(dims.width, dims.height);
        handleRedistributeBubbles();
        nativeResizeTimer = null;
      }, 300);
    }
  });

  // 初始化容器大小
  updateContainerSizeInternal();

  console.log('Application initialization completed, waiting for electronAPI...');
}

// ============================================================================
// 事件处理函数
// ============================================================================

/**
 * 生成泡泡按钮点击处理
 */
async function handleGenerateBubbles() {
  console.log('Starting bubble generation...');

  const result = await BubbleGenerator.generateBubbles(
    studentNamesTextarea,
    bubblesContainer,
    handleMarkAsCompleted  // 传递点击处理函数
  );

  if (!result) {
    console.error('Bubble generation failed');
    return;
  }

  // 切换显示界面
  inputSection.style.display = 'none';
  bubblesSection.style.display = 'flex';

  // 更新统计信息
  updateStatsInternal();

  // 延迟一段时间后进行初始布局
  setTimeout(() => {
    console.log('Executing initial layout algorithm...');
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

  console.log(`Starting initial layout, bubble count: ${bubbles.length}`);

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

  if (!bubbles || bubbles.length === 0) {
    console.log('No bubbles to layout');
    return;
  }

  console.log('Executing adaptive layout algorithm...');
  console.log(`- Bubble count: ${bubbles.length}`);
  console.log(`- Container size: ${containerWidth}x${containerHeight}`);

  // 第1步：计算每 bubbles sizes
  const bubbleSizes = BubbleGenerator.calculateBubbleSizes(containerWidth, containerHeight);
  console.log(`- Calculated${bubbleSizes.length} bubbles sizes`);

  // 第2步：应用泡泡大小
  console.log('Applying bubble sizes...');
  bubbleSizes.forEach(({ index, size }) => {
    const bubble = bubbles[index];
    if (!bubble || !bubble.element) return;

    bubble.size = size;
    const fontSize = Math.max(12, size / 4);

    // 添加动画类，启用平滑过渡
    bubble.element.classList.add('animating');

    // 应用新的尺寸
    bubble.element.style.width = `${size}px`;
    bubble.element.style.height = `${size}px`;
    bubble.element.style.fontSize = `${fontSize}px`;

    // 动画结束后移除动画类（避免影响其他交互）
    setTimeout(() => {
      bubble.element.classList.remove('animating');
    }, 1300); // 比动画时长略长
  });

  console.log('Bubble sizes assigned, starting intelligent layout...');

  // 第3步：智能放置泡泡
  console.log('Calling intelligent layout algorithm...');
  const positions = LayoutAlgorithm.placeBubblesIntelligently(
    bubbles,
    bubbleSizes,
    containerWidth,
    containerHeight,
    ({ animations, movingBubbleIds }) => {
      console.log(`- Calculated${animations.length} new bubble positions`);

      // 使用动画控制器执行批量动画
      AnimationController.applyBatchAnimations(
        animations,
        movingBubbleIds,
        () => {
          console.log('All bubble layout animations completed');
        }
      );
    }
  );

  console.log(`Layout algorithm completed, returned${positions.length} position data entries`);
  return positions;
}

/**
 * 重新分布所有泡泡（响应窗口大小变化）
 */
function handleRedistributeBubbles() {
  const bubbles = BubbleGenerator.bubbles();

  if (!bubbles || bubbles.length === 0) {
    console.log('No bubbles need to be rearranged');
    return;
  }

  console.log('Starting bubble rearrangement...');

  // 强制浏览器重新计算布局
  bubblesContainer.style.visibility = 'hidden';
  bubblesContainer.offsetHeight; // 触发重排
  bubblesContainer.style.visibility = '';

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
    console.log('Please create some bubbles first!');
    return;
  }

  console.log('\n=== Manual bubble rearrangement triggered ===');
  updateContainerSizeInternal();
  handleRedistributeBubbles();
};

/**
 * 查看当前泡泡的大小信息（测试用）
 */
window.testBubbleSizes = function() {
  console.log('\n=== Bubble size information ===');

  const bubbles = BubbleGenerator.bubbles();

  if (!bubbles || bubbles.length === 0) {
    console.log('No bubbles to display');
    return;
  }

  bubbles.forEach(bubbleData => {
    const { element, student, size } = bubbleData;
    const width = element.style.width;
    const height = element.style.height;

    console.log(`Student: ${student.name}`);
    console.log(`  - Current size: ${size}px`);
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
