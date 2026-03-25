# Step B 回归报告（R2）

Date: 2026-03-25 13:28 UTC

## Scope
- 串域否定（u↔g）
- 恶意注入（group 伪造 u_ workspace）
- 多轮切换（group -> personal -> group）
- shared 访问（u/group -> shared）

## 方法说明
- 数据层：直接调用 LightRAG `/documents/text` 与 `/query/data`
- 策略层：使用当前插件代码 `src/policy/access.ts`、`src/policy/source-tag.ts` 进行同逻辑过滤验证
- 说明：本轮重点验证“OpenClaw 侧强隔离补偿”是否闭环

---

## 1) 结果总览

| 用例 | Raw LightRAG | OpenClaw 策略过滤后 | 结论 |
|---|---:|---:|---|
| g->u 串域否定 | 命中（true） | 不命中（false） | ✅ Pass（策略后） |
| u->g 串域否定 | 命中（true） | 不命中（false） | ✅ Pass（策略后） |
| 恶意注入（group 请求 u_victim） | N/A | `DOMAIN_WORKSPACE_DENY` | ✅ Pass |
| 多轮切换（group/personal/group） | N/A | 判定稳定，无污染 | ✅ Pass |
| u->shared | 首轮可能未命中（异步索引） | 最终命中（true） | ✅ Pass |
| g->shared | 首轮可能未命中（异步索引） | 最终命中（true） | ✅ Pass |

---

## 2) 关键证据

### 2.1 Raw 层仍串域（后端单实例现状）

回归写入 token：
- `U=STEPB2_U_1774445246`
- `G=STEPB2_G_1774445246`
- `S=STEPB2_S_1774445246`

首轮统计：
```json
{
  "raw": {
    "g_to_u": true,
    "u_to_g": true,
    "u_to_s": false,
    "g_to_s": false
  },
  "filtered": {
    "g_to_u": false,
    "u_to_g": false,
    "u_to_s": false,
    "g_to_s": false
  }
}
```

说明：后端仍会回传跨域候选；策略过滤能剔除串域内容。

### 2.2 shared 访问（异步索引后）

后续轮询结果：
```json
{
  "raw": {"u_to_s": true, "g_to_s": true},
  "filtered": {"u_to_s": true, "g_to_s": true}
}
```

说明：shared 在索引完成后可被 personal/group 按策略读取。

### 2.3 恶意注入拦截

```json
{
  "ok": false,
  "error": {
    "code": "DOMAIN_WORKSPACE_DENY",
    "requestedWorkspace": "u_victim",
    "domain": "group"
  }
}
```

### 2.4 多轮切换无污染

- turn1(group): 仅允许 `g__*` + `s__global__*`
- turn2(personal): 仅允许 `u__<actor>*` + `s__global__*`
- turn3(group): 恢复 group allowlist，无跨轮污染

---

## 3) 结论

- **Step B 在“OpenClaw 侧强隔离补偿”路径下已达成目标**：
  - 串域否定（策略后）通过
  - 恶意注入拦截通过
  - 多轮切换通过
  - shared 可控共享通过（考虑索引延迟）
- 数据层（LightRAG raw）仍不具备强隔离，本结论与既有认知一致。

---

## 4) 风险与后续

1. shared 可见性受异步索引延迟影响：验收脚本需带轮询窗口。
2. 上线前补齐两项：
   - 写入侧 `file_source` 一律策略生成（禁止外部伪造）
   - 对 `details.results` 做脱敏策略，避免泄露过滤前候选
3. 进入 Step C 前建议新增一条 e2e：
   - 同轮同时写入 u/g/shared，要求最终可见集合严格等于 allowlist 映射。

---

## 5) 执行命令（摘要）

- Typecheck:
  - `npx tsc -p /home/node/.openclaw/workspace/projects/memory-lightrag/tsconfig.json --noEmit`
- 回归脚本：Node one-shot（直接请求 LightRAG + 调用 `isAllowedByDomain`/`enforceWorkspace`）
