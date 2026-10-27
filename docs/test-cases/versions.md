# Versions (Internal › Version Management) — Task & Bug từ Linear

> Màn hình này chưa có tài liệu test case. File hiện chỉ liệt kê các ticket Linear liên quan, làm căn cứ để quét màn hình (`screen-test-generator`) và viết test case sau.

## Linear — Task & Bug liên quan

> Nguồn: Linear team VP, label `Portal` — lấy ngày 2026-10-20. Bỏ Canceled, TechDebt/CI và Restaurant Portal.
> Thứ tự: Bug → đang QC/Review → đã Prod/Done → Todo/Backlog. **7 issue.**

| ID                                                  | Loại    | Tiêu đề                                                                                 | Trạng thái          | Ưu tiên     | Test hiện có | E2E được?    | Ghi chú                               |
| --------------------------------------------------- | ------- | --------------------------------------------------------------------------------------- | ------------------- | ----------- | ------------ | ------------ | ------------------------------------- |
| [VP-3016](https://linear.app/fastboy/issue/VP-3016) | Enh     | [Portal] Bổ sung action Pause Publish / Resume Publish cho POS Version                  | Done                | Medium      | Chưa         | Có           | Ticket cha của VP-3042                |
| [VP-3042](https://linear.app/fastboy/issue/VP-3042) | Feature | [Portal] Bổ sung action Pause Publish / Resume Publish cho POS Version                  | Verified Production | Medium      | Chưa         | Có           | Pause / Resume Publish (cha: VP-3016) |
| [VP-3357](https://linear.app/fastboy/issue/VP-3357) | Feature | [Portal] Re-enable Pause/Resume Publish UI on develop (env-gated, hidden on production) | Done                | No priority | Chưa         | Có (chỉ DEV) | Pause/Resume chỉ hiện trên develop    |
| [VP-3941](https://linear.app/fastboy/issue/VP-3941) | Feature | [PORTAL] Versions page has a Windows tab and an Android tab                             | Done                | High        | Chưa         | Có           | Tab Windows / Android                 |
| [VP-4049](https://linear.app/fastboy/issue/VP-4049) | Enh     | [PORTAL] Version rows show one action and a more menu, not a row of buttons             | Done                | Medium      | Chưa         | Có           | 1 action + menu "more" mỗi dòng       |
| [VP-4284](https://linear.app/fastboy/issue/VP-4284) | Enh     | [PORTAL] Android version — download the APK, upload the KPP, then publish               | Done                | High        | Chưa         | Một phần     | Download APK → upload KPP → publish   |
| [VP-4480](https://linear.app/fastboy/issue/VP-4480) | Enh     | [PORTAL] Versions — name the downloaded APK like the CI artifact                        | Done                | Medium      | Chưa         | Có           | Tên file APK tải về giống CI artifact |
