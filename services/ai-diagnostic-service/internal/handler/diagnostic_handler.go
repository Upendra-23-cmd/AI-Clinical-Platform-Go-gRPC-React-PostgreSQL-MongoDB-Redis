package handler

import (
	"context"
	"strings"

	"go.uber.org/zap"

	"github.com/healthos/services/ai-diagnostic-service/internal/pipeline"
	apperrors "github.com/healthos/shared/errors"
)

// DiagnosticServiceServer implements the AI diagnostic gRPC service.
type DiagnosticServiceServer struct {
	ai     *pipeline.AIClient
	logger *zap.Logger
}

func NewDiagnosticServiceServer(ai *pipeline.AIClient, logger *zap.Logger) *DiagnosticServiceServer {
	return &DiagnosticServiceServer{ai: ai, logger: logger}
}

// AnalyzeSymptoms calls the AI pipeline to evaluate patient symptoms.
func (s *DiagnosticServiceServer) AnalyzeSymptoms(ctx context.Context, patientID, age, gender string, symptoms, conditions, medications []string) (*pipeline.SymptomAnalysisResult, error) {
	if len(symptoms) == 0 {
		return nil, apperrors.InvalidInput("at least one symptom is required").ToGRPCStatus()
	}

	s.logger.Info("analyzing symptoms",
		zap.String("patient_id", patientID),
		zap.Int("symptom_count", len(symptoms)),
	)

	result, err := s.ai.AnalyzeSymptoms(ctx, symptoms, age, gender, conditions, medications)
	if err != nil {
		s.logger.Error("symptom analysis failed", zap.Error(err))
		return nil, apperrors.Internal("AI analysis failed").ToGRPCStatus()
	}

	s.logger.Info("symptom analysis complete",
		zap.String("urgency", result.UrgencyLevel),
		zap.Bool("emergency", result.EmergencyReferral),
	)
	return result, nil
}

// GetRiskAssessment evaluates long-term patient health risk.
func (s *DiagnosticServiceServer) GetRiskAssessment(ctx context.Context, patientID, age, gender, lifestyle, familyHistory string, conditions []string) (*pipeline.RiskAssessmentResult, error) {
	s.logger.Info("running risk assessment", zap.String("patient_id", patientID))

	result, err := s.ai.AssessRisk(ctx, conditions, age, gender, lifestyle, familyHistory)
	if err != nil {
		s.logger.Error("risk assessment failed", zap.Error(err))
		return nil, apperrors.Internal("risk assessment failed").ToGRPCStatus()
	}

	s.logger.Info("risk assessment complete",
		zap.Float32("score", result.OverallRiskScore),
		zap.String("category", result.RiskCategory),
	)
	return result, nil
}

// GetTreatmentRecommendation generates treatment options.
func (s *DiagnosticServiceServer) GetTreatmentRecommendation(ctx context.Context, diagnosis, patientID, patientAge string, allergies, currentMeds []string) (*pipeline.TreatmentResult, error) {
	if diagnosis == "" {
		return nil, apperrors.InvalidInput("diagnosis is required").ToGRPCStatus()
	}

	result, err := s.ai.RecommendTreatment(ctx, diagnosis, patientAge, allergies, currentMeds)
	if err != nil {
		s.logger.Error("treatment recommendation failed", zap.Error(err))
		return nil, apperrors.Internal("treatment recommendation failed").ToGRPCStatus()
	}
	return result, nil
}

// GetDrugInteractions checks for dangerous medication combinations.
func (s *DiagnosticServiceServer) GetDrugInteractions(ctx context.Context, medications []string) (*pipeline.DrugInteractionResult, error) {
	if len(medications) < 2 {
		return nil, apperrors.InvalidInput("at least 2 medications required for interaction check").ToGRPCStatus()
	}

	result, err := s.ai.CheckDrugInteractions(ctx, medications)
	if err != nil {
		s.logger.Error("drug interaction check failed", zap.Error(err))
		return nil, apperrors.Internal("drug interaction check failed").ToGRPCStatus()
	}
	return result, nil
}

// ChatWithAI provides conversational medical AI.
func (s *DiagnosticServiceServer) ChatWithAI(ctx context.Context, patientID, message, patientContext string, history []pipeline.ChatHistoryItem) (string, bool, string, []string, error) {
	if strings.TrimSpace(message) == "" {
		return "", false, "", nil, apperrors.InvalidInput("message cannot be empty").ToGRPCStatus()
	}

	// Build message history for Anthropic API
	var msgs []pipeline.AnthropicMsg
	for _, h := range history {
		msgs = append(msgs, pipeline.AnthropicMsg{Role: h.Role, Content: h.Content})
	}
	msgs = append(msgs, pipeline.AnthropicMsg{Role: "user", Content: message})

	return s.ai.ChatWithAI(ctx, msgs, patientContext)
}

// GeneratePatientSummary creates an AI-written clinical summary.
func (s *DiagnosticServiceServer) GeneratePatientSummary(ctx context.Context, patientID, patientData string) (string, []string, []string, string, error) {
	if patientData == "" {
		return "", nil, nil, "", apperrors.InvalidInput("patient data is required").ToGRPCStatus()
	}

	summary, concerns, recs, next, err := s.ai.GeneratePatientSummary(ctx, patientData)
	if err != nil {
		s.logger.Error("patient summary failed", zap.Error(err))
		return "", nil, nil, "", apperrors.Internal("summary generation failed").ToGRPCStatus()
	}
	return summary, concerns, recs, next, nil
}
