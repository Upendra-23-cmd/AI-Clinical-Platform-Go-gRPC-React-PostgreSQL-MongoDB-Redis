package pipeline

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"go.uber.org/zap"
)

// AIClient wraps the Anthropic Messages API for medical AI tasks.
type AIClient struct {
	apiKey     string
	model      string
	baseURL    string
	httpClient *http.Client
	logger     *zap.Logger
}

type anthropicRequest struct {
	Model     string             `json:"model"`
	MaxTokens int                `json:"max_tokens"`
	System    string             `json:"system,omitempty"`
	Messages  []anthropicMessage `json:"messages"`
}

type anthropicMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type anthropicResponse struct {
	ID      string `json:"id"`
	Content []struct {
		Type string `json:"type"`
		Text string `json:"text"`
	} `json:"content"`
	Usage struct {
		InputTokens  int `json:"input_tokens"`
		OutputTokens int `json:"output_tokens"`
	} `json:"usage"`
}

// SymptomAnalysisResult is the structured output of the AI symptom pipeline.
type SymptomAnalysisResult struct {
	PossibleDiagnoses []DiagnosisItem `json:"possible_diagnoses"`
	UrgencyLevel      string          `json:"urgency_level"`
	Recommendation    string          `json:"recommendation"`
	FollowUpQuestions []string        `json:"follow_up_questions"`
	EmergencyReferral bool            `json:"emergency_referral"`
}

type DiagnosisItem struct {
	Condition    string  `json:"condition"`
	Confidence   float32 `json:"confidence"`
	Description  string  `json:"description"`
	ICDCode      string  `json:"icd_code"`
	UrgencyLevel string  `json:"urgency_level"`
}

// RiskAssessmentResult is the structured AI output for patient risk scoring.
type RiskAssessmentResult struct {
	OverallRiskScore  float32      `json:"overall_risk_score"`
	RiskCategory      string       `json:"risk_category"`
	RiskFactors       []RiskFactor `json:"risk_factors"`
	PreventiveMeasures []string    `json:"preventive_measures"`
	NextScreeningDate string       `json:"next_screening_date"`
}

type RiskFactor struct {
	Factor         string `json:"factor"`
	Severity       string `json:"severity"`
	Recommendation string `json:"recommendation"`
}

// TreatmentResult is the structured AI treatment recommendation.
type TreatmentResult struct {
	Options                []TreatmentOption `json:"options"`
	LifestyleRecommendations string          `json:"lifestyle_recommendations"`
	SpecialistReferrals    []string          `json:"specialist_referrals"`
	MonitoringPlan         string            `json:"monitoring_plan"`
}

type TreatmentOption struct {
	Treatment        string   `json:"treatment"`
	Description      string   `json:"description"`
	Effectiveness    float32  `json:"effectiveness"`
	SideEffects      []string `json:"side_effects"`
	RequiresSpecialist bool   `json:"requires_specialist"`
}

// DrugInteractionResult contains drug safety analysis.
type DrugInteractionResult struct {
	Interactions  []DrugInteraction `json:"interactions"`
	SafetySummary string            `json:"safety_summary"`
	Warnings      []string          `json:"warnings"`
}

type DrugInteraction struct {
	Drug1          string `json:"drug1"`
	Drug2          string `json:"drug2"`
	Severity       string `json:"severity"`
	Description    string `json:"description"`
	Recommendation string `json:"recommendation"`
}

func NewAIClient(apiKey, model, baseURL string, logger *zap.Logger) *AIClient {
	if model == "" {
		model = "claude-sonnet-4-20250514"
	}
	if baseURL == "" {
		baseURL = "https://api.anthropic.com"
	}
	return &AIClient{
		apiKey:  apiKey,
		model:   model,
		baseURL: baseURL,
		httpClient: &http.Client{
			Timeout: 60 * time.Second,
		},
		logger: logger,
	}
}

