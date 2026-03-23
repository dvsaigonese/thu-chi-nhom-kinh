// js/modules/thuchi.js

const ThuChiModule = {
    // Lưu các list lấy từ sheet SETUP
    Lists: { khachHang: [], doiTac: [], nhaCungCap: [], thuTypes: [], chiTypes: [] },
    
    // Lưu State cho Phân trang & Bộ lọc
    isEventBound: false,
    filteredData: [],
    displayLimit: 10,

    load: async function() {
        if (!this.isEventBound) {
            this.bindEvents();
            this.isEventBound = true;
        }

        document.getElementById('tc-ngay').valueAsDate = new Date();
        
        await this.loadSetupLists();
        await this.loadHistory();
    },

    loadSetupLists: async function() {
        let setupData = App.State.setupData;
        if (!setupData) {
            let res = await API.request('GET', 'read', 'SETUP');
            if(res.status === 'success') {
                setupData = res.data;
                App.State.setupData = res.data; 
            } else return;
        }

        this.Lists.khachHang = setupData.map(r => r['NGUỒN TIỀN/KHÁCH']).filter(Boolean);
        this.Lists.doiTac = setupData.map(r => r['ĐỐI TƯỢNG GIA CÔNG'] || r['ĐỐI TÁC GIA CÔNG']).filter(Boolean);
        this.Lists.nhaCungCap = setupData.map(r => r['NGUỒN HÀNG/NCC']).filter(Boolean);
        this.Lists.thuTypes = setupData.map(r => r['PHÂN LOẠI THU']).filter(Boolean);
        this.Lists.chiTypes = setupData.map(r => r['PHÂN LOẠI CHI']).filter(Boolean);
    },

    bindEvents: function() {
        const loaiChuThe = document.getElementById('tc-loai');
        const listChuThe = document.getElementById('list-chuthe'); 
        const inputChuThe = document.getElementById('tc-chuthe');
        const phanLoai = document.getElementById('tc-phanloai');
        
        // 2 input tiền để xử lý khóa ô
        const inputThu = document.getElementById('tc-thu');
        const inputChi = document.getElementById('tc-chi');

        loaiChuThe.addEventListener('change', (e) => {
            let val = e.target.value;
            listChuThe.innerHTML = ''; 
            inputChuThe.value = ''; 
            phanLoai.innerHTML = '<option value="">-- Chọn phân loại --</option>';
            
            // Mở lại cả 2 ô tiền khi đổi loại chủ thể
            inputThu.disabled = false;
            inputChi.disabled = false;

            if (val === 'KhachHang') {
                this.Lists.khachHang.forEach(i => listChuThe.innerHTML += `<option value="${i}">`);
                this.Lists.thuTypes.forEach(i => phanLoai.innerHTML += `<option value="${i}">${i}</option>`);
            } 
            else if (val === 'DoiTac') {
                this.Lists.doiTac.forEach(i => listChuThe.innerHTML += `<option value="${i}">`);
                this.Lists.chiTypes.forEach(i => phanLoai.innerHTML += `<option value="${i}">${i}</option>`);
            } 
            else if (val === 'NhaCungCap') {
                this.Lists.nhaCungCap.forEach(i => listChuThe.innerHTML += `<option value="${i}">`);
                this.Lists.chiTypes.forEach(i => phanLoai.innerHTML += `<option value="${i}">${i}</option>`);
            } 
            else if (val === 'NoiBo') {
                listChuThe.innerHTML = `<option value="Cậu Sơn / Nội bộ xưởng">`;
                [...this.Lists.thuTypes, ...this.Lists.chiTypes].forEach(i => phanLoai.innerHTML += `<option value="${i}">${i}</option>`);
            }
        });

        // XỬ LÝ KHÓA Ô THU / CHI
        phanLoai.addEventListener('change', (e) => {
            let val = e.target.value;
            if (val.startsWith('Thu')) {
                inputThu.disabled = false; inputChi.disabled = true; inputChi.value = ''; inputThu.focus();
            } else if (val.startsWith('Chi')) {
                inputChi.disabled = false; inputThu.disabled = true; inputThu.value = ''; inputChi.focus();
            } else {
                inputThu.disabled = false; inputChi.disabled = false;
            }
        });

    },

    loadHistory: async function() {
        const tbody = document.getElementById('tbody-thuchi');
        const note = document.getElementById('tc-note');
        
        if (App.State.thuChiData !== null) {
            this.applyFilters(); 
            return;
        }

        note.innerText = "⏳ Đang kéo lịch sử từ két sắt...";
        note.className = "badge bg-warning text-dark fw-normal fs-7";
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted p-4">Đang tải...</td></tr>';
        
        let res = await API.request('GET', 'read', 'THU_CHI');
        if (res.status === 'success') {
            let validData = res.data.filter(r => r['Ngày'] || r['Chủ thể']);
            App.State.thuChiData = validData.reverse(); 
            this.applyFilters(); 
        } else {
            note.innerText = "Lỗi kết nối!";
            note.className = "badge bg-danger text-white fw-normal fs-7";
            tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger p-4">❌ ${res.message}</td></tr>`;
        }
    },

    // ================= BỘ LỌC ĐA NĂNG & THỐNG KÊ =================
    
    // 1. Hàm phụ: Chuyển đổi ngày DD/MM/YYYY từ Sheet sang chuẩn của máy tính
    parseDateString: function(dateStr) {
        if (!dateStr) return null;
        if (dateStr.includes('-')) return new Date(dateStr); // Nếu đã chuẩn YYYY-MM-DD
        const parts = dateStr.split('/');
        if (parts.length === 3) {
            // Javascript nhận tháng từ 0-11, nên phải trừ 1
            return new Date(parts[2], parts[1] - 1, parts[0]);
        }
        return new Date(dateStr);
    },

    // 2. Hàm lọc chính thức
    applyFilters: function() {
        if(!App.State.thuChiData) return;

        // Lấy điều kiện lọc
        const type = document.getElementById('filter-type').value;
        const txtKeyword = document.getElementById('filter-keyword').value.toLowerCase();
        const dateFromStr = document.getElementById('filter-date-from').value;
        const dateToStr = document.getElementById('filter-date-to').value;

        // Xử lý mốc thời gian an toàn
        let dateFrom = dateFromStr ? new Date(dateFromStr) : null;
        if (dateFrom) dateFrom.setHours(0, 0, 0, 0); // Lấy từ 0h00 sáng

        let dateTo = dateToStr ? new Date(dateToStr) : null;
        if (dateTo) dateTo.setHours(23, 59, 59, 999); // Lấy đến 23h59 tối

        let tongThu = 0;
        let tongChi = 0;

        this.filteredData = App.State.thuChiData.filter(row => {
            let thu = parseFloat(row['Số tiền THU']) || 0;
            let chi = parseFloat(row['Số tiền CHI']) || 0;

            // Kiểm tra Loại
            let matchType = true;
            if (type === 'THU') matchType = thu > 0;
            if (type === 'CHI') matchType = chi > 0;

            // Kiểm tra Từ khóa
            let matchKeyword = true;
            if (txtKeyword !== '') {
                let chuthe = (row['Chủ thể'] || '').toLowerCase();
                let noidung = (row['Nội dung'] || '').toLowerCase();
                let thuStr = thu.toString();
                let chiStr = chi.toString();
                
                matchKeyword = chuthe.includes(txtKeyword) || noidung.includes(txtKeyword) || 
                               thuStr.includes(txtKeyword) || chiStr.includes(txtKeyword);
            }

            // Kiểm tra Thời gian
            let matchDate = true;
            if (dateFrom || dateTo) {
                let rowDate = this.parseDateString(row['Ngày']);
                if (rowDate) {
                    if (dateFrom && rowDate < dateFrom) matchDate = false;
                    if (dateTo && rowDate > dateTo) matchDate = false;
                } else {
                    matchDate = false; // Dòng nào không có ngày coi như loại
                }
            }

            // Phải thỏa mãn CẢ 3 điều kiện mới được giữ lại
            let isMatch = matchType && matchKeyword && matchDate;
            
            // Tính toán thống kê dựa trên những dòng ĐÃ ĐƯỢC LỌC
            if (isMatch) {
                tongThu += thu;
                tongChi += chi;
            }

            return isMatch;
        });

        // Cập nhật lên màn hình
        this.updateStatsUI(tongThu, tongChi);
        this.displayLimit = 10;
        this.renderTable();
    },

    // 3. Hàm phụ: Vẽ tiền lên Dashboard mini
    updateStatsUI: function(thu, chi) {
        const chenhLech = thu - chi;
        
        document.getElementById('stat-tong-thu').innerText = thu.toLocaleString('vi-VN') + ' đ';
        document.getElementById('stat-tong-chi').innerText = chi.toLocaleString('vi-VN') + ' đ';
        
        const elChenhLech = document.getElementById('stat-chenh-lech');
        elChenhLech.innerText = Math.abs(chenhLech).toLocaleString('vi-VN') + ' đ';
        
        // Cảnh báo màu sắc thông minh cho Cậu
        if (chenhLech > 0) {
            elChenhLech.className = 'fw-bold text-success text-truncate';
            elChenhLech.innerText = '+' + elChenhLech.innerText; // Dư tiền
        } else if (chenhLech < 0) {
            elChenhLech.className = 'fw-bold text-danger text-truncate';
            elChenhLech.innerText = '-' + elChenhLech.innerText; // Lõm vốn
        } else {
            elChenhLech.className = 'fw-bold text-primary text-truncate'; // Hòa vốn
        }
    },

    // ================= XÓA BỘ LỌC =================
    resetFilters: function() {
        // Trả các ô input về trạng thái trống hoặc mặc định
        document.getElementById('filter-date-from').value = '';
        document.getElementById('filter-date-to').value = '';
        document.getElementById('filter-type').value = 'ALL';
        document.getElementById('filter-keyword').value = '';
        
        // Gọi lại hàm lọc (lúc này các ô trống trơn nên nó sẽ tự động hiện ra TẤT CẢ)
        this.applyFilters();
    },

    loadMore: function() {
        this.displayLimit += 10;
        this.renderTable();
    },

    renderTable: function() {
        const tbody = document.getElementById('tbody-thuchi');
        const btnMore = document.getElementById('btn-load-more');
        const note = document.getElementById('tc-note');
        
        let html = '';
        let displayData = this.filteredData.slice(0, this.displayLimit); 

        displayData.forEach(row => {
            let rawDate = new Date(row['Ngày']);
            let dateStr = rawDate.toLocaleDateString('vi-VN');
            if(dateStr === 'Invalid Date') dateStr = row['Ngày'];

            let thu = row['Số tiền THU'] ? Number(row['Số tiền THU']).toLocaleString('vi-VN') + ' đ' : '-';
            let chi = row['Số tiền CHI'] ? Number(row['Số tiền CHI']).toLocaleString('vi-VN') + ' đ' : '-';

            html += `
            <tr>
                <td class="ps-3 text-muted">${dateStr}</td>
                <td><b class="text-teal">${row['Chủ thể']}</b></td>
                <td class="text-truncate" style="max-width: 150px;">${row['Nội dung']}</td>
                <td class="text-end text-success font-weight-bold-money">${thu}</td>
                <td class="text-end text-danger font-weight-bold-money">${chi}</td>
                <td class="text-center pe-3">
                    <button class="btn btn-outline-danger btn-sm border-0 py-0" onclick="ThuChiModule.deleteRow(${row._rowIndex})">
                        <i class="bi bi-trash3"></i>
                    </button>
                </td>
            </tr>`;
        });
        
        if(html === '') html = '<tr><td colspan="6" class="text-center p-4 text-muted">Không tìm thấy giao dịch phù hợp.</td></tr>';
        tbody.innerHTML = html;

        if (this.filteredData.length > this.displayLimit) {
            btnMore.style.display = 'block';
            note.innerText = `${this.displayLimit}/${this.filteredData.length}`;
            note.className = "badge bg-primary-subtle text-primary fw-normal fs-7"; 
        } else {
            btnMore.style.display = 'none';
            note.innerText = `Đủ ${this.filteredData.length}`;
            note.className = "badge bg-light text-muted fw-normal fs-7";
        }
    },

    addTransaction: async function(e) {
        e.preventDefault();
        
        // --- 1. KIỂM TRA ĐIỀU KIỆN BẮT BUỘC CHỈ DÀNH CHO TIỀN ---
        const thuVal = parseFloat(document.getElementById('tc-thu').value) || 0;
        const chiVal = parseFloat(document.getElementById('tc-chi').value) || 0;

        if (thuVal === 0 && chiVal === 0) {
            alert("⚠️ Cậu ơi, ít nhất phải nhập số tiền THU hoặc CHI chứ!");
            return; // Dừng luôn, không cho chạy tiếp
        }

        // --- 2. XỬ LÝ LẤY DỮ LIỆU AN TOÀN (Nếu bỏ trống vẫn chạy được) ---
        const btnAdd = document.getElementById('btn-add-tc');
        
        // Xử lý Ngày (Nếu Cậu xóa ngày, tự mặc định lấy ngày hôm nay)
        let dateInput = document.getElementById('tc-ngay').value;
        if (!dateInput) {
            // Lấy chuỗi YYYY-MM-DD của hôm nay
            dateInput = new Date().toISOString().split('T')[0]; 
        }
        const dateParts = dateInput.split('-');
        const dateFormatted = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;

        // Xử lý các ô Text / Dropdown
        const loaiEl = document.getElementById('tc-loai');
        const loaiTxt = loaiEl.selectedIndex > 0 ? loaiEl.options[loaiEl.selectedIndex].text : "";
        const chuTheTxt = document.getElementById('tc-chuthe').value.trim();
        const noiDungTxt = document.getElementById('tc-noidung').value.trim();
        const phanLoaiTxt = document.getElementById('tc-phanloai').value;

        const payload = [dateFormatted, loaiTxt, chuTheTxt, noiDungTxt, phanLoaiTxt, thuVal, chiVal];

        // --- 3. ĐẨY LÊN GOOGLE SHEETS & RAM ---
        btnAdd.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Đang ghi vào sổ cái...'; 
        btnAdd.disabled = true;
        
        let res = await API.request('POST', 'create', 'THU_CHI', payload);
        
        if (res.status === 'success') {
            document.getElementById('form-thuchi').reset();
            document.getElementById('tc-ngay').valueAsDate = new Date();
            document.getElementById('tc-thu').disabled = false;
            document.getElementById('tc-chi').disabled = false;
            
            App.State.thuChiData.unshift({
                _rowIndex: res.rowIndex, 
                "Ngày": dateFormatted,
                "Loại chủ thể": loaiTxt,
                "Chủ thể": chuTheTxt,
                "Nội dung": noiDungTxt,
                "Phân loại": phanLoaiTxt,
                "Số tiền THU": thuVal,
                "Số tiền CHI": chiVal
            });

            this.applyFilters(); 
            
        } else {
            alert('Lỗi: ' + res.message);
        }

        btnAdd.innerHTML = '<i class="bi bi-cloud-arrow-up-fill me-2"></i>LƯU VÀO SỔ QUỸ'; 
        btnAdd.disabled = false;
    },

    deleteRow: async function(rowIndex) {
        if(confirm(`⚠️ Cậu đang xóa dòng giao dịch số ${rowIndex}. Hành động này sẽ làm thay đổi quỹ.\nTiếp tục?`)) {
            
            // Lệnh API xóa ngầm
            let res = await API.request('POST', 'delete', 'THU_CHI', null, rowIndex);
            
            if(res.status === 'success') {
                // XÓA TRÊN RAM
                App.State.thuChiData = App.State.thuChiData.filter(r => r._rowIndex !== rowIndex);
                
                // Vẽ lại bảng ngay lập tức
                this.applyFilters();
            } else {
                alert('Lỗi: ' + res.message);
            }
        }
    }
};