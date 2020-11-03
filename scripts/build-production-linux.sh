#!/bin/bash

NODE_ENV=production npm run build-electron
./node_modules/.bin/electron-builder --linux