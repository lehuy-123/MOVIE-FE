# 🎬 Cinema 3D - Frontend (Next.js)

Giao diện xem phim 3D thời gian thực với Next.js 16, React 19, Tailwind CSS v4, và Three.js / React Three Fiber.

## 🚀 Khởi chạy cục bộ (Local Development)

1. Cài đặt thư viện:
```bash
npm install
```

2. Tạo file cấu hình môi trường `.env.local`:
```bash
cp .env.example .env.local
```
Đảm bảo biến `NEXT_PUBLIC_SOCKET_URL` trỏ đến server Backend (mặc định: `http://localhost:3001`).

3. Chạy môi trường phát triển:
```bash
npm run dev
```
Mở trình duyệt tại [http://localhost:3000](http://localhost:3000).

---

## 🚢 Hướng dẫn Deploy Frontend

### 1. Vercel (Khuyên dùng)
1. Đẩy mã nguồn lên GitHub.
2. Đăng nhập [Vercel](https://vercel.com) -> Chọn **Add New Project** -> Chọn repository `MOVIE-FE`.
3. Trong phần **Environment Variables**:
   - Key: `NEXT_PUBLIC_SOCKET_URL`
   - Value: `https://<ten-backend-cua-ban>.onrender.com` (URL backend đã deploy)
4. Nhấn **Deploy**.

### 2. Netlify / Cloudflare Pages
- Build command: `npm run build`
- Publish directory: `.next` (hoặc chuẩn bị adapter Next.js)
- Environment Variables: Cung cấp `NEXT_PUBLIC_SOCKET_URL`.
