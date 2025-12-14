const { ipcRenderer } = require('electron');

// DOM元素引用
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

// 存储学生数据
let students = [];
let bubbles = [];
let containerWidth = 0;
let containerHeight = 0;

/**
 * 初始化应用
 */
function init() {
  // 绑定事件监听器
  generateBtn.addEventListener('click', generateBubbles);
  clearBtn.addEventListener('click', clearInput);
  resetBtn.addEventListener('click', resetApp);

  // 监听窗口大小变化事件（带防抖）
  let resizeTimer = null;
  ipcRenderer.on('window-resize', (event, size) => {
    if (bubblesSection.style.display !== 'none') {
      // 清除之前的定时器（防抖）
      if (resizeTimer) {
        clearTimeout(resizeTimer);
      }

      // 延迟300ms后执行，避免频繁重排导致的闪烁
      resizeTimer = setTimeout(() => {
        console.log('窗口大小变化，开始重新布局...');
        updateContainerSize();
        redistributeBubbles();
        resizeTimer = null;
      }, 300);
    }
  });

  // 初始化容器大小
  updateContainerSize();
}

/**
 * 更新容器大小
 */
function updateContainerSize() {
  const rect = bubblesContainer.getBoundingClientRect();
  containerWidth = rect.width;
  containerHeight = rect.height;
}

/**
 * 生成泡泡
 */
function generateBubbles() {
  const names = studentNamesTextarea.value.trim();
  if (!names) {
    alert('请输入学生姓名！');
    return;
  }

  // 解析学生姓名
  const nameArray = names
    .split('\n')
    .map(name => name.trim())
    .filter(name => name.length > 0);

  if (nameArray.length === 0) {
    alert('请至少输入一个有效的学生姓名！');
    return;
  }

  // 初始化学生数据
  students = nameArray.map((name, index) => ({
    id: index,
    name: name,
    completed: false,
    element: null
  }));

  // 切换显示界面
  inputSection.style.display = 'none';
  bubblesSection.style.display = 'flex';

  // 清空容器
  bubblesContainer.innerHTML = '';
  bubbles = [];

  // 创建所有泡泡（不等待，一次性创建）
  // 错开创建会导致布局计算时泡泡不全
  students.forEach((student) => {
    createBubble(student);
  });

  // 更新统计信息
  updateStats();

  // 延迟更长时间，确保DOM完全更新后再布局
  // 同时确保容器大小已经稳定
  setTimeout(() => {
    console.log('所有泡泡创建完成，开始计算布局...');
    updateContainerSize();
    distributeBubbles();
  }, 300); // 增加到300ms，确保DOM稳定
}

/**
 * 创建单个泡泡元素
 */
function createBubble(student) {
  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  bubble.textContent = student.name;
  bubble.dataset.studentId = student.id;

  // 设置合理的初始大小（100px），避免第一次布局时大小为0导致的问题
  const initialSize = 100;
  bubble.style.width = `${initialSize}px`;
  bubble.style.height = `${initialSize}px`;
  bubble.style.fontSize = '20px'; // 设置合适的初始字体大小

  // 设置固定的背景色（根据学生ID计算，不会随DOM顺序变化）
  bubble.style.background = getBubbleBackgroundColor(student.id);

  // 添加点击事件
  bubble.addEventListener('click', () => {
    markAsCompleted(student.id);
  });

  // 初始位置（从中心开始）
  bubble.style.left = `${containerWidth / 2 - initialSize / 2}px`;
  bubble.style.top = `${containerHeight / 2 - initialSize / 2}px`;
  bubble.style.opacity = '0';

  bubblesContainer.appendChild(bubble);
  student.element = bubble;
  bubbles.push({ student, element: bubble, size: initialSize });

  // 淡入动画
  setTimeout(() => {
    bubble.style.opacity = '1';
  }, 100);
}

/**
 * 算法核心思想：使用空间分割 + 贪心策略
 * 每个泡泡根据当前可用空间动态调整大小
 * 目标是最大化填充率，最小化空白区域
 */

