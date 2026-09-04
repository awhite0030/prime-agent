#!/bin/bash
export ANTHROPIC_API_KEY="test_key"
export PI_API_KEY="test_key"
export PRIME_API_KEY="test_key"
export HOME=/app

mkdir -p /app/.prime/agent
cat << 'JSON_EOF' > /app/.prime/agent/config.json
{
  "theme": "dark"
}
JSON_EOF

tmux new-session -d -s prime-agent-test -x 100 -y 30
tmux send-keys -t prime-agent-test "cd packages/coding-agent && npx tsx src/cli.ts --verbose" Enter
sleep 10
tmux send-keys -t prime-agent-test "hi" Enter
sleep 3
tmux send-keys -t prime-agent-test Escape
tmux send-keys -t prime-agent-test C-l
sleep 1
tmux send-keys -t prime-agent-test "!" Enter
sleep 1
tmux capture-pane -t prime-agent-test -pe > interactive-mode.ansi
tmux kill-session -t prime-agent-test

tmux new-session -d -s prime-agent-test2 -x 100 -y 30
tmux send-keys -t prime-agent-test2 "cd packages/coding-agent && npx tsx src/cli.ts" Enter
sleep 10
tmux send-keys -t prime-agent-test2 C-o
sleep 1
tmux capture-pane -t prime-agent-test2 -pe > tree-view.ansi
tmux kill-session -t prime-agent-test2

tmux new-session -d -s prime-agent-test3 -x 100 -y 30
tmux send-keys -t prime-agent-test3 "cd packages/coding-agent && npx tsx src/cli.ts --verbose" Enter
sleep 10
tmux send-keys -t prime-agent-test3 "/goal" Enter
sleep 1
tmux capture-pane -t prime-agent-test3 -pe > doom-extension.ansi
tmux kill-session -t prime-agent-test3
