/**
 * 通用工具模块
 * 包含各种辅助函数和配置
 */

/**
 * 更新统计信息
 * @param {Array} students - 学生数组
 * @param {Object} statElements - 显示元素对象
 */
function updateStats(students, statElements) {
  const total = students.length;
  const completed = students.filter(s => s.completed).length;
  const remaining = total - completed;

  statElements.totalCount.textContent = total;
  statElements.completedCount.textContent = completed;
  statElements.remainingCount.textContent = remaining;
}

/**
 * 清空输入框
 * @param {HTMLTextAreaElement} textarea - 要清空的输入框
 */
function clearInput(textarea) {
  if (textarea) {
    textarea.value = '';
  }
}

/**
 * 计算容器大小
 * @param {HTMLElement} container - 容器元素
 * @returns {Object} 容器尺寸对象{width, height}
 */
function updateContainerSize(container) {
  if (!container) {
    console.error('容器元素不存在');
    return { width: 0, height: 0 };
  }

  const rect = container.getBoundingClientRect();

  // 存储到全局变量
  if (typeof window !== 'undefined') {
    window.containerWidth = rect.width;
    window.containerHeight = rect.height;
  }

  return {
    width: rect.width,
    height: rect.height
  };
}

/**
 * 防抖函数
 * @param {Function} func - 要防抖的函数
 * @param {number} wait - 等待时间(毫秒)
 * @returns {Function} 防抖后的函数
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * 节流函数
 * @param {Function} func - 要节流的函数
 * @param {number} limit - 时间限制(毫秒)
 * @returns {Function} 节流后的函数
 */
function throttle(func, limit) {
  let inThrottle;
  return function() {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * 检查是否所有学生都already completed
 * @param {Array} students - 学生数组
 * @returns {boolean} 是否全部完成
 */
function allStudentsCompleted(students) {
  if (!students || students.length === 0) return false;
  return students.every(s => s.completed);
}

/**
 * 获取完成百分比
 * @param {Array} students - 学生数组
 * @returns {number} 完成百分比(0-100)
 */
function getCompletionPercentage(students) {
  if (!students || students.length === 0) return 0;
  const completed = students.filter(s => s.completed).length;
  return (completed / students.length * 100).toFixed(1);
}

/**
 * 格式化学生姓名（移除空白字符）
 * @param {string} name - 学生姓名
 * @returns {string} 格式化后的姓名
 */
function formatStudentName(name) {
  if (!name) return '';
  return name.trim().replace(/\s+/g, ' ');
}

/**
 * 验证学生姓名列表
 * @param {string} namesText - 姓名文本
 * @returns {Object} 验证结果{isValid, names, error}
 */
function validateStudentNames(namesText) {
  const names = namesText
    .split('\n')
    .map(name => formatStudentName(name))
    .filter(name => name.length > 0);

  if (names.length === 0) {
    return {
      isValid: false,
      names: [],
      error: '请输入至少一个有效的学生姓名！'
    };
  }

  // 检查重复
  const uniqueNames = new Set(names);
  if (uniqueNames.size !== names.length) {
    return {
      isValid: false,
      names: [],
      error: '检测到重复的学生姓名！'
    };
  }

  return {
    isValid: true,
    names: names,
    error: null
  };
}

/**
 * 重置应用状态
 * @param {Object} elements - DOM元素对象
 * @param {Object} bubbleModule - 泡泡管理模块
 */
function resetApp(elements, bubbleModule, animationModule) {
  if (!elements || !bubbleModule || !animationModule) {
    console.error('缺少必要的参数');
    return Promise.resolve(false);
  }

  const { bubblesSection, inputSection, studentNamesTextarea, statElements } = elements;
  const { resetBubbles, bubbles } = bubbleModule;

  if (bubbles().length > 0) {
    const confirmed = confirm('确定要重置名单吗？当前进度将会丢失。');
    if (!confirmed) {
      return Promise.resolve(false);
    }
  }

  // 重置数据
  resetBubbles();

  // 清空容器
  if (elements.bubblesContainer) {
    elements.bubblesContainer.innerHTML = '';
  }

  // 切换界面
  if (bubblesSection && inputSection) {
    bubblesSection.style.display = 'none';
    inputSection.style.display = 'flex';
  }

  // 清空输入框
  if (studentNamesTextarea) {
    studentNamesTextarea.value = '';
  }

  // 重置统计信息
  if (statElements) {
    statElements.totalCount.textContent = '0';
    statElements.completedCount.textContent = '0';
    statElements.remainingCount.textContent = '0';
  }

  console.log('Application has been reset');
  return Promise.resolve(true);
}

/**
 * 导出当前学生数据（用于备份或传输）
 * @param {Array} students - 学生数组
 * @returns {string} JSON格式的数据
 */
function exportStudentData(students) {
  if (!students || students.length === 0) return null;

  const exportData = {
    timestamp: new Date().toISOString(),
    total: students.length,
    completed: students.filter(s => s.completed).length,
    students: students.map(s => ({
      name: s.name,
      completed: s.completed
    }))
  };

  return JSON.stringify(exportData, null, 2);
}

// 全局导出
window.UtilsModule = {
  updateStats,
  clearInput,
  updateContainerSize,
  debounce,
  throttle,
  allStudentsCompleted,
  getCompletionPercentage,
  formatStudentName,
  validateStudentNames,
  resetApp,
  exportStudentData
};
