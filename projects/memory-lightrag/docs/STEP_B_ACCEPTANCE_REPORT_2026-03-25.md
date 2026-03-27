# Step B 验收报告（串域否定 / 恶意 workspace 注入 / 多轮切换）

Date: 2026-03-25

## 0) 环境说明
- OpenClaw 插件：`memory-lightrag` -> `loaded`
- LightRAG 连通地址（当前执行环境）：`http://lightrag:9621`
- 注意：当前环境内 `http://127.0.0.1:9621` 不可达（容器命名空间差异）

---

## 1) 用例结果总览

| 用例 | 预期 | 实测 | 结论 |
|---|---|---|---|
| 串域否定（u 写入，g 查询） | 0 命中 | 命中 | ❌ Fail |
| 串域否定（g 写入，u 查询） | 0 命中 | 命中 | ❌ Fail |
| 恶意 workspace 注入（group 请求 u_） | AccessPolicy 拦截 | 返回 `DOMAIN_WORKSPACE_DENY`（策略层） | ✅ Pass（策略单测） |
| 同 session 多轮切换（group->personal->group） | 每轮独立判定，无污染 | 决策分别为 group/personal/group | ✅ Pass（策略单测） |

---

## 2) 详细证据

### 2.1 串域否定测试（真实 LightRAG API）

命令摘要：
- 写入 `TOKEN_U` 到 `LIGHTRAG-WORKSPACE: u_demo`
- 写入 `TOKEN_G` 到 `LIGHTRAG-WORKSPACE: g_demo`
- 分别在 `u_demo`/`g_demo` 下查询两个 token

关键结果：
```json
{
  "u_to_u": true,
  "g_to_u": true,
  "g_to_g": true,
  "u_to_g": true
}
```

解释：
- 正常命中（u->u / g->g）成立
- 否定用例（g->u / u->g）也命中，说明**当前 LightRAG 实例未实现有效 workspace 隔离**（或 header 未生效）

---

### 2.2 恶意 workspace 注入（策略层）

输入：
- domain=group
- allowed=[`g_demo`, `global_shared`]
- requestedWorkspace=`u_demo`

结果：
- `ok=false`
- `error.code=DOMAIN_WORKSPACE_DENY`

说明：
- OpenClaw 本地 AccessPolicy 逻辑可拦截伪造 workspace。

---

### 2.3 多轮切换污染（策略层）

三轮判定结果：
- turn1(group@bot): `group`
- turn2(direct): `personal`
- turn3(group): `group`

说明：
- 判定函数当前无跨轮缓存污染迹象。

---

## 3) 结论

- Step B 三大项中，**策略侧两项通过**（恶意注入拦截 / 多轮切换判定）。
- **串域否定失败**，阻断上线：当前数据层隔离不成立。

---

## 4) 下一步（最小修复路径）

1. 先确认 LightRAG workspace 生效机制（header 是否被实例启用；是否需初始化 namespace）。
2. 增加 workspace 健康检查用例：
   - 同 token 在两域写入不同内容，查询必须返回域内版本。
3. 在插件侧保留 AccessPolicy 强拦截，不因后端隔离失效而放行。
4. 只有“串域否定=0命中”通过后，才进入 Step C。
