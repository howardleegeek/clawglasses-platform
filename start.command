#!/bin/bash
cd "$(dirname "$0")"
echo "🔧 Installing dependencies..."
npm install
echo ""
echo "🚀 Starting Clawglasses..."
echo "   Open http://localhost:3000 in your browser"
echo "   Press Ctrl+C to stop"
echo ""
npm run dev