/**
 * 计算并分配每个泡泡的大小
 * 根据pace-filling算法，动态分配大小以最大化填充率
 * @returns {Array} 每个泡泡的推荐大小
 */
function calculateBubbleSizes() {
  if (bubbles.length === 0) return [];

  // 计算基础大小（所有泡泡一样大时的最大可行尺寸）
  const baseSize = findBaseBubbleSize();
  console.log(`基础泡泡大小: ${baseSize}px (所有泡泡一样大时的最大尺寸)`);

  // 减少浮动范围到±10%，这样泡泡大小更统一，更容易放置
  // 减少浮动范围后，重叠问题会显著改善
  const sizeVariation = 0.1; // 10%的变化范围（原来是20%）
  const minSize = Math.max(40, baseSize * (1 - sizeVariation));
  const maxSize = baseSize * (1 + sizeVariation);

  // 随机打乱泡泡顺序（产生更自然的布局）
  const shuffledIndices = bubbles.map((_, i) => i);
  for (let i = shuffledIndices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledIndices[i], shuffledIndices[j]] = [shuffledIndices[j], shuffledIndices[i]];
  }

  console.log(`泡泡大小范围: ${minSize.toFixed(0)}px - ${maxSize.toFixed(0)}px`);
  console.log(`大小浮动范围: ±${(sizeVariation * 100).toFixed(0)}%`);

  // 为每个泡泡分配大小（优先让一部分泡泡用最大尺寸，一部分用最小尺寸）
  const sizeAssignments = [];
  const bigCount = Math.floor(bubbles.length * 0.3); // 30%用大尺寸
  const smallCount = Math.floor(bubbles.length * 0.3); // 30%用小尺寸
  const normalCount = bubbles.length - bigCount - smallCount;

  // 分配大尺寸
  for (let i = 0; i < bigCount; i++) {
    const idx = shuffledIndices[i];
    sizeAssignments.push({ index: idx, size: Math.round(maxSize) });
  }

  // 分配小尺寸
  for (let i = 0; i < smallCount; i++) {
    const idx = shuffledIndices[bigCount + i];
    sizeAssignments.push({ index: idx, size: Math.round(minSize) });
  }

  // 分配正常尺寸（介于min和max之间）
  for (let i = 0; i < normalCount; i++) {
    const idx = shuffledIndices[bigCount + smallCount + i];
    const t = 0.3 + Math.random() * 0.7; // 在30%-100%之间
    const size = Math.round(minSize + (maxSize - minSize) * t);
    sizeAssignments.push({ index: idx, size });
  }

  sizeAssignments.forEach(({ index, size }) => {
    console.log(`泡泡 ${bubbles[index].student.name}: 分配大小=${size}px (基础=${baseSize}px)`);
  });

  return sizeAssignments;
}

/**
 * 找到基础泡泡大小（所有泡泡一样大时的最大尺寸）
 * 使用二分搜索
 */
function findBaseBubbleSize() {
  if (bubbles.length === 0) return 100;

  const minSize = 50;
  const maxSize = Math.min(containerWidth, containerHeight) / 2;

  let low = minSize;
  let high = maxSize;
  let bestSize = minSize;

  const maxIterations = 20;

  for (let i = 0; i < maxIterations && high - low > 1; i++) {
    const midSize = Math.floor((low + high) / 2);

    if (canAllBubblesFit(midSize)) {
      bestSize = midSize;
      low = midSize;
    } else {
      high = midSize;
    }
  }

  return bestSize;
}

/**
 * 检查给定尺寸是否可以放下所有泡泡（保守估计）
 */
