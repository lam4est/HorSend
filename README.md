# Campaign Manager

Giao diện quản lý workflow và lịch campaign. Backend Express + PostgreSQL, frontend React (Vite).

## Chạy nhanh

```bash
cp .env.example .env
# Sửa mật khẩu Postgres trong .env (DATABASE_URL, POSTGRES_PASSWORD)

pnpm install
pnpm dev
```

- **API:** http://127.0.0.1:3000  
- **Giao diện:** URL do Vite in ra (thường http://127.0.0.1:5173)

PostgreSQL phải đang chạy và trùng `DATABASE_URL` trong `.env` (mặc định `app_db` port `5433`).

### Postgres bằng Docker (trong repo)

```bash
docker compose up -d
```

Nếu DB mới, chưa có bảng:

```bash
pnpm db:setup
```

### Kiểm tra

```bash
curl http://127.0.0.1:3000/api/health
```

## Lệnh hữu ích

| Lệnh | Việc làm |
|------|----------|
| `pnpm dev` | Chạy API + UI (development) |
| `pnpm build` | Build production |
| `pnpm start` | Chạy API sau khi build |
| `pnpm db:setup` | Tạo bảng demo + seed (chỉ khi DB trống) |

## Git — không commit

- `.env` (mật khẩu, URL DB)
- `node_modules/`, `dist/`

Chỉ commit `.env.example` (không có secret thật).

### Loại commit (Conventional Commits)

Dùng prefix trong message commit, ví dụ: `feat: thêm lọc workflow theo category`.

| Type       | Ý nghĩa                                     |
| ---------- | ------------------------------------------- |
| `feat`     | Thêm tính năng mới                          |
| `fix`      | Sửa lỗi                                     |
| `docs`     | Thay đổi tài liệu                           |
| `style`    | Sửa format code, không đổi logic            |
| `refactor` | Refactor code, không thêm tính năng/sửa bug |
| `test`     | Thêm/sửa test                               |
| `chore`    | Việc phụ như config, dependency, tooling    |
| `perf`     | Cải thiện hiệu năng                         |
| `ci`       | Thay đổi CI/CD                              |

## Cấu trúc

```
backend/   API Express (+ cron Auto Scheduler, + /api/n8n/* cho Workflow, + /api/workflows/ai/*)
frontend/  React
ml/        Dataset, LoRA training, inference FastAPI (port 8001)
n8n/       Workflow JSON (chỉ Campaign Workflow)
```

## AI Workflow Builder

Tạo workflow mới từ prompt + sinh nội dung template (email/SMS). Engine ML riêng (fine-tune LoRA), fallback rule-based khi chưa train model.

| Thành phần | Mô tả |
|------------|--------|
| UI | Nút **Create with AI** trên trang Workflows |
| API | `POST /api/workflows/ai/generate`, `/confirm`, `/feedback` |
| Inference | `ml/inference/server.py` — port **8001** |
| Feedback | Bảng `ai_generation_log` — dùng tái train |

```bash
# Dataset + inference (xem ml/README.md)
pnpm ml:dataset
pnpm ml:serve

# Backend .env
ML_INFERENCE_URL=http://127.0.0.1:8001
ML_USE_MOCK=false   # true = bỏ qua inference, dùng mock trong backend
```

Workflow AI được tạo với `is_active: false` — xác nhận từng step trong editor trước khi bật.

## Campaign Auto Scheduler — cron trong backend (không dùng n8n)

Người dùng bật sự kiện trên lịch, chọn template / kênh / danh sách liên hệ và **Send date** (X ngày trước sự kiện, giờ cố định). Backend chạy cron nội bộ, khi đến giờ gửi sẽ gọi sender (mock/live) trực tiếp.

| Thành phần | Mô tả |
|------------|--------|
| Gửi đúng giờ | `setTimeout` tới đúng send date/time đã cấu hình |
| Safety net | `SCHEDULER_CRON_SECONDS` (mặc định 30s) — quét lại subscription đã đến giờ |
| Gửi ngay khi lưu | Nếu send date ≤ hiện tại → gửi ngay sau khi Save trên UI |
| Bảng log | `scheduler_send_log` — mỗi user/event/năm chỉ gửi một lần |
| Trigger thủ công | `POST /api/campaign/scheduler/run` |

```bash
# Chạy scheduler ngay (kiểm tra)
curl -X POST 'http://127.0.0.1:3000/api/campaign/scheduler/run'
```

Log backend: `[scheduler send]` (khác với `[workflow send]` của n8n).

## Campaign Workflow — n8n

Chỉ **Campaign Workflow** dùng n8n. Backend expose `/api/n8n/*` (bảng queue: `workflow_send_queue`).

| Workflow | Cron | Việc làm |
|----------|------|----------|
| `n8n/workflows/campaign-workflow-planner.json` | 5 phút | Gọi `POST /api/n8n/planner/run` — tính step due và ghi queue |
| `n8n/workflows/campaign-workflow-dispatcher.json` | 1 phút | Claim queue → gửi qua `POST /api/n8n/send` → đánh dấu sent/failed |

### Biến môi trường n8n

Trong container n8n (Settings → Variables hoặc docker env):

| Biến | Ví dụ | Ý nghĩa |
|------|-------|---------|
| `CAMPAIGN_API_URL` | `http://host.docker.internal:3000` | URL API backend (port **3000**, không phải 5679) |
| `N8N_CAMPAIGN_SERVICE_KEY` | `my-secret-key` | Khớp với backend `.env` (tùy chọn khi dev) |

Thêm vào `.env` backend nếu muốn bảo vệ route n8n:

```
N8N_CAMPAIGN_SERVICE_KEY=my-secret-key
```

### Import workflow

1. Chạy backend: `pnpm dev` (API port 3000)
2. Import 2 file JSON từ `n8n/workflows/` vào n8n 2.4.4
3. Set biến `CAMPAIGN_API_URL` (Linux: thử `http://172.17.0.1:3000` nếu `host.docker.internal` không resolve)
4. Activate cả 2 workflow

### Kiểm tra end-to-end

```bash
# Planner (chuẩn bị queue)
curl -X POST 'http://127.0.0.1:3000/api/n8n/planner/run?window_minutes=5'

# Xem pending
curl 'http://127.0.0.1:3000/api/n8n/send-queue/pending?limit=10&claim=true'

# Requeue item kẹt processing
curl -X POST 'http://127.0.0.1:3000/api/n8n/send-queue/requeue-stale?older_than_minutes=10'
```

Sau khi dispatcher chạy, log backend sẽ in `[workflow send]` (mock sender) và queue chuyển `sent`.

