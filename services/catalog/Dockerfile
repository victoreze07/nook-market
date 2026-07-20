FROM golang:1.24-alpine AS build
WORKDIR /src
COPY go.mod go.sum* ./
COPY main.go ./
RUN go mod tidy
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /catalog .
FROM alpine:3.22
RUN adduser -D -H app
COPY --from=build /catalog /catalog
EXPOSE 4001
USER app
CMD ["/catalog"]
