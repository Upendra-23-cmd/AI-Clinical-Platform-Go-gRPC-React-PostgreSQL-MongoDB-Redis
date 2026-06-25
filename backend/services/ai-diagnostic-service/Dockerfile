FROM golang:1.20-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./

RUN go mod download

COPY . .

RUN go build -o ai-diagnostic-service ./cmd/ai-diagnostic-service

FROM alpine:latest

WORKDIR /root/

COPY --from=builder /app/ai-diagnostic-service .

EXPOSE 8080

CMD ["./ai-diagnostic-service"]