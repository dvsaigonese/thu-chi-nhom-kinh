// js/modules/dashboard.js

const DashboardModule = {
    load: function(forceReload = false) {
        // 1. LẤY SỐ CACHE TỪ ĐIỆN THOẠI ĐỂ HIỆN TỨC THỜI (KHÔNG CẦN CHỜ ĐỢI)
        const cachedStats = localStorage.getItem('xuong_dashboardStats');
        if (cachedStats && !forceReload) {
            const stats = JSON.parse(cachedStats);
            this.updateUI(stats.tongThu, stats.tongChi, stats.tonQuy);
            this.showSyncingIndicator(true); // Hiện xoay xoay nhẹ ở nút Cập nhật
        } else {
            // Nếu là lần đầu tiên mở app, chưa có cache thì đành phải xoay
            document.getElementById('dash-ton-quy').innerHTML = '<span class="spinner-border spinner-border-sm"></span>';
            document.getElementById('dash-tong-thu').innerHTML = '<span class="spinner-border spinner-border-sm"></span>';
            document.getElementById('dash-tong-chi').innerHTML = '<span class="spinner-border spinner-border-sm"></span>';
            this.showSyncingIndicator(true);
        }

        if (forceReload) {
            App.State.thuChiData = null; 
        }

        // 2. KÉO DỮ LIỆU TỪ GOOGLE SHEETS BẰNG LUỒNG CHẠY NGẦM
        if (!App.State.thuChiData) {
            API.request('GET', 'read', 'THU_CHI').then(tcRes => {
                this.showSyncingIndicator(false); // Tắt xoay xoay ở nút
                if(tcRes.status === 'success') {
                    App.State.thuChiData = tcRes.data.filter(r => r['Ngày'] || r['Chủ thể']).reverse();
                    this.calculateStats(); // Có số mới thì tính toán lại
                } else {
                    console.error("Lỗi kết nối khi tải số liệu Dashboard!");
                }
            }).catch(err => {
                this.showSyncingIndicator(false);
                console.error("Lỗi mạng:", err);
            });
        } else {
            this.calculateStats();
            this.showSyncingIndicator(false);
        }
    },

    calculateStats: function() {
        let tongThu = 0;
        let tongChi = 0;

        App.State.thuChiData.forEach(row => {
            let thu = parseFloat(row['Số tiền THU']) || 0;
            let chi = parseFloat(row['Số tiền CHI']) || 0;
            
            tongThu += thu;
            tongChi += chi;
        });

        let tonQuy = tongThu - tongChi;

        // Cập nhật ra màn hình ngay lập tức
        this.updateUI(tongThu, tongChi, tonQuy);

        // 3. LƯU KẾT QUẢ VÀO BỘ NHỚ ĐIỆN THOẠI ĐỂ DÀNH CHO LẦN SAU MỞ APP
        localStorage.setItem('xuong_dashboardStats', JSON.stringify({
            tongThu: tongThu,
            tongChi: tongChi,
            tonQuy: tonQuy
        }));
    },

    updateUI: function(tongThu, tongChi, tonQuy) {
        document.getElementById('dash-tong-thu').innerText = tongThu.toLocaleString('vi-VN') + ' đ';
        document.getElementById('dash-tong-chi').innerText = tongChi.toLocaleString('vi-VN') + ' đ';
        
        const elTonQuy = document.getElementById('dash-ton-quy');
        elTonQuy.innerText = tonQuy.toLocaleString('vi-VN') + ' đ';
        
        // Cảnh báo màu đỏ nếu âm tiền
        if (tonQuy < 0) {
            elTonQuy.classList.remove('text-success');
            elTonQuy.classList.add('text-danger');
        } else {
            elTonQuy.classList.remove('text-danger');
            elTonQuy.classList.add('text-success');
        }
    },

    // Hàm tạo hiệu ứng xoay ở góc trên bên phải thay vì che mất số tiền
    showSyncingIndicator: function(isSyncing) {
        const btn = document.querySelector('#page-home button[title="Làm mới dữ liệu"]');
        if(btn) {
            if(isSyncing) {
                btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Đang đồng bộ';
                btn.disabled = true;
            } else {
                btn.innerHTML = '<i class="bi bi-arrow-clockwise me-1"></i>Cập nhật';
                btn.disabled = false;
            }
        }
    }
};