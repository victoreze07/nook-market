FROM golang:1.24-alpine AS build
WORKDIR /src
COPY go.mod go.sum* ./
COPY main.go ./
RUN go mod tidy
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /cart .
FROM alpine:3.22
RUN adduser -D -H app
COPY --from=build /cart /cart
EXPOSE 4002
USER app
CMD ["/cart"]
