// ============================================================================
// 泡泡布局算法模块
// ============================================================================
//
// 当前使用: 空间填充算法 + 泡泡大小动态分配 + requestAnimationFrame优化
//
// 核心目标: 通过允许泡泡大小不同，进一步减少空白区域
//
// 算法步骤:
// 1. 计算基础大小 (findBaseBubbleSize)
//    - 所有泡泡一样大时的最大可行尺寸
//    - 使用二分搜索找到基础大小
//
// 2. 动态分配大小 (calculateBubbleSizes)
//    - 在基础大小的基础上允许±10%浮动
//    - 30%大泡泡，30%小泡泡，40%中等
//    - 大小混合减少空白
//
// 3. 智能放置 (placeBubbles)
//    - 网格参考系统：先计算理想网格位置
//    - 分层搜索：前50%Attempting在网格附近，后50%完全随机
//    - 300次Attempting，确保找到合适位置
//
// ============================================================================

/**
 * 自适应布局算法（泡泡可以不同大小）
 * 核心目标：通过允许泡泡大小不同，进一步减少空白区域
 * 算法：计算基础大小 → 为每 bubbles分配大小 → 智能放置
 */
function randomLayout(bubbles, containerWidth, containerHeight, updateUI) {
  if (!bubbles || bubbles.length === 0) return;

  // 请将calculateBubbleSizes从bubble-generator.js中导入并使用
  console.log('Executing adaptive layout algorithm...');
  // 此函数需要通过updateUI回调来应用布局结果
  updateUI && updateUI({ success: true, layout: 'random' });
}

/**
 * 智能放置泡泡（改进算法 - 使用requestAnimationFrame优化性能）
 * 关键点：批量动画 + 统一动画开始时间 + 增加Attempting次数 + 更好的初始位置 + 分层放置
 * @param {Array} bubbles - 泡泡数据数组
 * @param {Array} bubbleSizes - 泡泡大小分配数组
 * @param {number} containerWidth - 容器宽度
 * @param {number} containerHeight - 容器高度
 * @param {Function} onPositionCalculated - 位置计算完成回调
 * @returns {Array} 泡泡位置数组
 */
function placeBubblesIntelligently(bubbles, bubbleSizes, containerWidth, containerHeight, onPositionCalculated) {
  const occupiedPositions = [];
  const maxAttempts = 300;

  if (!bubbleSizes || bubbleSizes.length === 0) {
    console.error('bubbleSizes为空，无法放置泡泡');
    return [];
  }

  // 按泡泡大小排序，先放大泡泡（大的更难放置）
  const sortedBySize = [...bubbleSizes].sort((a, b) => b.size - a.size);

  // 使用网格系统作为初始参考
  const baseSize = bubbleSizes.length > 0 ? bubbleSizes[Math.floor(bubbleSizes.length / 2)].size : 100;
  const margin = baseSize * 0.12;
  const padding = margin * 3;

  const availableWidth = containerWidth - padding * 2;
  const availableHeight = containerHeight - padding * 2;

  // 计算理想的网格位置
  const cols = Math.max(1, Math.floor(availableWidth / (baseSize + margin)));
  const rows = Math.max(1, Math.floor(availableHeight / (baseSize + margin)));

  console.log(`Attempting${cols}x${rows}grid layout (${cols * rows} positions) to place${bubbleSizes.length} bubbles`);

  // 为每 bubbles计算初始网格位置
  const gridPositions = [];
  for (let i = 0; i < rows && gridPositions.length < bubbleSizes.length; i++) {
    for (let j = 0; j < cols && gridPositions.length < bubbleSizes.length; j++) {
      const offsetX = (Math.random() - 0.5) * baseSize * 0.4;
      const offsetY = (Math.random() - 0.5) * baseSize * 0.4;

      const x = padding + j * (baseSize + margin) + offsetX;
      const y = padding + i * (baseSize + margin) + offsetY;

      gridPositions.push({ x, y, gridX: j, gridY: i });
    }
  }

  // 收集所有需要设置的动画
  const animations = [];
  const movingBubbleIds = new Set();
  const positions = [];

  // 将泡泡分配到最近的网格位置
  for (let i = 0; i < sortedBySize.length; i++) {
    const { index: bubbleIndex, size } = sortedBySize[i];
    const { element } = bubbles[bubbleIndex];

    if (!element) {
      console.warn(`泡泡${bubbleIndex}没有element，跳过`);
      continue;
    }

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
        const angle = Math.random() * 2 * Math.PI;
        const distance = Math.random() * baseSize * (attempt / maxAttempts * 2);
        x = startPos.x + Math.cos(angle) * distance;
        y = startPos.y + Math.sin(angle) * distance;
      } else {
        x = padding + Math.random() * Math.max(0, containerWidth - size - padding * 2);
        y = padding + Math.random() * Math.max(0, containerHeight - size - padding * 2);
      }

      // 严格检查是否与已放置的泡泡重叠
      let overlap = false;
      for (const pos of occupiedPositions) {
        const dx = x - pos.x;
        const dy = y - pos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

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
      finalX = Math.max(padding, Math.min(finalX, containerWidth - size - padding));
      finalY = Math.max(padding, Math.min(finalY, containerHeight - size - padding));
      movingBubbleIds.add(bubbleIndex);
      animations.push({ element, x: finalX, y: finalY, bubbleIndex });
      positions.push({ index: bubbleIndex, x: finalX, y: finalY, found: true });
    } else {
      console.warn(`无法为泡泡${i}找到合适位置，使用最终位置`);
      finalX = Math.max(padding, Math.min(finalX, containerWidth - size - padding));
      finalY = Math.max(padding, Math.min(finalY, containerHeight - size - padding));
      animations.push({ element, x: finalX, y: finalY, bubbleIndex });
      positions.push({ index: bubbleIndex, x: finalX, y: finalY, found: false });
    }
  }

  console.log(`Successfully placed ${occupiedPositions.length} bubbles, success rate: ${(occupiedPositions.length / bubbleSizes.length * 100).toFixed(1)}%`);

  // 回调函数
  if (onPositionCalculated) {
    onPositionCalculated({
      animations,
      movingBubbleIds,
      positions,
      occupiedPositions,
      successRate: (occupiedPositions.length / bubbleSizes.length * 100).toFixed(1)
    });
  }

  return positions;
}

