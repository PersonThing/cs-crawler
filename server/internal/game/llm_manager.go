package game

import (
	"log"
	"sync"
	"time"
)

// LLMProvider is the interface for any LLM backend (llama.cpp, HTTP API, etc).
type LLMProvider interface {
	// Generate takes a prompt and GBNF grammar, returns constrained output bytes.
	Generate(prompt string, grammar string) ([]byte, error)

	// Name returns the provider name for logging.
	Name() string

	// Available returns true if the provider is ready to accept requests.
	Available() bool
}

// InferenceRequest is a queued request for the LLM.
type InferenceRequest struct {
	PlayerID string
	Snapshot *StateSnapshot
	Result   chan *AIAction
}

// LLMManager manages the async inference pipeline with batching and fallback.
type LLMManager struct {
	provider LLMProvider
	fallback *FallbackProvider

	// Request queue
	queue    chan InferenceRequest
	queueMu  sync.Mutex

	// Stats
	totalRequests   int64
	totalFallbacks  int64
	avgLatencyMs    float64

	// Configuration
	maxQueueSize    int
	maxBatchSize    int
	batchTimeoutMs  int

	// Lifecycle
	running bool
	stopCh  chan struct{}
}

// LLMManagerConfig holds configuration for the LLM manager.
type LLMManagerConfig struct {
	Provider       LLMProvider
	MaxQueueSize   int // Max pending requests before dropping
	MaxBatchSize   int // Max requests to batch per inference
	BatchTimeoutMs int // Max wait time to fill a batch
}

// NewLLMManager creates a new LLM manager with the given provider.
// If provider is nil or unavailable, all requests use the behavior tree fallback.
func NewLLMManager(cfg LLMManagerConfig) *LLMManager {
	if cfg.MaxQueueSize <= 0 {
		cfg.MaxQueueSize = 32
	}
	if cfg.MaxBatchSize <= 0 {
		cfg.MaxBatchSize = 4
	}
	if cfg.BatchTimeoutMs <= 0 {
		cfg.BatchTimeoutMs = 50
	}

	m := &LLMManager{
		provider:       cfg.Provider,
		fallback:       &FallbackProvider{},
		queue:          make(chan InferenceRequest, cfg.MaxQueueSize),
		maxQueueSize:   cfg.MaxQueueSize,
		maxBatchSize:   cfg.MaxBatchSize,
		batchTimeoutMs: cfg.BatchTimeoutMs,
		stopCh:         make(chan struct{}),
	}

	return m
}

// Start begins the inference worker goroutine.
func (m *LLMManager) Start() {
	if m.running {
		return
	}
	m.running = true

	providerName := "fallback"
	if m.provider != nil && m.provider.Available() {
		providerName = m.provider.Name()
	}
	log.Printf("[LLM] Manager started, provider=%s queue=%d batch=%d",
		providerName, m.maxQueueSize, m.maxBatchSize)

	go m.workerLoop()
}

// Stop shuts down the inference worker.
func (m *LLMManager) Stop() {
	if !m.running {
		return
	}
	m.running = false
	close(m.stopCh)
	log.Printf("[LLM] Manager stopped. requests=%d fallbacks=%d avgLatency=%.1fms",
		m.totalRequests, m.totalFallbacks, m.avgLatencyMs)
}

// RequestDecision queues an inference request. Non-blocking; drops if queue is full.
// The result will be sent on the returned channel.
func (m *LLMManager) RequestDecision(playerID string, snapshot *StateSnapshot) chan *AIAction {
	result := make(chan *AIAction, 1)

	req := InferenceRequest{
		PlayerID: playerID,
		Snapshot: snapshot,
		Result:   result,
	}

	select {
	case m.queue <- req:
		// queued
	default:
		// Queue full, use fallback immediately
		m.totalFallbacks++
		go func() {
			result <- nil // signal to use behavior tree
		}()
	}

	return result
}

// workerLoop processes inference requests in batches.
func (m *LLMManager) workerLoop() {
	batchTimeout := time.Duration(m.batchTimeoutMs) * time.Millisecond

	for {
		select {
		case <-m.stopCh:
			// Drain remaining requests with fallback
			for {
				select {
				case req := <-m.queue:
					req.Result <- nil
				default:
					return
				}
			}
		case firstReq := <-m.queue:
			// Collect a batch
			batch := []InferenceRequest{firstReq}
			timer := time.NewTimer(batchTimeout)

		collectLoop:
			for len(batch) < m.maxBatchSize {
				select {
				case req := <-m.queue:
					batch = append(batch, req)
				case <-timer.C:
					break collectLoop
				case <-m.stopCh:
					timer.Stop()
					for _, req := range batch {
						req.Result <- nil
					}
					return
				}
			}
			timer.Stop()

			// Process the batch
			m.processBatch(batch)
		}
	}
}

// processBatch runs inference for a batch of requests.
func (m *LLMManager) processBatch(batch []InferenceRequest) {
	useProvider := m.provider != nil && m.provider.Available()

	for _, req := range batch {
		m.totalRequests++
		start := time.Now()

		var action *AIAction

		if useProvider {
			prompt := req.Snapshot.ToPrompt()
			output, err := m.provider.Generate(prompt, ActionGBNF)
			if err != nil {
				log.Printf("[LLM] Inference error for player %s: %v (falling back)", req.PlayerID, err)
				m.totalFallbacks++
				action = nil // fallback
			} else {
				llmAction, err := ParseLLMAction(output)
				if err != nil {
					log.Printf("[LLM] Parse error for player %s: %v (falling back)", req.PlayerID, err)
					m.totalFallbacks++
					action = nil
				} else {
					// We need Player and enemies to convert, but we only have the snapshot.
					// The caller will handle conversion. Send raw action.
					action = &AIAction{
						Type:     llmAction.Action,
						Ability:  AbilityType(llmAction.Ability),
						Mood:     CharacterMood(llmAction.Mood),
						Dialogue: llmAction.Reason,
					}
				}
			}
		} else {
			m.totalFallbacks++
			action = nil // signal to caller to use behavior tree
		}

		elapsed := time.Since(start).Seconds() * 1000
		m.avgLatencyMs = m.avgLatencyMs*0.95 + elapsed*0.05

		req.Result <- action
	}
}

// Stats returns current performance statistics.
func (m *LLMManager) Stats() map[string]interface{} {
	providerName := "fallback"
	available := false
	if m.provider != nil {
		providerName = m.provider.Name()
		available = m.provider.Available()
	}

	return map[string]interface{}{
		"provider":       providerName,
		"available":      available,
		"totalRequests":  m.totalRequests,
		"totalFallbacks": m.totalFallbacks,
		"avgLatencyMs":   m.avgLatencyMs,
		"queueLength":    len(m.queue),
	}
}

// FallbackProvider is a no-op LLM provider that signals the caller to use
// the existing behavior tree instead.
type FallbackProvider struct{}

func (f *FallbackProvider) Generate(prompt string, grammar string) ([]byte, error) {
	return nil, nil
}

func (f *FallbackProvider) Name() string {
	return "fallback-behavior-tree"
}

func (f *FallbackProvider) Available() bool {
	return false
}
