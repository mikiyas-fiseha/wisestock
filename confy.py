#@title 1. Initialize ComfyUI Environment
#@markdown Sets up ComfyUI, ComfyUI-Manager, dependencies, and fast-boot optimizations.

import os
import re
import shutil
import subprocess
import sys
from google.colab import drive
from IPython.display import HTML, display

display(HTML('<div style="background: linear-gradient(90deg, #4b6cb7 0%, #182848 100%); color: white; padding: 12px; border-radius: 6px; font-weight: bold; text-align: center;">⚡ Initializing ComfyUI Environment...</div>'))

# --- Configuration ---
MOUNT_DRIVE = False #@param {type:"boolean"}
UPDATE_COMFY_UI = True #@param {type:"boolean"}
FORCE_CLEAN_CACHE = True #@param {type:"boolean"}

LOCAL_WORKSPACE = "/content/ComfyUI"
DRIVE_WORKSPACE = "/content/drive/MyDrive/ComfyUI"
CACHE_TAR = os.path.join(DRIVE_WORKSPACE, "comfy_ui_cache.tar")

def stream_cmd(cmd, cwd=None):
    process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, cwd=cwd, bufsize=1)
    for line in iter(process.stdout.readline, ''):
        sys.stdout.write(line)
        sys.stdout.flush()
    process.wait()

print("\n📦 [1/4] Installing UV, aria2c, pigz, and cloudflared...")
subprocess.run(["pip", "install", "-q", "uv"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
subprocess.run(["apt-get", "update", "-qq"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
subprocess.run(["apt-get", "install", "-y", "-qq", "aria2", "pigz"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

if not os.path.exists("/usr/local/bin/cloudflared"):
    subprocess.run(["wget", "-q", "-nc", "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64", "-O", "/usr/local/bin/cloudflared"])
    subprocess.run(["chmod", "+x", "/usr/local/bin/cloudflared"])

if MOUNT_DRIVE:
    print("\n💾 Requesting Google Drive Access...")
    drive.mount('/content/drive')

print("\n📂 [2/4] Setting up ComfyUI Core...")
# --- FIXED BLOCK START: Ensures a real git repo exists before pulling ---
if not os.path.exists(os.path.join(LOCAL_WORKSPACE, ".git")):
    if not os.path.exists(LOCAL_WORKSPACE):
        subprocess.run(["git", "clone", "https://github.com/comfyanonymous/ComfyUI", LOCAL_WORKSPACE])
else:
    if UPDATE_COMFY_UI:
        print("   🔄 Pulling latest core updates...")
        subprocess.run(["git", "pull"], cwd=LOCAL_WORKSPACE)
# --- FIXED BLOCK END ---

if MOUNT_DRIVE:
    print("   🔗 Linking model storage directories to Google Drive...")
    for d in ["models", "output", "input"]:
        local_path = os.path.join(LOCAL_WORKSPACE, d)
        drive_path = os.path.join(DRIVE_WORKSPACE, d)
        os.makedirs(drive_path, exist_ok=True)
        if os.path.exists(local_path) and not os.path.islink(local_path):
            shutil.rmtree(local_path)
        if not os.path.exists(local_path):
            os.symlink(drive_path, local_path)

    if FORCE_CLEAN_CACHE and os.path.exists(CACHE_TAR):
        print("   🗑️ Removing old cache tarball...")
        os.remove(CACHE_TAR)

    if os.path.exists(CACHE_TAR):
        print("   📦 Unpacking cached workspace...")
        os.system(f"tar -I pigz -xf '{CACHE_TAR}' -C '{LOCAL_WORKSPACE}' > /dev/null 2>&1")

os.makedirs(os.path.join(LOCAL_WORKSPACE, "custom_nodes"), exist_ok=True)
os.makedirs(os.path.join(LOCAL_WORKSPACE, "user"), exist_ok=True)

# Install ComfyUI-Manager
manager_path = os.path.join(LOCAL_WORKSPACE, "custom_nodes", "ComfyUI-Manager")
if not os.path.exists(os.path.join(manager_path, "__init__.py")):
    if os.path.exists(manager_path):
        shutil.rmtree(manager_path)
    print("\n📦 [3/4] Installing ComfyUI-Manager...")
    subprocess.run(["git", "clone", "https://github.com/Comfy-Org/ComfyUI-Manager.git", manager_path])

# Non-blocking lazy config for ComfyUI-Manager
mgr_config = """[default]
network_mode = standard
preview_method = auto
badge_mode = None
security_level = normal
migrated = true
skip_update_check = true
component_policy = remote
lazy_load = true
"""
for conf_dir in [
    os.path.join(LOCAL_WORKSPACE, "user", "default", "ComfyUI-Manager"),
    os.path.join(LOCAL_WORKSPACE, "user", "ComfyUI-Manager"),
    os.path.join(LOCAL_WORKSPACE, "user", "__manager"),
    manager_path
]:
    os.makedirs(conf_dir, exist_ok=True)
    with open(os.path.join(conf_dir, "config.ini"), "w") as f:
        f.write(mgr_config)

print("\n🛠️ [4/4] Installing Python dependencies via UV...")
stream_cmd(["uv", "pip", "install", "--system", "-r", "requirements.txt"], cwd=LOCAL_WORKSPACE)

stream_cmd(["uv", "pip", "install", "--system",
            "av", "imageio-ffmpeg", "torchsde", "einops", "transformers", "safetensors",
            "kornia", "spandrel", "scipy", "soundfile", "insightface", "onnxruntime-gpu",
            "alembic", "blake3", "comfy-kitchen", "comfy-aimdo", "comfy-angle", "gguf", "piexif",
            "comfyui-frontend-package", "pydantic", "pydantic-settings", "simpleeval", "accelerate"])

mgr_req = os.path.join(manager_path, "requirements.txt")
if os.path.exists(mgr_req):
    stream_cmd(["uv", "pip", "install", "--system", "-r", mgr_req])

# --- GZIP TURBO PATCH ---
server_file = os.path.join(LOCAL_WORKSPACE, "server.py")
if os.path.exists(server_file):
    with open(server_file, "r") as f:
        content = f.read()
    if "gzip_object_info" not in content:
        patch = """
import gzip as _gzip
import json as _json

async def gzip_object_info(self, request):
    data = _json.dumps(self.node_info()).encode('utf-8')
    accept = request.headers.get('Accept-Encoding', '')
    if 'gzip' in accept:
        return web.Response(body=_gzip.compress(data), content_type='application/json', headers={'Content-Encoding': 'gzip'})
    return web.Response(body=data, content_type='application/json')
PromptServer.get_object_info = gzip_object_info
"""
        with open(server_file, "a") as f:
            f.write(patch)

print("\n✅ [SYSTEM READY] ComfyUI environment initialized.")