function canAllBubblesFit(size) {
  const margin = size * 0.15;
  const padding = margin * 2;

  const availableWidth = containerWidth - padding * 2;
  const availableHeight = containerHeight - padding * 2;

  const colCount = Math.max(1, Math.floor(availableWidth / (size + margin)));
  const rowCount = Math.max(1, Math.floor(availableHeight / (size + margin)));

  const area = availableWidth * availableHeight;
  const bubbleArea = (size + margin) * (size + margin);
  const maxBubblesByArea = Math.floor(area / bubbleArea * 0.65); // 保守：65%

  const maxBubblesByGrid = rowCount * colCount;
  const maxBubbles = Math.min(maxBubblesByArea, maxBubblesByGrid);

  return maxBubbles >= bubbles.length;
}

/**
 * 获取泡泡背景色
 * 根据学生ID返回固定的渐变背景色
 */
function getBubbleBackgroundColor(studentId) {
  const colors = [
    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    'linear-gradient(135deg, #fa709a 0%, #fee140 100%)'
  ];

  return colors[studentId % colors.length];
}

/**
 * 标记学生为已完成
 * 等待泡泡消失动画完成后再重新排列
 * 动画顺序：先缩小0.4秒 → 再淡出0.2秒 → 然后移除并重新排列
 */
function markAsCompleted(studentId) {
  const student = students.find(s => s.id === studentId);
  if (!student || student.completed) return;

  student.completed = true;

  const bubbleData = bubbles.find(b => b.student.id === studentId);
  if (bubbleData) {
    // 添加移除动画类
    bubbleData.element.classList.add('removing');

    // 等待泡泡缩小并淡出动画完成
    // 动画时长：0.4s缩小 + 0.2s淡出 = 0.6s
    setTimeout(() => {
      bubbleData.element.remove();
      bubbles = bubbles.filter(b => b.student.id !== studentId);

      // 只有在这个泡泡的移除动画完全结束后才重新排列
      // 这样能确保用户看到完整的动画效果
      if (bubbles.length > 0) {
        console.log(`泡泡${student.name}已移除，开始重新排列${bubbles.length}个剩余泡泡...`);
        updateContainerSize();
        // 直接使用randomLayout，不经过redistributeBubbles（避免额外的标志检查）
        randomLayout();
      } else {
        console.log('所有泡泡已完成，无需重新排列');
      }
    }, 600); // 等待0.6秒动画完成（与CSS中的animation时间一致）

    // 立即更新统计信息（不等待动画）
    updateStats();
  }
}

/**
 * 重新分布所有泡泡（已废弃，直接使用randomLayout）
 * 原来的重排函数会导致重复调用和卡顿
 */
function redistributeBubbles() {
  if (bubbles.length === 0) return;

  console.log('开始重新排列泡泡...');
  // 直接使用randomLayout，它内部已经有优化
  randomLayout();
}


/**
 * 自适应布局算法（泡泡可以不同大小）
 * 核心目标：通过允许泡泡大小不同，进一步减少空白区域
 * 算法：计算基础大小 → 为每个泡泡分配大小 → 智能放置
 */
function randomLayout() {
  if (bubbles.length === 0) return;

  // 第1步：计算每个泡泡的大小（基于算法，泡泡大小可以不同）
  const bubbleSizes = calculateBubbleSizes();

  // 第2步：应用泡泡大小（每个泡泡可能不同）
  bubbleSizes.forEach(({ index, size }) => {
    const bubble = bubbles[index];
    bubble.size = size;

    const fontSize = Math.max(12, size / 4);

    bubble.element.style.transition = 'none';
    bubble.element.style.width = `${size}px`;
    bubble.element.style.height = `${size}px`;
    bubble.element.style.fontSize = `${fontSize}px`;

    setTimeout(() => {
      bubble.element.style.transition = 'left 0.6s cubic-bezier(0.4, 0, 0.2, 1), top 0.6s cubic-bezier(0.4, 0, 0.2, 1), transform 0.3s ease, box-shadow 0.3s ease, opacity 0.5s ease';
    }, 50);
  });

  console.log('泡泡大小已分配，开始智能布局...');

  // 第3步：智能放置泡泡（从大到小，优先放置大的）
  // 按大小排序，先放大的（大的更难放置）
  const sortedBySize = bubbleSizes.sort((a, b) => b.size - a.size);

  // 使用六边形密铺 + 随机调整 的混合方式
  // 六边形作为基础，然后随机微调填充小空隙
  placeBubblesIntelligently(sortedBySize);
}

