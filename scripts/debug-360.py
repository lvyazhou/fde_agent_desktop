"""Debug script: intercept what hermes sends to 360 API."""
import sys, io, os, json
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
os.environ['HERMES_HOME'] = os.path.expanduser('~/.product-lobster')

from dotenv import load_dotenv
load_dotenv(os.path.join(os.environ['HERMES_HOME'], '.env'))

import httpx
original_send = httpx.Client.send
def patched_send(self, request, **kwargs):
    url = str(request.url)
    if 'chat/completions' in url:
        body = json.loads(request.content.decode('utf-8'))
        print('=== REQUEST TO 360 API ===', flush=True)
        for k, v in body.items():
            if k == 'messages':
                print(f'  messages: [{len(v)} items]', flush=True)
                for i, m in enumerate(v[:3]):
                    role = m.get('role', '?')
                    content = str(m.get('content', ''))[:100]
                    print(f'    [{i}] role={role} content={content}...', flush=True)
            elif k == 'tools':
                if v:
                    print(f'  tools: [{len(v)} tools]', flush=True)
                else:
                    print(f'  tools: None', flush=True)
            else:
                print(f'  {k}: {json.dumps(v, ensure_ascii=False)[:200]}', flush=True)
        auth = request.headers.get('authorization', '?')
        print(f'  Authorization: {auth[:40]}...', flush=True)
        print('=== END REQUEST ===', flush=True)
    return original_send(self, request, **kwargs)
httpx.Client.send = patched_send

from run_agent import AIAgent
print('Creating agent...', flush=True)
agent = AIAgent(
    model='deepseek-v3.2',
    base_url='https://api.360.cn/v1',
    api_key=os.environ.get('OPENAI_API_KEY'),
    quiet_mode=True,
)
print('Sending message...', flush=True)
try:
    resp = agent.chat('Hi')
    print(f'Response: {resp[:200]}', flush=True)
except Exception as e:
    print(f'Error: {e}', flush=True)
