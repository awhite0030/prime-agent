import sys

content = open('prime-agent-runtime/test/test_bash.py').read()
lines = content.split('\n')

insert_idx = -1
for i, line in enumerate(lines):
    if line.startswith('class BashTest'):
        insert_idx = i + 1
        break

new_methods = [
    '    @unittest.skipUnless(sys.platform == "darwin", "darwin-only")',
    '    def test_process_start_id_darwin(self):',
    '        # Real sysctl for the test process',
    '        pid = os.getpid()',
    '        sysctl_id = bash_module._darwin_start_id(pid)',
    '        self.assertIsNotNone(sysctl_id)',
    '        self.assertTrue(sysctl_id.startswith("ps:"))',
    '',
    '        # Should match ps output with pinned TZ/locale exactly',
    '        env = dict(os.environ)',
    '        env.update({"LC_ALL": "C", "LC_TIME": "C", "LANG": "C", "TZ": "UTC"})',
    '        ps_out = subprocess.run(',
    '            ["/bin/ps", "-p", str(pid), "-o", "lstart="],',
    '            capture_output=True,',
    '            text=True,',
    '            env=env,',
    '        ).stdout.strip()',
    '        self.assertEqual(sysctl_id, f"ps:{ps_out}")',
    '',
    '        # Non-existent pid',
    '        self.assertIsNone(bash_module._darwin_start_id(999999))',
    '',
    '    def test_process_start_id_ps_fallback(self):',
    '        # Verify ps fallback sets the correct environment variables',
    '        with mock.patch("subprocess.run") as mock_run:',
    '            mock_run.return_value.stdout = "Mon Sep 14 01:07:27 2026\\n"',
    '            with mock.patch("sys.platform", "linux"):',
    '                with mock.patch("builtins.open", side_effect=OSError):',
    '                    res = bash_module._process_start_id(1)',
    '                    self.assertEqual(res, "ps:Mon Sep 14 01:07:27 2026")',
    '                    mock_run.assert_called_once()',
    '                    env = mock_run.call_args[1].get("env", {})',
    '                    self.assertEqual(env.get("TZ"), "UTC")',
    '                    self.assertEqual(env.get("LC_ALL"), "C")',
    ''
]

lines = lines[:insert_idx] + new_methods + lines[insert_idx:]
with open('prime-agent-runtime/test/test_bash.py', 'w') as f:
    f.write('\n'.join(lines))