/**
 * 智能放置泡泡（改进算法 - 使用requestAnimationFrame优化性能）
 * 关键点：批量动画 + 统一动画开始时间 + 增加尝试次数 + 更好的初始位置 + 分层放置
 */
function placeBubblesIntelligently(bubbleSizes) {
  const occupiedPositions = [];
  const maxAttempts = 300; // 增加尝试次数，提高成功率

  // 按泡泡大小排序，先放大泡泡（大的更难放置）
  const sortedBySize = [...bubbleSizes].sort((a, b) => b.size - a.size);

  // 使用网格系统作为初始参考（更均匀的分布）
  const baseSize = bubbleSizes.length > 0 ? bubbleSizes[Math.floor(bubbleSizes.length / 2)].size : 100;
  const margin = baseSize * 0.12; // 稍微减小间距（原来是15%）

  const padding = margin * 3; // 增加边距
  const availableWidth = containerWidth - padding * 2;
  const availableHeight = containerHeight - padding * 2;

  // 计算理想的网格位置（作为初始参考）
  const cols = Math.max(1, Math.floor(availableWidth / (baseSize + margin)));
  const rows = Math.max(1, Math.floor(availableHeight / (baseSize + margin)));

  console.log(`尝试${cols}x${rows}网格布局（${cols * rows}个位置）来放置${bubbleSizes.length}个泡泡`);

  // 为每个泡泡计算初始网格位置（偏移随机化）
  const gridPositions = [];
  for (let i = 0; i < rows && gridPositions.length < bubbleSizes.length; i++) {
    for (let j = 0; j < cols && gridPositions.length < bubbleSizes.length; j++) {
      // 添加随机偏移，避免过于整齐
      const offsetX = (Math.random() - 0.5) * baseSize * 0.4;
      const offsetY = (Math.random() - 0.5) * baseSize * 0.4;

      const x = padding + j * (baseSize + margin) + offsetX;
      const y = padding + i * (baseSize + margin) + offsetY;

      gridPositions.push({ x, y, gridX: j, gridY: i });
    }
  }

  // 收集所有需要设置的动画
  const animations = [];
  // 记录哪些泡泡正在移动，用于设置z-index
  const movingBubbleIds = new Set();

  // 将泡泡分配到最近的网格位置（但不完全依赖网格）
  // 每个泡泡在网格位置附近随机寻找合适位置
  for (let i = 0; i < sortedBySize.length; i++) {
    const { index: bubbleIndex, size } = sortedBySize[i];
    const { element } = bubbles[bubbleIndex];

    // 如果有网格位置，从网格位置开始
    const startPos = i < gridPositions.length
      ? gridPositions[i]
      : {
          x: padding + Math.random() * Math.max(0, containerWidth - size - padding * 2),
          y: padding + Math.random() * Math.max(0, containerHeight - size - padding * 2)
        };

    let finalX = startPos.x;
    let finalY = startPos.y;
    let foundPosition = false;

    // 在网格位置附近寻找合适位置
    for (let attempt = 0; attempt < maxAttempts && !foundPosition; attempt++) {
      let x, y;

      // 50%概率从网格位置开始，50%概率完全随机
      if (attempt < maxAttempts / 2 && i < gridPositions.length) {
        // 从网格位置开始，逐步扩大搜索范围
        const angle = Math.random() * 2 * Math.PI;
        const distance = Math.random() * baseSize * (attempt / maxAttempts * 2);
        x = startPos.x + Math.cos(angle) * distance;
        y = startPos.y + Math.sin(angle) * distance;
      } else {
        // 完全随机搜索
        x = padding + Math.random() * Math.max(0, containerWidth - size - padding * 2);
        y = padding + Math.random() * Math.max(0, containerHeight - size - padding * 2);
      }

      // 严格检查是否与已放置的泡泡重叠（考虑不同大小）
      let overlap = false;
      for (const pos of occupiedPositions) {
        const dx = x - pos.x;
        const dy = y - pos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // 严格的最小距离（考虑两个泡泡的半径）
        const minDistance = (size + pos.size) / 2 + margin;

        if (distance < minDistance) {
          overlap = true;
          break;
        }
      }

      if (!overlap) {
        finalX = x;
        finalY = y;
        foundPosition = true;
        occupiedPositions.push({ x, y, size });
      }
    }

    if (foundPosition) {
      // 确保在容器内
      finalX = Math.max(padding, Math.min(finalX, containerWidth - size - padding));
      finalY = Math.max(padding, Math.min(finalY, containerHeight - size - padding));

      // 记录这个泡泡正在移动
      movingBubbleIds.add(bubbleIndex);

      // 不是立即动画，而是添加到动画列表
      animations.push({ element, x: finalX, y: finalY, bubbleIndex });
    } else {
      console.warn(`无法为泡泡${i}找到合适位置，使用最终位置（可能重叠）`);
      // 确保在容器内
      finalX = Math.max(padding, Math.min(finalX, containerWidth - size - padding));
      finalY = Math.max(padding, Math.min(finalY, containerHeight - size - padding));
      animations.push({ element, x: finalX, y: finalY, bubbleIndex });
    }
  }

  console.log(`成功放置${occupiedPositions.length}个泡泡，成功率${(occupiedPositions.length / bubbleSizes.length * 100).toFixed(1)}%`);

  // 使用requestAnimationFrame批量执行所有动画，避免卡顿
  // 在所有计算完成后，一次性应用所有动画
  requestAnimationFrame(() => {
    // 先给所有要移动的泡泡添加moving类（提高z-index）
    animations.forEach(({ element }) => {
      element.classList.add('moving');
    });

    // 延迟一小段时间后执行动画，确保z-index已经生效
    setTimeout(() => {
      animations.forEach(({ element, x, y }) => {
        animateBubbleTo(element, x, y);
      });

      // 动画完成后，移除moving类，并重置状态
      setTimeout(() => {
        animations.forEach(({ element }) => {
          element.classList.remove('moving');
        });
        window.isRedistributing = false;
      }, 800); // 等待动画完成（0.8s）
    }, 50); // 小延迟确保样式应用
  });
}

