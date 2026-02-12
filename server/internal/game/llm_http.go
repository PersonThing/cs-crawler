package game

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"sync"
	"time"
)

// HTTPLLMProvider implements LLMProvider using HTTP calls to llama-server or compatible API
type HTTPLLMProvider struct {
	baseURL string
	client  *http.Client
	mu      sync.Mutex
}

// HTTPLLMConfig holds configuration for HTTP LLM provider
type HTTPLLMConfig struct {
	BaseURL string // Base URL of the LLM server (e.g., "http://localhost:8080")
	Timeout int    // Request timeout in seconds (default: 30)
}

// completionRequest matches llama-server /completion endpoint format
type completionRequest struct {
	Prompt      string   `json:"prompt"`
	Temperature float64  `json:"temperature"`
	TopP        float64  `json:"top_p"`
	TopK        int      `json:"top_k"`
	MaxTokens   int      `json:"n_predict"`
	Stop        []string `json:"stop"`
	Grammar     string   `json:"grammar,omitempty"`
	Stream      bool     `json:"stream"`
}

// completionResponse matches llama-server response
type completionResponse struct {
	Content string `json:"content"`
	Stop    bool   `json:"stop"`
}

// NewHTTPLLMProvider creates a new HTTP-based LLM provider
func NewHTTPLLMProvider(cfg HTTPLLMConfig) (*HTTPLLMProvider, error) {
	if cfg.BaseURL == "" {
		return nil, fmt.Errorf("baseURL is required")
	}

	timeout := 30
	if cfg.Timeout > 0 {
		timeout = cfg.Timeout
	}

	log.Printf("[LLM] Connecting to HTTP LLM server at: %s", cfg.BaseURL)

	provider := &HTTPLLMProvider{
		baseURL: cfg.BaseURL,
		client: &http.Client{
			Timeout: time.Duration(timeout) * time.Second,
		},
	}

	// Test connection
	resp, err := provider.client.Get(cfg.BaseURL + "/health")
	if err != nil {
		log.Printf("[LLM] WARNING: Health check failed: %v (server may not be running yet)", err)
	} else {
		resp.Body.Close()
		if resp.StatusCode == 200 {
			log.Printf("[LLM] HTTP LLM server is healthy")
		}
	}

	return provider, nil
}

// Generate implements LLMProvider.Generate
func (p *HTTPLLMProvider) Generate(prompt string, grammar string) ([]byte, error) {
	p.mu.Lock()
	defer p.mu.Unlock()

	// Build request
	req := completionRequest{
		Prompt:      prompt,
		Temperature: 0.7,
		TopP:        0.9,
		TopK:        40,
		MaxTokens:   128,
		Stop:        []string{"</s>", "\n\n", "```"},
		Grammar:     grammar,
		Stream:      false,
	}

	reqBody, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	// Make HTTP request
	httpReq, err := http.NewRequest("POST", p.baseURL+"/completion", bytes.NewBuffer(reqBody))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := p.client.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("server returned %d: %s", resp.StatusCode, string(body))
	}

	// Parse response
	var completionResp completionResponse
	if err := json.NewDecoder(resp.Body).Decode(&completionResp); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return []byte(completionResp.Content), nil
}

// Name implements LLMProvider.Name
func (p *HTTPLLMProvider) Name() string {
	return "http-llm"
}

// Available implements LLMProvider.Available
func (p *HTTPLLMProvider) Available() bool {
	// Quick health check
	resp, err := p.client.Get(p.baseURL + "/health")
	if err != nil {
		return false
	}
	defer resp.Body.Close()
	return resp.StatusCode == 200
}
