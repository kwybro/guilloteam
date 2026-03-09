#!/usr/bin/env sh
set -e

REPO="kwybro/guilloteam"
BINARY="guillo"
INSTALL_DIR="/usr/local/bin"

OS=$(uname -s | tr '[:upper:]' '[:lower:]')
ARCH=$(uname -m)

case "$OS" in
  darwin)
    case "$ARCH" in
      arm64)   ARTIFACT="guillo-darwin-arm64" ;;
      x86_64)  ARTIFACT="guillo-darwin-x64" ;;
      *)       echo "Unsupported architecture: $ARCH" && exit 1 ;;
    esac
    ;;
  linux)
    case "$ARCH" in
      aarch64|arm64) ARTIFACT="guillo-linux-arm64" ;;
      x86_64)        ARTIFACT="guillo-linux-x64" ;;
      *)             echo "Unsupported architecture: $ARCH" && exit 1 ;;
    esac
    ;;
  *)
    echo "Unsupported OS: $OS"
    exit 1
    ;;
esac

URL="https://github.com/$REPO/releases/latest/download/$ARTIFACT"

echo "Downloading guillo for $OS/$ARCH..."
curl -fsSL "$URL" -o "$INSTALL_DIR/$BINARY"
chmod +x "$INSTALL_DIR/$BINARY"

echo "guillo installed to $INSTALL_DIR/$BINARY"
echo "Run 'guillo --version' to verify."
