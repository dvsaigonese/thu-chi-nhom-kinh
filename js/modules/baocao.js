// js/modules/baocao.js

const BaocaoModule = {
    load: async function() {
        const inputList = document.getElementById('bc-list-chuthe');
        const emptyState = document.getElementById('bc-empty-state');
        const dashboard = document.getElementById('bc-dashboard');
        
        document.getElementById('bc-chuthe').value = '';
        emptyState.style.display = 'block';
        dashboard.style.display = 'none';

        // 1. Tải Sổ Thu Chi vào RAM (nếu chưa có)
        if (!App.State.thuChiData) {
            document.getElementById('bc-chuthe').disabled = true;
            let tcRes = await API.request('GET', 'read', 'THU_CHI');
            if(tcRes.status === 'success') {
                App.State.thuChiData = tcRes.data.filter(r => r['Ngày'] || r['Chủ thể']).reverse();
            }
            document.getElementById('bc-chuthe').disabled = false;
        }

        // 2. Tải danh sách SETUP vào RAM (để lấy danh sách đối tác)
        if (!App.State.setupData) {
            let stRes = await API.request('GET', 'read', 'SETUP');
            if(stRes.status === 'success') {
                App.State.setupData = stRes.data;
            }
        }

        // 3. Đổ danh sách vào Dropdown cho Cậu dễ gõ
        if (App.State.setupData) {
            inputList.innerHTML = '';
            let partners = new Set(); // Dùng Set để lọc trùng lặp tự động
            App.State.setupData.forEach(r => {
                if (r['NGUỒN TIỀN/KHÁCH']) partners.add(r['NGUỒN TIỀN/KHÁCH']);
                if (r['ĐỐI TÁC GIA CÔNG']) partners.add(r['ĐỐI TÁC GIA CÔNG']);
                if (r['NGUỒN HÀNG/NCC']) partners.add(r['NGUỒN HÀNG/NCC']);
            });
            partners.forEach(p => {
                inputList.innerHTML += `<option value="${p}">`;
            });
        }
    },

    selectPartner: function() {
        const selectedName = document.getElementById('bc-chuthe').value.trim();
        const emptyState = document.getElementById('bc-empty-state');
        const dashboard = document.getElementById('bc-dashboard');

        if (!selectedName || !App.State.thuChiData) {
            emptyState.style.display = 'block';
            dashboard.style.display = 'none';
            return;
        }

        // LỌC MỌI GIAO DỊCH CỦA NGƯỜI NÀY
        let history = App.State.thuChiData.filter(row => 
            (row['Chủ thể'] || '').toLowerCase() === selectedName.toLowerCase()
        );

        if (history.length > 0) {
            let tongThu = 0;
            let tongChi = 0;

            history.forEach(row => {
                tongThu += parseFloat(row['Số tiền THU']) || 0;
                tongChi += parseFloat(row['Số tiền CHI']) || 0;
            });

            let chenhLech = tongThu - tongChi;

            // In số liệu ra màn hình
            document.getElementById('bc-tong-thu').innerText = tongThu.toLocaleString('vi-VN') + ' đ';
            document.getElementById('bc-tong-chi').innerText = tongChi.toLocaleString('vi-VN') + ' đ';
            document.getElementById('bc-chenh-lech').innerText = Math.abs(chenhLech).toLocaleString('vi-VN') + ' đ';
            
            const elChenhLech = document.getElementById('bc-chenh-lech');
            if (chenhLech > 0) {
                elChenhLech.className = 'fw-bold text-success text-truncate';
                elChenhLech.innerText = '+' + elChenhLech.innerText;
            } else if (chenhLech < 0) {
                elChenhLech.className = 'fw-bold text-danger text-truncate';
                elChenhLech.innerText = '-' + elChenhLech.innerText;
            } else {
                elChenhLech.className = 'fw-bold text-primary text-truncate';
            }

            document.getElementById('bc-name-label').innerText = selectedName;
            emptyState.style.display = 'none';
            dashboard.style.display = 'block';

            this.renderHistory(history);
        } else {
            alert("Chưa có giao dịch Thu Chi nào với đối tác: " + selectedName);
        }
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
                <td class="ps-3 text-muted">${dateStr}</td>
                <td class="text-truncate" style="max-width: 150px;">${row['Nội dung']}</td>
                <td class="text-end text-success font-weight-bold-money">${thu}</td>
                <td class="text-end text-danger font-weight-bold-money">${chi}</td>
            </tr>`;
        });

        tbody.innerHTML = html;
    }
};