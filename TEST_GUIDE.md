# Regex Weaver IDE - 全功能测试指导书

本指导书旨在帮助您快速上手并全面测试 **Regex Weaver (可视化正则表达式 IDE)** 的所有核心功能。测试数据模拟了真实网络信息爬虫（Web Scraper）场景，包含多 URL 格式抽取、日志分析、结构化数据提取等实际任务，并覆盖了匹配高亮、分组捕获、文本替换及 Global Regex Flags 的完整用法。

---

## 目录
1. [测试场景一：可视化拖拽与串联编译 (构建爬虫格式校验器)](#测试场景一可视化拖拽与串联编译-构建爬虫格式校验器)
2. [测试场景二：正则表达式逆向工程 (反编译 URL 提取正则)](#测试场景二正则表达式逆向工程-反编译-url-提取正则)
3. [测试场景三：测试沙盒——Match Highlight (多 URL 批量高亮)](#测试场景三测试沙盒match-highlight-多-url-批量高亮)
4. [测试场景四：测试沙盒——Details & Groups (分组捕获与爬虫字段提取)](#测试场景四测试沙盒details--groups-分组捕获与爬虫字段提取)
5. [测试场景五：测试沙盒——Replace Sandbox (URL 规范化与数据清洗)](#测试场景五测试沙盒replace-sandbox-url-规范化与数据清洗)
6. [测试场景六：Global Regex Flags 用法](#测试场景六global-regex-flags-用法)
7. [测试场景七：达尔文进化引擎 (遗传算法自动演化日志正则)](#测试场景七达尔文进化引擎-遗传算法自动演化日志正则)

---

## 测试场景一：可视化拖拽与串联编译 (构建爬虫格式校验器)

### 1. 目标
模拟爬虫任务中对采集到的 HTTP 状态行（如 `H200OK`、`A301B`）做格式校验。通过拖拽组件构建正则，要求：
- 必须以一个**英文字母**开头（代表来源标识符）。
- 紧跟 **3 到 6 位数字**（HTTP 状态码或自定义编号）。
- 以字符 `!` 结尾（数据完整性标记）。
- 整个字符串必须从行首到行尾严格匹配（不允许前后有杂余字符）。

预期正则：`/^[a-zA-Z]\d{3,6}!$/g`

### 2. 操作步骤
1. **清理画布**：选中默认的 `Line Start` 节点，点击其右上角的 **红色垃圾桶图标** 删除。
2. **拖入 Line Start 节点**：从左侧 `Nodes Library` → `Anchors & Boundaries`，拖拽 `Line Start` 到画布左侧。
3. **拖入 Char Class 节点**：拖拽 `Basic Blocks` → `Char Class` 放到右侧。
   - 配置：`Class Preset` 选择 `Letters (a-zA-Z)`。
4. **拖入 Number 节点**：从 `Common Presets` → `Number` 拖入，放置在 Char Class 右侧。
5. **拖入 Quantifier 节点**：从 `Groups & Logic` → `Quantifier` 拖入。
   - 配置：`Type` → `Between N and M`；`N` 填 `3`；`M` 填 `6`；`Lazy Match` 保持未勾选。
6. **拖入 Plain Text 节点**：从 `Basic Blocks` → `Plain Text` 拖入。
   - 配置：`Match Text` 填入 `!`。
7. **拖入 Line End 节点**：从 `Anchors & Boundaries` → `Line End` 拖入，放最右侧。
8. **连线**：按顺序拖拽连线：
   `Line Start` ➔ `Char Class` ➔ `Number` ➔ `Quantifier` ➔ `Plain Text` ➔ `Line End`

### 3. 预测结果

**右侧 Output 面板 → Compiled Code：**
```javascript
// Compiled Pattern
const regex = /^[a-zA-Z]\d{3,6}!$/g;
```

**右侧 Diagnostics（诊断）：**
- ✅ 绿色提示：`Pattern is optimized for linear time matching.`（无嵌套重复，不会触发回溯警告）

**右侧 Logic Breakdown（逻辑分解）：**
- 步骤 1：断言必须处于【行首】位置 (`^`)
- 步骤 2：匹配一个 字母 字符
- 步骤 3：匹配一串数字
- 步骤 4：重复上一步骤的匹配量：3 到 6 次
- 步骤 5：匹配文本 "!"
- 步骤 6：断言必须处于【行尾】位置 (`$`)

### 4. 沙盒测试数据

将以下内容粘贴到底部 **Test Input** 框：

```
a123!
B4567!
z99!
A1234567!
hello!
1234!
c100!OK
```

**预期高亮结果：**
| 输入行 | 是否匹配 | 原因 |
|--------|----------|------|
| `a123!` | ✅ 匹配 | 字母 + 3 位数字 + `!` |
| `B4567!` | ✅ 匹配 | 字母 + 4 位数字 + `!` |
| `z99!` | ❌ 不匹配 | 数字只有 2 位，不足 3 位 |
| `A1234567!` | ❌ 不匹配 | 数字有 7 位，超过 6 位上限 |
| `hello!` | ❌ 不匹配 | 后面是字母而非数字 |
| `1234!` | ❌ 不匹配 | 开头是数字而非字母 |
| `c100!OK` | ❌ 不匹配 | `!` 之后还有字符，不在行尾 |

---

## 测试场景二：正则表达式逆向工程 (反编译 URL 提取正则)

### 1. 目标
将生产级的 URL 结构化提取正则反编译为可视化节点，验证反编译器（AST Decompiler）的准确性。

### 2. 测试正则
```
/(?<protocol>https?):\/\/(?:www\.)?(?<domain>[a-zA-Z0-9.-]+)/gi
```

这个正则用于从网页文本中提取 URL 的**协议**（http/https）和**域名**（domain）字段，是真实爬虫场景的核心模式。

### 3. 操作步骤
1. 点击顶部 Header 的 `Reverse Engineer` 输入框（带 `Paste raw regex...` 占位符）。
2. 粘贴以下正则并回车或点击旁边的 **刷新图标**：
   ```
   /(?<protocol>https?):\/\/(?:www\.)?(?<domain>[a-zA-Z0-9.-]+)/gi
   ```

### 4. 预测结果

**画布区域** 将自动铺开以下节点链：

| 序号 | 节点类型 | 配置说明 |
|------|----------|----------|
| 1 | `Group Start` | Named Capture Group，组名: `protocol` |
| 2 | `Plain Text` | 内容: `http` |
| 3 | `Quantifier` | Optional (`?`)，修饰字符 `s` |
| 4 | `Group End` | 关闭 `protocol` 组 |
| 5 | `Plain Text` | 内容: `://` |
| 6 | `Group Start` | Non-Capturing (`?:`) |
| 7 | `Plain Text` | 内容: `www.` |
| 8 | `Group End` | 关闭非捕获组 |
| 9 | `Quantifier` | Optional (`?`)，整个 `www.` 可选 |
| 10 | `Group Start` | Named Capture Group，组名: `domain` |
| 11 | `Char Class` | Custom Set，内容: `a-zA-Z0-9.-` |
| 12 | `Quantifier` | One or More (`+`) |
| 13 | `Group End` | 关闭 `domain` 组 |

**右侧 Output Flags（来自 `/gi`）：**
- `Case Insensitive (i)` 自动勾选
- 右侧 Diagnostics：✅ 绿色，线性时间复杂度 O(N)

---

## 测试场景三：测试沙盒——Match Highlight (多 URL 批量高亮)

### 1. 目标
在真实的爬虫爬取内容（混合文本与链接的 HTML 片段）中，验证正则的批量匹配和字符级高亮渲染。

### 2. 使用正则
沿用场景二反编译出的 URL 正则（无需重新构建），确认右侧 Output 显示：
```javascript
const regex = /(?<protocol>https?):\/\/(?:www\.)?(?<domain>[a-zA-Z0-9.-]+)/gi;
```

### 3. 测试文本（粘贴到 Test Input）

```
=== 爬虫抓取结果：产品页面链接汇总 ===

官方主页: https://www.apple.com/products
文档中心: http://docs.python.org/3/library/re.html
CDN 镜像: https://cdn.jsdelivr.net/npm/react@18.2.0
GitHub 仓库: https://github.com/facebook/react
API 端点: http://api.example.com/v2/items?limit=50
未知协议（不应匹配）: ftp://legacy.server.io
本地链接（不应匹配）: file:///Users/admin/report.html
邮件地址（不匹配）: admin@example.com
```

### 4. 预测高亮结果

| 目标字符串 | 是否高亮 | 说明 |
|-----------|----------|------|
| `https://www.apple.com` | ✅ 高亮（蓝色） | 完整 https + www + 域名 |
| `http://docs.python.org` | ✅ 高亮 | http + 无 www + 域名 |
| `https://cdn.jsdelivr.net` | ✅ 高亮 | https + CDN 域名 |
| `https://github.com` | ✅ 高亮 | https + 无 www |
| `http://api.example.com` | ✅ 高亮 | API 域名 |
| `ftp://legacy.server.io` | ❌ 不高亮 | ftp 不在 `https?` 范围内 |
| `file:///Users/...` | ❌ 不高亮 | 不匹配协议格式 |
| `admin@example.com` | ❌ 不高亮 | 邮件地址无 `://` |

> **颜色含义**：蓝色底色 = 完整匹配；如有捕获组（Group），匹配字符串内部的协议部分（`https`）与域名部分（`apple.com`）会显示**不同颜色的下划线**，区分各组归属。

---

## 测试场景四：测试沙盒——Details & Groups (分组捕获与爬虫字段提取)

### 1. 目标
验证底部 **Details & Groups** 标签页能否精确展示每个匹配的索引位置和各捕获组的值——这是爬虫"字段抽取"的核心能力。

### 2. 使用正则 & 测试文本
沿用场景三的 URL 正则和测试文本（不变）。

### 3. 操作步骤
1. 确认 Test Input 中已有场景三的文本。
2. 点击底部面板的 **Details & Groups** 标签。

### 4. 预期输出（Match Inspector 列表）

```
Match #1
  Index: 22 - 44
  Value: "https://www.apple.com"
  Group 1: "https"          ← protocol 捕获组
  Group 2: "apple.com"      ← domain 捕获组

Match #2
  Index: 52 - 78
  Value: "http://docs.python.org"
  Group 1: "http"
  Group 2: "docs.python.org"

Match #3
  Index: 88 - 116
  Value: "https://cdn.jsdelivr.net"
  Group 1: "https"
  Group 2: "cdn.jsdelivr.net"

Match #4
  Index: ...
  Value: "https://github.com"
  Group 1: "https"
  Group 2: "github.com"

Match #5
  Index: ...
  Value: "http://api.example.com"
  Group 1: "http"
  Group 2: "api.example.com"
```

> **爬虫实战意义**：`Group 1`（protocol）和 `Group 2`（domain）可直接用 `$1`、`$2` 引用，实现字段的批量结构化提取，等同于 Python 的 `re.findall()` 返回 tuple 列表。

---

## 测试场景五：测试沙盒——Replace Sandbox (URL 规范化与数据清洗)

### 1. 目标
模拟爬虫数据清洗任务：将抓取到的链接统一格式化为 Markdown 超链接形式，或规范化导出为 CSV 字段。

### 2. 测试正则
```
/(?<protocol>https?):\/\/(?:www\.)?(?<domain>[a-zA-Z0-9.-]+)/gi
```

### 3. 使用场景三的测试文本

---

### 替换任务 A：提取并格式化为 Markdown 链接

在 **Replace With** 输入框填入：
```
[$2]($1://$2)
```

**预期替换结果：**
```
=== 爬虫抓取结果：产品页面链接汇总 ===

官方主页: [apple.com](https://apple.com)/products
文档中心: [docs.python.org](http://docs.python.org)/3/library/re.html
CDN 镜像: [cdn.jsdelivr.net](https://cdn.jsdelivr.net)/npm/react@18.2.0
GitHub 仓库: [github.com](https://github.com)/facebook/react
API 端点: [api.example.com](http://api.example.com)/v2/items?limit=50
未知协议（不应匹配）: ftp://legacy.server.io
本地链接（不应匹配）: file:///Users/admin/report.html
邮件地址（不匹配）: admin@example.com
```

> **说明**：`$1` = protocol，`$2` = domain。非匹配行（ftp/file/email）原样保留，体现正则的"精准替换"能力。

---

### 替换任务 B：导出为 CSV 格式字段

**Replace With：**
```
"$1","$2"
```

**预期替换结果（仅匹配行替换部分）：**
```
"https","apple.com"
"http","docs.python.org"
"https","cdn.jsdelivr.net"
"https","github.com"
"http","api.example.com"
```

---

### 替换任务 C：统一协议升级（http → https）

**Replace With：**
```
https://$2
```

**预期行为：**
- `http://docs.python.org` → `https://docs.python.org`
- `https://www.apple.com` → `https://apple.com`（同时去掉 www）
- `ftp://...` 不变（未匹配）

---

### ⚠️ 警告机制测试（无捕获组时使用 `$1`）

> 如果您将 URL 正则**改为不含捕获组的版本**（例如直接粘贴 `/https?:\/\/[^\s]+/gi` 进行反编译，然后在 Replace With 中填入 `[$1]`），底部面板会自动触发黄色警告：
>
> `Warning: Replacement text contains group placeholders (like $1), but your regular expression has no capturing groups. They will be replaced as literal text.`
>
> 这是设计中的智能诊断功能，防止用户误用 `$1`、`$2` 而得不到预期结果。

---

## 测试场景六：Global Regex Flags 用法

Global Regex Flags（全局正则标志）位于右侧 **Output Panel** 顶部的 **Flags** 区域，有三个复选框：

| 标志 | 勾选名称 | 对应字符 | 作用 |
|------|---------|----------|------|
| Case Insensitive | 忽略大小写 | `i` | 匹配时不区分字母大小写 |
| Multiline | 多行模式 | `m` | `^` `$` 分别匹配每一行的行首/行尾（而非整个字符串的首尾） |
| Dot All / Single Line | 点号匹配换行 | `s` | `.` 可以匹配换行符 `\n`（默认不能） |

---

### Flag 测试 A：Case Insensitive (`i`) — 不区分大小写爬虫

**目标**：构建一个爬虫关键词过滤器，无论用户输入大小写都能命中。

**画布构建**：
- 拖入 `Plain Text` 节点，内容填 `python`
- 在右侧 Output Panel 勾选 **Case Insensitive (i)**

**编译结果：**
```javascript
const regex = /python/gi;  // 注意多了 i flag
```

**测试文本（粘贴到 Test Input）：**
```
Python 3.11 release notes
learning PYTHON is fun
The python documentation
pyTHon vs JavaScript
Ruby is different
```

**预期：** 前四行的 `Python`、`PYTHON`、`python`、`pyTHon` 全部高亮，最后一行不高亮。

---

### Flag 测试 B：Multiline (`m`) — 多行日志行首匹配

**目标**：从爬虫运行日志中，精确匹配每一行以 `[ERROR]` 开头的日志条目。

**画布构建（逆向工程方式）：** 在顶部 Reverse Engineer 框粘贴并确认：
```
/^\[ERROR\]/m
```

**或手动拖拽构建：**
- `Line Start` → `Plain Text`（内容 `[ERROR]`）

然后在右侧 Output Panel 勾选 **Multiline (m)**。

**测试文本（粘贴到 Test Input）：**
```
[INFO] 2024-01-15 10:00:01 Crawler started
[ERROR] 2024-01-15 10:00:05 Connection timeout: api.target.com
[INFO] 2024-01-15 10:00:06 Retrying request...
[ERROR] 2024-01-15 10:00:09 HTTP 403 Forbidden: /admin/data.json
[WARN] 2024-01-15 10:00:10 Rate limit approaching
[ERROR] 2024-01-15 10:00:12 SSL certificate error: expired
[INFO] 2024-01-15 10:00:15 Crawler stopped
```

**预期：**
- `[ERROR]` 出现在三行的**行首**，三个位置高亮。
- `[INFO]`、`[WARN]` 行不高亮。

> **对比实验（不勾选 m）**：取消 Multiline 勾选，`^` 只匹配整个字符串的开头，如果文本第一行是 `[INFO]`，则 `[ERROR]` 完全不高亮。勾选 `m` 后，`^` 意义扩展为每行的行首。

---

### Flag 测试 C：Dot All (`s`) — 跨行 HTML 片段提取

**目标**：从 HTML 抓取内容中，用 `.` 匹配包含换行符的多行标签内容。

**在 Reverse Engineer 框粘贴：**
```
/<title>(.+?)<\/title>/s
```

在右侧 Output Panel 勾选 **Dot All / Single Line (s)**。

**测试文本（粘贴到 Test Input）：**
```html
<html>
<head>
<title>
  Regex Weaver IDE
  - Visual RegEx Builder
</title>
</head>
<body>Hello World</body>
</html>
```

**勾选 `s` 后**：`.+?` 能跨越换行符，匹配到完整的多行 `<title>` 内容，在 Details & Groups 中显示：
```
Match #1
  Group 1: "\n  Regex Weaver IDE\n  - Visual RegEx Builder\n"
```

**不勾选 `s` 时**：`.` 不匹配 `\n`，`<title>` 多行内容无法被匹配。

---

### Flag 组合使用（`gi` + `m`）

在实际爬虫中，通常同时使用多个 Flag：

**同时勾选 Global（默认开启）+ Case Insensitive + Multiline：**

测试正则（Reverse Engineer 框）：
```
/^error:/gim
```

**测试文本：**
```
ERROR: disk full
Info: 200 OK
error: null pointer
WARNING: slow
Error: timeout exceeded
```

**预期：** 三行（`ERROR:`、`error:`、`Error:`）均高亮，`Info:` 和 `WARNING:` 不高亮。

---

## 测试场景七：达尔文进化引擎 (遗传算法自动演化日志正则)

### 1. 目标
测试"达尔文进化"的遗传算法能力。模拟爬虫工程师面对一批服务器日志，需要自动找出一个能精确区分**错误日志**与**正常日志**的正则表达式模式，无需手写正则。

### 2. 测试数据

**正向样本 (Positive Examples - 必须匹配)：**
```
[ERROR] Connection timeout
[ERROR] HTTP 403 Forbidden
[ERROR] SSL certificate expired
[ERROR] DNS resolution failed
```

**反向样本 (Negative Examples - 必须排除)：**
```
[INFO] Request completed
[WARN] Rate limit at 80%
[DEBUG] Cache hit ratio: 0.92
[INFO] Crawler started successfully
```

### 3. 操作步骤
1. 点击右上角 **Darwin Magic** 按钮。
2. 将正向样本每行粘贴至左侧 **Positive Matches** 输入区（已按行分隔）。
3. 将反向样本每行粘贴至右侧 **Negative Exclusions** 输入区。
4. 点击 **Start Evolution** 开始进化。
5. 观察实时 Dashboard：
   - `Generation`（代数）每刷新一次为一代
   - `Best Fitness`（适应度）从低向 100% 攀升
   - 绿色 Pass / 红色 Fail 状态实时切换
6. 当所有正向样本显示 **Pass**（绿色），所有反向样本显示 **Pass**（绿色），或达到最大代数时，点击 **Apply to Canvas**。

### 4. 预测结果
- **进化目标**：算法将收敛到类似 `\[ERROR\]` 或 `ERROR` 的特征模式
- **适应度收敛**：通常在 20~60 代内达到 80%+ 的适应度
- **应用到画布**：对话框关闭，正则通过 AST 反编译器拆解为节点铺在画布上
- **Diagnostics 验证**：右侧面板显示该演化正则的性能指标（绿色/黄色/红色）

### 5. 邮箱正则进化（进阶测试）

**正向样本：**
```
alice@gmail.com
bob-123@work.co.uk
support@service.net
dev.team@company.org
```

**反向样本：**
```
just-text
@missing-user.com
user@domain-without-tld
invalid_email@.com
not-an-email
```

**预期**：演化出匹配 `\w+@\w+\.\w+` 或含字符集 `[a-z0-9.-]+@[a-z0-9.-]+\.[a-z]+` 的精确模式。

---

## 附录：快速参考卡

### 底部 Tester Panel 三个标签页说明

| 标签页 | 功能 | 核心用途 |
|--------|------|----------|
| **Match Highlight** | 字符级彩色高亮 | 快速直观看到哪些文本被匹配 |
| **Details & Groups** | 完整 Match 列表 + 各捕获组值 | 提取结构化字段（爬虫核心操作） |
| **Replace Sandbox** | 正则替换预览 | 数据清洗、格式转换、批量重写 |

### 捕获组占位符参考

| 占位符 | 含义 | 示例 |
|--------|------|------|
| `$1` | 第 1 个捕获组的匹配内容 | protocol |
| `$2` | 第 2 个捕获组的匹配内容 | domain |
| `$&` | 整个匹配字符串 | 完整 URL |
| `$'` | 匹配字符串之后的文本 | 路径部分 |
| `` $` `` | 匹配字符串之前的文本 | 前缀文本 |

### 常用爬虫正则速查

| 场景 | 正则示例 |
|------|---------|
| 提取 URL | `/(https?):\/\/([\w.-]+)/gi` |
| 提取 IP 地址 | `/\b(\d{1,3}\.){3}\d{1,3}\b/g` |
| 提取邮箱 | `/[\w.+-]+@[\w-]+\.[\w.]+/gi` |
| 提取日期 | `/\d{4}-\d{2}-\d{2}/g` |
| 提取 HTML 标签属性 | `/href="([^"]+)"/gi` |
| 过滤 HTTP 错误 | `/^HTTP\/\d\.\d [45]\d{2}/m` |
| 提取 JSON 键值 | `/"(\w+)":\s*"([^"]+)"/g` |
