const { ipcRenderer } = require('electron');

// 存储学生数据
let students = [];
let bubbles = [];

/**
 * 获取当前学生数据
 */
function getStudents() {
  return students;
}

/**
 * 获取当前泡泡数据
 */
function getBubbles() {
  return bubbles;
}

/**
 * 获取泡泡容器大小
 */
function getContainerSize() {
  return {
    width: window.containerWidth || 0,
    height: window.containerHeight || 0
  };
}

/**
 * 生成泡泡
 * @param {HTMLTextAreaElement} textarea - 学生姓名输入框
 * @param {HTMLElement} container - 泡泡容器
 * @returns {Promise<boolean>} - 是否成功生成
 */
function generateBubbles(studentNamesTextarea, bubblesContainer) {
  const names = studentNamesTextarea.value.trim();
  if (!names) {
    alert('请输入学生姓名！');
    return Promise.resolve(false);
  }

  // 解析学生姓名
  const nameArray = names
    .split('\n')
    .map(name => name.trim())
    .filter(name => name.length > 0);

  if (nameArray.length === 0) {
    alert('请至少输入一个有效的学生姓名！');
    return Promise.resolve(false);
  }

  // 初始化学生数据
  students = nameArray.map((name, index) => ({
    id: index,
    name: name,
    completed: false,
    element: null
  }));

  // 清空容器
  bubblesContainer.innerHTML = '';
  bubbles = [];

  // 创建所有泡泡
  students.forEach((student) => {
    createBubble(student, bubblesContainer);
  });

  return Promise.resolve(true);
}

/**
 * 创建单 bubbles元素
 * @param {Object} student - 学生数据对象
 * @param {HTMLElement} container - 泡泡容器
 * @param {Function} onClick - 点击回调函数
 * @param {number} containerWidth - 容器宽度
 * @param {number} containerHeight - 容器高度
 */
function createBubble(student, container, onClick, containerWidth = 0, containerHeight = 0) {
  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  bubble.textContent = student.name;
  bubble.dataset.studentId = student.id;

  // 设置初始大小
  const initialSize = 100;
  bubble.style.width = `${initialSize}px`;
  bubble.style.height = `${initialSize}px`;
  bubble.style.fontSize = '20px';

  // 设置背景色
  bubble.style.background = getBubbleBackgroundColor(student.id);

  // 添加点击事件（如果提供了回调函数）
  if (onClick && typeof onClick === 'function') {
    bubble.addEventListener('click', () => {
      onClick(student.id);
    });
  }

  // 初始位置（从中心开始）
  bubble.style.left = `${(containerWidth || window.innerWidth) / 2 - initialSize / 2}px`;
  bubble.style.top = `${(containerHeight || window.innerHeight) / 2 - initialSize / 2}px`;
  bubble.style.opacity = '0';

  container.appendChild(bubble);
  student.element = bubble;
  bubbles.push({ student, element: bubble, size: initialSize });

  // 淡入动画
  setTimeout(() => {
    bubble.style.opacity = '1';
  }, 100);
}

/**
 * 生成泡泡
 * @param {HTMLTextAreaElement} textarea - 学生姓名输入框
 * @param {HTMLElement} container - 泡泡容器
 * @param {Function} onBubbleClick - 泡泡点击回调函数
 * @returns {Promise<boolean>} - 是否成功生成
 */
function generateBubbles(studentNamesTextarea, bubblesContainer, onBubbleClick) {
  const names = studentNamesTextarea.value.trim();
  if (!names) {
    alert('请输入学生姓名！');
    return Promise.resolve(false);
  }

  // 解析学生姓名
  const nameArray = names
    .split('\n')
    .map(name => name.trim())
    .filter(name => name.length > 0);

  if (nameArray.length === 0) {
    alert('请至少输入一个有效的学生姓名！');
    return Promise.resolve(false);
  }

  // 初始化学生数据
  students = nameArray.map((name, index) => ({
    id: index,
    name: name,
    completed: false,
    element: null
  }));

  // 清空容器
  bubblesContainer.innerHTML = '';
  bubbles = [];

  // 创建所有泡泡
  students.forEach((student) => {
    createBubble(student, bubblesContainer, onBubbleClick);
  });

  return Promise.resolve(true);
}

