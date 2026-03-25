// js/modules/baocao.js

const BaocaoModule = {
    allPartners: [],
    historyCache: {}, // Bộ nhớ đệm: Ai tải rồi thì lưu lại, không tải lại nữa

    load: async function() {
        this.showList();
        document.getElementById('bc-search-input').value = '';
        const listContainer = document.getElementById('bc-partner-list');

        // CHỈ TẢI MỖI DANH BẠ (SETUP) RẤT NHẸ
        if (!App.State.setupData) {
            listContainer.innerHTML = '<div class="text-center p-4 text-muted"><span class="spinner-border spinner-border-sm text-teal me-2"></span> Đang tải danh bạ...</div>';
            let stRes = await API.request('GET', 'read', 'SETUP');
            if(stRes.status === 'success') App.State.setupData = stRes.data;
        }

        // Lấy danh sách tên và in ra
        let partnersSet = new Set();
        if (App.State.setupData) {
            App.State.setupData.forEach(r => {
                if (r['CHỦ THỂ']) partnersSet.add(r['CHỦ THỂ']);
            });
        }
        this.allPartners = Array.from(partnersSet).sort();
        this.renderPartnerList(this.allPartners);
    },

    renderPartnerList: function(listToRender) {
        const container = document.getElementById('bc-partner-list');
        let html = '';
        const maxRender = 50;
        const slicedList = listToRender.slice(0, maxRender);

        slicedList.forEach(partner => {
            html += `
            <button class="list-group-item list-group-item-action d-flex justify-content-between align-items-center py-3 border-bottom" onclick="BaocaoModule.openPartner('${partner}')">
                <span class="fw-bold text-dark fs-6">${partner}</span>
                <i class="bi bi-chevron-right text-muted"></i>
            </button>`;
        });

        if (listToRender.length > maxRender) {
            html += `<div class="text-center p-3 text-muted fs-7 bg-light">Và ${listToRender.length - maxRender} đối tác khác...<br><i>(Gõ từ khóa lên trên để tìm nhanh)</i></div>`;
        }

        if (html === '') {
            html = `<div class="text-center p-5 text-muted">
                        <i class="bi bi-search" style="font-size: 2rem; opacity: 0.5;"></i>
                        <p class="mt-2">Không tìm thấy đối tác nào.</p>
                    </div>`;
        }
        container.innerHTML = html;
    },

    filterPartners: function() {
        const keyword = document.getElementById('bc-search-input').value.toLowerCase();
        const filteredList = this.allPartners.filter(p => p.toLowerCase().includes(keyword));
        this.renderPartnerList(filteredList);
    },

    showList: function() {
        document.getElementById('bc-view-list').style.display = 'block';
        document.getElementById('bc-view-detail').style.display = 'none';
    },

    // KHI BẤM VÀO 1 TÊN
    openPartner: async function(partnerName) {
        document.getElementById('bc-view-list').style.display = 'none';
        document.getElementById('bc-view-detail').style.display = 'block';
        document.getElementById('bc-name-label').innerText = partnerName;

        let history = [];

        // Kiểm tra xem đã từng tải người này chưa?
        if (this.historyCache[partnerName]) {
            // Lấy từ RAM ra xài luôn, tốc độ ánh sáng
            history = this.historyCache[partnerName];
        } else {
            // Hiển thị loading trong bảng
            document.getElementById('tbody-baocao').innerHTML = '<tr><td colspan="4" class="text-center p-5 text-muted"><span class="spinner-border spinner-border-sm text-teal me-2"></span> Đang kéo dữ liệu từ sổ quỹ...</td></tr>';
            
            // Gọi lệnh API mới viết để lấy đúng ông này
            let res = await API.request('POST', 'readPartnerHistory', '', { partnerName: partnerName });
            if (res.status === 'success') {
                history = res.data;
                this.historyCache[partnerName] = history; // Lưu vào Cache cho lần sau
            } else {
                alert("Lỗi tải lịch sử: " + res.message);
                return;
            }
        }

        // TÍNH TOÁN TIỀN BẠC
        let tongThu = 0;
        let tongChi = 0;

        history.forEach(row => {
            tongThu += parseFloat(row['Số tiền THU']) || 0;
            tongChi += parseFloat(row['Số tiền CHI']) || 0;
        });

        let chenhLech = tongThu - tongChi;

        document.getElementById('bc-tong-thu').innerText = tongThu.toLocaleString('vi-VN') + ' đ';
        document.getElementById('bc-tong-chi').innerText = tongChi.toLocaleString('vi-VN') + ' đ';
        const elChenhLech = document.getElementById('bc-chenh-lech');
        elChenhLech.innerText = Math.abs(chenhLech).toLocaleString('vi-VN') + ' đ';
        
        if (chenhLech > 0) {
            elChenhLech.className = 'fw-bold text-success text-truncate';
            elChenhLech.innerText = '+' + elChenhLech.innerText;
        } else if (chenhLech < 0) {
            elChenhLech.className = 'fw-bold text-danger text-truncate';
            elChenhLech.innerText = '-' + elChenhLech.innerText;
        } else {
            elChenhLech.className = 'fw-bold text-primary text-truncate';
        }

        this.renderHistory(history);
    },

    renderHistory: function(history) {
        const tbody = document.getElementById('tbody-baocao');
        let html = '';
        
        history.forEach(row => {
            let rawDate = new Date(row['Ngày']);
            let dateStr = rawDate.toLocaleDateString('vi-VN');
            if(dateStr === 'Invalid Date') dateStr = row['Ngày'];

            let thu = row['Số tiền THU'] ? Number(row['Số tiền THU']).toLocaleString('vi-VN') : '-';
            let chi = row['Số tiền CHI'] ? Number(row['Số tiền CHI']).toLocaleString('vi-VN') : '-';

            html += `
            <tr>
                <td class="ps-3 text-muted py-2">${dateStr}</td>
                <td class="text-truncate py-2" style="max-width: 150px;">${row['Nội dung']}</td>
                <td class="text-end text-success font-weight-bold-money py-2">${thu}</td>
                <td class="text-end text-danger font-weight-bold-money py-2">${chi}</td>
            </tr>`;
        });

        if (html === '') {
            html = '<tr><td colspan="4" class="text-center p-5 text-muted">Chưa có giao dịch dòng tiền nào với đối tác này.</td></tr>';
        }
        tbody.innerHTML = html;
    }
};