#!/bin/bash

# Lưu thay đổi toàn bộ file
git add .

# Tạo commit với message tự động kèm timestamp
git commit -m "Auto commit $(date '+%Y-%m-%d %H:%M:%S')"

# Push lên remote chính (branch main hoặc master)
git push origin main

# Thông báo hoàn tất
echo "Đã auto commit và push lên GitHub!"
