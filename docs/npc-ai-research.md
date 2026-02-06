# Embedded AI Options for NPC Behavior & Conversations

Research notes for adding AI-driven NPC behavior and dialogue to CS Crawler.

**Date:** 2026-02-05
**Context:** Godot 4.3+ client / Go server multiplayer dungeon crawler

---

## Option 1: GDLlama / NobodyWho (Godot Native)

**Best for: Client-side NPC dialogue**

Several Godot extensions exist that wrap llama.cpp directly:

| Extension | Status | Features |
|-----------|--------|----------|
| [GDLlama](https://github.com/xarillian/GDLlama) | Active (Godot 4.4+) | Multi-turn conversations, function calling, streaming, GBNF grammar |
| [NobodyWho](https://godotengine.org/asset-library/asset/2886) | New (Jan 2026) | Local LLMs for dialogue, offline-only |
| [godot-llm](https://github.com/Adriankhl/godot-llm) | Active | Vulkan/CPU builds available |

**Pros:**
- Direct Godot integration via GDExtension
- No external server needed
- Works offline
- Function calling for triggering game actions

**Cons:**
- Runs on client (requires player to have decent hardware)
- Server-authoritative architecture means you'd need to handle AI state sync

---

## Option 2: NVIDIA ACE + Nemotron-4 4B

**Best for: High-quality conversational NPCs with speech/animation**

[NVIDIA ACE](https://developer.nvidia.com/ace-for-games) provides a full digital human stack:
- **Nemotron-4 4B Instruct**: Only ~2GB VRAM, optimized for roleplay & RAG
- Available in 2B, 4B, 8B parameter sizes
- Includes Audio2Face for lip-sync animation

**Pros:**
- Purpose-built for game NPCs
- Excellent roleplay capabilities
- Low VRAM (2GB for 4B model)
- Multi-vendor GPU/CPU support

**Cons:**
- Primarily targets RTX GPUs
- More complex integration
- May be overkill for a top-down dungeon crawler

---

## Option 3: Gemma 3 / Gemma3NPC (Recommended)

**Best for: Flexible deployment, good balance of quality/size**

[Gemma3NPC](https://huggingface.co/blog/chimbiwide/gemma3npc) is specifically fine-tuned for NPC interactions:

| Model | Size | VRAM | Use Case |
|-------|------|------|----------|
| Gemma 3 1B | ~1GB | ~2GB | Basic dialogue, low-end machines |
| Gemma 3n E4B | ~2GB | ~3GB | Good quality, efficient |
| Gemma 3 4B | ~4GB | ~5GB | High quality dialogue |

**Pros:**
- GGUF quantized versions for llama.cpp embedding
- Fine-tuned variant specifically for NPCs
- Can run on laptops/low-end hardware
- 128K context window for long conversations

**Cons:**
- Requires integration work with Go server

---

## Option 4: Server-Side Embedding (Go + llama.cpp bindings)

**Best for: Server-authoritative architecture (like CS Crawler)**

Since the game runs AI logic server-side (in Go), the LLM can be embedded there:

**Go bindings for llama.cpp:**
- [go-llama.cpp](https://github.com/go-skynet/go-llama.cpp)
- [llama-go](https://github.com/nicholasgasior/llama-go)

**Architecture:**
```
Player → WebSocket → Go Server → Embedded LLM → Response
                         ↓
                   enemy_ai.go (behavior)
                         +
                   npc_dialogue.go (new)
```

**Pros:**
- Consistent with server-authoritative design
- All players get same AI responses (deterministic state)
- No client hardware requirements
- Can integrate with existing enemy AI states

**Cons:**
- Server resource scaling (memory per concurrent LLM inference)
- Latency considerations for multiplayer

---

## Recommended Approach for CS Crawler

### 1. Behavior AI (keep current system)

The existing `enemy_ai.go` with state machines (Idle, Chase, Attack, Flee, Support) is well-suited for combat behavior. Don't replace this with LLM.

### 2. Conversational AI (add LLM for NPCs)

For friendly NPCs (shopkeepers, quest givers, lore NPCs):

```go
// Server-side approach
type NPCDialogue struct {
    model    *llama.Model  // Gemma 3 1B or 4B
    persona  string        // "You are a grumpy blacksmith..."
    memory   []Message     // Conversation history
}

func (npc *NPCDialogue) Respond(playerInput string) string {
    // Build prompt with persona + memory + input
    // Run inference
    // Return response
}
```

### 3. Suggested Model

- **Gemma 3 1B (Q4_K_M quantized)**: ~1GB memory, fast inference
- Scale to 4B if you need better quality

---

## Memory Considerations

For target of ~100 concurrent players:
- Gemma 3 1B: ~1GB per loaded model
- Can share one model instance across all NPC interactions
- Use a queue system for inference requests

The research paper on [Fixed-Persona SLMs with Modular Memory](https://arxiv.org/html/2511.10277) describes exactly this architecture: one base model + per-NPC persona/memory modules.

---

## References

- [GDLlama - Godot LLM Extension](https://github.com/xarillian/GDLlama)
- [NobodyWho - Local LLMs for Dialogue](https://godotengine.org/asset-library/asset/2886)
- [NVIDIA ACE for Games](https://developer.nvidia.com/ace-for-games)
- [NVIDIA Nemotron-4 4B Announcement](https://blogs.nvidia.com/blog/ai-decoded-gamescom-ace-nemotron-instruct/)
- [Gemma3NPC - NPC Interactions](https://huggingface.co/blog/chimbiwide/gemma3npc)
- [Gemma 3 QAT Models](https://developers.googleblog.com/en/gemma-3-quantized-aware-trained-state-of-the-art-ai-to-consumer-gpus/)
- [Fixed-Persona SLMs with Modular Memory](https://arxiv.org/html/2511.10277)
- [Local On-Device AI Companions](https://gladestudio.ai/news/local-on-device-ai-companions-the-next-frontier-in-immersive-worlds)
