/**
 * 动画控制模块
 * 集中管理所有动画相关的逻辑和性能优化
 */

/**
 * 泡泡平滑动画
 * @param {HTMLElement} element - 要移动的DOM元素
 * @param {number} x - 目标X坐标
 * @param {number} y - 目标Y坐标
 * @param {Function} onComplete - 动画完成回调
 * @returns {Promise<void>} 动画完成的Promise
 */
function animateBubbleTo(element, x, y, onComplete) {
  const duration = 800;
  const startTime = performance.now();

  const startX = parseFloat(element.style.left) || 0;
  const startY = parseFloat(element.style.top) || 0;

  return new Promise((resolve) => {
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
      } else {
        onComplete && onComplete();
        resolve();
      }
    }

    requestAnimationFrame(animate);
  });
}

/**
 * 批量动画执行
 * @param {Array} animations - 动画数组，包含{element, x, y}
 * @param {Function} onAllComplete - 所有动画完成回调
 * @returns {Promise<void>}
 */
function batchAnimate(animations, onAllComplete) {
  if (!animations || animations.length === 0) {
    onAllComplete && onAllComplete();
    return Promise.resolve();
  }

  const promises = animations.map(({ element, x, y }) => {
    return new Promise((resolve) => {
      // 先添加moving类
      if (element) {
        element.classList.add('moving');
      }

      // 延迟执行动画，确保Z-index生效
      setTimeout(() => {
        animateBubbleTo(element, x, y, resolve);
      }, 50);
    });
  });

  return Promise.all(promises).then(() => {
    // 动画完成后，移除moving类
    animations.forEach(({ element }) => {
      if (element) {
        setTimeout(() => {
          element.classList.remove('moving');
        }, 100);
      }
    });

    onAllComplete && onAllComplete();
  });
}

/**
 * 标记学生为已完成（带动画）
 * @param {number} studentId - 学生ID
 * @param {Array} bubbles - 泡泡数据数组
 * @param {Function} onAnimationComplete - 动画完成回调
 * @param {Function} onBubbleRemoved - 泡泡移除回调
 */
function markAsCompleted(studentId, bubbles, onAnimationComplete, onBubbleRemoved) {
  const bubbleData = bubbles.find(b => b.student.id === studentId);
  if (!bubbleData) {
    console.error(`未找到ID为${studentId}的泡泡`);
    return;
  }

  if (bubbleData.student.completed) {
    console.warn(`学生${bubbleData.student.name}已经完成`);
    return;
  }

  // 更新学生状态
  bubbleData.student.completed = true;

  // 添加移除动画类
  bubbleData.element.classList.add('removing');

  console.log(`开始执行学生${bubbleData.student.name}的移除动画...`);

  // 等待泡泡缩小并淡出动画完成（0.6s）
  setTimeout(() => {
    bubbleData.element.remove();

    // 调用回调
    onBubbleRemoved && onBubbleRemoved(studentId);

    // 只有在这个泡泡的移除动画完全结束后才重新排列
    if (bubbles.length > 0) {
      console.log(`泡泡${bubbleData.student.name}已移除，开始重新排列${bubbles.length}个剩余泡泡...`);
      onAnimationComplete && onAnimationComplete(studentId);
    } else {
      console.log('所有泡泡已完成，无需重新排列');
    }
  }, 600); // 与CSS中的animation时间一致
}

/**
 * 应用批量动画（使用requestAnimationFrame优化）
 * 关键点：批量动画 + 统一动画开始时间 + 性能优化 + 流畅的动画曲线
 */
function applyBatchAnimations(animations, movingBubbleIds, onComplete) {
  if (!animations || animations.length === 0) {
    onComplete && onComplete();
    return;
  }

  const nonNullAnimations = animations.filter(a => a.element);

  console.log(`准备执行${nonNullAnimations.length}个泡泡的批量动画...`);

  // 使用requestAnimationFrame批量执行所有动画，避免卡顿
  requestAnimationFrame(() => {
    // 先给所有要移动的泡泡添加moving类（提高z-index）和animating类（启用平滑动画）
    nonNullAnimations.forEach(({ element }) => {
      if (element) {
        element.classList.add('moving', 'animating');
      }
    });

    // 延迟一小段时间后应用位置变化，确保动画类已生效
    setTimeout(() => {
      // 直接设置位置，CSS动画会自动过渡
      nonNullAnimations.forEach(({ element, x, y }) => {
        if (element) {
          element.style.left = `${x}px`;
          element.style.top = `${y}px`;
        }
      });

      // 动画结束后清理
      setTimeout(() => {
        nonNullAnimations.forEach(({ element }) => {
          if (element) {
            element.classList.remove('moving', 'animating');
          }
        });
        window.isRedistributing = false;
        onComplete && onComplete();
      }, 1300); // 比动画时长略长，确保动画完成
    }, 50);
  });
}

/**
 * 淡入动画
 * @param {HTMLElement} element - 要淡入的元素
 * @param {number} duration - 动画时长
 * @param {Function} onComplete - 完成回调
 */
function fadeIn(element, duration = 300, onComplete) {
  if (!element) return;

  element.style.opacity = '0';
  const startTime = performance.now();

  function animate(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);

    element.style.opacity = progress.toString();

    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      onComplete && onComplete();
    }
  }

  requestAnimationFrame(animate);
}

/**
 * 淡出动画
 * @param {HTMLElement} element - 要淡出的元素
 * @param {number} duration - 动画时长
 * @param {Function} onComplete - 完成回调
 */
function fadeOut(element, duration = 300, onComplete) {
  if (!element) return;

  const startTime = performance.now();

  function animate(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);

    element.style.opacity = (1 - progress).toString();

    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      onComplete && onComplete();
    }
  }

  requestAnimationFrame(animate);
}

/**
 * 缩放动画（用于移除泡泡）
 * @param {HTMLElement} element - 要缩放的元素
 * @param {number} duration - 动画时长
 * @param {Function} onComplete - 完成回调
 */
function scaleToZero(element, duration = 400, onComplete) {
  if (!element) return;

  element.style.transformOrigin = 'center center';
  const startTime = performance.now();

  function animate(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);

    const scale = 1 - progress;
    element.style.transform = `scale(${scale})`;

    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      onComplete && onComplete();
    }
  }

  requestAnimationFrame(animate);
}

// 全局导出
window.AnimationModule = {
  animateBubbleTo,
  batchAnimate,
  markAsCompleted,
  applyBatchAnimations,
  fadeIn,
  fadeOut,
  scaleToZero
};
