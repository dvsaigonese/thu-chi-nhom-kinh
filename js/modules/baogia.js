// js/modules/baogia.js

const BaogiaModule = {
    rowCount: 0,
    currentHistory: [],
    historyDisplayCount: 5, 

    load: async function() {
        document.getElementById('bg-khachhang').value = '';
        document.getElementById('bg-ghichu').value = '';
        document.getElementById('tbody-baogia').innerHTML = '';
        document.getElementById('bg-history-container').style.display = 'none';
        
        const btnSave = document.getElementById('btn-save-baogia');
        const btnNew = document.getElementById('btn-new-baogia');
        if (btnSave) {
            btnSave.innerHTML = '<i class="bi bi-file-earmark-arrow-down me-2"></i>LƯU & XUẤT FILE PDF';
            btnSave.classList.remove('btn-success');
            btnSave.classList.add('btn-primary');
            btnSave.disabled = false;
        }
        if (btnNew) btnNew.style.display = 'none';

        this.updateTotal();
        this.addRow();

        if (!App.State.setupData) {
            let res = await API.request('GET', 'read', 'SETUP');
            if(res.status === 'success') App.State.setupData = res.data;
        }
    },

    resetForm: function() {
        if(confirm('⚠️ Bạn muốn xóa trắng form hiện tại để làm báo giá mới?')) {
            this.load();
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

    fetchHistory: async function(khachHang) {
        const container = document.getElementById('bg-history-container');
        const listEl = document.getElementById('bg-history-list');
        listEl.innerHTML = '<div class="text-info p-2"><span class="spinner-border spinner-border-sm"></span> Đang lục tìm trong Sổ...</div>';
        container.style.display = 'block';

        try {
            let res = await API.request('POST', 'getBaoGiaHistory', 'BAO_GIA', { khachHang: khachHang });
            if (res.status === 'error') {
                listEl.innerHTML = `<div class="text-danger fw-bold p-2">Lỗi máy chủ: ${res.message}</div>`;
                return;
            }
            if (res.status === 'success' && res.data && res.data.length > 0) {
                this.currentHistory = res.data;
                this.historyDisplayCount = 5; 
                this.renderHistoryList(); 
            } else {
                listEl.innerHTML = '<div class="text-muted p-2"><i class="bi bi-info-circle"></i> Khách hàng này chưa có báo giá cũ.</div>';
            }
        } catch (err) {
            listEl.innerHTML = `<div class="text-danger fw-bold p-2">Lỗi kết nối: ${err.message}</div>`;
        }
    },

    renderHistoryList: function() {
        const listEl = document.getElementById('bg-history-list');
        let html = '<div class="w-100">';
        let limit = Math.min(this.historyDisplayCount, this.currentHistory.length);
        
        for (let index = 0; index < limit; index++) {
            let bg = this.currentHistory[index];
            let ngayGio = bg.ngay;
            if(ngayGio && String(ngayGio).includes('T')) {
                let d = new Date(ngayGio);
                ngayGio = d.toLocaleDateString('vi-VN') + ' ' + d.toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'});
            }
            html += `
            <div class="w-100 d-flex justify-content-between align-items-center p-2 border rounded bg-white mb-2 shadow-sm">
                <div>
                    <div class="fs-7 text-muted"><i class="bi bi-clock me-1"></i>${ngayGio}</div>
                    <div class="fw-bold text-danger">${Number(bg.tongTien).toLocaleString('vi-VN')} đ</div>
                </div>
                <div class="text-nowrap">
                    <button class="btn btn-sm btn-outline-primary py-1 px-2" onclick="BaogiaModule.loadOldQuote(${index})" title="Nạp vào Form để sửa"><i class="bi bi-pencil"></i></button>
                    <button class="btn btn-sm btn-outline-success py-1 px-2 mx-1" onclick="BaogiaModule.viewOldPDF(${index})" title="Xem/Tải lại file PDF"><i class="bi bi-file-earmark-pdf"></i></button>
                    <button class="btn btn-sm btn-outline-danger py-1 px-2" onclick="BaogiaModule.deleteQuote(${bg._rowIndex})" title="Xóa bỏ"><i class="bi bi-trash"></i></button>
                </div>
            </div>`;
        }
        html += '</div>';

        let soLuongConLai = this.currentHistory.length - this.historyDisplayCount;
        if (soLuongConLai > 0) {
            html += `
            <div class="text-center mt-2">
                <button class="btn btn-sm btn-outline-secondary rounded-pill px-3 shadow-sm" onclick="BaogiaModule.loadMoreHistory()">
                    <i class="bi bi-chevron-down me-1"></i>Xem thêm (${soLuongConLai} báo giá cũ)
                </button>
            </div>`;
        }
        listEl.innerHTML = html;
    },

    loadMoreHistory: function() {
        this.historyDisplayCount += 5;
        this.renderHistoryList();
    },

    deleteQuote: async function(rowIndex) {
        if(!rowIndex) return alert("Lỗi: Không tìm thấy ID dòng để xóa.");
        if(!confirm("⚠️ Bạn có chắc chắn muốn xóa vĩnh viễn báo giá này khỏi lịch sử không?")) return;
        let res = await API.request('POST', 'delete', 'BAO_GIA', null, rowIndex);
        if(res.status === 'success') {
            const khachHang = document.getElementById('bg-khachhang').value.trim();
            this.fetchHistory(khachHang);
        } else {
            alert("Lỗi xóa: " + res.message);
        }
    },

    parseItemsData: function(rawItems) {
        if (!rawItems) return [];
        if (typeof rawItems !== 'string') return Array.isArray(rawItems) ? rawItems : [];
        let str = String(rawItems).trim();
        if (str.startsWith("'")) str = str.substring(1);
        str = str.replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"');
        try {
            return JSON.parse(str);
        } catch(e) {
            try {
                let parsed = (new Function("return " + str))();
                return Array.isArray(parsed) ? parsed : [];
            } catch(e2) {
                console.error("Dữ liệu vật tư bị hỏng hoàn toàn:", str);
                return [];
            }
        }
    },

    loadOldQuote: function(index) {
        const bg = this.currentHistory[index];
        if(!bg) return;
        
        document.getElementById('bg-ghichu').value = bg.ghiChu || '';
        document.getElementById('tbody-baogia').innerHTML = '';
        this.rowCount = 0;
        
        let itemsList = this.parseItemsData(bg.items);
        
        if (itemsList.length === 0) {
            this.addRow(); 
            alert("Báo giá này không có vật tư, hoặc dữ liệu đã bị hỏng!");
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
            alert(`✅ Đã nạp lại dữ liệu thành công!`);
        }
        this.updateTotal();
    },

    addRow: function() {
        this.rowCount++;
        const tbody = document.getElementById('tbody-baogia');
        const tr = document.createElement('tr');
        tr.id = `bg-row-${this.rowCount}`;
        tr.innerHTML = `
            <td><input type="text" class="form-control form-control-sm bg-item-name" placeholder="Vd: Kính 8mm"></td>
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

    // --- BẢN NÂNG CẤP: MỞ KHÓA GIỚI HẠN VÀ CHỐNG ĐỨT TRANG (page-break-inside) ---
    generatePDFHTML: function(khachHang, ngayInPDF, tongTien, items, ghiChu) {
        let trHtml = '';
        // THUẬT TOÁN: Lấy tối thiểu 8 dòng để giữ form đẹp, hoặc lấy tất cả nếu lớn hơn 8
        let totalRows = Math.max(8, items.length); 

        for (let i = 0; i < totalRows; i++) {
            let isEven = i % 2 !== 0; 
            let bgColor = isEven ? '#f5f5f5' : '#ffffff';
            let item = items[i];

            // Thêm page-break-inside: avoid vào TR để dòng không bao giờ bị cắt làm đôi
            if (item) {
                let thanhTien = item.qty * item.price;
                trHtml += `
                    <tr style="background-color: ${bgColor}; font-size: 13px; color: #555; page-break-inside: avoid;">
                        <td style="padding: 10px; text-align: center;">${i + 1}</td>
                        <td style="padding: 10px; font-weight: bold;">${item.name}</td>
                        <td style="padding: 10px; text-align: center;">${item.dvt}</td>
                        <td style="padding: 10px; text-align: center;">${item.qty.toLocaleString('vi-VN')}</td>
                        <td style="padding: 10px; text-align: right;">${item.price.toLocaleString('vi-VN')}</td>
                        <td style="padding: 10px; text-align: right;">${thanhTien.toLocaleString('vi-VN')}</td>
                    </tr>`;
            } else {
                trHtml += `
                    <tr style="background-color: ${bgColor}; height: 38px; page-break-inside: avoid;">
                        <td style="padding: 10px; text-align: center; color: #999;">${i + 1}</td>
                        <td></td><td></td><td></td><td></td><td></td>
                    </tr>`;
            }
        }

        const tienBangChu = this.docSoThanhChu(tongTien);
        
        let htmlGhiChu = ghiChu ? `
            <div style="margin-top: 10px; font-size: 13px; color: #333; padding: 10px; border: 1px dashed #ccc; background: #fafafa; page-break-inside: avoid;">
                <b style="color: #283593;">Ghi chú:</b><br>${String(ghiChu).replace(/\n/g, '<br>')}
            </div>
        ` : '';

        return `
            <div style="padding: 30px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background: white; box-sizing: border-box;">
                <div style="border-top: 8px solid #3f51b5; margin-bottom: 20px;"></div>
                
                <div style="margin-bottom: 25px;">
                    <h2 style="color: #5c6bc0; font-size: 20px; margin: 0 0 5px 0; font-weight: 600;">ĐƠN VỊ THI CÔNG XÂY DỰNG THANH SƠN</h2>
                    <p style="color: #777; font-size: 12px; margin: 0; line-height: 1.5;">
                        362, Quốc Lộ 13<br>Lộc Ninh, Bình Phước<br>Phone/Zalo: 0974031035
                    </p>
                </div>

                <h1 style="color: #283593; font-size: 28px; font-weight: 700; margin-bottom: 20px;">Bảng giá các hạng mục thi công</h1>

                <div style="margin-bottom: 15px; page-break-inside: avoid;">
                    <div style="font-weight: 700; font-size: 13px; color: #333;">Khách hàng</div>
                    <div style="font-size: 13px; color: #777;">${khachHang}</div>
                </div>

                <table style="width: 100%; border-collapse: collapse; margin-bottom: 10px;">
                    <thead>
                        <tr style="border-bottom: 1px solid #ddd; color: #283593; font-size: 13px; page-break-inside: avoid;">
                            <th style="padding: 10px 8px; text-align: center; width: 5%;">STT</th>
                            <th style="padding: 10px 8px; text-align: left; width: 40%;">Nội dung</th>
                            <th style="padding: 10px 8px; text-align: center; width: 10%;">ĐVT</th>
                            <th style="padding: 10px 8px; text-align: center; width: 10%;">SL</th>
                            <th style="padding: 10px 8px; text-align: right; width: 15%;">Đơn giá (*)</th>
                            <th style="padding: 10px 8px; text-align: right; width: 20%;">Thành tiền</th>
                        </tr>
                    </thead>
                    <tbody>${trHtml}</tbody>
                </table>

                <div style="text-align: right; padding: 10px 0; border-bottom: 1px solid #ddd; margin-bottom: 15px; page-break-inside: avoid;">
                    <span style="font-size: 24px; font-weight: bold; color: #e91e63;">${tongTien.toLocaleString('vi-VN')}</span>
                </div>

                <div style="font-size: 12px; color: #333; margin-bottom: 20px; page-break-inside: avoid;">
                    <p style="margin: 0 0 5px 0;">(*) Đơn giá chưa bao gồm thuế VAT</p>
                    <p style="color: #283593; font-weight: bold; margin: 0;">Số tiền bằng chữ: ${tienBangChu}</p>
                    ${htmlGhiChu}
                </div>

                <table style="width: 100%; font-size: 12px; page-break-inside: avoid;">
                    <tr>
                        <td style="width: 50%; vertical-align: top;">
                            <div style="color: #283593; font-weight: bold; margin-bottom: 5px;">Chủ đơn vị</div>
                            <div style="font-weight: bold; margin-bottom: 5px;">PHAN THANH SƠN</div>
                            <div style="color: #333;">STK: Ngân hàng ACB – 41175687 – PHAN THANH SON</div>
                            <div style="border-bottom: 1px solid #ddd; width: 80%; margin-top: 10px;"></div>
                        </td>
                        <td style="width: 50%; vertical-align: top;">
                            <div style="color: #283593; font-weight: bold; margin-bottom: 5px;">Ngày lập báo giá</div>
                            <div style="margin-bottom: 5px;">${ngayInPDF}</div>
                            <div style="color: #333;">Lộc Ninh, Bình Phước</div>
                            <div style="border-bottom: 1px solid #ddd; width: 80%; margin-top: 10px;"></div>
                        </td>
                    </tr>
                </table>
            </div>
        `;
    },

    // --- HÀM DOWNLOAD THAY VÌ SHARE (Diệt gọn bệnh đen xì) ---
    triggerDownload: function(pdfContainer, filename) {
        var opt = {
            margin:       0,
            filename:     filename,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2, scrollY: 0 },
            jsPDF:        { unit: 'in', format: 'A4', orientation: 'portrait' }
        };

        // GỌI THẲNG LỆNH SAVE - iPhone sẽ tự mở Tab xem PDF hoặc hiện Popup tải về mượt mà
        html2pdf().set(opt).from(pdfContainer).save().then(() => {
            pdfContainer.style.display = 'none';
            pdfContainer.innerHTML = '';
        });
    },

    viewOldPDF: function(index) {
        const bg = this.currentHistory[index];
        if(!bg) return;
        
        let itemsList = this.parseItemsData(bg.items);
        let ngayHienThi = bg.ngay;
        if(String(ngayHienThi).includes('T')) {
            ngayHienThi = new Date(ngayHienThi).toLocaleDateString('vi-VN');
        }

        const khachHang = document.getElementById('bg-khachhang').value.trim() || 'Khach_Hang';
        const pdfContainer = document.getElementById('pdf-template-container');
        pdfContainer.innerHTML = this.generatePDFHTML(khachHang, ngayHienThi, Number(bg.tongTien), itemsList, bg.ghiChu);
        
        window.scrollTo({ top: 0, behavior: 'instant' });
        pdfContainer.style.display = 'block';

        const filename = `BaoGia_${khachHang.replace(/ /g, "_")}_${ngayHienThi.replace(/\//g, "")}.pdf`;
        this.triggerDownload(pdfContainer, filename);
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
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Đang tạo PDF...';
        btn.disabled = true;

        const dateObj = new Date();
        const ngayInPDF = dateObj.toLocaleDateString('vi-VN');
        const gioPhut = dateObj.toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'});
        const ngayLuuDB = ngayInPDF + ' ' + gioPhut; 
        const maBG = "BG-" + dateObj.getTime().toString().slice(-6);

        const pdfContainer = document.getElementById('pdf-template-container');
        pdfContainer.innerHTML = this.generatePDFHTML(khachHang, ngayInPDF, tongTien, items, ghiChu);

        const itemsString = "'" + JSON.stringify(items);
        const payload = [maBG, ngayLuuDB, khachHang, tongTien, itemsString, ghiChu];
        
        let res = await API.request('POST', 'saveBaoGia', 'BAO_GIA', payload);
        
        if(res.status !== 'success') {
            alert("Lỗi lưu DB: " + res.message);
            btn.innerHTML = '<i class="bi bi-file-earmark-arrow-down me-2"></i>LƯU & XUẤT FILE PDF';
            btn.disabled = false;
            return;
        }

        window.scrollTo({ top: 0, behavior: 'instant' });
        pdfContainer.style.display = 'block';

        const filename = `BaoGia_${khachHang.replace(/ /g, "_")}_${ngayInPDF.replace(/\//g, "")}.pdf`;
        this.triggerDownload(pdfContainer, filename);

        btn.innerHTML = '<i class="bi bi-check-circle-fill me-2"></i>ĐÃ XUẤT THÀNH CÔNG';
        btn.classList.replace('btn-primary', 'btn-success');
        
        const btnNew = document.getElementById('btn-new-baogia');
        if(btnNew) btnNew.style.display = 'block'; 
        
        setTimeout(() => {
            if(btn.classList.contains('btn-success')) {
                btn.innerHTML = '<i class="bi bi-file-earmark-arrow-down me-2"></i>LƯU ĐÈ & XUẤT LẠI';
                btn.classList.replace('btn-success', 'btn-primary');
                btn.disabled = false;
            }
        }, 3000);
        
        this.fetchHistory(khachHang);
    }
};

document.addEventListener('click', function(e) {
    const input = document.getElementById('bg-khachhang');
    const dropdown = document.getElementById('bg-khachhang-dropdown');
    if (input && dropdown && !input.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.style.display = 'none';
    }
});