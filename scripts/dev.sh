#!/usr/bin/env bash
# Starts a Fast Refresh dev session: device -> Debug build/install -> port forwarding -> Metro + app launch.
# Each step is skipped when it's already done, so it is safe to re-run.
# With a real device connected it asks whether to use it or the Vega Virtual Device.
#
# Usage: scripts/dev.sh [--build] [--reset-cache]
#   --build        force a Debug rebuild and reinstall
#   --reset-cache  start Metro with --reset-cache

set -euo pipefail

cd "$(dirname "$0")/.."

PORT=8081
FORCE_BUILD=false
METRO_ARGS=()

for arg in "$@"; do
  case "$arg" in
    --build) FORCE_BUILD=true ;;
    --reset-cache) METRO_ARGS+=(--reset-cache) ;;
    -h | --help)
      sed -n '2,9p' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *)
      echo "Unknown option: $arg" >&2
      exit 1
      ;;
  esac
done

log() { printf '\033[1;36m▸ %s\033[0m\n' "$*"; }

metro_running() {
  [ "$(curl -s "http://localhost:$PORT/status" 2>/dev/null)" = 'packager-status:running' ]
}

VIRTUAL_DEVICE=VirtualDevice

# `vega device list` prints one "<id> : <details>" line per device; <id> is what -d accepts.
real_devices() {
  vega device list 2>&1 | awk -F ' : ' -v vd="$VIRTUAL_DEVICE" 'NF > 1 && $1 != vd { print $1 }'
}

virtual_device_running() {
  vega device list 2>&1 | grep -q "^$VIRTUAL_DEVICE : "
}

use_virtual_device() {
  if ! virtual_device_running; then
    log 'Starting Vega Virtual Device...'
    vega virtual-device start
  fi
  DEVICE=$VIRTUAL_DEVICE
}

# 1. Device: offer connected real devices, otherwise use the Virtual Device.
DEVICES=()
while IFS= read -r id; do
  [ -n "$id" ] && DEVICES+=("$id")
done < <(real_devices)

if [ ${#DEVICES[@]} -eq 0 ]; then
  log 'No real device connected, using Vega Virtual Device.'
  use_virtual_device
elif [ ! -t 0 ]; then
  log "Not interactive, using real device ${DEVICES[0]}."
  DEVICE=${DEVICES[0]}
else
  echo 'Where should the app run?'
  for i in "${!DEVICES[@]}"; do
    echo "  $((i + 1))) Use real device ${DEVICES[$i]}"
  done
  last=$((${#DEVICES[@]} + 1))
  echo "  $last) Use Virtual Device"
  while :; do
    read -r -p "Choose [1-$last, default 1]: " choice
    choice=${choice:-1}
    if [[ $choice =~ ^[0-9]+$ ]] && [ "$choice" -ge 1 ] && [ "$choice" -le "$last" ]; then
      break
    fi
    echo 'Invalid choice.'
  done
  if [ "$choice" -lt "$last" ]; then
    DEVICE=${DEVICES[$((choice - 1))]}
  else
    use_virtual_device
  fi
fi
log "Device: $DEVICE"

# 2. Build when forced, when there's no Debug package, or when build inputs changed since the last build.
vpkg=$(find build -path '*-debug/*.vpkg' 2>/dev/null | head -1)
if $FORCE_BUILD || [ -z "$vpkg" ] ||
  [ -n "$(find manifest.toml package.json pnpm-lock.yaml -newer "$vpkg" 2>/dev/null)" ]; then
  log 'Building Debug...'
  pnpm build:debug
  needs_install=true
elif vega device is-app-installed -d "$DEVICE" --dir . 2>&1 | grep -qi 'true'; then
  needs_install=false
else
  needs_install=true
fi

if $needs_install; then
  log 'Installing Debug build...'
  vega device install-app -d "$DEVICE" --dir . -b Debug
fi

# 3. Reverse port forwarding so the device can reach Metro. It lasts until the device reboots.
if ! vega device is-port-forwarded -d "$DEVICE" --port "$PORT" --forward false 2>&1 | grep -qi 'true'; then
  log "Forwarding port $PORT from device..."
  vega device start-port-forwarding -d "$DEVICE" --port "$PORT" --forward false
fi

# 4. Metro in the foreground (keeps r/d shortcuts); the app launches once Metro answers.
if metro_running; then
  log 'Metro is already running, relaunching the app...'
  vega device terminate-app -d "$DEVICE" --dir . >/dev/null 2>&1 || true
  vega device launch-app -d "$DEVICE" --dir .
  exit 0
fi

(
  for _ in $(seq 1 30); do
    sleep 1
    if metro_running; then
      vega device launch-app -d "$DEVICE" --dir . >/dev/null 2>&1 &&
        log 'App launched. Edit files and save to Fast Refresh.' ||
        log "App launch failed, run: vega device launch-app -d $DEVICE --dir ."
      exit 0
    fi
  done
  log 'Metro did not start within 30s, app not launched.'
) &

log 'Starting Metro...'
exec pnpm start ${METRO_ARGS[@]+"${METRO_ARGS[@]}"}
