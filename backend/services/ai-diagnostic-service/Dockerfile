FROM golang:1.22-alpine AS builder
WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux go build -o ai-diagnostic-service ./services/ai-diagnostic-service/cmd

FROM alpine:latest
RUN apk add --no-cache ca-certificates
WORKDIR /root/

COPY --from=builder /app/ai-diagnostic-service .

EXPOSE 8080
CMD ["./ai-diagnostic-service"]