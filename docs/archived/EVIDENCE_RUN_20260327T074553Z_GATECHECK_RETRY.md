# GateCheck Retry Evidence
timestamp_utc: 2026-03-27T07:45:53Z
cwd: /home/node/.openclaw/workspace/agents/director

## CMD: openclaw plugins inspect memory-lightrag --json
### STDERR
### STDOUT
[35m[plugins][39m [36mmodel-config-admin: routes registered[39m
[35m[plugins][39m [36mfeishu_doc: Registered feishu_doc, feishu_app_scopes[39m
[35m[plugins][39m [36mfeishu_chat: Registered feishu_chat tool[39m
[35m[plugins][39m [36mfeishu_wiki: Registered feishu_wiki tool[39m
[35m[plugins][39m [36mfeishu_drive: Registered feishu_drive tool[39m
[35m[plugins][39m [36mfeishu_perm: Registered feishu_perm tool[39m
[35m[plugins][39m [36mfeishu_bitable: Registered bitable tools[39m
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

## CMD: openclaw plugins inspect memory-lightrag --json | jq .diagnostics
INSPECT_OUTPUT_NOT_JSON

## CMD: openclaw memory status --json
### STDERR
### STDOUT
[35m[plugins][39m [36mmodel-config-admin: routes registered[39m
[35m[plugins][39m [36mfeishu_doc: Registered feishu_doc, feishu_app_scopes[39m
[35m[plugins][39m [36mfeishu_chat: Registered feishu_chat tool[39m
[35m[plugins][39m [36mfeishu_wiki: Registered feishu_wiki tool[39m
[35m[plugins][39m [36mfeishu_drive: Registered feishu_drive tool[39m
[35m[plugins][39m [36mfeishu_perm: Registered feishu_perm tool[39m
[35m[plugins][39m [36mfeishu_bitable: Registered bitable tools[39m
[35m[plugins][39m [36mmodel-config-admin: routes registered[39m
[35m[plugins][39m [36mfeishu_doc: Registered feishu_doc, feishu_app_scopes[39m
[35m[plugins][39m [36mfeishu_chat: Registered feishu_chat tool[39m
[35m[plugins][39m [36mfeishu_wiki: Registered feishu_wiki tool[39m
[35m[plugins][39m [36mfeishu_drive: Registered feishu_drive tool[39m
[35m[plugins][39m [36mfeishu_perm: Registered feishu_perm tool[39m
[35m[plugins][39m [36mfeishu_bitable: Registered bitable tools[39m
[35m[plugins][39m [36mmodel-config-admin: routes registered[39m
[35m[plugins][39m [36mfeishu_doc: Registered feishu_doc, feishu_app_scopes[39m
[35m[plugins][39m [36mfeishu_chat: Registered feishu_chat tool[39m
[35m[plugins][39m [36mfeishu_wiki: Registered feishu_wiki tool[39m
[35m[plugins][39m [36mfeishu_drive: Registered feishu_drive tool[39m
[35m[plugins][39m [36mfeishu_perm: Registered feishu_perm tool[39m
[35m[plugins][39m [36mfeishu_bitable: Registered bitable tools[39m
[35m[plugins][39m [36mmodel-config-admin: routes registered[39m
[35m[plugins][39m [36mfeishu_doc: Registered feishu_doc, feishu_app_scopes[39m
[35m[plugins][39m [36mfeishu_chat: Registered feishu_chat tool[39m
[35m[plugins][39m [36mfeishu_wiki: Registered feishu_wiki tool[39m
[35m[plugins][39m [36mfeishu_drive: Registered feishu_drive tool[39m
[35m[plugins][39m [36mfeishu_perm: Registered feishu_perm tool[39m
[35m[plugins][39m [36mfeishu_bitable: Registered bitable tools[39m
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

## CMD: openclaw memory search --query env-ops-standard --json
### STDERR
[35m[plugins][39m [36mmodel-config-admin: routes registered[39m
[35m[plugins][39m [36mfeishu_doc: Registered feishu_doc, feishu_app_scopes[39m
[35m[plugins][39m [36mfeishu_chat: Registered feishu_chat tool[39m
[35m[plugins][39m [36mfeishu_wiki: Registered feishu_wiki tool[39m
[35m[plugins][39m [36mfeishu_drive: Registered feishu_drive tool[39m
[35m[plugins][39m [36mfeishu_perm: Registered feishu_perm tool[39m
[35m[plugins][39m [36mfeishu_bitable: Registered bitable tools[39m
[35m[plugins][39m [36mmodel-config-admin: routes registered[39m
[35m[plugins][39m [36mfeishu_doc: Registered feishu_doc, feishu_app_scopes[39m
[35m[plugins][39m [36mfeishu_chat: Registered feishu_chat tool[39m
[35m[plugins][39m [36mfeishu_wiki: Registered feishu_wiki tool[39m
[35m[plugins][39m [36mfeishu_drive: Registered feishu_drive tool[39m
[35m[plugins][39m [36mfeishu_perm: Registered feishu_perm tool[39m
[35m[plugins][39m [36mfeishu_bitable: Registered bitable tools[39m
[35m[plugins][39m [36mmodel-config-admin: routes registered[39m
[35m[plugins][39m [36mfeishu_doc: Registered feishu_doc, feishu_app_scopes[39m
[35m[plugins][39m [36mfeishu_chat: Registered feishu_chat tool[39m
[35m[plugins][39m [36mfeishu_wiki: Registered feishu_wiki tool[39m
[35m[plugins][39m [36mfeishu_drive: Registered feishu_drive tool[39m
[35m[plugins][39m [36mfeishu_perm: Registered feishu_perm tool[39m
[35m[plugins][39m [36mfeishu_bitable: Registered bitable tools[39m
[35m[plugins][39m [36mmodel-config-admin: routes registered[39m
[35m[plugins][39m [36mfeishu_doc: Registered feishu_doc, feishu_app_scopes[39m
[35m[plugins][39m [36mfeishu_chat: Registered feishu_chat tool[39m
[35m[plugins][39m [36mfeishu_wiki: Registered feishu_wiki tool[39m
[35m[plugins][39m [36mfeishu_drive: Registered feishu_drive tool[39m
[35m[plugins][39m [36mfeishu_perm: Registered feishu_perm tool[39m
[35m[plugins][39m [36mfeishu_bitable: Registered bitable tools[39m
Memory search failed: openai embeddings failed: 401 {
  "error": {
    "message": "Incorrect API key provided: sk-fjwky***************************************bwix. You can find your API key at https://platform.openai.com/account/api-keys.",
    "type": "invalid_request_error",
    "code": "invalid_api_key",
    "param": null
  },
  "status": 401
}
[31m[memory][39m [33msync failed (session-start): Error: openai embeddings failed: 401 {[39m
[33m  "error": {[39m
[33m    "message": "Incorrect API key provided: sk-fjwky***************************************bwix. You can find your API key at https://platform.openai.com/account/api-keys.",[39m
[33m    "type": "invalid_request_error",[39m
[33m    "code": "invalid_api_key",[39m
[33m    "param": null[39m
[33m  },[39m
[33m  "status": 401[39m
[33m}[39m
[31m[memory][39m [33msync failed (search): Error: openai embeddings failed: 401 {[39m
[33m  "error": {[39m
[33m    "message": "Incorrect API key provided: sk-fjwky***************************************bwix. You can find your API key at https://platform.openai.com/account/api-keys.",[39m
[33m    "type": "invalid_request_error",[39m
[33m    "code": "invalid_api_key",[39m
[33m    "param": null[39m
[33m  },[39m
[33m  "status": 401[39m
[33m}[39m
### STDOUT

## Gate Verdict (retry run)
- Gate1 plugins inspect loaded/tools/cli: TBD_BY_MANUAL_REVIEW
- Gate2 success+fallback details completeness: TBD_BY_MANUAL_REVIEW
- Gate3 duplicate diagnostics zero: TBD_BY_MANUAL_REVIEW
