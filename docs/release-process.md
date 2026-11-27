# Phantom 发版流程

适用仓库：私有源码仓 `lyq2010/lees-phantom` 与公开发版仓 `lyq2010/lees-phantom-release`。版本采用 `X.Y.Z`；已发布版本不覆盖，修复使用新的补丁版本。

## 1. 准备源码与版本说明

1. 确认两仓工作区与远端状态，只提交本次功能相关源码、测试、资源和正式文档；临时脚本、截图、分析报告、验收报告与构建产物不入库。
2. 从固定源码 SHA 的 `Engine/` 与 `Cargo.lock` 编译 Rust `phantom-engine`，使用 `cargo build --locked --release -p phantom-engine`。内核构建完成后通过 `PHANTOM_ENGINE_BIN` 传入测试与打包，不复用未知来源的旧内核，同时打包固定源码中的 `Resources/bin/mihomo` 作为可选回退，不在线下载替换。
3. 同步两仓 README、CHANGELOG 和本地打包默认版本；发版仓新增 `release-tools/lees-phantom/notes-X.Y.Z.md`。说明简短列出用户可见变化，适当使用 emoji，不把内部实现或未经验证的能力写成已完成。
4. 原 mihomo 二进制与兼容源文件保留，不作为本轮接入的清理对象。不要把用户订阅、节点凭据、运行配置或签名私钥提交到任一仓库。

## 2. 本地验证

在源码仓运行：

```bash
source /Volumes/DISK/Applications/rust/env.sh
cargo test --manifest-path Engine/Cargo.toml --workspace --locked
cargo build --manifest-path Engine/Cargo.toml --locked --release -p phantom-engine
export PHANTOM_ENGINE_BIN="${CARGO_TARGET_DIR:-$PWD/Engine/target}/release/phantom-engine"
DEVELOPER_DIR=/Volumes/DISK/Applications/Xcode.app/Contents/Developer \
PHANTOM_RUN_ENGINE_LIVE_TESTS=1 \
swift test --scratch-path /private/tmp/phantom-release-check

git diff --check
bash -n scripts/bundle-app.sh packaging/macos/package.sh packaging/macos/verify-dmg.sh
```

真实内核集成测试使用本机临时端口和合成数据，不接管系统代理、默认路由或 DNS。需要指定配置编译测试时，只使用独立合成 fixtures，通过 `PHANTOM_PROFILE_TEST_SOURCE` 和 `PHANTOM_PROFILE_TEST_OUTPUT` 指定临时输入/输出；不使用私人订阅充当公开测试数据。TUN 全局接管、睡眠和换网未实测时必须如实保留验证边界。

检查 Workflow YAML、所有 `run` 块及打包脚本语法。macOS 包应包含 `phantom-engine`、`mihomo`、`phantom-proxy-helper`、`phantom-tun-helper` 和 GeoIP 数据，严格验证嵌套代码签名；DMG 由源码仓 `packaging/macos/package.sh` 生成并只读挂载验包。`.app.tar.gz` 从同一份已验包的 `Phantom.app` 生成。

## 3. 提交并推送双仓

先提交并推送源码仓，记录 `git rev-parse HEAD` 得到的完整40位 SHA；再提交并推送发版仓的说明、文档和必要 Workflow 修正。发版必须使用包含全部迁移修复的源码提交，必须包含自建内核与原生功能入口的接入修改。

不使用 `git add .` 混入私人配置或验收产物。确认 `git diff --cached --stat` 后提交；提交与公开说明不添加工具署名。

## 4. 手动触发固定源码构建

以下命令中的版本与 SHA 必须替换为本次已推送的值：

```bash
gh workflow run lees-phantom-release.yml \
  --repo lyq2010/lees-phantom-release --ref main \
  -f source_sha='<完整40位源码SHA>' -f version='<X.Y.Z>' \
  -f publish=true -f run_tests=true
```

首次仅验包时使用 `publish=false`；用户已明确授权正式发布后可直接使用 `publish=true`，无需重复确认。触发前先检查是否有同版本或同源码的在途任务，避免重复发布。

Workflow 按顺序执行：固定源码检出 → Rust/Swift、真实双内核与往返冷切换测试 → 内置资源校验 → Apple Silicon 应用与 APFS DMG 构建 → Minisign资产签名 → Ed25519发行清单签名与本地全量验签 → COS/R2暂存及元数据核对 → 双源latest晋升 → GitHub Release发布 → 旧镜像资产清理。

签名私钥及存储凭据只通过 GitHub Secrets 注入；不打印、不下载到开发机、不写入文档。保留现有权限隔离、白名单上传和双镜像发布顺序。

## 5. 验证发布，禁止消耗 COS 包下行

**禁止从 COS 下载完整安装包或更新包做验证。不得用 curl、浏览器、安装器或自动更新器从 COS 重新拉取 DMG、`.app.tar.gz`；也不从 COS 读取 `latest.json` 等清单正文。不要以 HEAD 校验后再 GET 完整包作为“二次确认”。**

- 完整包的 SHA-256、大小、Minisign、Ed25519 及平台身份验证在 CI 上传前，使用构建机已有的本地文件完成。
- COS 仅使用 `head_object` / HTTP HEAD 读取对象大小和 ETag，并与本次PUT的元数据比对；R2沿用管理API的对象列表元数据核对，不读取桶内对象正文。
- 如确实需要独立下载复核，只从 **GitHub Release** 获取公开包与签名清单，使用 `release-tools/lees-phantom/verify.mjs` 完整验签；不得回退到 COS 下载。
- 运维操作严格限定在 `lees-phantom/` 前缀，不能触碰共享存储桶中的其他产品。旧版清单只从 GitHub Release 取得并验签。
- 确认全部Workflow任务（包括镜像清理）成功、Release版本与源码SHA正确、公开资产齐全。未成功前不得宣布发布完成。

## 6. 失败与清理

失败时先看具体任务，修正后重新提交；只重试符合状态的失败任务，不盲目重复触发完整发布。若资产已发布或latest已晋升，不覆盖同版本，按签名清单与现有恢复流程处理。对用户如实说明部分成功、剩余失败及验证范围。

发布验证完成后，按用户授权清理：项目 `dist/`、专用Swift/Rust构建缓存、合成配置、测试输出、截图、临时脚本、REA分析及验收产物；清理方式以本次用户授权为准：默认移至macOS废纸篓；明确要求直接删除时永久删除，不再移入废纸篓。先逐项核对路径与归属，不能仅凭宽泛名称匹配删除。不得清理用户配置/订阅、应用运行所需的辅助程序、正式源码/测试、发版流程文档、图标和GeoIP资源，或GitHub Release正式资产。只移除确认属于本项目或当前会话的文件，不泛删共享工具链缓存与其他项目文件。

没有清理授权时遵循“删除前确认”；明确要求清理本次产物后，不重复请求相同范围的确认。当前发版成功后可清理该次GitHub Actions中间Artifacts，保留正式Release及工作流执行记录。
