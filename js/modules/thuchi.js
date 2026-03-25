// js/modules/thuchi.js

const ThuChiModule = {
    // Chỉ cần lưu Thu và Chi Types
    Lists: { thuTypes: [], chiTypes: [] },
    
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

        // Kéo danh sách phân loại thu chi từ cột mới
        this.Lists.thuTypes = setupData.map(r => r['PHÂN LOẠI THU']).filter(Boolean);
        this.Lists.chiTypes = setupData.map(r => r['PHÂN LOẠI CHI']).filter(Boolean);

        // Đổ toàn bộ Phân loại vào Dropdown
        const phanLoai = document.getElementById('tc-phanloai');
        phanLoai.innerHTML = '<option value="">-- Bỏ qua cũng được --</option>';
        
        // Dùng Set để lọc trùng lặp tự động
        let allTypes = [...new Set([...this.Lists.thuTypes, ...this.Lists.chiTypes])];
        allTypes.forEach(i => {
            phanLoai.innerHTML += `<option value="${i}">${i}</option>`;
        });
    },

    bindEvents: function() {
        // Đã xóa phần bắt sự kiện của tc-loai cũ
        const phanLoai = document.getElementById('tc-phanloai');
        const inputThu = document.getElementById('tc-thu');
        const inputChi = document.getElementById('tc-chi');

        // XỬ LÝ KHÓA Ô THU / CHI THEO CHỮ ĐẦU TIÊN CỦA PHÂN LOẠI
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
    
    parseDateString: function(dateStr) {
        if (!dateStr) return null;
        if (dateStr.includes('-')) return new Date(dateStr); 
        const parts = dateStr.split('/');
        if (parts.length === 3) {
            return new Date(parts[2], parts[1] - 1, parts[0]);
        }
        return new Date(dateStr);
    },

    applyFilters: function() {
        if(!App.State.thuChiData) return;

        const type = document.getElementById('filter-type').value;
        const txtKeyword = document.getElementById('filter-keyword').value.toLowerCase();
        const dateFromStr = document.getElementById('filter-date-from').value;
        const dateToStr = document.getElementById('filter-date-to').value;

        let dateFrom = dateFromStr ? new Date(dateFromStr) : null;
        if (dateFrom) dateFrom.setHours(0, 0, 0, 0); 

        let dateTo = dateToStr ? new Date(dateToStr) : null;
        if (dateTo) dateTo.setHours(23, 59, 59, 999); 

        let tongThu = 0;
        let tongChi = 0;

        this.filteredData = App.State.thuChiData.filter(row => {
            let thu = parseFloat(row['Số tiền THU']) || 0;
            let chi = parseFloat(row['Số tiền CHI']) || 0;

            let matchType = true;
            if (type === 'THU') matchType = thu > 0;
            if (type === 'CHI') matchType = chi > 0;

            let matchKeyword = true;
            if (txtKeyword !== '') {
                let chuthe = (row['Chủ thể'] || '').toLowerCase();
                let noidung = (row['Nội dung'] || '').toLowerCase();
                let thuStr = thu.toString();
                let chiStr = chi.toString();
                
                matchKeyword = chuthe.includes(txtKeyword) || noidung.includes(txtKeyword) || 
                               thuStr.includes(txtKeyword) || chiStr.includes(txtKeyword);
            }

            let matchDate = true;
            if (dateFrom || dateTo) {
                let rowDate = this.parseDateString(row['Ngày']);
                if (rowDate) {
                    if (dateFrom && rowDate < dateFrom) matchDate = false;
                    if (dateTo && rowDate > dateTo) matchDate = false;
                } else {
                    matchDate = false; 
                }
            }

            let isMatch = matchType && matchKeyword && matchDate;
            
            if (isMatch) {
                tongThu += thu;
                tongChi += chi;
            }

            return isMatch;
        });

        this.updateStatsUI(tongThu, tongChi);
        this.displayLimit = 10;
        this.renderTable();
    },

    updateStatsUI: function(thu, chi) {
        const chenhLech = thu - chi;
        
        document.getElementById('stat-tong-thu').innerText = thu.toLocaleString('vi-VN') + ' đ';
        document.getElementById('stat-tong-chi').innerText = chi.toLocaleString('vi-VN') + ' đ';
        
        const elChenhLech = document.getElementById('stat-chenh-lech');
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
    },

    resetFilters: function() {
        document.getElementById('filter-date-from').value = '';
        document.getElementById('filter-date-to').value = '';
        document.getElementById('filter-type').value = 'ALL';
        document.getElementById('filter-keyword').value = '';
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
        
        const thuVal = parseFloat(document.getElementById('tc-thu').value) || 0;
        const chiVal = parseFloat(document.getElementById('tc-chi').value) || 0;

        if (thuVal === 0 && chiVal === 0) {
            alert("⚠️ Bạn ơi, ít nhất phải nhập số tiền THU hoặc CHI chứ!");
            return; 
        }

        const btnAdd = document.getElementById('btn-add-tc');
        
        let dateInput = document.getElementById('tc-ngay').value;
        if (!dateInput) {
            dateInput = new Date().toISOString().split('T')[0]; 
        }
        const dateParts = dateInput.split('-');
        const dateFormatted = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;

        const chuTheTxt = document.getElementById('tc-chuthe').value.trim();
        const noiDungTxt = document.getElementById('tc-noidung').value.trim();
        const phanLoaiTxt = document.getElementById('tc-phanloai').value;

        if (chuTheTxt !== "") {
            let validNames = this.getValidPartners(); 
            if (!validNames.includes(chuTheTxt)) {
                alert(`⚠️ LỖI: Đối tác "${chuTheTxt}" chưa được đăng ký trong Cài Đặt!`);
                return; 
            }
        }

        // Đã gọt sạch payload, chỉ truyền đúng 6 Cột
        const payload = [dateFormatted, chuTheTxt, noiDungTxt, phanLoaiTxt, thuVal, chiVal];

        btnAdd.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Đang ghi vào sổ cái...'; 
        btnAdd.disabled = true;
        
        let res = await API.request('POST', 'create', 'THU_CHI', payload);
        
        if (res.status === 'success') {
            document.getElementById('form-thuchi').reset();
            document.getElementById('tc-ngay').valueAsDate = new Date();
            document.getElementById('tc-thu').disabled = false;
            document.getElementById('tc-chi').disabled = false;
            
            // Xóa "Loại chủ thể" khỏi lệnh nhét vào RAM
            App.State.thuChiData.unshift({
                _rowIndex: res.rowIndex, 
                "Ngày": dateFormatted,
                "Chủ thể": chuTheTxt,
                "Nội dung": noiDungTxt,
                "Phân loại": phanLoaiTxt,
                "Số tiền THU": thuVal,
                "Số tiền CHI": chiVal
            });

            this.applyFilters(); 
            if(typeof DashboardModule !== 'undefined') DashboardModule.load(false);
        } else {
            alert('Lỗi: ' + res.message);
        }

        btnAdd.innerHTML = '<i class="bi bi-cloud-arrow-up-fill me-2"></i>LƯU VÀO SỔ QUỸ'; 
        btnAdd.disabled = false;
    },

    getValidPartners: function() {
        let validNames = ["Cậu Sơn / Nội bộ xưởng"];
        if (App.State.setupData) {
            App.State.setupData.forEach(r => {
                if (r['CHỦ THỂ']) validNames.push(r['CHỦ THỂ']);
            });
        }
        return validNames;
    },

    suggestNames: function() {
        const inputVal = document.getElementById('tc-chuthe').value.toLowerCase();
        const dropdown = document.getElementById('tc-chuthe-dropdown');
        const allNames = this.getValidPartners();
        
        const filtered = allNames.filter(name => name.toLowerCase().includes(inputVal));
        
        if (filtered.length === 0) {
            dropdown.style.display = 'none';
            return;
        }

        let html = '';
        filtered.forEach(name => {
            html += `<li><button type="button" class="dropdown-item py-3 fw-bold text-teal border-bottom" onclick="ThuChiModule.selectName('${name}')">${name}</button></li>`;
        });
        
        dropdown.innerHTML = html;
        dropdown.style.display = 'block';
    },

    selectName: function(name) {
        const input = document.getElementById('tc-chuthe');
        input.value = name; 
        document.getElementById('tc-chuthe-dropdown').style.display = 'none'; 
        input.blur(); 
    },

    deleteRow: async function(rowIndex) {
        if(confirm(`⚠️ Bạn đang xóa dòng giao dịch số ${rowIndex}. Hành động này sẽ làm thay đổi quỹ.\nTiếp tục?`)) {
            let res = await API.request('POST', 'delete', 'THU_CHI', null, rowIndex);
            
            if(res.status === 'success') {
                App.State.thuChiData = App.State.thuChiData.filter(r => r._rowIndex !== rowIndex);
                this.applyFilters();
                if(typeof DashboardModule !== 'undefined') DashboardModule.load(false);
            } else {
                alert('Lỗi: ' + res.message);
            }
        }
    }
};

document.addEventListener('click', function(e) {
    const input = document.getElementById('tc-chuthe');
    const dropdown = document.getElementById('tc-chuthe-dropdown');
    if (input && dropdown) {
        if (!input.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.style.display = 'none';
        }
    }
});