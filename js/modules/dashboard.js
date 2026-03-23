// js/modules/dashboard.js

const DashboardModule = {
    load: async function(forceReload = false) {
        // Hiện vòng xoay loading
        document.getElementById('dash-ton-quy').innerHTML = '<span class="spinner-border spinner-border-sm"></span>';
        document.getElementById('dash-tong-thu').innerHTML = '<span class="spinner-border spinner-border-sm"></span>';
        document.getElementById('dash-tong-chi').innerHTML = '<span class="spinner-border spinner-border-sm"></span>';

        if (forceReload) {
            App.State.thuChiData = null; 
        }

        if (!App.State.thuChiData) {
            let tcRes = await API.request('GET', 'read', 'THU_CHI');
            if(tcRes.status === 'success') {
                App.State.thuChiData = tcRes.data.filter(r => r['Ngày'] || r['Chủ thể']).reverse();
            } else {
                alert("Lỗi kết nối khi tải số liệu Dashboard!");
                return;
            }
        }

        this.calculateStats();
    },

    calculateStats: function() {
        let tongThu = 0;
        let tongChi = 0;

        // Quét sạch sẽ toàn bộ mảng, không bỏ sót dòng nào, không phân biệt ai với ai
        App.State.thuChiData.forEach(row => {
            let thu = parseFloat(row['Số tiền THU']) || 0;
            let chi = parseFloat(row['Số tiền CHI']) || 0;
            
            tongThu += thu;
            tongChi += chi;
        });

        // Chốt Tồn Quỹ
        let tonQuy = tongThu - tongChi;

        // Bắn số ra màn hình
        document.getElementById('dash-tong-thu').innerText = tongThu.toLocaleString('vi-VN') + ' đ';
        document.getElementById('dash-tong-chi').innerText = tongChi.toLocaleString('vi-VN') + ' đ';
        
        const elTonQuy = document.getElementById('dash-ton-quy');
        elTonQuy.innerText = tonQuy.toLocaleString('vi-VN') + ' đ';
        
        // Đổi màu cảnh báo nếu Tồn Quỹ bị âm (Chi nhiều hơn Thu)
        if (tonQuy < 0) {
            elTonQuy.classList.remove('text-success');
            elTonQuy.classList.add('text-danger');
        } else {
            elTonQuy.classList.remove('text-danger');
            elTonQuy.classList.add('text-success');
        }
    }
};