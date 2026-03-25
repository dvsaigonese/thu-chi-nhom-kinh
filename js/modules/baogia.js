// js/modules/baogia.js

const BaogiaModule = {
    rowCount: 0,
    currentHistory: [],

    load: async function() {
        document.getElementById('bg-khachhang').value = '';
        document.getElementById('bg-ghichu').value = '';
        document.getElementById('tbody-baogia').innerHTML = '';
        document.getElementById('bg-history-container').style.display = 'none';
        this.updateTotal();
        this.addRow();

        if (!App.State.setupData) {
            let res = await API.request('GET', 'read', 'SETUP');
            if(res.status === 'success') App.State.setupData = res.data;
        }
    },

    getValidPartners: function() {
        let validNames = [];
        if (App.State.setupData) {
            App.State.setupData.forEach(r => { if (r['CHỦ THỂ']) validNames.push(r['CHỦ THỂ']); });
        }
        return validNames;
    },

    suggestNames: function() {
        const inputVal = document.getElementById('bg-khachhang').value.toLowerCase();
        const dropdown = document.getElementById('bg-khachhang-dropdown');
        const allNames = this.getValidPartners();
        const filtered = allNames.filter(name => name.toLowerCase().includes(inputVal));
        if (filtered.length === 0) { dropdown.style.display = 'none'; return; }
        let html = '';
        filtered.forEach(name => {
            html += `<li><button type="button" class="dropdown-item py-3 fw-bold text-teal border-bottom" onclick="BaogiaModule.selectName('${name}')">${name}</button></li>`;
        });
        dropdown.innerHTML = html; dropdown.style.display = 'block';
    },

    selectName: function(name) {
        document.getElementById('bg-khachhang').value = name;
        document.getElementById('bg-khachhang-dropdown').style.display = 'none';
        this.fetchHistory(name);
    },

    // ĐÃ NÂNG CẤP: KHÔNG BAO GIỜ BIẾN MẤT, CÓ LỖI LÀ BÁO ĐỎ!
    fetchHistory: async function(khachHang) {
        const container = document.getElementById('bg-history-container');
        const listEl = document.getElementById('bg-history-list');
        
        listEl.innerHTML = '<span class="spinner-border spinner-border-sm text-info"></span> <span class="text-info">Đang lục tìm trong Sổ...</span>';
        container.style.display = 'block'; // Luôn luôn hiện khung

        try {
            // Lệnh kết nối lên mây
            let res = await API.request('POST', 'getBaoGiaHistory', 'BAO_GIA', { khachHang: khachHang });
            
            // Nếu Google Sheets ném ra lỗi (Ví dụ: kẹt dòng rác)
            if (res.status === 'error') {
                listEl.innerHTML = `<span class="text-danger fw-bold"><i class="bi bi-exclamation-triangle"></i> Lỗi máy chủ Google: ${res.message}</span>`;
                return;
            }
            
            // Nếu thành công và có số liệu
            if (res.status === 'success' && res.data && res.data.length > 0) {
                this.currentHistory = res.data;
                let html = '';
                res.data.forEach((bg, index) => {
                    let ngayStr = bg.ngay;
                    if(ngayStr && String(ngayStr).includes('T')) {
                        ngayStr = new Date(ngayStr).toLocaleDateString('vi-VN');
                    }
                    html += `<button class="btn btn-outline-info btn-sm bg-white" onclick="BaogiaModule.loadOldQuote(${index})" title="${bg.ghiChu}">
                                ${ngayStr} - ${Number(bg.tongTien).toLocaleString('vi-VN')}đ
                             </button>`;
                });
                listEl.innerHTML = html;
            } else {
                // Nếu tìm không thấy khách
                listEl.innerHTML = '<span class="text-muted"><i class="bi bi-info-circle"></i> Khách hàng này chưa có báo giá cũ.</span>';
            }
        } catch (err) {
            // Lỗi đứt cáp mạng
            listEl.innerHTML = `<span class="text-danger fw-bold"><i class="bi bi-wifi-off"></i> Lỗi kết nối mạng: ${err.message}</span>`;
        }
    },

    loadOldQuote: function(index) {
        const bg = this.currentHistory[index];
        if(!bg) return;
        
        document.getElementById('bg-ghichu').value = bg.ghiChu || '';
        document.getElementById('tbody-baogia').innerHTML = '';
        this.rowCount = 0;
        
        let itemsList = [];
        try {
            let rawData = bg.items;
            if (!rawData) {
                itemsList = [];
            } else if (typeof rawData === 'object') {
                itemsList = rawData; 
            } else {
                rawData = String(rawData).trim();
                if (rawData.includes('%5B')) {
                    rawData = decodeURIComponent(rawData);
                }
                rawData = rawData.replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"');
                try {
                    itemsList = JSON.parse(rawData);
                } catch(e1) {
                    console.warn("Đang dùng giải pháp ép kiểu mạnh...");
                    itemsList = (new Function("return " + rawData))();
                }
            }
        } catch(e) {
            alert("Lỗi đọc dữ liệu vật tư: " + e.message);
            itemsList = [];
        }
        
        if (!Array.isArray(itemsList) || itemsList.length === 0) {
            this.addRow(); 
        } else {
            itemsList.forEach(item => {
                this.addRow();
                const row = document.getElementById(`bg-row-${this.rowCount}`);
                if(row) {
                    row.querySelector('.bg-item-name').value = item.name || '';
                    row.querySelector('.bg-item-dvt').value = item.dvt || '';
                    row.querySelector('.bg-item-qty').value = item.qty || '';
                    row.querySelector('.bg-item-price').value = item.price || '';
                }
            });
        }
        
        this.updateTotal();
        alert(`✅ Đã nạp lại Báo giá ngày ${bg.ngay}. Bạn có thể chỉnh sửa ngay bây giờ!`);
    },

    addRow: function() {
        this.rowCount++;
        const tbody = document.getElementById('tbody-baogia');
        const tr = document.createElement('tr');
        tr.id = `bg-row-${this.rowCount}`;
        tr.innerHTML = `
            <td><input type="text" class="form-control form-control-sm bg-item-name" placeholder="Vd: Vách kính cường lực 8mm"></td>
            <td><input type="text" class="form-control form-control-sm bg-item-dvt text-center" placeholder="m2"></td>
            <td><input type="number" class="form-control form-control-sm bg-item-qty text-center" placeholder="0" min="0" oninput="BaogiaModule.updateTotal()"></td>
            <td><input type="number" class="form-control form-control-sm bg-item-price text-end text-primary fw-bold" placeholder="0" min="0" oninput="BaogiaModule.updateTotal()"></td>
            <td class="text-center"><button class="btn btn-sm text-danger border-0" onclick="BaogiaModule.removeRow(${this.rowCount})"><i class="bi bi-trash"></i></button></td>
        `;
        tbody.appendChild(tr);
    },

    removeRow: function(id) {
        const row = document.getElementById(`bg-row-${id}`);
        if(row) row.remove();
        this.updateTotal();
    },

    updateTotal: function() {
        let total = 0;
        const rows = document.querySelectorAll('#tbody-baogia tr');
        rows.forEach(row => {
            let qty = parseFloat(row.querySelector('.bg-item-qty').value) || 0;
            let price = parseFloat(row.querySelector('.bg-item-price').value) || 0;
            total += (qty * price);
        });
        document.getElementById('bg-tongtien').innerText = total.toLocaleString('vi-VN') + ' đ';
        document.getElementById('bg-tongtien').setAttribute('data-total', total);
    },

    docSoThanhChu: function(so) {
        if (so === 0) return "Không đồng.";
        so = Math.abs(Math.round(so)); 
        const mangso = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
        
        const dochangchuc = function(so, daydu) {
            let chuoi = ""; let chuc = Math.floor(so / 10); let donvi = so % 10;
            if (chuc > 1) { chuoi = " " + mangso[chuc] + " mươi"; if (donvi == 1) chuoi += " mốt"; } 
            else if (chuc == 1) { chuoi = " mười"; if (donvi == 1) chuoi += " một"; } 
            else if (daydu && donvi > 0) { chuoi = " lẻ"; }
            if (donvi == 5 && chuc > 0) { chuoi += " lăm"; } 
            else if (donvi > 1 || (donvi == 1 && chuc == 0)) { chuoi += " " + mangso[donvi]; }
            return chuoi;
        };
        const docblock = function(so, daydu) {
            let chuoi = ""; let tram = Math.floor(so / 100); so = so % 100;
            if (daydu || tram > 0) { chuoi = " " + mangso[tram] + " trăm"; chuoi += dochangchuc(so, true); } 
            else { chuoi = dochangchuc(so, false); }
            return chuoi;
        };
        const dochangtrieu = function(so, daydu) {
            let chuoi = ""; let trieu = Math.floor(so / 1000000); so = so % 1000000;
            if (trieu > 0) { chuoi = docblock(trieu, daydu) + " triệu"; daydu = true; }
            let ngan = Math.floor(so / 1000); so = so % 1000;
            if (ngan > 0) { chuoi += docblock(ngan, daydu) + " nghìn"; daydu = true; }
            if (so > 0) { chuoi += docblock(so, daydu); }
            return chuoi;
        };
        
        let chuoi = ""; let hauto = "";
        do {
            let ty = so % 1000000000; so = Math.floor(so / 1000000000);
            if (so > 0) { chuoi = dochangtrieu(ty, true) + hauto + chuoi; } 
            else { chuoi = dochangtrieu(ty, false) + hauto + chuoi; }
            hauto = " tỷ";
        } while (so > 0);
        
        let str = chuoi.trim();
        str = str.replace(/mươi một/g, 'mươi mốt');
        return str.charAt(0).toUpperCase() + str.slice(1) + " đồng.";
    },

    saveAndExport: async function() {
        const khachHang = document.getElementById('bg-khachhang').value.trim();
        if (!khachHang) return alert("Vui lòng nhập tên khách hàng!");

        const ghiChu = document.getElementById('bg-ghichu').value.trim();
        const tongTien = parseFloat(document.getElementById('bg-tongtien').getAttribute('data-total')) || 0;
        if(tongTien === 0) return alert("Báo giá đang trống không!");

        let items = [];
        const rows = document.querySelectorAll('#tbody-baogia tr');
        rows.forEach(row => {
            let name = row.querySelector('.bg-item-name').value.trim();
            if(name) {
                items.push({
                    name: name,
                    dvt: row.querySelector('.bg-item-dvt').value.trim(),
                    qty: parseFloat(row.querySelector('.bg-item-qty').value) || 0,
                    price: parseFloat(row.querySelector('.bg-item-price').value) || 0
                });
            }
        });

        const btn = document.getElementById('btn-save-baogia');
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Đang tạo File PDF...';
        btn.disabled = true;

        const dateObj = new Date();
        const ngay = dateObj.toLocaleDateString('vi-VN');
        const maBG = "BG-" + dateObj.getTime().toString().slice(-6);
        const tienBangChu = this.docSoThanhChu(tongTien);

        const pdfContainer = document.getElementById('pdf-template-container');
        let trHtml = '';
        for (let i = 0; i < 8; i++) {
            let isEven = i % 2 !== 0; 
            let bgColor = isEven ? '#f5f5f5' : '#ffffff';
            let item = items[i];

            if (item) {
                let thanhTien = item.qty * item.price;
                trHtml += `
                    <tr style="background-color: ${bgColor}; font-size: 13px; color: #555;">
                        <td style="padding: 10px; text-align: center;">${i + 1}</td>
                        <td style="padding: 10px; font-weight: bold;">${item.name}</td>
                        <td style="padding: 10px; text-align: center;">${item.dvt}</td>
                        <td style="padding: 10px; text-align: center;">${item.qty.toLocaleString('vi-VN')}</td>
                        <td style="padding: 10px; text-align: right;">${item.price.toLocaleString('vi-VN')}</td>
                        <td style="padding: 10px; text-align: right;">${thanhTien.toLocaleString('vi-VN')}</td>
                    </tr>`;
            } else {
                trHtml += `
                    <tr style="background-color: ${bgColor}; height: 38px;">
                        <td style="padding: 10px; text-align: center; color: #999;">${i + 1}</td>
                        <td></td><td></td><td></td><td></td><td></td>
                    </tr>`;
            }
        }

        pdfContainer.innerHTML = `
            <div style="padding: 40px; font-family: 'Segoe UI', Arial, sans-serif; background: white;">
                <div style="border-top: 8px solid #3f51b5; margin-bottom: 30px;"></div>
                
                <div style="margin-bottom: 40px;">
                    <h2 style="color: #5c6bc0; font-size: 22px; margin: 0 0 5px 0; font-weight: 600;">ĐƠN VỊ THI CÔNG XÂY DỰNG THANH SƠN</h2>
                    <p style="color: #777; font-size: 13px; margin: 0; line-height: 1.5;">
                        362, Quốc Lộ 13<br>Lộc Ninh, Đồng Nai<br>Phone/Zalo: 0974031035
                    </p>
                </div>

                <h1 style="color: #283593; font-size: 32px; font-weight: 700; margin-bottom: 30px;">Bảng giá các hạng mục thi công</h1>

                <div style="margin-bottom: 20px;">
                    <div style="font-weight: 700; font-size: 14px; color: #333;">Khách hàng</div>
                    <div style="font-size: 14px; color: #777;">${khachHang}</div>
                </div>

                <table style="width: 100%; border-collapse: collapse; margin-bottom: 10px;">
                    <thead>
                        <tr style="border-bottom: 1px solid #ddd; color: #283593; font-size: 14px;">
                            <th style="padding: 12px 10px; text-align: center; width: 5%;">STT</th>
                            <th style="padding: 12px 10px; text-align: left; width: 40%;">Nội dung</th>
                            <th style="padding: 12px 10px; text-align: center; width: 10%;">ĐVT</th>
                            <th style="padding: 12px 10px; text-align: center; width: 10%;">SL</th>
                            <th style="padding: 12px 10px; text-align: right; width: 15%;">Đơn giá (*)</th>
                            <th style="padding: 12px 10px; text-align: right; width: 20%;">Thành tiền</th>
                        </tr>
                    </thead>
                    <tbody>${trHtml}</tbody>
                </table>

                <div style="text-align: right; padding: 20px 0; border-bottom: 1px solid #ddd; margin-bottom: 20px;">
                    <span style="font-size: 28px; font-weight: bold; color: #e91e63;">${tongTien.toLocaleString('vi-VN')}</span>
                </div>

                <div style="font-size: 13px; color: #333; margin-bottom: 40px;">
                    <p style="margin: 0 0 5px 0;">(*) Đơn giá chưa bao gồm thuế VAT</p>
                    <p style="color: #283593; font-weight: bold; margin: 0;">Số tiền bằng chữ: ${tienBangChu}</p>
                </div>

                <table style="width: 100%; font-size: 13px;">
                    <tr>
                        <td style="width: 50%; vertical-align: top;">
                            <div style="color: #283593; font-weight: bold; margin-bottom: 10px;">Chủ đơn vị</div>
                            <div style="font-weight: bold; margin-bottom: 5px;">PHAN THANH SƠN</div>
                            <div style="color: #333;">STK: Ngân hàng ACB – 41175687 – PHAN THANH SON</div>
                            <div style="border-bottom: 1px solid #ddd; width: 80%; margin-top: 10px;"></div>
                        </td>
                        <td style="width: 50%; vertical-align: top;">
                            <div style="color: #283593; font-weight: bold; margin-bottom: 10px;">Ngày lập báo giá</div>
                            <div style="margin-bottom: 5px;">${ngay}</div>
                            <div style="color: #333;">Lộc Ninh, Đồng Nai</div>
                            <div style="border-bottom: 1px solid #ddd; width: 80%; margin-top: 10px;"></div>
                        </td>
                    </tr>
                </table>
            </div>
        `;

        const itemsString = encodeURIComponent(JSON.stringify(items));
        const payload = [maBG, ngay, khachHang, tongTien, itemsString, ghiChu];
        
        let res = await API.request('POST', 'saveBaoGia', 'BAO_GIA', payload);
        
        if(res.status !== 'success') {
            alert("Lỗi lưu DB: " + res.message);
            btn.innerHTML = '<i class="bi bi-file-earmark-arrow-down me-2"></i>LƯU & XUẤT FILE PDF';
            btn.disabled = false;
            return;
        }

        pdfContainer.style.display = 'block';
        var opt = {
            margin:       0,
            filename:     `BaoGia_${khachHang.replace(/ /g, "_")}_${ngay.replace(/\//g, "")}.pdf`,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2 },
            jsPDF:        { unit: 'in', format: 'A4', orientation: 'portrait' }
        };

        html2pdf().set(opt).from(pdfContainer).save().then(() => {
            pdfContainer.style.display = 'none';
            pdfContainer.innerHTML = '';
            alert("✅ Xuất Báo giá thành công! Đã lưu trữ an toàn trên Google Sheets.");
            this.load(); 
            btn.innerHTML = '<i class="bi bi-file-earmark-arrow-down me-2"></i>LƯU & XUẤT FILE PDF';
            btn.disabled = false;
        });
    }
};

document.addEventListener('click', function(e) {
    const input = document.getElementById('bg-khachhang');
    const dropdown = document.getElementById('bg-khachhang-dropdown');
    if (input && dropdown && !input.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.style.display = 'none';
    }
});