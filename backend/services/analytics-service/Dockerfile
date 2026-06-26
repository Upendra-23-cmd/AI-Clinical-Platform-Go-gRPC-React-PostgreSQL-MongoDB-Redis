FROM --platform=linux/amd64 golang:1.20-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./

RUN go mod download

COPY . .

RUN go build -o analytics-service ./cmd/analytics-service

FROM alpine:latest

WORKDIR /root/

COPY --from=builder /app/analytics-service .

EXPOSE 8080

CMD ["./analytics-service"]
