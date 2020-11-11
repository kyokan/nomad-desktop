#!/bin/bash

NODE_ENV=production INDEXER_API=http://localhost:7373 npm run build-electron
./node_modules/.bin/electron-builder build  --win --x64 --arm64=false