// AnalyzeSymptoms sends patient symptoms to the AI and returns structured diagnoses.
func (c *AIClient) AnalyzeSymptoms(ctx context.Context, symptoms []string, age, gender string, conditions, medications []string) (*SymptomAnalysisResult, error) {
	systemPrompt := `You are an expert medical AI assistant helping healthcare professionals.
Analyze the given symptoms and return ONLY a valid JSON object (no markdown, no explanation) with this exact structure:
{
  "possible_diagnoses": [
    {"condition": "string", "confidence": 0.0-1.0, "description": "string", "icd_code": "string", "urgency_level": "low|medium|high|critical"}
  ],
  "urgency_level": "low|medium|high|critical",
  "recommendation": "string",
  "follow_up_questions": ["string"],
  "emergency_referral": false
}
Always return 2-5 possible diagnoses ordered by confidence. Be medically accurate.`

	prompt := fmt.Sprintf(`Patient Profile:
- Age: %s
- Gender: %s
- Existing conditions: %s
- Current medications: %s

Presenting symptoms:
%s

Analyze these symptoms and provide your assessment.`,
		age, gender,
		strings.Join(conditions, ", "),
		strings.Join(medications, ", "),
		strings.Join(symptoms, "\n"),
	)

	raw, err := c.complete(ctx, systemPrompt, prompt)
	if err != nil {
		return nil, err
	}

	var result SymptomAnalysisResult
	if err := json.Unmarshal([]byte(raw), &result); err != nil {
		c.logger.Error("failed to parse AI symptom response", zap.Error(err), zap.String("raw", raw))
		return nil, fmt.Errorf("failed to parse AI response: %w", err)
	}
	return &result, nil
}

// AssessRisk evaluates the patient's long-term health risk.
func (c *AIClient) AssessRisk(ctx context.Context, conditions []string, age, gender, lifestyle, familyHistory string) (*RiskAssessmentResult, error) {
	systemPrompt := `You are a medical risk assessment AI. Analyze patient data and return ONLY a valid JSON object:
{
  "overall_risk_score": 0.0-100.0,
  "risk_category": "low|moderate|high|critical",
  "risk_factors": [
    {"factor": "string", "severity": "low|medium|high", "recommendation": "string"}
  ],
  "preventive_measures": ["string"],
  "next_screening_date": "YYYY-MM-DD"
}
Be clinically accurate and evidence-based.`

	prompt := fmt.Sprintf(`Patient risk assessment:
- Age: %s | Gender: %s
- Conditions: %s
- Lifestyle: %s
- Family history: %s`,
		age, gender, strings.Join(conditions, ", "), lifestyle, familyHistory)

	raw, err := c.complete(ctx, systemPrompt, prompt)
	if err != nil {
		return nil, err
	}

	var result RiskAssessmentResult
	if err := json.Unmarshal([]byte(raw), &result); err != nil {
		return nil, fmt.Errorf("failed to parse risk response: %w", err)
	}
	return &result, nil
}

// RecommendTreatment generates treatment options for a diagnosis.
func (c *AIClient) RecommendTreatment(ctx context.Context, diagnosis, patientAge string, allergies, currentMeds []string) (*TreatmentResult, error) {
	systemPrompt := `You are a clinical decision support AI. Return ONLY a valid JSON object:
{
  "options": [
    {"treatment": "string", "description": "string", "effectiveness": 0.0-1.0, "side_effects": ["string"], "requires_specialist": false}
  ],
  "lifestyle_recommendations": "string",
  "specialist_referrals": ["string"],
  "monitoring_plan": "string"
}
Consider drug allergies and existing medications. Provide 2-4 treatment options.`

	prompt := fmt.Sprintf(`Diagnosis: %s
Patient age: %s
Allergies: %s
Current medications: %s`,
		diagnosis, patientAge, strings.Join(allergies, ", "), strings.Join(currentMeds, ", "))

	raw, err := c.complete(ctx, systemPrompt, prompt)
	if err != nil {
		return nil, err
	}

	var result TreatmentResult
	if err := json.Unmarshal([]byte(raw), &result); err != nil {
		return nil, fmt.Errorf("failed to parse treatment response: %w", err)
	}
	return &result, nil
}