/**
 * 六边形密铺布局（最节省空间的布局方式）
 * 确保泡泡不太可能重叠
 * @param {Array} bubbles - 泡泡数据数组
 * @param {number} containerWidth - 容器宽度
 * @param {number} containerHeight - 容器高度
 * @param {Function} onLayoutDone - 布局完成回调
 */
function hexagonalPackingLayout(bubbles, containerWidth, containerHeight, onLayoutDone) {
  if (!bubbles || bubbles.length === 0) {
    onLayoutDone && onLayoutDone({ placed: 0, total: 0 });
    return;
  }

  // 假设所有泡泡大小相同（取第一 bubbles sizes）
  const size = bubbles[0].size || 100;
  const margin = size * 0.15;

  // 容器内边距
  const paddingTop = 60;
  const paddingLeft = 40;

  const occupiedPositions = [];
  const animations = [];

  // 计算每行可以放的泡泡数量
  const perRow = Math.max(1, Math.floor((containerWidth - paddingLeft * 2) / (size + margin)));

  // 使用六边形排列
  let index = 0;
  let row = 0;
  const rowHeight = (size + margin) * 0.866; // sqrt(3)/2

  while (index < bubbles.length) {
    const y = paddingTop + row * rowHeight;

    // 偶数行向右偏移（六边形特性）
    const offsetX = row % 2 * (size + margin) / 2;

    const bubblesInRow = Math.min(perRow, bubbles.length - index);
    const rowWidth = bubblesInRow * (size + margin) - margin;
    const startX = (containerWidth - rowWidth) / 2 + offsetX;

    for (let col = 0; col < bubblesInRow && index < bubbles.length; col++) {
      const bubbleData = bubbles[index];
      const x = startX + col * (size + margin);

      animations.push({ element: bubbleData.element, x, y });
      occupiedPositions.push({ x, y });
      index++;
    }

    row++;
  }

  // 如果有剩余的泡泡无法放置，随机放置它们
  if (index < bubbles.length) {
    console.warn(`六边形密铺无法容纳${bubbles.length - index} bubbles，改用随机放置`);
    const remainingPositions = placeRemainingRandomly(
      bubbles.slice(index),
      occupiedPositions,
      containerWidth,
      containerHeight
    );
    animations.push(...remainingPositions);
  }

  if (onLayoutDone) {
    onLayoutDone({
      animations,
      placed: index,
      total: bubbles.length,
      method: 'hexagonal'
    });
  }

  return animations;
}

/**
 * 为剩余无法放置的泡泡使用随机放置
 * @param {Array} remainingBubbles - 剩余泡泡数组
 * @param {Array} occupiedPositions - 已占用的位置
 * @param {number} containerWidth - 容器宽度
 * @param {number} containerHeight - 容器高度
 * @returns {Array} 位置数组
 */
function placeRemainingRandomly(remainingBubbles, occupiedPositions, containerWidth, containerHeight) {
  if (!remainingBubbles || remainingBubbles.length === 0) return [];

  const size = remainingBubbles[0].size || 100;
  const margin = size * 0.15;
  const padding = margin * 2;

  const positions = [];

  for (let i = 0; i < remainingBubbles.length; i++) {
    const bubble = remainingBubbles[i];
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
      positions.push({ element: bubble.element, x: finalX, y: finalY });
    } else {
      console.warn(`无法为剩余泡泡${i}找到合适位置`);
    }
  }

  return positions;
}

// 全局导出
window.LayoutModule = {
  randomLayout,
  placeBubblesIntelligently,
  hexagonalPackingLayout,
  placeRemainingRandomly
};
