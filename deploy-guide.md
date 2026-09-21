# 马马合体 2026 - FastAPI 部署指南 (Windows Server)

本指南介绍如何在 Windows Server (如上海的服务器) 上使用 Python FastAPI 部署游戏的前端打包资源。

## 1. 准备前端构建文件
在开发环境或本地，进入 `frontend` 目录并运行打包命令：
```bash
cd frontend
npm install
npm run build
```
执行完毕后，`frontend/dist/` 目录下会生成所有的静态资源（`index.html`, `assets/` 等）。这些文件已经过压缩和优化。

## 2. 后端 FastAPI 服务搭建
在项目根目录（或您指定的部署目录）创建一个 Python 虚拟环境并安装所需依赖：
```bash
python -m venv .venv
.venv\Scripts\activate
pip install fastapi uvicorn
```

创建 `main.py` 文件，内容如下：

```python
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os

app = FastAPI(title="马马合体 2026")

# 设置前端 dist 目录的路径 (相对于 main.py)
FRONTEND_DIST_DIR = os.path.join(os.path.dirname(__file__), "frontend", "dist")

# 将 /assets 等目录挂载为静态文件
app.mount("/assets", StaticFiles(directory=os.path.join(FRONTEND_DIST_DIR, "assets")), name="assets")

# 根路由返回 index.html
@app.get("/")
async def serve_spa():
    return FileResponse(os.path.join(FRONTEND_DIST_DIR, "index.html"))

# 捕获所有其他路由并返回 index.html (支持前端路由)
@app.get("/{catchall:path}")
async def serve_catchall(catchall: str):
    file_path = os.path.join(FRONTEND_DIST_DIR, catchall)
    # 如果请求的文件真实存在，则直接返回
    if os.path.isfile(file_path):
        return FileResponse(file_path)
    # 否则返回 index.html (交由前端处理)
    return FileResponse(os.path.join(FRONTEND_DIST_DIR, "index.html"))

if __name__ == "__main__":
    import uvicorn
    # 在 0.0.0.0 上监听 8000 端口
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

## 3. 运行与外网访问配置
1.  **启动服务**:
    在命令提示符或 PowerShell 中运行：
    ```bash
    python main.py
    ```
    服务器将在 `http://localhost:8000` 启动。

2.  **Windows 防火墙配置**:
    - 打开“高级安全 Windows Defender 防火墙”。
    - 选择“入站规则” -> “新建规则”。
    - 选择“端口”，输入 `8000` (或您修改后的端口号)。
    - 允许连接，名称可以写为 "FastAPI Horse Merge"。

3.  **外网访问 (可选)**:
    - 如果您的 Windows Server 有公网 IP，玩家可以通过 `http://<您的服务器IP>:8000` 直接访问游戏。
    - 推荐使用 Nginx 或 IIS 作为反向代理，将域名 (例如 `horse.example.com`) 解析至该服务器，并配置 HTTPS 证书。

## 4. 后续更新 (更新游戏内容)
当游戏需要更新（例如美术资源替换）时：
1. 本地更新代码/素材。
2. 重新运行 `npm run build`。
3. 将新的 `frontend/dist/` 文件夹覆盖服务器上的旧文件夹。
4. 刷新网页，新内容即可生效（由于 Vite 会添加哈希后缀，缓存问题通常会自动解决）。