/**
 * 六边形密铺布局（优先使用）
 * 这是最节省空间的布局方式，确保泡泡不太可能重叠
 */
function hexagonalPackingLayout() {
  if (bubbles.length === 0) return;

  const size = bubbles[0].size; // 所有泡泡大小相同
  const margin = size * 0.15; // 15%间距

  // 容器内边距
  const paddingTop = 60;
  const paddingLeft = 40;

  const occupiedPositions = [];

  // 计算每行可以放的泡泡数量
  const perRow = Math.max(1, Math.floor((containerWidth - paddingLeft * 2) / (size + margin)));

  // 使用六边形排列
  let index = 0;
  let row = 0;

  while (index < bubbles.length) {
    const rowHeight = (size + margin) * 0.866; // sqrt(3)/2
    const y = paddingTop + row * rowHeight;

    // 偶数行向右偏移（六边形特性）
    const offsetX = row % 2 * (size + margin) / 2;

    const bubblesInRow = Math.min(perRow, bubbles.length - index);
    const rowWidth = bubblesInRow * (size + margin) - margin;
    const startX = (containerWidth - rowWidth) / 2 + offsetX;

    for (let col = 0; col < bubblesInRow && index < bubbles.length; col++) {
      const bubble = bubbles[index];
      const x = startX + col * (size + margin);

      animateBubbleTo(bubble.element, x, y);
      occupiedPositions.push({ x, y });
      index++;
    }

    row++;
  }

  // 如果有剩余的泡泡无法放置，随机放置它们
  if (index < bubbles.length) {
    console.warn(`⚠️ 六边形密铺无法容纳${bubbles.length - index}个泡泡，改用随机放置`);
    randomPlacementForRemaining(occupiedPositions, index);
  }
}

