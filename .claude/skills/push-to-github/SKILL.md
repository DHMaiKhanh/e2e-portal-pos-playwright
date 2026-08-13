---
name: push-to-github
description: Push local commits to GitHub for this repo. Use when the user asks to "push code", "push commit", "push lên github", "đẩy code lên git", or similar. Handles untracked files, picks the remote the user actually has write access to, and reports the result clearly (including PR suggestion when push target differs from origin).
---

# Push to GitHub

Quy trình chuẩn khi được yêu cầu push code lên GitHub trong repo này.

## Bước 1 — Kiểm tra trạng thái

```
git status
git remote -v
git log --oneline -5
```

- Xem có bao nhiêu commit local chưa push (`ahead of 'origin/main' by N commits`).
- Xem có file untracked/modified nào chưa được add không.
- Ghi nhớ danh sách remote (thường có thể có nhiều remote, ví dụ `origin` là repo gốc và `fork` là fork của user).

## Bước 2 — Xử lý file chưa track/chưa commit

- Nếu có untracked files: **đọc nội dung** trước khi add — không add mù (`git add -A`/`git add .`).
  Kiểm tra không có secret/credential trong file trước khi commit.
- Nếu user muốn gộp các file đó vào commit: `git add <file cụ thể>` rồi commit với message mô tả đúng nội dung thay đổi (theo quy tắc ở phần "Commit message" của CLAUDE.md nếu có, hoặc theo văn phong các commit gần nhất — `git log` để tham khảo).
- Không tự ý sửa nội dung file của user khi commit.

## Bước 3 — Xác định remote để push

- Thử push vào `origin` trước (remote chính/repo gốc).
- Nếu bị lỗi `403 Permission denied` hoặc tương tự → user không có quyền write vào remote đó.
  → Tự động thử remote khác mà user có quyền (ví dụ `fork`, thường đặt tên theo GitHub username của user).
- Báo rõ cho user: đã push vào remote nào, và nếu remote đó khác `origin`, nhắc rằng cần tạo Pull Request để đưa code vào repo gốc.

```
git push origin main
# nếu 403 → thử remote khác
git push <remote-user-co-quyen> main
```

## Bước 4 — Báo cáo kết quả

Luôn nói rõ:

- Đã push commit nào (hash + message) lên remote nào, branch nào.
- Nếu push vào fork thay vì origin: hỏi user có muốn tạo PR từ fork → origin không (dùng `gh pr create` hoặc `mcp__github__create_pull_request`, không tự tạo PR nếu chưa được xác nhận).
- Nếu có lỗi (permission, conflict, hook fail): giải thích nguyên nhân, không dùng `--no-verify`/`--force` để né lỗi trừ khi user yêu cầu rõ.

## Lưu ý an toàn

- Không bao giờ `git push --force` trừ khi user yêu cầu rõ ràng, và phải cảnh báo trước.
- Không tạo commit rỗng.
- Luôn tạo commit mới, không amend commit đã có trừ khi được yêu cầu.
- Không skip git hooks (husky pre-commit/pre-push) trừ khi được yêu cầu rõ.
