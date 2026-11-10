#!/bin/sh
# Yarn PnP라 node_modules가 없어 oxc 확장이 oxfmt를 찾지 못하므로 저장소의 oxfmt를 yarn으로 실행
cd "$(dirname "$0")/.." && exec yarn oxfmt "$@"
