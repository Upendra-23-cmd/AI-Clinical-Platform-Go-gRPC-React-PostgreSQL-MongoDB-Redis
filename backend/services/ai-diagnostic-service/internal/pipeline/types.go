package pipeline

// AnthropicMsg is an exported alias for handler use.
type AnthropicMsg = anthropicMessage

// ChatHistoryItem represents a historical message for context.
type ChatHistoryItem struct {
	Role    string
	Content string
}
