package errors

import (
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

// Domain error types
type ErrorCode string

const (
	ErrNotFound       ErrorCode = "NOT_FOUND"
	ErrAlreadyExists  ErrorCode = "ALREADY_EXISTS"
	ErrInvalidInput   ErrorCode = "INVALID_INPUT"
	ErrUnauthorized   ErrorCode = "UNAUTHORIZED"
	ErrForbidden      ErrorCode = "FORBIDDEN"
	ErrInternalError  ErrorCode = "INTERNAL_ERROR"
	ErrServiceTimeout ErrorCode = "SERVICE_TIMEOUT"
	ErrCacheMiss      ErrorCode = "CACHE_MISS"
)

type AppError struct {
	Code    ErrorCode
	Message string
	Details map[string]interface{}
}

func (e *AppError) Error() string {
	return e.Message
}

func New(code ErrorCode, message string) *AppError {
	return &AppError{Code: code, Message: message}
}

func NewWithDetails(code ErrorCode, message string, details map[string]interface{}) *AppError {
	return &AppError{Code: code, Message: message, Details: details}
}

// ToGRPCStatus converts AppError to gRPC status
func (e *AppError) ToGRPCStatus() error {
	var code codes.Code
	switch e.Code {
	case ErrNotFound:
		code = codes.NotFound
	case ErrAlreadyExists:
		code = codes.AlreadyExists
	case ErrInvalidInput:
		code = codes.InvalidArgument
	case ErrUnauthorized:
		code = codes.Unauthenticated
	case ErrForbidden:
		code = codes.PermissionDenied
	case ErrServiceTimeout:
		code = codes.DeadlineExceeded
	default:
		code = codes.Internal
	}
	return status.Error(code, e.Message)
}

// Convenience constructors
func NotFound(entity, id string) *AppError {
	return New(ErrNotFound, entity+" with id "+id+" not found")
}

func InvalidInput(message string) *AppError {
	return New(ErrInvalidInput, message)
}

func Internal(message string) *AppError {
	return New(ErrInternalError, message)
}

func Unauthorized(message string) *AppError {
	return New(ErrUnauthorized, message)
}
