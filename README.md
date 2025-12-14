# 🎈 班级任务统计助手

班级任务统计助手适用于统计班级学习任务完成情况的软件，可以统计并直观地展示未完成某一任务的同学

![Electron](https://img.shields.io/badge/Electron-47848F?style=for-the-badge&logo=electron&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)

## 🚀 快速开始

### 环境要求

- [Node.js](https://nodejs.org/) 14.0 或更高版本
- Windows、macOS 或 Linux 操作系统

### 安装步骤

```bash
# 克隆项目
git clone <repository-url>
cd class-task-tracker

# 安装依赖
npm install

# 启动应用
npm start

# 开发模式（自动打开开发者工具）
npm run dev
```

## 📖 使用教程

### 1️⃣ 录入学生名单

启动应用后，在输入界面：

1. 在文本框中输入学生姓名
2. **每行一个姓名**（支持中文和英文）
3. 点击"生成泡泡"按钮
4. 等待泡泡生成并自动排列

💡 **提示**：可以一次性输入所有学生姓名，系统会自动处理。

### 2️⃣ 标记完成状态

泡泡生成后：

1. 彩色泡泡随机分布在窗口中
2. **点击任意泡泡**表示该学生已完成任务
3. 泡泡会播放消失动画（缩放+淡出）
4. 其他泡泡自动重新排列，填补空位

🎬 **动画效果**：
- 点击：泡泡缩小并淡出（0.6秒）
- 重排：剩余泡泡平滑移动到新位置（0.8秒）
- 过渡：使用贝塞尔曲线，动画流畅自然

### 3️⃣ 查看实时统计

顶部统计栏显示：

- **总人数**：当前班级学生总数
- **已完成**：已点击完成的泡泡数量
- **未完成**：剩余需要完成的学生数量

📊 **数据实时更新**，无需手动刷新。

### 4️⃣ 重新开始

点击"重置名单"按钮：

- 清空当前所有数据
- 返回输入界面
- 可以录入新的学生名单

⚠️ 重置前会弹出确认对话框，防止误操作。


## 开发环境搭建

```bash
# Fork 项目并克隆
git clone https://github.com/your-username/class-task-tracker.git
cd class-task-tracker

# 安装依赖
npm install

# 开发模式运行
npm run dev
```
