# ACP / ACPX 排障记录（2026-03-22）

## 现象
- `ACP_SESSION_INIT_FAILED: ACP metadata is missing ...`
- `agent needs reconnect`
- `RUNTIME: Internal error`
- `initialize/session/new` 阶段频繁超时

## 根因归纳
1. **会话路由未固定**：`acpx openclaw` 默认会话目标漂移到 `agent:health-manager:acp:*`，导致 metadata 不一致。
2. **非交互权限策略过硬**：`nonInteractivePermissions=fail` 在无 TTY 下放大失败概率。
3. **压测方法混杂**：旧脚本（每次新建会话）与新脚本（持久会话）结果混用，造成误判。
4. **会话残留污染**：`~/.acpx/sessions` 残留大量历史会话，增加重连/映射异常概率。

## 已验证有效的修复
1. 固定 `acpx openclaw` 目标（`~/.acpx/config.json`）：
   - `openclaw acp --url ws://127.0.0.1:18789 --session agent:director:main`
2. 调整 ACPX 权限策略：
   - `plugins.entries.acpx.config.permissionMode = "approve-all"`
   - `plugins.entries.acpx.config.nonInteractivePermissions = "deny"`
3. 清理会话残留：
   - 关闭 active sessions
   - 备份并重建 `~/.acpx/sessions`
4. 复测结果：
   - `acpx openclaw exec` 连续 5 次成功（7~9s）

## 标准排障步骤（以后照这个走）
1. 先看错误类型：
   - metadata missing / needs reconnect / permission / timeout
2. 检查并固定会话路由：
   - 确认 `~/.acpx/config.json` 是否锁定 `--session`
3. 检查 ACP 配置：
   - `acp.enabled=true`
   - `acp.dispatch.enabled=true`
   - `acp.backend="acpx"`
4. 检查 acpx 策略：
   - `permissionMode=approve-all`
   - `nonInteractivePermissions=deny`
5. 清理会话：
   - `acpx <agent> sessions list/close`
   - 必要时清理 `~/.acpx/sessions`（先备份）
6. 用同一方法复测：
   - 先 5 次 smoke，再 20 次压测

## 禁止事项
- 不要混用旧压测结果与新压测结果。
- 不要在未固定 session key 的情况下做稳定性结论。
- 不要把 `models` API 可用误判为 ACP 端到端可用。
