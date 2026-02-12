package game

import (
	"strings"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNewChatService(t *testing.T) {
	cs := NewChatService()

	assert.NotNil(t, cs)
	assert.Equal(t, 500, cs.maxMessageLength)
	assert.Equal(t, int64(500), cs.cooldownMs)
	assert.NotNil(t, cs.lastMessageTime)
}

func TestCreateMessage(t *testing.T) {
	cs := NewChatService()

	msg, err := cs.CreateMessage("player1", "TestPlayer", "Hello, world!", ChatMessageTypeNormal)

	require.NoError(t, err)
	require.NotNil(t, msg)
	assert.Equal(t, "player1", msg.SenderID)
	assert.Equal(t, "TestPlayer", msg.SenderName)
	assert.Equal(t, "Hello, world!", msg.Content)
	assert.Equal(t, ChatMessageTypeNormal, msg.Type)
	assert.NotEmpty(t, msg.ID)
	assert.False(t, msg.Timestamp.IsZero())
}

func TestCreateMessageSanitization(t *testing.T) {
	cs := NewChatService()

	// Test HTML escaping
	msg, _ := cs.CreateMessage("player1", "TestPlayer", "<script>alert('xss')</script>", ChatMessageTypeNormal)
	assert.NotContains(t, msg.Content, "<script>")
	assert.Contains(t, msg.Content, "&lt;script&gt;")

	// Wait for cooldown
	time.Sleep(600 * time.Millisecond)

	// Test whitespace trimming and collapsing
	msg2, _ := cs.CreateMessage("player1", "TestPlayer", "  multiple   spaces  ", ChatMessageTypeNormal)
	assert.Equal(t, "multiple spaces", msg2.Content)
}

func TestCreateMessageLengthLimit(t *testing.T) {
	cs := NewChatService()

	// Create a very long message
	longMessage := strings.Repeat("a", 1000)
	msg, _ := cs.CreateMessage("player1", "TestPlayer", longMessage, ChatMessageTypeNormal)

	assert.LessOrEqual(t, len(msg.Content), cs.maxMessageLength)
}

func TestCreateMessageEmptyContent(t *testing.T) {
	cs := NewChatService()

	// Empty message after sanitization should return nil
	msg, err := cs.CreateMessage("player1", "TestPlayer", "   ", ChatMessageTypeNormal)

	assert.NoError(t, err)
	assert.Nil(t, msg)
}

func TestCreateMessageCooldown(t *testing.T) {
	cs := NewChatService()

	// First message should succeed
	msg1, _ := cs.CreateMessage("player1", "TestPlayer", "First message", ChatMessageTypeNormal)
	assert.NotNil(t, msg1)

	// Immediate second message should be silently ignored (spam)
	msg2, err := cs.CreateMessage("player1", "TestPlayer", "Second message", ChatMessageTypeNormal)
	assert.NoError(t, err)
	assert.Nil(t, msg2) // Silently ignored due to cooldown

	// Wait for cooldown to expire
	time.Sleep(600 * time.Millisecond)

	// Now should succeed
	msg3, _ := cs.CreateMessage("player1", "TestPlayer", "Third message", ChatMessageTypeNormal)
	assert.NotNil(t, msg3)
}

func TestCreateMessageDifferentPlayers(t *testing.T) {
	cs := NewChatService()

	// Different players should have separate cooldowns
	msg1, _ := cs.CreateMessage("player1", "Player1", "Message from player 1", ChatMessageTypeNormal)
	assert.NotNil(t, msg1)

	msg2, _ := cs.CreateMessage("player2", "Player2", "Message from player 2", ChatMessageTypeNormal)
	assert.NotNil(t, msg2)
}

func TestCreateWhisper(t *testing.T) {
	cs := NewChatService()

	whisper, err := cs.CreateWhisper("sender", "SenderName", "target", "Secret message")

	require.NoError(t, err)
	require.NotNil(t, whisper)
	assert.Equal(t, ChatMessageTypeWhisper, whisper.Type)
	assert.Equal(t, "sender", whisper.SenderID)
	assert.Equal(t, "target", whisper.TargetID)
	assert.Equal(t, "Secret message", whisper.Content)
}

func TestCreateSystemMessage(t *testing.T) {
	cs := NewChatService()

	sysMsg := cs.CreateSystemMessage("Server is restarting!")

	assert.NotNil(t, sysMsg)
	assert.Equal(t, ChatMessageTypeSystem, sysMsg.Type)
	assert.Equal(t, "system", sysMsg.SenderID)
	assert.Equal(t, "System", sysMsg.SenderName)
	assert.Equal(t, "Server is restarting!", sysMsg.Content)
}

func TestSanitizeMessage(t *testing.T) {
	cs := NewChatService()

	tests := []struct {
		input    string
		expected string
	}{
		{"  hello  ", "hello"},
		{"multiple   spaces", "multiple spaces"},
		{"<b>bold</b>", "&lt;b&gt;bold&lt;/b&gt;"},
		{"line1\nline2", "line1 line2"}, // Newlines collapsed to spaces
		{"tab\there", "tab here"},        // Tabs collapsed
	}

	for _, tt := range tests {
		result := cs.SanitizeMessage(tt.input)
		assert.Equal(t, tt.expected, result, "Input: %q", tt.input)
	}
}

func TestSanitizeMessageControlCharacters(t *testing.T) {
	cs := NewChatService()

	// Control characters should be removed (except newline and tab)
	input := "Hello\x00World\x01Test"
	result := cs.SanitizeMessage(input)

	assert.NotContains(t, result, "\x00")
	assert.NotContains(t, result, "\x01")
	assert.Equal(t, "HelloWorldTest", result)
}

func TestParseCommand(t *testing.T) {
	cs := NewChatService()

	tests := []struct {
		input     string
		command   string
		argsLen   int
		isCommand bool
	}{
		{"/whisper player hello", "whisper", 2, true},
		{"/me waves", "me", 1, true},
		{"/HELP", "help", 0, true},
		{"not a command", "", 0, false},
		{"/", "", 0, false},
		{"  /cmd  ", "cmd", 0, true},
	}

	for _, tt := range tests {
		cmd, args, isCmd := cs.ParseCommand(tt.input)
		assert.Equal(t, tt.isCommand, isCmd, "Input: %q", tt.input)
		if tt.isCommand {
			assert.Equal(t, tt.command, cmd, "Input: %q", tt.input)
			assert.Len(t, args, tt.argsLen, "Input: %q", tt.input)
		}
	}
}

func TestChatMessageSerialize(t *testing.T) {
	msg := &ChatMessage{
		ID:         "msg-123",
		Type:       ChatMessageTypeNormal,
		SenderID:   "player1",
		SenderName: "TestPlayer",
		Content:    "Hello!",
		Timestamp:  time.Now(),
	}

	data := msg.Serialize()

	assert.Equal(t, "msg-123", data["id"])
	assert.Equal(t, "normal", data["type"])
	assert.Equal(t, "player1", data["senderID"])
	assert.Equal(t, "TestPlayer", data["senderName"])
	assert.Equal(t, "Hello!", data["content"])
	assert.Contains(t, data, "timestamp")
	assert.NotContains(t, data, "targetID") // No target for normal message
}

func TestChatMessageSerializeWithTarget(t *testing.T) {
	msg := &ChatMessage{
		ID:         "msg-456",
		Type:       ChatMessageTypeWhisper,
		SenderID:   "sender",
		SenderName: "Sender",
		Content:    "Secret",
		Timestamp:  time.Now(),
		TargetID:   "target",
	}

	data := msg.Serialize()

	assert.Equal(t, "target", data["targetID"])
}

func TestChatMessageTypes(t *testing.T) {
	assert.Equal(t, ChatMessageType("normal"), ChatMessageTypeNormal)
	assert.Equal(t, ChatMessageType("system"), ChatMessageTypeSystem)
	assert.Equal(t, ChatMessageType("whisper"), ChatMessageTypeWhisper)
	assert.Equal(t, ChatMessageType("party"), ChatMessageTypeParty)
}