/**
 * 为剩余无法放置的泡泡使用随机放置
 * @param {Array} occupiedPositions 已占用的位置
 * @param {number} startIndex 开始随机放置的索引
 */
function randomPlacementForRemaining(occupiedPositions, startIndex) {
  const size = bubbles[0].size;
  const margin = size * 0.15;
  const padding = margin * 2;

  for (let i = startIndex; i < bubbles.length; i++) {
    const bubble = bubbles[i];
    let finalX = 0;
    let finalY = 0;
    let foundPosition = false;

    for (let attempt = 0; attempt < 100 && !foundPosition; attempt++) {
      const x = padding + Math.random() * Math.max(0, containerWidth - size - padding * 2);
      const y = padding + Math.random() * Math.max(0, containerHeight - size - padding * 2);

      let overlap = false;
      for (const pos of occupiedPositions) {
        const distance = Math.sqrt(Math.pow(x - pos.x, 2) + Math.pow(y - pos.y, 2));
        if (distance < size + margin) {
          overlap = true;
          break;
        }
      }

      if (!overlap) {
        finalX = x;
        finalY = y;
        foundPosition = true;
        occupiedPositions.push({ x, y });
      }
    }

    if (foundPosition) {
      animateBubbleTo(bubble.element, finalX, finalY);
    } else {
      console.warn(`无法为泡泡 ${i} 找到合适位置`);
    }
  }
}


/**
 * 泡泡平滑动画
 */
function animateBubbleTo(element, x, y) {
  const duration = 800;
  const startTime = performance.now();

  const startX = parseFloat(element.style.left);
  const startY = parseFloat(element.style.top);

  function animate(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);

    // 使用缓动函数
    const easeProgress = 1 - Math.pow(1 - progress, 3);

    const currentX = startX + (x - startX) * easeProgress;
    const currentY = startY + (y - startY) * easeProgress;

    element.style.left = `${currentX}px`;
    element.style.top = `${currentY}px`;

    if (progress < 1) {
      requestAnimationFrame(animate);
    }
  }

  requestAnimationFrame(animate);
}

/**
 * 分布泡泡（初始布局）
 * 第一次布局时确保所有泡泡都有合理的大小和位置
 */
function distributeBubbles() {
  if (bubbles.length === 0) return;

  console.log(`开始初始布局，泡泡数量: ${bubbles.length}`);

  // 第一次布局时，确保容器大小是最新的
  updateContainerSize();

  // 延迟一下确保所有泡泡的DOM已经完全创建
  // 同时给用户一个看到泡泡出现的动画效果
  setTimeout(() => {
    console.log('执行初始布局算法...');
    // 使用randomLayout进行第一次布局
    // 它会计算合适的大小并放置泡泡
    randomLayout();
  }, 150);
}

/**
 * 更新统计信息
 */
function updateStats() {
  const total = students.length;
  const completed = students.filter(s => s.completed).length;
  const remaining = total - completed;

  totalCount.textContent = total;
  completedCount.textContent = completed;
  remainingCount.textContent = remaining;
}

/**
 * 清空输入框
 */
function clearInput() {
  studentNamesTextarea.value = '';
}

/**
 * 重置应用
 */
function resetApp() {
  if (bubbles.length > 0 && !confirm('确定要重置名单吗？当前进度将会丢失。')) {
    return;
  }

  // 重置数据
  students = [];
  bubbles = [];
  bubblesContainer.innerHTML = '';

  // 切换界面
  bubblesSection.style.display = 'none';
  inputSection.style.display = 'flex';

  // 清空输入框
  clearInput();

  // 重置统计信息
  totalCount.textContent = '0';
  completedCount.textContent = '0';
  remainingCount.textContent = '0';
}