// CheckDrugInteractions checks for dangerous drug combinations.
func (c *AIClient) CheckDrugInteractions(ctx context.Context, medications []string) (*DrugInteractionResult, error) {
	systemPrompt := `You are a clinical pharmacology AI. Analyze drug interactions and return ONLY a valid JSON object:
{
  "interactions": [
    {"drug1": "string", "drug2": "string", "severity": "minor|moderate|major|contraindicated", "description": "string", "recommendation": "string"}
  ],
  "safety_summary": "string",
  "warnings": ["string"]
}
If no interactions exist, return an empty interactions array with a positive safety_summary.`

	prompt := fmt.Sprintf("Check interactions for these medications: %s", strings.Join(medications, ", "))

	raw, err := c.complete(ctx, systemPrompt, prompt)
	if err != nil {
		return nil, err
	}

	var result DrugInteractionResult
	if err := json.Unmarshal([]byte(raw), &result); err != nil {
		return nil, fmt.Errorf("failed to parse drug interaction response: %w", err)
	}
	return &result, nil
}

// ChatWithAI provides a conversational medical AI interface.
func (c *AIClient) ChatWithAI(ctx context.Context, messages []anthropicMessage, patientContext string) (string, bool, string, []string, error) {
	systemPrompt := fmt.Sprintf(`You are HealthOS AI, a compassionate and knowledgeable medical assistant.
You help patients understand their health, answer medical questions, and guide them to appropriate care.
Patient context: %s

Guidelines:
- Always be empathetic and clear
- Never diagnose definitively — guide patients to see doctors
- Flag emergencies immediately with EMERGENCY: prefix
- End responses with 1-2 follow-up suggestions if helpful
- Maintain patient privacy and professionalism`, patientContext)

	req := &anthropicRequest{
		Model:     c.model,
		MaxTokens: 1000,
		System:    systemPrompt,
		Messages:  messages,
	}

	resp, err := c.call(ctx, req)
	if err != nil {
		return "", false, "low", nil, err
	}

	text := ""
	if len(resp.Content) > 0 {
		text = resp.Content[0].Text
	}

	escalate := strings.Contains(strings.ToUpper(text), "EMERGENCY:")
	urgency := "low"
	if escalate {
		urgency = "critical"
	} else if strings.Contains(strings.ToLower(text), "urgent") || strings.Contains(strings.ToLower(text), "immediate") {
		urgency = "high"
	}

	return text, escalate, urgency, []string{}, nil
}

// GeneratePatientSummary creates a clinical summary for a patient's records.
func (c *AIClient) GeneratePatientSummary(ctx context.Context, patientData string) (string, []string, []string, string, error) {
	systemPrompt := `You are a clinical documentation AI. Given patient data, create a concise clinical summary.
Return a JSON object:
{
  "summary": "string",
  "key_concerns": ["string"],
  "recommendations": ["string"],
  "next_steps": "string"
}`

	raw, err := c.complete(ctx, systemPrompt, "Generate a clinical summary for:\n"+patientData)
	if err != nil {
		return "", nil, nil, "", err
	}

	var result struct {
		Summary         string   `json:"summary"`
		KeyConcerns     []string `json:"key_concerns"`
		Recommendations []string `json:"recommendations"`
		NextSteps       string   `json:"next_steps"`
	}
	if err := json.Unmarshal([]byte(raw), &result); err != nil {
		return raw, nil, nil, "", nil
	}
	return result.Summary, result.KeyConcerns, result.Recommendations, result.NextSteps, nil
}

// complete sends a single user turn and returns the raw text.
func (c *AIClient) complete(ctx context.Context, system, userMsg string) (string, error) {
	req := &anthropicRequest{
		Model:     c.model,
		MaxTokens: 1500,
		System:    system,
		Messages:  []anthropicMessage{{Role: "user", Content: userMsg}},
	}
	resp, err := c.call(ctx, req)
	if err != nil {
		return "", err
	}
	if len(resp.Content) == 0 {
		return "", fmt.Errorf("empty AI response")
	}
	return resp.Content[0].Text, nil
}

// call executes an Anthropic API request.
func (c *AIClient) call(ctx context.Context, reqBody *anthropicRequest) (*anthropicResponse, error) {
	data, err := json.Marshal(reqBody)
	if err != nil {
		return nil, err
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+"/v1/messages", bytes.NewReader(data))
	if err != nil {
		return nil, err
	}
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("x-api-key", c.apiKey)
	httpReq.Header.Set("anthropic-version", "2023-06-01")

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("AI API request failed: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("AI API error %d: %s", resp.StatusCode, string(body))
	}

	var result anthropicResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("failed to parse AI API response: %w", err)
	}
	return &result, nil
}
