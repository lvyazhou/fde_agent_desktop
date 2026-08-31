"""Debug: check what resolve_runtime_provider returns in ACP context."""
import sys, io, os, json
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
os.environ['HERMES_HOME'] = os.path.expanduser('~/.product-lobster')

from dotenv import load_dotenv
env_path = os.path.join(os.environ['HERMES_HOME'], '.env')
load_dotenv(env_path)
print(f"OPENAI_API_KEY from env: {os.environ.get('OPENAI_API_KEY', '?')[:40]}...")
print(f"OPENAI_BASE_URL from env: {os.environ.get('OPENAI_BASE_URL', '?')}")

sys.path.insert(0, r'd:\gitProject\claw-med-ai-platform\hermes-agent')

from hermes_cli.config import load_config
config = load_config()
print(f"\nconfig.model: {config.get('model')}")

from hermes_cli.runtime_provider import resolve_runtime_provider
try:
    runtime = resolve_runtime_provider(requested='custom')
    print(f"\nruntime provider: {runtime.get('provider')}")
    print(f"runtime base_url: {runtime.get('base_url')}")
    print(f"runtime api_key:  {str(runtime.get('api_key', ''))[:40]}...")
    print(f"runtime api_mode: {runtime.get('api_mode')}")
except Exception as e:
    print(f"resolve_runtime_provider error: {e}")

# Also try without explicit requested
try:
    runtime2 = resolve_runtime_provider()
    print(f"\nruntime2 (auto) provider: {runtime2.get('provider')}")
    print(f"runtime2 base_url: {runtime2.get('base_url')}")
    print(f"runtime2 api_key:  {str(runtime2.get('api_key', ''))[:40]}...")
    print(f"runtime2 api_mode: {runtime2.get('api_mode')}")
except Exception as e:
    print(f"resolve_runtime_provider (auto) error: {e}")