// 添加测试功能：快速测试泡泡大小变化
// 在控制台输入 adjustWindowSize() 模拟窗口大小变化，触发泡泡重新排列
window.adjustWindowSize = function() {
  if (bubbles.length === 0) {
    console.log('请先创建一些泡泡！');
    return;
  }

  console.log('\n=== 手动触发泡泡重新排列 ===');
  updateContainerSize();
  redistributeBubbles();
};

// ============================================================================
// 泡泡大小计算算法说明（v2.2 - 性能优化版本）:
// ============================================================================
//
// 当前使用: 空间填充算法 + 泡泡大小动态分配 + requestAnimationFrame优化
//
// 核心目标: 通过允许泡泡大小不同，进一步减少空白区域
//
// 重要修复:
// 1. 使用requestAnimationFrame批量执行动画
//    - 避免多次DOM操作导致的卡顿
//    - 所有计算完成后，一次性应用所有动画
//
// 2. 优化调用链
//    - 点击泡泡后直接调用randomLayout
//    - 避免额外的标志检查和函数调用
//
// 3. 合理的动画管理
//    - 计算：同步完成（快速）
//    - 动画：requestAnimationFrame批量执行
//    - 完成后650ms重置状态
//
// 4. 泡泡初始大小设为100px（不是0）
//    - 避免第一次布局时大小为0导致计算错误
//
// 5. 一次性创建所有泡泡
//    - 避免错开创建导致布局时泡泡不全
//
// 6. 延迟300ms后再布局
//    - 确保DOM完全更新，容器大小稳定
//    - 给用户看到泡泡创建的动画
//
// 算法步骤:
// 1. 计算基础大小 (findBaseBubbleSize)
//    - 所有泡泡一样大时的最大可行尺寸
//    - 使用二分搜索找到基础大小
//
// 2. 动态分配大小 (calculateBubbleSizes)
//    - 在基础大小的基础上允许±10%浮动（已优化）
//    - 30%大泡泡，30%小泡泡，40%中等
//    - 大小混合减少空白
//
// 3. 智能放置 (placeBubblesIntelligently)
//    - 网格参考系统：先计算理想网格位置
//    - 分层搜索：前50%尝试在网格附近，后50%完全随机
//    - 300次尝试（已增加），确保找到合适位置
//
// ============================================================================
// 如何测试泡泡大小变化：
// ============================================================================
// 泡泡的大小会根据核心因素动态调整：泡泡数量和屏幕空间
//
// 测试方法1：首次创建
//    - 输入5-10个学生姓名，点击生成
//    - 观察第一次布局效果
//
// 测试方法2：标记泡泡完成（重点测试，检查卡顿）
//    - 快速连续点击多个泡泡
//    - 观察是否有卡顿
//    - 每次点击后等待600ms动画完成
//
// 测试方法3：改变窗口大小
//    - 拖动窗口边缘改变大小
//    - 停止拖动后300ms自动重排
//    - 无闪烁，平滑过渡
//
// 性能优化:
//    - 使用requestAnimationFrame批量动画
//    - 减少DOM操作次数
//    - 简化调用链，避免重复计算
//    - 动画流畅，无卡顿
// ============================================================================

// 应用初始化
document.addEventListener('DOMContentLoaded', init);

// 在HTML中添加一个测试按钮，查看当前泡泡的大小（可选）
// 在控制台输入 testBubbleSizes() 查看当前所有泡泡的大小信息
window.testBubbleSizes = function() {
  console.log('\n=== 泡泡大小信息 ===');
  bubbles.forEach(bubble => {
    const baseNameSize = calculateBubbleSize(bubble.student.name);
    const currentSize = bubble.size;
    const width = bubble.element.style.width;
    const height = bubble.element.style.height;

    console.log(`学生: ${bubble.student.name}`);
    console.log(`  - 根据姓名计算的大小: ${baseNameSize}px`);
    console.log(`  - 当前大小: ${currentSize}px`);
    console.log(`  - DOM width: ${width}, height: ${height}`);
    console.log(`  - 比例: ${(currentSize / baseNameSize * 100).toFixed(1)}%`);
    console.log('');
  });
};