/**
 * 计算并分配每 bubbles sizes
 * 根据space-filling算法，动态分配大小以最大化填充率
 * @returns {Array} 每 bubbles的推荐大小
 */
function calculateBubbleSizes(containerWidth, containerHeight) {
  if (bubbles.length === 0) return [];

  // 计算基础大小
  const baseSize = findBaseBubbleSize(containerWidth, containerHeight);
  console.log(`Base bubble size: ${baseSize}px (maximum size when all bubbles are equal)`);

  // 减少浮动范围到±10%
  const sizeVariation = 0.1;
  const minSize = Math.max(40, baseSize * (1 - sizeVariation));
  const maxSize = baseSize * (1 + sizeVariation);

  // 随机打乱泡泡顺序
  const shuffledIndices = bubbles.map((_, i) => i);
  for (let i = shuffledIndices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledIndices[i], shuffledIndices[j]] = [shuffledIndices[j], shuffledIndices[i]];
  }

  console.log(`Bubble size range: ${minSize.toFixed(0)}px - ${maxSize.toFixed(0)}px`);
  console.log(`Size variation range: ±${(sizeVariation * 100).toFixed(0)}%`);

  // 为每 bubbles分配大小
  const sizeAssignments = [];
  const bigCount = Math.floor(bubbles.length * 0.3);
  const smallCount = Math.floor(bubbles.length * 0.3);
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

  // 分配正常尺寸
  for (let i = 0; i < normalCount; i++) {
    const idx = shuffledIndices[bigCount + smallCount + i];
    const t = 0.3 + Math.random() * 0.7;
    const size = Math.round(minSize + (maxSize - minSize) * t);
    sizeAssignments.push({ index: idx, size });
  }

  sizeAssignments.forEach(({ index, size }) => {
    console.log(`Bubble ${bubbles[index].student.name}: Assigned size=${size}px (base=${baseSize}px)`);
  });

  return sizeAssignments;
}

/**
 * 找到基础泡泡大小（所有泡泡一样大时的最大尺寸）
 * 使用二分搜索
 */
function findBaseBubbleSize(containerWidth, containerHeight) {
  if (bubbles.length === 0) return 100;

  const minSize = 50;
  const maxSize = Math.min(containerWidth || window.innerWidth, containerHeight || window.innerHeight) / 2;

  let low = minSize;
  let high = maxSize;
  let bestSize = minSize;

  const maxIterations = 20;

  for (let i = 0; i < maxIterations && high - low > 1; i++) {
    const midSize = Math.floor((low + high) / 2);

    if (canAllBubblesFit(midSize, containerWidth, containerHeight)) {
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
function canAllBubblesFit(size, containerWidth, containerHeight) {
  const margin = size * 0.15;
  const padding = margin * 2;

  const availableWidth = containerWidth - padding * 2;
  const availableHeight = containerHeight - padding * 2;

  const colCount = Math.max(1, Math.floor(availableWidth / (size + margin)));
  const rowCount = Math.max(1, Math.floor(availableHeight / (size + margin)));

  const area = availableWidth * availableHeight;
  const bubbleArea = (size + margin) * (size + margin);
  const maxBubblesByArea = Math.floor(area / bubbleArea * 0.65);

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
 * 根据学生ID移除泡泡
 * @param {number} studentId - 学生ID
 * @returns {boolean} - 是否成功移除
 */
function removeBubble(studentId) {
  const index = bubbles.findIndex(b => b.student.id === studentId);
  if (index === -1) return false;

  const bubble = bubbles[index];
  bubble.element.remove();
  bubbles.splice(index, 1);

  // 更新学生完成状态
  const student = students.find(s => s.id === studentId);
  if (student) {
    student.completed = true;
  }

  return true;
}

/**
 * 重置泡泡数据
 */
function resetBubbles() {
  students = [];
  bubbles = [];
}

// 全局导出
window.BubbleGeneratorModule = {
  students: () => students,
  bubbles: () => bubbles,
  getContainerSize,
  generateBubbles,
  createBubble,
  calculateBubbleSizes,
  findBaseBubbleSize,
  canAllBubblesFit,
  getBubbleBackgroundColor,
  removeBubble,
  resetBubbles,
  setStudents: (data) => { students = data; },
  setBubbles: (data) => { bubbles = data; },
  setContainerSize: (width, height) => {
    window.containerWidth = width;
    window.containerHeight = height;
  }
};
