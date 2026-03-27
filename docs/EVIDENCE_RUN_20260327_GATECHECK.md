# Memory Lightrag Gate Check Evidence (2026-03-27)

## Overview
This document records the required commands and results for the release gate verification performed on 2026-03-27.

## Commands Executed

### 1. `openclaw plugins inspect memory-lightrag --json`
```
{ "command": "openclaw plugins inspect memory-lightrag --json" }
```

#### Raw Output
```
{
  "workspaceDir": "/home/node/.openclaw/workspace",
  "plugin": {
    "id": "memory-lightrag",
    "name": "Memory (LightRAG)",
    "description": "Memory search with LightRAG backend and automatic builtin fallback",
    "version": "0.1.1",
    "format": "openclaw",
    "source": "/home/node/.openclaw/workspace/projects/memory-lightrag/src/index.ts",
    "rootDir": "/home/node/.openclaw/workspace/projects/memory-lightrag",
    "origin": "config",
    "workspaceDir": "/home/node/.openclaw/workspace",
    "enabled": true,
    "status": "loaded",
    "toolNames": [
      "memory_search",
      "memory_get"
    ],
    "hookNames": [],
    "channelIds": [],
    "providerIds": [],
    "speechProviderIds": [],
    "mediaUnderstandingProviderIds": [],
    "imageGenerationProviderIds": [],
    "webSearchProviderIds": [],
    "gatewayMethods": [],
    "cliCommands": [
      "memory"
    ],
    "services": [],
    "commands": [],
    "httpRoutes": 0,
    "hookCount": 0,
    "configSchema": true,
    "configJsonSchema": {
      "type": "object",
      "additionalProperties": true,
      "properties": {
        "lightrag": {
          "type": "object",
          "additionalProperties": true,
          "properties": {
            "baseUrl": {
              "type": "string"
            },
            "apiKey": {
              "type": "string"
            },
            "timeout": {
              "type": "number"
            }
          }
        },
        "fallbackEnabled": {
          "type": "boolean"
        },
        "verbose": {
          "type": "boolean"
        },
        "intent": {
          "type": "object",
          "additionalProperties": true,
          "properties": {
            "scoredRouting": {
              "type": "object",
              "additionalProperties": true,
              "properties": {
                "enabled": {
                  "type": "boolean"
                },
                "profile": {
                  "type": "string",
                  "enum": [
                    "strict",
                    "default",
                    "recall"
                  ]
                },
                "minTopScore": {
                  "type": "number"
                },
                "minMargin": {
                  "type": "number"
                }
              }
            }
          }
        }
      }
    },
    "kind": "memory"
  },
  "shape": "non-capability",
  "capabilityMode": "none",
  "capabilityCount": 0,
  "capabilities": [],
  "typedHooks": [],
  "customHooks": [],
  "tools": [
    {
      "names": [
        "memory_search"
      ],
      "optional": false
    },
    {
      "names": [
        "memory_get"
      ],
      "optional": false
    }
  ],
  "commands": [],
  "cliCommands": [
    "memory"
  ],
  "services": [],
  "gatewayMethods": [],
  "mcpServers": [],
  "lspServers": [],
  "httpRouteCount": 0,
  "bundleCapabilities": [],
  "diagnostics": [],
  "policy": {
    "allowedModels": [],
    "hasAllowedModelsConfig": false
  },
  "usesLegacyBeforeAgentStart": false,
  "compatibility": [],
  "install": {
    "source": "path",
    "sourcePath": "/home/node/.openclaw/workspace/projects/memory-lightrag",
    "installPath": "/home/node/.openclaw/workspace/projects/memory-lightrag",
    "version": "0.1.1",
    "installedAt": "2026-03-25T09:29:51.306Z"
  }
}
```

#### Gate Verdict
- Gate 1 (plugin inspect): **PASS**
- Gate 2 (success/fallback observability): **UNKNOWN** (not exercised in this run)
- Gate 3 (duplicate diagnostics): **UNKNOWN** (not covered by this command)

### 2. `openclaw memory status --json`
```
{ "command": "openclaw memory status --json" }
```

