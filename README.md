<div align="center">

<img src="docs/app-icon.png" width="104" height="104" alt="Phantom 应用图标" />

# Phantom

### 静默穿梭，掌控每一条连接。

原生 macOS 网络代理与流量观测工具。
基于内置 mihomo 内核，以轻量、低内存的原生界面管理节点策略、分流规则与实时连接。

![Apple Silicon](https://img.shields.io/badge/macOS-Apple_Silicon-333333?logo=apple&logoColor=white)
![macOS 14.0+](https://img.shields.io/badge/macOS-14.0%2B-0071E3)
![Swift Native](https://img.shields.io/badge/Swift-Native_AppKit_%2B_SwiftUI-635BFF)

[下载 Mac 版](https://github.com/lyq2010/lees-phantom-release/releases/latest) · [更新日志](CHANGELOG.md) · [所有版本](https://github.com/lyq2010/lees-phantom-release/releases) · [反馈问题](https://github.com/lyq2010/lees-phantom-release/issues)

</div>

---

## 为 macOS 打造的原生网络代理

- **实时活动与流量观测** — 按进程、域名、规则与策略多维度统计流量，配合独立仪表盘（`⌘D`）与悬浮速度窗（`⇧⌘M`），异常连接一目了然。
- **高密度原生状态栏** — 五柱波形图标、R / G / D 出站模式角标、双行等宽实时速率，以及支持一键测速与切换的全宽策略组子菜单。
- **双模式流量接管** — 一键开启系统代理或增强模式（TUN），按住 `Option` 点击菜单即可复制局域网终端代理导出命令。
- **兼容配置与模块覆写** — 原生支持 YAML，并内置 Surge 配置导入转换与局部编辑（含语法校验与警告提示）、覆写模块及自定义规则管理。

当前版本 **1.1.1** 面向 Apple Silicon（macOS 14.0+）提供开箱即用的 `.dmg` 安装包（已内嵌 `mihomo` 内核与 `geoip.metadb`）。Intel Mac 与 Windows 不在当前发行范围。

## 常用能力

| 功能 | 体验 |
| --- | --- |
| 状态栏控制 | 五柱波形、R/G/D 模式角标、双行实时速率与全宽策略切换 |
| 系统代理与 TUN | 一键接管系统代理与增强模式，支持复制本机/局域网终端代理命令 |
| 策略与测速 | 批量延迟基准测试、Smart 智能优选避让与可视化节点编辑 |
| 配置与规则 | YAML 配置管理、Surge 导入、编辑与转换、覆写模块与自定义规则 |
| 仪表盘与诊断 | 活跃/历史连接、请求与内核日志、DNS 缓存清理与网络诊断 |
| 低内存设计 | 关闭窗口自动释放视图树，按需采样与干净退出回收 |

## 选择你的版本

| 平台 | 适用设备 | 安装文件 | 更新记录 |
| --- | --- | --- | --- |
| Mac | Apple Silicon，macOS 14.0+ | `lees-phantom-1.1.1-macos-aarch64.dmg` | [发行版](https://github.com/lyq2010/lees-phantom-release/releases) |

### Mac 安装与自动更新

1. 下载最新 `.dmg` 并通过发行页附带的 `SHA256SUMS` 校验完整性：
   ```sh
   shasum -a 256 -c SHA256SUMS
   ```
2. 打开 `.dmg`，将 **Phantom** 拖入「应用程序」。首次从正式安装位置启动后，可精确确认来源的本次 DMG 会自动推出并移至废纸篓。
3. 首次打开若被系统拦截，请在「系统设置 → 隐私与安全性」中点击「仍要打开」。
4. 后续新版本会在主窗口左下角提示；确认更新后将优先从主源（COS）并在必要时自动切至备源（R2）下载 `.app.tar.gz`，经 Ed25519 发行清单验签、Minisign 包验签与 SHA-256 校验后自动替换重启，并在新版健康启动后自动清理更新缓存与旧版备份。

> Mac 版采用 ad-hoc 签名，不使用 Developer ID 或 Apple 公证。`.app.tar.gz` 仅用于应用内自动更新，首次安装请选择 DMG。

## 隐私与发版透明

所有配置文件、代理规则、节点信息与流量观测记录均保存在本机，不自动上传，不绑定账号。

原始源码在私有仓库 `lyq2010/lees-phantom` 维护；本仓库仅承载公开发版工作流、产品说明、更新日志与经过校验的公开白名单资产（`.dmg`、`.app.tar.gz`、`.minisig`、`darwin-aarch64.json`、`release-manifest.json` 与 `SHA256SUMS`），不公开源码或构建日志。COS／R2 运维核对仅使用元数据，具体边界见[镜像核对约束](release-tools/lees-phantom/mirror-policy.md)。

## 反馈问题

欢迎通过 [Issues](https://github.com/lyq2010/lees-phantom-release/issues) 反馈问题，请附带应用版本、macOS 版本及复现步骤。提交日志或配置示例前请务必脱敏，**切勿上传私人订阅链接、节点密码或含隐私信息的原始日志**。

[发版流程与清理规则](docs/release-process.md)
