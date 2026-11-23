# COS／R2 核对约束

发行运维核对不下载 COS／R2 对象，不读取桶内 `latest.json` 或其他清单正文，不消耗存储桶对象下行流量；仅使用 COS `head_object` 与 R2 管理 API 对象列表元数据校验单次 PUT 的 MD5 ETag 与大小。

- 本地 `verify.mjs` 负责完整验证 Ed25519 发行清单签名、Minisign 更新包签名、SHA-256、大小与平台身份。
- 所有操作严格限定在 `lees-phantom/` 前缀，禁止触碰共享存储桶内其他产品资产。
- 晋升前仅从 GitHub Release 获取上一版签名清单并本地验签，拒绝降级与同版本冲突。
- 仅在 COS 与 R2 双源晋升且 GitHub Release 成功后，清理历史旧版 `lees-phantom` 产物，保留当前版与 `stable/latest.json`。
