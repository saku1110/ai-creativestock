FROM mcr.microsoft.com/devcontainers/javascript-node:20

# タイムゾーン＆ロケール
ENV TZ=Asia/Tokyo \
    LC_ALL=C.UTF-8 \
    LANG=C.UTF-8

# よく使うツール
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      python3 python3-pip git curl ca-certificates unzip && \
    rm -rf /var/lib/apt/lists/*
