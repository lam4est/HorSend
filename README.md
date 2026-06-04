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
backend/   API Express
frontend/  React
```