#### Raw Output
```
[
  {
    "agentId": "health-manager",
    "status": {
      "backend": "builtin",
      "files": 51,
      "chunks": 106,
      "dirty": false,
      "workspaceDir": "/home/node/.openclaw/workspace",
      "dbPath": "/home/node/.openclaw/memory/health-manager.sqlite",
      "provider": "openai",
      "model": "BAAI/bge-m3",
      "requestedProvider": "openai",
      "sources": [
        "memory"
      ],
      "extraPaths": [],
      "sourceCounts": [
        {
          "source": "memory",
          "files": 51,
          "chunks": 106
        }
      ],
      "cache": {
        "enabled": true,
        "entries": 104
      },
      "fts": {
        "enabled": true,
        "available": true
      },
      "vector": {
        "enabled": true,
        "available": true,
        "extensionPath": "/app/node_modules/sqlite-vec-linux-x64/vec0.so",
        "dims": 1024
      },
      "batch": {
        "enabled": false,
        "failures": 0,
        "limit": 2,
        "wait": true,
        "concurrency": 2,
        "pollIntervalMs": 2000,
        "timeoutMs": 3600000
      },
      "custom": {
        "searchMode": "hybrid",
        "readonlyRecovery": {
          "attempts": 0,
          "successes": 0,
          "failures": 0
        }
      }
    },
    "scan": {
      "sources": [
        {
          "source": "memory",
          "totalFiles": 53,
          "issues": []
        }
      ],
      "totalFiles": 53,
      "issues": []
    }
  },
  {
    "agentId": "coding-agent",
    "status": {
      "backend": "builtin",
      "files": 0,
      "chunks": 0,
      "dirty": false,
      "workspaceDir": "/home/node/.openclaw/workspace-coding",
      "dbPath": "/home/node/.openclaw/memory/coding-agent.sqlite",
      "provider": "openai",
      "model": "BAAI/bge-m3",
      "requestedProvider": "openai",
      "sources": [
        "memory"
      ],
      "extraPaths": [],
      "sourceCounts": [
        {
          "source": "memory",
          "files": 0,
          "chunks": 0
        }
      ],
      "cache": {
        "enabled": true,
        "entries": 0
      },
      "fts": {
        "enabled": true,
        "available": true
      },
      "vector": {
        "enabled": true,
        "available": true,
        "extensionPath": "/app/node_modules/sqlite-vec-linux-x64/vec0.so"
      },
      "batch": {
        "enabled": false,
        "failures": 0,
        "limit": 2,
        "wait": true,
        "concurrency": 2,
        "pollIntervalMs": 2000,
        "timeoutMs": 3600000
      },
      "custom": {
        "searchMode": "hybrid",
        "readonlyRecovery": {
          "attempts": 0,
          "successes": 0,
          "failures": 0
        }
      }
    },
    "scan": {
      "sources": [
        {
          "source": "memory",
          "totalFiles": 1,
          "issues": []
        }
      ],
      "totalFiles": 1,
      "issues": []
    }
  },
  {
    "agentId": "director",
    "status": {
      "backend": "builtin",
      "files": 8,
      "chunks": 18,
      "dirty": false,
      "workspaceDir": "/home/node/.openclaw/workspace/agents/director",
      "dbPath": "/home/node/.openclaw/memory/director.sqlite",
      "provider": "openai",
      "model": "BAAI/bge-m3",
      "requestedProvider": "openai",
      "sources": [
        "memory"
      ],
      "extraPaths": [],
      "sourceCounts": [
        {
          "source": "memory",
          "files": 8,
          "chunks": 18
        }
      ],
      "cache": {
        "enabled": true,
        "entries": 19
      },
      "fts": {
        "enabled": true,
        "available": true
      },
      "vector": {
        "enabled": true,
        "available": true,
        "extensionPath": "/app/node_modules/sqlite-vec-linux-x64/vec0.so",
        "dims": 1024
      },
      "batch": {
        "enabled": false,
        "failures": 0,
        "limit": 2,
        "wait": true,
        "concurrency": 2,
        "pollIntervalMs": 2000,
        "timeoutMs": 3600000
      },
      "custom": {
        "searchMode": "hybrid",
        "readonlyRecovery": {
          "attempts": 0,
          "successes": 0,
          "failures": 0
        }
      }
    },
    "scan": {
      "sources": [
        {
          "source": "memory",
          "totalFiles": 8,
          "issues": []
        }
      ],
      "totalFiles": 8,
      "issues": []
    }
  },
  {
    "agentId": "model-config-backend",
    "status": {
      "backend": "builtin",
      "files": 0,
      "chunks": 0,
      "dirty": true,
      "workspaceDir": "/home/node/.openclaw/workspace/agents/model-config-backend",
      "dbPath": "/home/node/.openclaw/memory/model-config-backend.sqlite",
      "provider": "openai",
      "model": "BAAI/bge-m3",
      "requestedProvider": "openai",
      "sources": [
        "memory"
      ],
      "extraPaths": [],
      "sourceCounts": [
        {
          "source": "memory",
          "files": 0,
          "chunks": 0
        }
      ],
      "cache": {
        "enabled": true,
        "entries": 0
      },
      "fts": {
        "enabled": true,
        "available": true
      },
      "vector": {
        "enabled": true,
        "available": true,
        "extensionPath": "/app/node_modules/sqlite-vec-linux-x64/vec0.so"
      },
      "batch": {
        "enabled": false,
        "failures": 0,
        "limit": 2,
        "wait": true,
        "concurrency": 2,
        "pollIntervalMs": 2000,
        "timeoutMs": 3600000
      },
      "custom": {
        "searchMode": "hybrid",
        "readonlyRecovery": {
          "attempts": 0,
          "successes": 0,
          "failures": 0
        }
      }
    },
    "scan": {
      "sources": [
        {
          "source": "memory",
          "totalFiles": 0,
          "issues": [
            "memory directory missing (~/.openclaw/workspace/agents/model-config-backend/memory)"
          ]
        }
      ],
      "totalFiles": 0,
      "issues": [
        "memory directory missing (~/.openclaw/workspace/agents/model-config-backend/memory)"
      ]
    }
  },
  {
    "agentId": "model-config-frontend",
    "status": {
      "backend": "builtin",
      "files": 0,
      "chunks": 0,
      "dirty": true,
      "workspaceDir": "/home/node/.openclaw/workspace/agents/model-config-frontend",
      "dbPath": "/home/node/.openclaw/memory/model-config-frontend.sqlite",
      "provider": "openai",
      "model": "BAAI/bge-m3",
      "requestedProvider": "openai",
      "sources": [
        "memory"
      ],
      "extraPaths": [],
      "sourceCounts": [
        {
          "source": "memory",
          "files": 0,
          "chunks": 0
        }
      ],
      "cache": {
        "enabled": true,
        "entries": 0
      },
      "fts": {
        "enabled": true,
        "available": true
      },
      "vector": {
        "enabled": true,
        "available": true,
        "extensionPath": "/app/node_modules/sqlite-vec-linux-x64/vec0.so"
      },
      "batch": {
        "enabled": false,
        "failures": 0,
        "limit": 2,
        "wait": true,
        "concurrency": 2,
        "pollIntervalMs": 2000,
        "timeoutMs": 3600000
      },
      "custom": {
        "searchMode": "hybrid",
        "readonlyRecovery": {
          "attempts": 0,
          "successes": 0,
          "failures": 0
        }
      }
    },
    "scan": {
      "sources": [
        {
          "source": "memory",
          "totalFiles": 0,
          "issues": [
            "memory directory missing (~/.openclaw/workspace/agents/model-config-frontend/memory)"
          ]
        }
      ],
      "totalFiles": 0,
      "issues": [
        "memory directory missing (~/.openclaw/workspace/agents/model-config-frontend/memory)"
      ]
    }
  },
  {
    "agentId": "model-config-qa",
    "status": {
      "backend": "builtin",
      "files": 0,
      "chunks": 0,
      "dirty": true,
      "workspaceDir": "/home/node/.openclaw/workspace/agents/model-config-qa",
      "dbPath": "/home/node/.openclaw/memory/model-config-qa.sqlite",
      "provider": "openai",
      "model": "BAAI/bge-m3",
      "requestedProvider": "openai",
      "sources": [
        "memory"
      ],
      "extraPaths": [],
      "sourceCounts": [
        {
          "source": "memory",
          "files": 0,
          "chunks": 0
        }
      ],
      "cache": {
        "enabled": true,
        "entries": 0
      },
      "fts": {
        "enabled": true,
        "available": true
      },
      "vector": {
        "enabled": true,
        "available": true,
        "extensionPath": "/app/node_modules/sqlite-vec-linux-x64/vec0.so"
      },
      "batch": {
        "enabled": false,
        "failures": 0,
        "limit": 2,
        "wait": true,
        "concurrency": 2,
        "pollIntervalMs": 2000,
        "timeoutMs": 3600000
      },
      "custom": {
        "searchMode": "hybrid",
        "readonlyRecovery": {
          "attempts": 0,
          "successes": 0,
          "failures": 0
        }
      }
    },
    "scan": {
      "sources": [
        {
          "source": "memory",
          "totalFiles": 0,
          "issues": [
            "memory directory missing (~/.openclaw/workspace/agents/model-config-qa/memory)"
          ]
        }
      ],
      "totalFiles": 0,
      "issues": [
        "memory directory missing (~/.openclaw/workspace/agents/model-config-qa/memory)"
      ]
    }
  }
]
```

#### Gate Verdict
- Gate 1 (plugin inspect): **PASS** (from previous command)
- Gate 2 (success/fallback observability): **UNKNOWN** (not covered by status output)
- Gate 3 (duplicate diagnostics): **UNKNOWN** (no diagnostic list; requires separate check)

## Summary
- Commands executed successfully; outputs captured above.
- Only Gate 1 can be confirmed as PASS from this run. Gates 2 and 3 require targeted scenario tests / diagnostic checks to conclude.
- No code changes were made; this report is documentation-only.
