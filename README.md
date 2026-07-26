# Pinyin Pal

Pinyin Pal 是一个面向中文初学者的浏览器端拼音学习工具。项目以单个 HTML 文件运行，包含拼音课程、听读、书写练习、测验、句子跟读和中国文化故事等内容，无需安装依赖或启动后端服务器。

## 快速开始

1. 使用 Microsoft Edge 或 Google Chrome 打开 `第三版.html`。
2. 首次使用录音功能时，允许浏览器访问麦克风。
3. 建议保持网络连接，以便加载在线字体、`pinyin-pro` 以及浏览器语音识别服务。

也可以把 `第三版.html` 放到静态网站服务器中直接发布。

## 主要功能

- 声母课程：3 个章节，覆盖 `b p m f` 到 `zh ch sh r z c s y w`。
- 韵母课程：3 个章节，包含单韵母、复韵母和鼻韵母。
- 声调规则：标调规则演示及配套测验。
- 整体认读音节：覆盖 `zhi chi shi ri`、`yi wu yu` 等内容。
- 句子练习：15 句带拼音的中文句子，支持逐词点读和整段朗读。
- 故事阅读：传统节日、二十四节气等中国文化故事，配有拼音、英文和插图。
- 书写练习：支持描写、笔顺模板演示和手写检查。
- 章节测验：包含听音选择、看拼音认读、书写和标调等题型。
- 跟读评分：句子和故事页面支持录音、语音识别、回放及自动评分。

## 跟读评分

句子页面的评分目标是当前句子单元显示的完整文本；故事页面的评分目标是当前页故事原文。

评分前会自动去除标点和空格，然后使用莱文斯坦编辑距离比较目标文本与识别文本：

- `correct`：文本完全一致。
- `close`：差异比例不超过 20%。
- `mismatch`：差异比例超过 20%。

跟读时浏览器会持续监听，直到点击“停止”。反馈区会直接显示系统识别到的文字，录音也可以立即回放。

## 学习记录

所有数据保存在当前浏览器的 `localStorage` 中，不需要账号或后端服务器。

- `pinyinSentenceRecords`：句子和故事跟读记录。
- `pinyinPronunciationRecords`：早期单字发音判分记录，保留用于兼容已有数据。

句子和故事记录包含：

```json
{
  "timestamp": "2026-07-26T00:00:00.000Z",
  "source": "text",
  "targetText": "目标原文",
  "recognizedText": "识别结果",
  "result": "correct",
  "distance": 0,
  "differenceRatio": 0
}
```

点击页面中的“导出学习记录”，可以下载：

```text
pinyin-sentence-story-records.json
```

浏览器缓存被清除后，本地学习记录也可能被删除，建议定期导出备份。

## 浏览器兼容性

推荐使用最新版 Microsoft Edge 或 Google Chrome。

录音依赖：

- `MediaRecorder`
- `navigator.mediaDevices.getUserMedia`

语音识别依赖：

- `webkitSpeechRecognition`
- `SpeechRecognition`

如果浏览器不支持语音识别，仍可录音并回放，但无法自动评分。语音识别结果由浏览器及其服务提供，安静环境、清晰发音和稳定网络有助于提高识别准确率。

## 技术说明

- 原生 HTML、CSS 和 JavaScript
- Web Speech API：中文朗读与语音识别
- MediaRecorder API：录音和回放
- Canvas：拼音书写练习
- `pinyin-pro`：汉字转拼音及单音节分析
- localStorage：学习记录持久化
- SVG：内嵌故事插图

项目不需要 npm、数据库或后端服务。

## 项目文件

```text
PinyinWork/
├─ 第三版.html
├─ README.md
└─ Pinyin_Pal_真实发音评测_阶段性研究报告.docx
```

`第三版.html` 是当前可运行版本；研究报告用于记录真实发音评测功能的阶段性设计与结论。

## 隐私说明

学习记录默认只存储在当前浏览器中。项目本身不会把记录上传到自建服务器，但浏览器的在线语音识别功能可能由浏览器厂商处理音频或识别请求，具体行为取决于所使用的浏览器及其隐私政策。
