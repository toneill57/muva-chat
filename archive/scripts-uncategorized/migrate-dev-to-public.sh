#!/bin/bash
echo "🔄 Comparing Dev vs Public..."

diff src/lib/dev-chat-engine.ts src/lib/public-chat-engine.ts > diff-engines.txt
diff src/components/Dev/DevChatMobileDev.tsx src/components/Public/ChatMobile.tsx > diff-components.txt

grep -n "slice(-50)" src/lib/*-chat-engine.ts

echo "✅ Review diff-engines.txt and diff-components.txt"
