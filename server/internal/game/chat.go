package game

import (
	"html"
	"regexp"
	"strings"
	"time"
)

// ChatMessageType defines the type of chat message
type ChatMessageType string

const (
	ChatMessageTypeNormal  ChatMessageType = "normal"
	ChatMessageTypeSystem  ChatMessageType = "system"
	ChatMessageTypeWhisper ChatMessageType = "whisper"
	ChatMessageTypeParty   ChatMessageType = "party"
)

// ChatMessage represents a chat message
type ChatMessage struct {
	ID        string          `json:"id"`
	Type      ChatMessageType `json:"type"`
	SenderID  string          `json:"senderID"`
	SenderName string         `json:"senderName"`
	Content   string          `json:"content"`
	Timestamp time.Time       `json:"timestamp"`
	TargetID  string          `json:"targetID,omitempty"`  // For whispers
}

// ChatService handles chat message processing
type ChatService struct {
	maxMessageLength int
	cooldownMs       int64
	lastMessageTime  map[string]int64 // playerID -> timestamp
}

// NewChatService creates a new chat service
func NewChatService() *ChatService {
	return &ChatService{
		maxMessageLength: 500,
		cooldownMs:       500, // 500ms between messages
		lastMessageTime:  make(map[string]int64),
	}
}

// CreateMessage creates and sanitizes a chat message
func (cs *ChatService) CreateMessage(senderID, senderName, content string, msgType ChatMessageType) (*ChatMessage, error) {
	// Check cooldown
	now := time.Now().UnixMilli()
	if lastTime, ok := cs.lastMessageTime[senderID]; ok {
		if now-lastTime < cs.cooldownMs {
			return nil, nil // Silently ignore spam
		}
	}
	cs.lastMessageTime[senderID] = now

	// Sanitize content
	content = cs.SanitizeMessage(content)

	if content == "" {
		return nil, nil // Empty message after sanitization
	}

	msg := &ChatMessage{
		ID:         generateMessageID(),
		Type:       msgType,
		SenderID:   senderID,
		SenderName: senderName,
		Content:    content,
		Timestamp:  time.Now(),
	}

	return msg, nil
}

// CreateWhisper creates a whisper message to a specific player
func (cs *ChatService) CreateWhisper(senderID, senderName, targetID, content string) (*ChatMessage, error) {
	msg, err := cs.CreateMessage(senderID, senderName, content, ChatMessageTypeWhisper)
	if err != nil || msg == nil {
		return nil, err
	}

	msg.TargetID = targetID
	return msg, nil
}

// CreateSystemMessage creates a system announcement
func (cs *ChatService) CreateSystemMessage(content string) *ChatMessage {
	return &ChatMessage{
		ID:         generateMessageID(),
		Type:       ChatMessageTypeSystem,
		SenderID:   "system",
		SenderName: "System",
		Content:    content,
		Timestamp:  time.Now(),
	}
}

// SanitizeMessage cleans up a message for safe display
func (cs *ChatService) SanitizeMessage(content string) string {
	// Trim whitespace
	content = strings.TrimSpace(content)

	// Limit length
	if len(content) > cs.maxMessageLength {
		content = content[:cs.maxMessageLength]
	}

	// Escape HTML entities to prevent XSS
	content = html.EscapeString(content)

	// Remove control characters
	content = removeControlCharacters(content)

	// Collapse multiple spaces
	spaceRegex := regexp.MustCompile(`\s+`)
	content = spaceRegex.ReplaceAllString(content, " ")

	return content
}

// ParseCommand parses a chat command if present
// Returns command name, args, and whether it was a command
func (cs *ChatService) ParseCommand(content string) (string, []string, bool) {
	content = strings.TrimSpace(content)

	if !strings.HasPrefix(content, "/") {
		return "", nil, false
	}

	parts := strings.Fields(content[1:]) // Remove leading /
	if len(parts) == 0 {
		return "", nil, false
	}

	command := strings.ToLower(parts[0])
	args := parts[1:]

	return command, args, true
}

// Serialize converts a ChatMessage to a map for JSON
func (m *ChatMessage) Serialize() map[string]interface{} {
	data := map[string]interface{}{
		"id":         m.ID,
		"type":       string(m.Type),
		"senderID":   m.SenderID,
		"senderName": m.SenderName,
		"content":    m.Content,
		"timestamp":  m.Timestamp.Unix(),
	}

	if m.TargetID != "" {
		data["targetID"] = m.TargetID
	}

	return data
}

// Helper functions

func generateMessageID() string {
	return "msg-" + string(rune(time.Now().UnixNano()))
}

func removeControlCharacters(s string) string {
	var result strings.Builder
	for _, r := range s {
		if r >= 32 || r == '\n' || r == '\t' {
			result.WriteRune(r)
		}
	}
	return result.String()
}
